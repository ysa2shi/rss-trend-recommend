export type MetricMap = {
  bookmarks?: number | null;
  points?: number | null;
  comments?: number | null;
  score?: number | null;
  likes?: number | null;
  stocks?: number | null;
};

export type RawItem = {
  title?: string;
  url?: string;
  summary?: string;
  channel?: string;
  bookmarks?: number;
  points?: number;
  comments?: number;
  score?: number;
  likes?: number;
  lgtm?: number;
  stocks?: number;
  stock?: number;
  subreddit?: string;
  [key: string]: unknown;
};

export type Article = {
  id: string;
  source: string;
  title: string;
  url: string;
  summary: string;
  metrics: MetricMap;
  subreddit: string | null;
  raw: RawItem;
};

export type SourceConfig = {
  key: string;
  title: string;
  metricLabel: string;
  metricKey: keyof MetricMap;
  metricSuffix: string;
  metricInlineSuffix: string;
  isReddit?: boolean;
};

export type DateInfo = {
  y: string;
  m: string;
  d: string;
  iso: string;
  compact: string;
};

export type InputPayload = {
  date?: string;
  sources: Record<string, RawItem[]>;
};
