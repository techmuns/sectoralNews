import type { NewsItem } from '../lib/types';
import { NewsCard } from './news-card';

type NewsGridProps = {
  items: NewsItem[];
};

export function NewsGrid({ items }: NewsGridProps) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </section>
  );
}
