import type { Article, RawItem } from "@/types";

export function countArticles(sources: Record<string, RawItem[]>): number {
  return Object.values(sources || {}).reduce(
    (acc, items) => acc + (Array.isArray(items) ? items.length : 0),
    0,
  );
}

export function flattenSources(sources: Record<string, RawItem[]>): Article[] {
  const results: Article[] = [];
  const sourceEntries = sources || {};
  for (const [source, items] of Object.entries(sourceEntries)) {
    if (!Array.isArray(items)) continue;
    items.forEach((item, index) => {
      results.push({
        id: `${source}:${index}`,
        source,
        title: item.title || "",
        url: item.url || "",
        summary: item.summary || "",
        metrics: {
          bookmarks: item.bookmarks ?? null,
          points: item.points ?? null,
          comments: item.comments ?? null,
          score: item.score ?? null,
          likes: item.likes ?? item.lgtm ?? null,
          stocks: item.stocks ?? item.stock ?? null,
        },
        subreddit: item.subreddit || null,
        raw: item,
      });
    });
  }
  return results;
}

export function groupBySource(items: Article[]): Record<string, Article[]> {
  const grouped: Record<string, Article[]> = {};
  for (const item of items) {
    if (!grouped[item.source]) grouped[item.source] = [];
    grouped[item.source].push(item);
  }
  return grouped;
}
