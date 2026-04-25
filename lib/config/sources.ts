import type { SourceConfig } from '../types';

export const sources: SourceConfig[] = [
  { id: 'reuters', label: 'Reuters', domain: 'reuters.com', priority: 1 },
  {
    id: 'the-economic-times',
    label: 'The Economic Times',
    domain: 'economictimes.indiatimes.com',
    priority: 2,
  },
  { id: 'mint', label: 'Mint', domain: 'livemint.com', priority: 3 },
  {
    id: 'business-standard',
    label: 'Business Standard',
    domain: 'business-standard.com',
    priority: 4,
  },
  {
    id: 'businessline',
    label: 'BusinessLine',
    domain: 'thehindubusinessline.com',
    priority: 5,
  },
  {
    id: 'moneycontrol',
    label: 'Moneycontrol',
    domain: 'moneycontrol.com',
    priority: 6,
  },
];
