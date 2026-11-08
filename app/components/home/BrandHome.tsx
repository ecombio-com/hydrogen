import {Container} from '~/components/ui/container';
import LocalizedLink from '~/components/ui/localized-link';
import {InfiniteProductGrid} from '~/components/collections/infinite-product-grid';

type BrandHomeContent = {
  title: string;
  description: string;
  heading: string;
  intro: string;
  cta: string;
  collection: string;
  productsHeading: string;
  gradient: string;
};

export const BRAND_HOME: Record<string, BrandHomeContent> = {
  scooterbio: {
    title: 'ScooterBio | Electric scooters for every ride',
    description: 'Shop electric scooters for commuting, weekends and long range, with free standard shipping and free 30-day returns.',
    heading: 'Find the scooter that fits your ride',
    intro: 'Electric scooters for commuting, weekends and everything in between.',
    cta: 'Shop scooters',
    collection: 'scooterbio-all',
    productsHeading: 'Electric scooters',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #1e3a8a 100%)',
  },
  skaterbio: {
    title: 'SkaterBio | Electric skateboards and Onewheels',
    description: 'Shop electric skateboards and Onewheel boards for cruising, carving and commuting, with free standard shipping and free 30-day returns.',
    heading: 'Find the board that fits your ride',
    intro: 'Electric skateboards and Onewheel boards for cruising, carving and commuting.',
    cta: 'Shop boards',
    collection: 'skaterbio-all',
    productsHeading: 'Electric skateboards and Onewheels',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #7c2d12 100%)',
  },
};

const TRUST = ['1-year warranty', 'Free standard shipping', 'Free 30-day returns', 'Friendly support'];

export function BrandHome({slug, products, pageInfo}: {slug: string; products: any[]; pageInfo: any}) {
  const c = BRAND_HOME[slug] ?? BRAND_HOME.scooterbio;
  const shopHref = '/collections/' + c.collection;
  return (
    <div className="bg-background text-foreground">
      <section className="relative flex min-h-[85vh] items-end bg-neutral-900 text-white" style={{backgroundImage: c.gradient}}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" aria-hidden="true" />
        <Container className="relative pb-12 md:pb-16">
          <h1 className="max-w-2xl text-4xl font-extrabold uppercase leading-none tracking-tight md:text-6xl">{c.heading}</h1>
          <p className="mt-4 max-w-lg text-base font-medium md:text-lg">{c.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LocalizedLink href={shopHref} className="bg-white px-6 py-3 text-sm font-semibold text-black hover:opacity-90">
              {c.cta}
            </LocalizedLink>
          </div>
        </Container>
      </section>

      <Container className="space-y-16 py-14 md:py-20">
        <section aria-labelledby="brand-featured">
          <div className="flex items-end justify-between gap-4">
            <h2 id="brand-featured" className="text-2xl font-extrabold uppercase tracking-tight md:text-3xl">{c.productsHeading}</h2>
            <LocalizedLink href={shopHref} className="text-sm font-semibold underline underline-offset-4 hover:opacity-70">Shop all</LocalizedLink>
          </div>
          <div className="mt-6">
            {products.length > 0 ? (
              <InfiniteProductGrid initialProducts={products.slice(0, 8)} initialPageInfo={{...(pageInfo ?? {}), hasNextPage: false}} />
            ) : (
              <p className="text-muted-foreground">Products coming soon.</p>
            )}
          </div>
          <div className="mt-8 flex justify-center">
            <LocalizedLink href={shopHref} className="bg-foreground px-6 py-3 text-sm font-semibold text-background hover:opacity-90">{c.cta}</LocalizedLink>
          </div>
        </section>

        <section aria-label="Service" className="grid gap-4 md:grid-cols-4">
          {TRUST.map((t) => (
            <span key={t} className="bg-muted p-6 text-center text-base font-semibold">{t}</span>
          ))}
        </section>

        <section className="text-center">
          <a href="https://support.ecombio.com" className="text-base font-semibold underline underline-offset-4 hover:opacity-70">Help center</a>
        </section>
      </Container>
    </div>
  );
}