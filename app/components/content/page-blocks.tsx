import type {ReactNode} from 'react';
import {ArticleBody} from '~/components/blog/article-body';
import {CardRow} from '~/components/blog/card-row';
import {Container} from '~/components/ui/container';
import Link from '~/components/ui/localized-link';
import {Page} from '~/components/ui/page';
import {cn} from 'cn';
import {parseBody} from '~/lib/shortcodes';
import type {BlockLink, CardItem, CardVariant, PageBlock} from '~/lib/page-blocks';

type Of<T extends PageBlock['type']> = Extract<PageBlock, {type: T}>;

const PILL =
  'inline-flex items-center gap-(--spacer-xsmall) rounded-full bg-(--color-bg-secondary) px-(--spacer-regular) py-(--spacer-xsmall) font-medium text-(--color-text-dark) text-ds-small shadow-(--shadow-drop-xs) transition-opacity hover:opacity-70';

function BlockAnchor({children, className, href}: {children: ReactNode; className: string; href: string}) {
  // Hash, mailto and outside links skip the locale-aware Link.
  if (href.startsWith('#') || href.startsWith('mailto:')) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    );
  }
  if (href.startsWith('https://')) {
    return (
      <a className={className} href={href} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    );
  }
  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 12 12">
      <path d="M2 2l8 8M10 4v6H4" />
    </svg>
  );
}

