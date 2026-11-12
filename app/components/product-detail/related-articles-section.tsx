// Path: app/components/product-detail/related-articles-section.tsx
// Related articles (custom.related_articles): white cards in a slider, modeled on Back Market.
import {CardRow} from '~/components/blog/card-row';
import {ImagePlaceholder} from '~/components/ui/image-placeholder';
import Link from '~/components/ui/localized-link';
import {sizedImage} from '~/lib/blog';
import type {RelatedArticle} from '~/lib/product-extras.server';

const COPY = {
  title: 'Related articles',
  itemLabel: 'articles',
};

export function RelatedArticlesSection({articles}: {articles: RelatedArticle[]}) {
  if (articles.length === 0) return null;

  return (
    <CardRow id="related-articles" itemLabel={COPY.itemLabel} title={COPY.title}>
      {articles.map((article) => {
        const href = `/blogs/articles/${article.handle}`;
        return (
          <article
            className="grid content-start overflow-hidden rounded-ds-lg bg-white shadow-(--shadow-drop-xs)"
            key={article.id}
          >
            <Link className="relative aspect-4/3 overflow-hidden bg-muted" href={href}>
              {article.image ? (
                <img
                  alt={article.image.altText ?? ''}
                  className="absolute inset-0 size-full object-cover"
                  decoding="async"
                  loading="lazy"
                  src={sizedImage(article.image.url, 640)}
                />
              ) : (
                <ImagePlaceholder className="size-full bg-muted" />
              )}
            </Link>
            <div className="grid gap-1 p-(--spacer-regular)">
              <p className="text-muted-foreground text-ds-small">{article.blog.title}</p>
              <h3 className="line-clamp-2 font-semibold text-ds-regular leading-snug">
                <Link className="transition-opacity hover:opacity-70" href={href}>
                  {article.title}
                </Link>
              </h3>
            </div>
          </article>
        );
      })}
    </CardRow>
  );
}
