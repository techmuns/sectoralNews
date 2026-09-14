import { fetchSectorNews } from '../lib/api/news';
import { fetchArticleContent } from '../lib/api/web-reader';

export type Tool = {
  name: string;
  section: string;                 // which dashboard section this data appears in
  description: string;             // what QUESTIONS it answers
  args: Record<string, {
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    from?: string;                 // 'filter:<key>' — inherit the live filter value
    enum?: string[];
    default?: string;
  }>;
  run: (args: Record<string, any>, token: string) => Promise<unknown>;
};

/** Arg values are chosen by the model and can arrive as numbers, objects or null. */
function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return '';
}

export const tools: Tool[] = [
  {
    name: 'search_sector_news',
    section: 'Sector Headlines',
    // Datasource: news_search (POST /tools/news-search). Read-only.
    description:
      'Recent Indian business news headlines for one sector over a date range, with the ' +
      'publishing outlet, the published time and a short summary for each article. ' +
      'Use for questions about what is happening or what is new in a sector, the latest ' +
      'developments, policy or regulatory moves, deals, results commentary, demand or pricing ' +
      'trends, which outlets are covering a story, how many headlines there are, or what the ' +
      'news says about the currently selected company within its sector.',
    args: {
      sector: { type: 'string', required: true, from: 'filter:sector' },
      ticker: { type: 'string', required: false, from: 'filter:ticker' },
      tickerCompany: { type: 'string', required: false, from: 'filter:tickerCompany' },
      country: { type: 'string', required: false, from: 'filter:country', default: 'India' },
      fromDate: { type: 'string', required: false, from: 'filter:fromDate' },
      toDate: { type: 'string', required: false, from: 'filter:toDate' },
    },
    run: (args, token) => {
      const sector = text(args.sector);
      if (!sector) {
        throw new Error('No sector was given, so sector headlines could not be looked up.');
      }
      return fetchSectorNews(
        {
          sector,
          ticker: text(args.ticker) || null,
          tickerCompany: text(args.tickerCompany) || null,
          country: text(args.country) || 'India',
          fromDate: text(args.fromDate) || null,
          toDate: text(args.toDate) || null,
        },
        token,
      );
    },
  },

  {
    name: 'read_article',
    section: 'Article Reader',
    // Datasource: web_reader (POST /tools/web-reader). Read-only.
    description:
      'The full extracted text of one news article, given its URL. ' +
      'Use for questions that need detail the headline and summary do not carry — what an ' +
      'article actually says, the figures or names quoted in it, what a regulator or company ' +
      'announced in a specific story, or when the user asks to summarise, explain or dig into ' +
      'a particular article shown in Sector Headlines.',
    args: {
      url: { type: 'string', required: true, from: 'filter:articleUrl' },
      task: { type: 'string', required: false },
    },
    run: (args, token) => {
      const url = text(args.url);
      if (!url) {
        throw new Error(
          'No article link was given. Open an article on a headline card first, or name the ' +
            'article to read.',
        );
      }
      return fetchArticleContent({ url, task: text(args.task) || null }, token);
    },
  },
];
