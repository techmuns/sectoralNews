export type ImpactLevel =
  | 'Positive'
  | 'Negative'
  | 'Neutral'
  | 'Policy'
  | 'Global Spillover';

export type SectorConfig = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  theme: {
    primary: string;
    soft: string;
    border: string;
  };
  keywords: string[];
  excludeKeywords: string[];
};

export type SourceConfig = {
  id: string;
  label: string;
  domain: string;
  priority: number;
};

export type NewsItem = {
  id: string;
  sectorId: SectorConfig['id'];
  headline: string;
  summary: string;
  source: string;
  sourceDomain: string;
  publishedAt: string;
  url: string;
  impact: ImpactLevel;
  clusterKey: string;
};

export type NewsCluster = {
  clusterKey: string;
  canonicalHeadline: string;
  items: NewsItem[];
};
