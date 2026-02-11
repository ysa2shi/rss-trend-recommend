import type { RawItem } from "@/types";

const TECHFEED_RANKING_PATTERNS = [
  /^【[^】]*ランキング】/,
  /^\d{1,2}月\d{1,2}日ランキング/,
  /^\d{1,2}月ランキング/,
];

export function isTechfeedRankingTitle(title: string): boolean {
  const trimmed = title.trim();
  return TECHFEED_RANKING_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function removeTechfeedRankings(
  sources: Record<string, RawItem[]>
): { sources: Record<string, RawItem[]>; removed: number } {
  let removed = 0;
  const cleaned: Record<string, RawItem[]> = {};

  for (const [key, items] of Object.entries(sources || {})) {
    const isTechfeedKey = key === "techfeed" || key.startsWith("techfeed_");
    if (!Array.isArray(items)) {
      cleaned[key] = items as unknown as RawItem[];
      continue;
    }

    if (!isTechfeedKey) {
      cleaned[key] = items;
      continue;
    }

    const filtered = items.filter((item) => {
      const title = item?.title ?? "";
      const shouldDrop = isTechfeedRankingTitle(String(title));
      if (shouldDrop) removed += 1;
      return !shouldDrop;
    });

    cleaned[key] = filtered;
  }

  return { sources: cleaned, removed };
}

function isTechfeedKey(key: string): boolean {
  return key === "techfeed" || key.startsWith("techfeed_");
}

function normalizeTechfeedUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.hash = "";
    const params = url.searchParams;
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(
      (key) => params.delete(key),
    );
    url.search = params.toString();
    return url.toString().toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

function buildTechfeedKey(item: RawItem): string {
  const url = typeof item.url === "string" ? normalizeTechfeedUrl(item.url) : "";
  if (url) return `url:${url}`;
  const title = typeof item.title === "string" ? item.title.trim().toLowerCase() : "";
  return `title:${title}`;
}

export function removeTechfeedDuplicates(
  sources: Record<string, RawItem[]>,
): { sources: Record<string, RawItem[]>; removed: number } {
  let removed = 0;
  const cleaned: Record<string, RawItem[]> = {};

  for (const [key, items] of Object.entries(sources || {})) {
    if (!Array.isArray(items)) {
      cleaned[key] = items as unknown as RawItem[];
      continue;
    }

    if (!isTechfeedKey(key)) {
      cleaned[key] = items;
      continue;
    }

    const seen = new Set<string>();
    const filtered = items.filter((item) => {
      const dedupeKey = buildTechfeedKey(item);
      if (!dedupeKey) return true;
      if (seen.has(dedupeKey)) {
        removed += 1;
        return false;
      }
      seen.add(dedupeKey);
      return true;
    });

    cleaned[key] = filtered;
  }

  return { sources: cleaned, removed };
}
