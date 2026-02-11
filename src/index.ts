import "dotenv/config";
import path from "node:path";
import process from "node:process";
import {
  DEFAULT_FEED_LIMIT,
  DEFAULT_HIGHLIGHT_LIMIT,
  FEED_CACHE_DIR,
  FEEDS_PATH,
  INPUT_PATH,
} from "@/config";
import type { InputPayload } from "@/types";
import {
  countArticles,
  flattenSources,
  groupBySource,
} from "@/scripts/collection";
import { resolveDateInfo } from "@/scripts/date";
import { FileCache } from "@/scripts/cache";
import {
  readJsonSafe,
  ensureDir,
  writeText,
  writeJson,
} from "@/scripts/io";
import { buildReport } from "@/scripts/report";
import { buildInputFromFeeds } from "@/scripts/feeds";
import {
  removeTechfeedRankings,
  removeTechfeedDuplicates,
} from "@/scripts/filters";

const EMPTY_INPUT: InputPayload = { sources: {} };

function parseNumber(value: string | undefined, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

function parseFeedCacheMaxAgeMs(): number | undefined {
  const minutes = Number(process.env.FEED_CACHE_MAX_AGE_MINUTES || "");
  if (!Number.isFinite(minutes) || minutes <= 0) return undefined;
  return minutes * 60 * 1000;
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

async function main(): Promise<void> {
  const inputResult = await readJsonSafe<InputPayload>(INPUT_PATH, EMPTY_INPUT);
  if (inputResult.error) {
    console.warn(
      `WARN: Failed to read input.json. ${inputResult.error.message}`,
    );
  }

  let input = inputResult.data;

  const fetchFeedsEnabled = parseBoolean(process.env.FETCH_FEEDS);
  if (fetchFeedsEnabled) {
    const feedCache = new FileCache(FEED_CACHE_DIR);
    const feedLimit = parseNumber(process.env.FEED_LIMIT, DEFAULT_FEED_LIMIT);
    const feedCacheMaxAgeMs = parseFeedCacheMaxAgeMs();
    const feedInput = await buildInputFromFeeds({
      feedsPath: FEEDS_PATH,
      cache: feedCache,
      cacheMaxAgeMs: feedCacheMaxAgeMs,
      limit: feedLimit,
      userAgent: "rss-trend-recommend/1.0 (+https://github.com/)",
      onWarn: (message) => console.warn(`WARN: ${message}`),
    });
    const filteredFeed = removeTechfeedRankings(feedInput.sources);
    if (filteredFeed.removed > 0) {
      console.warn(
        `WARN: Removed ${filteredFeed.removed} TechFeed ranking items (feed).`,
      );
    }
    const dedupedFeed = removeTechfeedDuplicates(filteredFeed.sources);
    if (dedupedFeed.removed > 0) {
      console.warn(
        `WARN: Removed ${dedupedFeed.removed} TechFeed duplicate items (feed).`,
      );
    }
    input = { ...feedInput, sources: dedupedFeed.sources };
    await writeJson(INPUT_PATH, input);
  }

  const filtered = removeTechfeedRankings(input.sources);
  if (filtered.removed > 0) {
    console.warn(`WARN: Removed ${filtered.removed} TechFeed ranking items.`);
  }
  const deduped = removeTechfeedDuplicates(filtered.sources);
  if (deduped.removed > 0) {
    console.warn(`WARN: Removed ${deduped.removed} TechFeed duplicate items.`);
  }
  input = { ...input, sources: deduped.sources };

  let dateInfo;
  try {
    dateInfo = resolveDateInfo(input.date);
  } catch (error) {
    console.warn(`WARN: Invalid input date, using JST today. ${error}`);
    dateInfo = resolveDateInfo();
  }

  const outDir = path.join(process.cwd(), "trend", dateInfo.y, dateInfo.m);
  const outPath = path.join(outDir, `${dateInfo.compact}.md`);

  await ensureDir(outDir);

  const totalArticles = countArticles(input.sources);
  console.log(`Articles: ${totalArticles}`);
  console.log(`Output path: ${outPath}`);

  const articles = flattenSources(input.sources);
  const highlightLimit = parseNumber(
    process.env.HIGHLIGHT_LIMIT,
    DEFAULT_HIGHLIGHT_LIMIT,
  );

  const groupedSources = groupBySource(articles);
  const report = buildReport({
    dateInfo,
    groupedSources,
    highlightLimit,
  });

  await writeText(outPath, report);
  console.log(`Report written: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
