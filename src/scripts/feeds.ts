import Parser from "rss-parser";
import type { Item } from "rss-parser";
import YAML from "yaml";
import type { InputPayload, RawItem } from "@/types";
import { FileCache, hashString } from "@/scripts/cache";
import { readTextSafe } from "@/scripts/io";
import { RetryableError, withRetry } from "@/scripts/retry";
import { getJstIsoDate } from "@/scripts/date";
import { isTechfeedRankingTitle } from "@/scripts/filters";

export type FeedSource = {
  id: string;
  name?: string;
  type?: string;
  url?: string;
  subreddit?: string;
  group?: string;
  page?: string;
  note?: string;
};

type FeedsFile = {
  sources?: FeedSource[];
};

type FeedOptions = {
  feedsPath: string;
  cache?: FileCache;
  cacheMaxAgeMs?: number;
  limit: number;
  userAgent?: string;
  onWarn?: (message: string) => void;
};

type RssItem = Item & {
  "hatena:bookmarkcount"?: string | number;
  "content:encoded"?: string;
};

const parser = new Parser({
  customFields: {
    item: ["hatena:bookmarkcount", "content:encoded"],
  },
});

const REDDIT_BLOCKED_PATTERN = /you'?ve been blocked by network security/i;

function normalizeSummary(value: unknown): string {
  if (!value) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeUrl(item: { link?: string; guid?: string }): string {
  return item.link || item.guid || "";
}

function parseNumber(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function compactText(value: string, maxLen = 220): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen)}...`;
}

function isLikelyHtmlDocument(value: string): boolean {
  const head = value.trimStart().slice(0, 200).toLowerCase();
  return head.startsWith("<!doctype html") || head.startsWith("<html");
}

function looksLikeFeedXml(value: string): boolean {
  const sample = value.slice(0, 2000).toLowerCase();
  return (
    sample.includes("<rss") ||
    sample.includes("<feed") ||
    sample.includes("<rdf:rdf")
  );
}

function isRedditBlockedPage(value: string): boolean {
  return REDDIT_BLOCKED_PATTERN.test(value);
}

function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

function buildCandidateUrls(source: FeedSource): string[] {
  if (!source.url) return [];
  const urls = [source.url];
  if (
    source.id === "reddit" &&
    source.url.includes("://www.reddit.com/")
  ) {
    urls.push(source.url.replace("://www.reddit.com/", "://old.reddit.com/"));
  }
  return [...new Set(urls)];
}

function isTechfeedSource(source: FeedSource): boolean {
  return source.group === "techfeed" || source.id.startsWith("techfeed");
}

function shouldExcludeItem(source: FeedSource, title: string): boolean {
  if (isTechfeedSource(source) && isTechfeedRankingTitle(title)) {
    return true;
  }
  return false;
}

async function fetchXml(url: string, userAgent?: string): Promise<string> {
  const res = await withRetry(
    async () => {
      const response = await fetch(url, {
        headers: userAgent ? { "User-Agent": userAgent } : undefined,
      });
      const text = await response.text();
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        throw new RetryableError(
          `Feed fetch failed (${response.status}): ${compactText(text)}`,
          retryable,
        );
      }

      if (isLikelyHtmlDocument(text)) {
        if (isRedditBlockedPage(text)) {
          throw new RetryableError(
            "Blocked by Reddit network security.",
            false,
          );
        }
        throw new RetryableError(
          "Unexpected HTML response (RSS/Atom XML expected).",
          false,
        );
      }

      if (!looksLikeFeedXml(text)) {
        throw new RetryableError(
          "Unexpected response format (RSS/Atom XML expected).",
          false,
        );
      }

      return text;
    },
    {
      retries: 3,
      minDelayMs: 750,
      maxDelayMs: 8000,
    },
  );
  return res;
}

async function fetchFeedItems(
  source: FeedSource,
  options: FeedOptions,
): Promise<RawItem[]> {
  const candidateUrls = buildCandidateUrls(source);
  if (candidateUrls.length === 0) {
    const hint = source.page ? ` (page: ${source.page})` : "";
    options.onWarn?.(`Feed URL missing for source: ${source.id}${hint}`);
    return [];
  }

  const cacheKey = hashString(candidateUrls[0]);
  if (options.cache) {
    const cached = await options.cache.get<RawItem[]>(
      cacheKey,
      options.cacheMaxAgeMs,
    );
    if (cached) return cached;
  }

  let lastError: unknown;
  for (let i = 0; i < candidateUrls.length; i += 1) {
    const url = candidateUrls[i];
    const hasFallback = i < candidateUrls.length - 1;

    try {
      const xml = await fetchXml(url, options.userAgent);
      const feed = await parser.parseString(xml);
      const items: RawItem[] = [];
      for (const item of feed.items || []) {
        const rawItem = item as RssItem;

        const title = rawItem.title || "";
        if (shouldExcludeItem(source, title)) {
          continue;
        }

        const bookmarkCount = parseNumber(rawItem["hatena:bookmarkcount"]);
        const summary =
          normalizeSummary(rawItem.contentSnippet) ||
          normalizeSummary(rawItem.content) ||
          normalizeSummary(rawItem.summary) ||
          normalizeSummary(rawItem["content:encoded"]);

        items.push({
          title,
          url: normalizeUrl(rawItem),
          summary,
          bookmarks: bookmarkCount,
          subreddit: source.subreddit,
          channel: source.group ? source.name || source.id : undefined,
        } satisfies RawItem);

        if (items.length >= options.limit) {
          break;
        }
      }

      if (options.cache) {
        options.cache.set(cacheKey, items).catch(() => undefined);
      }
      return items;
    } catch (error) {
      lastError = error;
      if (hasFallback) {
        options.onWarn?.(
          `Feed fetch failed for ${source.id} (${url}): ${describeError(error)} Retrying with fallback URL.`,
        );
      }
    }
  }

  options.onWarn?.(
    `Feed fetch failed for ${source.id}: ${describeError(lastError)}`,
  );
  return [];
}

export async function buildInputFromFeeds(
  options: FeedOptions,
): Promise<InputPayload> {
  const feedsResult = await readTextSafe(options.feedsPath, "");
  if (feedsResult.error) {
    options.onWarn?.(`Failed to read feeds.yaml. ${feedsResult.error.message}`);
    return { date: getJstIsoDate(), sources: {} };
  }

  const parsed = (YAML.parse(feedsResult.data) || {}) as FeedsFile;
  const sources = Array.isArray(parsed.sources) ? parsed.sources : [];

  const output: Record<string, RawItem[]> = {};
  for (const source of sources) {
    const items = await fetchFeedItems(source, options);
    const key = source.group || source.id;
    if (!output[key]) output[key] = [];
    output[key].push(...items);
  }

  return {
    date: getJstIsoDate(),
    sources: output,
  };
}
