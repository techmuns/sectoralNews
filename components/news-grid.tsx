import type { ArticleContent } from '../lib/api/web-reader';
import type { NewsItem } from '../lib/types';
import { NewsCard } from './news-card';

type NewsGridProps = {
  items: NewsItem[];
  openArticleUrl: string | null;
  article: ArticleContent | null;
  articleLoading: boolean;
  articleError: string | null;
  onReadArticle: (url: string, headline: string) => void;
};

export function NewsGrid({
  items,
  openArticleUrl,
  article,
  articleLoading,
  articleError,
  onReadArticle,
}: NewsGridProps) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const isOpen = openArticleUrl === item.url;
        return (
          <NewsCard
            key={item.id}
            item={item}
            isOpen={isOpen}
            article={isOpen ? article : null}
            articleLoading={isOpen && articleLoading}
            articleError={isOpen ? articleError : null}
            onReadArticle={onReadArticle}
          />
        );
      })}
    </section>
  );
}
