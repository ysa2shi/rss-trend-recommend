import path from "node:path";
import process from "node:process";
import type { SourceConfig } from "@/types";

export const ROOT = process.cwd();
export const INPUT_PATH = path.join(ROOT, "input.json");
export const FEEDS_PATH = path.join(ROOT, "feeds.yaml");
export const CACHE_DIR = path.join(ROOT, ".cache");
export const FEED_CACHE_DIR = path.join(CACHE_DIR, "feeds");

export const SOURCE_CONFIGS: SourceConfig[] = [
  {
    key: "hatebu_it",
    title: "はてブIT（日本市場）",
    metricLabel: "ブクマ数",
    metricKey: "bookmarks",
    metricSuffix: " users",
    metricInlineSuffix: " users",
  },
  {
    key: "zenn",
    title: "Zenn（日本市場）",
    metricLabel: "いいね数",
    metricKey: "likes",
    metricSuffix: "",
    metricInlineSuffix: " likes",
  },
  {
    key: "qiita",
    title: "Qiita（日本市場）",
    metricLabel: "ストック数",
    metricKey: "stocks",
    metricSuffix: "",
    metricInlineSuffix: " stocks",
  },
  {
    key: "techfeed",
    title: "TechFeed（日本市場）",
    metricLabel: "スコア",
    metricKey: "score",
    metricSuffix: "",
    metricInlineSuffix: " score",
  },
  {
    key: "hacker_news",
    title: "Hacker News（グローバル）",
    metricLabel: "ポイント",
    metricKey: "points",
    metricSuffix: "",
    metricInlineSuffix: " points",
  },
  {
    key: "reddit",
    title: "Reddit（グローバル）",
    metricLabel: "投票数",
    metricKey: "score",
    metricSuffix: "",
    metricInlineSuffix: " votes",
    isReddit: true,
  },
];

export const DEFAULT_HIGHLIGHT_LIMIT = 10;
export const DEFAULT_FEED_LIMIT = 10;