function Hero({block}: {block: Of<'hero'>}) {
  const {image, links, title} = block;
  return (
    <header
      className={cn(
        'relative isolate flex min-h-80 items-end overflow-hidden md:min-h-112',
        image ? 'text-(--color-text-light)' : 'bg-(--color-brand-primary) text-(--color-text-dark)',
      )}
    >
      {image && (
        <>
          <img alt="" className="absolute inset-0 -z-20 size-full object-cover" fetchPriority="high" src={image} />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-foreground/70 to-transparent" />
        </>
      )}
      <Container className="grid justify-items-start gap-(--spacer-medium) py-(--spacer-large) md:py-(--spacer-xlarge)">
        <h1 className="font-display font-semibold text-(length:--heading-hero) tracking-tight">{title}</h1>
        {links.length > 0 && (
          <nav aria-label="On this page">
            <ul className="flex flex-wrap gap-(--spacer-small)">
              {links.map((link: BlockLink) => (
                <li key={`${link.href}-${link.label}`}>
                  <BlockAnchor className={PILL} href={link.href}>
                    {link.label}
                    <ArrowIcon />
                  </BlockAnchor>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </Container>
    </header>
  );
}

function Stats({block}: {block: Of<'stats'>}) {
  return (
    <Container className="py-(--padding-section-medium)">
      <ul className="grid gap-(--spacer-small) md:grid-cols-3">
        {block.items.map((item, i) => (
          <li
            className="grid gap-(--spacer-large) rounded-lg bg-(--color-brand-primary) p-(--spacer-regular) text-(--color-text-dark)"
            key={`${i}-${item.value}-${item.label}`}
          >
            <p className="flex items-baseline font-semibold leading-none tracking-tight">
              <span className="text-(length:--heading-display)">{item.value}</span>
              {item.unit && <span className="text-(length:--heading-h1)">{item.unit}</span>}
            </p>
            <p className="text-ds-small">{item.label}</p>
          </li>
        ))}
      </ul>
    </Container>
  );
}

function Band({block}: {block: Of<'band'>}) {
  return (
    <div className="scroll-mt-24 bg-(--color-bg-warm) py-(--padding-section-medium) text-center" id={block.id}>
      <Container className="grid max-w-3xl justify-items-center gap-(--spacer-medium)">
        <h2 className="font-display font-semibold text-(length:--heading-hero) tracking-tight">{block.title}</h2>
        <p className="font-medium text-ds-regular">{block.text}</p>
        {block.links.length > 0 && (
          <ul className="flex flex-wrap justify-center gap-(--spacer-small)">
            {block.links.map((link, i) => (
              <li key={`${link.href}-${link.label}`}>
                <BlockAnchor
                  className={cn(PILL, i === 0 && 'bg-foreground text-background')}
                  href={link.href}
                >
                  {link.label}
                  <ArrowIcon />
                </BlockAnchor>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  );
}

function Split({block}: {block: Of<'split'>}) {
  const {button, eyebrow, id, image, imageSide, text, title} = block;
  return (
    <Container className="max-w-5xl scroll-mt-24 py-(--padding-section-medium)" id={id}>
      {eyebrow && (
        <h2 className="mb-(--spacer-medium) font-display font-semibold text-(length:--heading-h2) tracking-tight">
          {eyebrow}
        </h2>
      )}
      <div className={cn('grid items-center gap-(--spacer-large)', image && 'md:grid-cols-2')}>
        {image && (
          <div className={cn('relative aspect-4/3 overflow-hidden rounded-lg', imageSide === 'right' && 'md:order-2')}>
            <img alt="" className="absolute inset-0 size-full object-cover" loading="lazy" src={image} />
          </div>
        )}
        <div className="grid justify-items-start gap-(--spacer-small)">
          {eyebrow ? (
            <h3 className="font-semibold text-(length:--heading-h3)">{title}</h3>
          ) : (
            <h2 className="font-semibold text-(length:--heading-h3)">{title}</h2>
          )}
          <p className="text-muted-foreground text-ds-regular leading-6">{text}</p>
          {button && (
            <BlockAnchor
              className="mt-(--spacer-small) bg-foreground px-6 py-3 font-medium text-background text-ds-small"
              href={button.href}
            >
              {button.label}
            </BlockAnchor>
          )}
        </div>
      </div>
    </Container>
  );
}

function CardBody({item, variant}: {item: CardItem; variant: CardVariant}) {
  const img = (className: string, frame: string) =>
    item.image ? (
      <div className={frame}>
        <img alt={variant === 'logo' ? item.title : ''} className={className} loading="lazy" src={item.image} />
      </div>
    ) : null;
  switch (variant) {
    case 'article':
      return (
        <article className="grid h-full content-start overflow-hidden rounded-lg bg-(--color-bg-secondary) shadow-(--shadow-drop-xs)">
          {img('size-full object-cover', 'aspect-16/10 overflow-hidden')}
          <div className="grid gap-1 p-(--spacer-small)">
            {item.subtitle && <p className="text-muted-foreground text-ds-tiny">{item.subtitle}</p>}
            <h3 className="line-clamp-2 font-semibold text-ds-small">{item.title}</h3>
          </div>
        </article>
      );
    case 'press':
      return (
        <article className="grid h-full content-start justify-items-center gap-(--spacer-small) rounded-lg bg-(--color-bg-secondary) p-(--spacer-regular) text-center shadow-(--shadow-drop-xs)">
          {img('size-full object-contain', 'h-16 w-40')}
          <h3 className="line-clamp-3 font-medium text-ds-small">“{item.title}”</h3>
          {item.subtitle && <p className="text-muted-foreground text-ds-tiny">{item.subtitle}</p>}
        </article>
      );
    case 'person':
      return (
        <article className="grid h-full content-start gap-(--spacer-xsmall)">
          {img('size-full object-cover grayscale', 'aspect-448/360 overflow-hidden rounded-lg')}
          <h3 className="mt-(--spacer-xsmall) font-medium text-ds-small">{item.title}</h3>
          {item.subtitle && <p className="text-muted-foreground text-ds-tiny">{item.subtitle}</p>}
        </article>
      );
    case 'logo':
      return (
        <article className="grid h-full place-items-center rounded-lg bg-(--color-bg-secondary) p-(--spacer-regular) shadow-(--shadow-drop-xs)">
          {item.image ? (
            img('size-full object-contain', 'aspect-2/1 w-full')
          ) : (
            <h3 className="font-semibold text-ds-regular">{item.title}</h3>
          )}
        </article>
      );
  }
}

function Cards({block}: {block: Of<'cards'>}) {
  return (
    <Container className="max-w-5xl">
      <CardRow
        id={block.id ?? `cards-${block.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        itemLabel="items"
        subtitle={block.subtitle}
        title={block.title}
      >
        {block.items.map((item, i) =>
          item.href ? (
            <BlockAnchor className="block h-full w-full transition-opacity hover:opacity-80" href={item.href} key={i}>
              <CardBody item={item} variant={block.variant} />
            </BlockAnchor>
          ) : (
            <CardBody item={item} key={i} variant={block.variant} />
          ),
        )}
      </CardRow>
    </Container>
  );
}

export function PageBlocks({blocks}: {blocks: PageBlock[]}) {
  return (
    <Page className="pt-0">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case 'hero':
            return <Hero block={block} key={key} />;
          case 'text':
            return (
              <Container className="max-w-3xl py-(--padding-section-medium)" key={key}>
                <ArticleBody products={{}} segments={parseBody(block.html)} />
              </Container>
            );
          case 'body':
            return (
              <Container className="max-w-3xl py-(--padding-section-medium)" key={key}>
                <ArticleBody products={{}} segments={block.segments} />
              </Container>
            );
          case 'stats':
            return <Stats block={block} key={key} />;
          case 'band':
            return <Band block={block} key={key} />;
          case 'split':
            return <Split block={block} key={key} />;
          case 'cards':
            return <Cards block={block} key={key} />;
        }
      })}
    </Page>
  );
}

