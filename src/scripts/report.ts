import { SOURCE_CONFIGS } from "@/config";
import type { Article, DateInfo, MetricMap, SourceConfig } from "@/types";

function escapeTableCell(value: unknown): string {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .trim();
}

function metricNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getMetricValue(item: Article, metricKey: keyof MetricMap): unknown {
  return item.metrics?.[metricKey] ?? null;
}

function formatMetric(value: unknown, suffix = ""): string {
  if (value === null || value === undefined || value === "") return "-";
  const output = Number.isFinite(Number(value)) ? Number(value) : value;
  return `${output}${suffix}`;
}

function hasMetricValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return Number.isFinite(value);
  return true;
}

function formatTitleLink(item: Article): string {
  const title = item.title || "Untitled";
  if (item.url) {
    return `[${escapeTableCell(title)}](${item.url})`;
  }
  return escapeTableCell(title);
}

function selectHighlights(
  items: Article[],
  metricKey: keyof MetricMap,
  limit: number,
): Article[] {
  const sorted = [...items].sort((a, b) => {
    const metricDiff =
      metricNumber(getMetricValue(b, metricKey)) -
      metricNumber(getMetricValue(a, metricKey));
    if (metricDiff !== 0) return metricDiff;
    return (a.title || "").localeCompare(b.title || "");
  });
  return sorted.slice(0, limit);
}

function renderTable(headers: string[], rows: string[][]): string {
  const headerLine = `| ${headers.join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const rowLines = rows.map((row) => `| ${row.join(" | ")} |`);
  return [headerLine, separator, ...rowLines].join("\n");
}

function renderEmptyNotice(): string {
  return "（該当なし）";
}

function renderStandardSection({
  config,
  items,
  highlightLimit,
}: {
  config: SourceConfig;
  items: Article[];
  highlightLimit: number;
}): string {
  const lines: string[] = [];
  const highlights = selectHighlights(items, config.metricKey, highlightLimit);
  const includeMetricColumn = highlights.some((item) =>
    hasMetricValue(getMetricValue(item, config.metricKey)),
  );

  lines.push(`## ${config.title}`);
  lines.push("");
  lines.push("### 注目トピック");
  if (highlights.length === 0) {
    lines.push(renderEmptyNotice());
  } else {
    const rows = highlights.map((item) => {
      const row = [formatTitleLink(item)];
      if (includeMetricColumn) {
        row.push(
          escapeTableCell(
            formatMetric(
              getMetricValue(item, config.metricKey),
              config.metricSuffix,
            ),
          ),
        );
      }
      row.push("-", "-", "-");
      return row;
    });
    const headers = includeMetricColumn
      ? ["タイトル", config.metricLabel, "興味度", "カテゴリ", "メモ"]
      : ["タイトル", "興味度", "カテゴリ", "メモ"];
    lines.push(
      renderTable(headers, rows),
    );
  }

  lines.push("");
  lines.push("### 全エントリー");
  if (items.length === 0) {
    lines.push(renderEmptyNotice());
  } else {
    items.forEach((item, index) => {
      lines.push(`${index + 1}. ${formatTitleLink(item)}`);
    });
  }

  return lines.join("\n");
}

function renderRedditSection({
  config,
  items,
  highlightLimit,
}: {
  config: SourceConfig;
  items: Article[];
  highlightLimit: number;
}): string {
  const lines: string[] = [];
  const highlights = selectHighlights(items, config.metricKey, highlightLimit);
  const includeScoreColumn = highlights.some((item) =>
    hasMetricValue(getMetricValue(item, config.metricKey)),
  );
  const includeCommentsColumn = highlights.some((item) =>
    hasMetricValue(item.metrics?.comments ?? null),
  );

  lines.push(`## ${config.title}`);
  lines.push("");
  lines.push("### 注目トピック");

  if (highlights.length === 0) {
    lines.push(renderEmptyNotice());
  } else {
    const rows = highlights.map((item) => {
      const row = [formatTitleLink(item)];
      if (includeScoreColumn) {
        row.push(
          escapeTableCell(formatMetric(getMetricValue(item, config.metricKey), "")),
        );
      }
      if (includeCommentsColumn) {
        row.push(escapeTableCell(formatMetric(item.metrics?.comments ?? null, "")));
      }
      row.push("-", "-", escapeTableCell(item.subreddit || "-"), "-");
      return row;
    });
    const headers = ["タイトル"];
    if (includeScoreColumn) headers.push("投票数");
    if (includeCommentsColumn) headers.push("コメント数");
    headers.push("興味度", "カテゴリ", "サブレッド", "メモ");
    lines.push(
      renderTable(headers, rows),
    );
  }

  lines.push("");
  lines.push("### 全エントリー");
  if (items.length === 0) {
    lines.push(renderEmptyNotice());
  } else {
    items.forEach((item, index) => {
      lines.push(`${index + 1}. ${formatTitleLink(item)}`);
    });
  }

  return lines.join("\n");
}

function renderGenericSection({
  title,
  items,
  highlightLimit,
}: {
  title: string;
  items: Article[];
  highlightLimit: number;
}): string {
  const config: SourceConfig = {
    key: title,
    title,
    metricLabel: "スコア",
    metricKey: "score",
    metricSuffix: "",
    metricInlineSuffix: " score",
  };
  return renderStandardSection({ config, items, highlightLimit });
}

export function buildReport({
  dateInfo,
  groupedSources,
  highlightLimit,
}: {
  dateInfo: DateInfo;
  groupedSources: Record<string, Article[]>;
  highlightLimit: number;
}): string {
  const sections: string[] = [];
  const knownKeys = new Set(SOURCE_CONFIGS.map((config) => config.key));

  for (const config of SOURCE_CONFIGS) {
    const items = groupedSources[config.key] || [];
    const section = config.isReddit
      ? renderRedditSection({ config, items, highlightLimit })
      : renderStandardSection({ config, items, highlightLimit });
    sections.push(section);
  }

  const extraKeys = Object.keys(groupedSources || {}).filter(
    (key) => !knownKeys.has(key),
  );
  extraKeys.forEach((key) => {
    sections.push(
      renderGenericSection({
        title: `${key}`,
        items: groupedSources[key] || [],
        highlightLimit,
      }),
    );
  });

  return [
    `# トレンドネタ: ${dateInfo.iso}`,
    "",
    sections.join("\n\n---\n\n"),
  ].join("\n");
}
