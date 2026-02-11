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
      if (!response.ok) {
        const text = await response.text();
        const retryable = response.status === 429 || response.status >= 500;
        throw new RetryableError(
          `Feed fetch failed (${response.status}): ${text}`,
          retryable,
        );
      }
      return response.text();
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
  if (!source.url) {
    const hint = source.page ? ` (page: ${source.page})` : "";
    options.onWarn?.(`Feed URL missing for source: ${source.id}${hint}`);
    return [];
  }

  const cacheKey = hashString(source.url);
  if (options.cache) {
    const cached = await options.cache.get<RawItem[]>(
      cacheKey,
      options.cacheMaxAgeMs,
    );
    if (cached) return cached;
  }

  try {
    const xml = await fetchXml(source.url, options.userAgent);
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
    options.onWarn?.(`Feed fetch failed for ${source.id}: ${error}`);
    return [];
  }
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
