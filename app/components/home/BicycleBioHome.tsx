import {Container} from '~/components/ui/container';
import LocalizedLink from '~/components/ui/localized-link';

// Set to a hero image URL (CDN or /public path) when you have one. Empty = dark gradient.
const HERO_IMAGE = '';

const RIDERS = [
  {label: 'Seniors', url: '/collections/electric-bikes-for-seniors', blurb: 'Low step-through, easy to mount'},
  {label: 'Heavy riders', url: '/collections/electric-bikes-for-heavy-riders', blurb: 'Higher load ratings, strong frames'},
  {label: 'Tall riders', url: '/collections/electric-bikes-for-tall-riders', blurb: 'Longer frames and seat posts'},
  {label: 'Family', url: '/collections/family-electric-bikes', blurb: 'Cargo and kid-ready bikes'},
];

const CLASSES = [
  {label: 'Class 1', url: '/collections/class-1-electric-bikes'},
  {label: 'Class 2', url: '/collections/class-2-electric-bikes'},
  {label: 'Class 3', url: '/collections/class-3-electric-bikes'},
  {label: '750W', url: '/collections/750w-electric-bikes'},
  {label: 'Long range', url: '/collections/long-range-electric-bikes'},
];

const BRANDS = [
  {label: 'Aventon', url: '/collections/aventon'},
  {label: 'Lectric', url: '/collections/lectric-ebikes'},
];

const GUIDES = [
  {label: 'The best e-bike guide', url: '/blogs/electric-bikes/best-electric-bike-guide'},
  {label: 'Class 1 vs 2 vs 3, explained', url: '/blogs/electric-bikes/class-1-vs-class-2-vs-class-3-e-bikes-explained'},
  {label: 'E-bike laws and where you can ride', url: '/blogs/electric-bikes/e-bike-laws-and-where-you-can-ride'},
  {label: 'Choosing a commuter e-bike', url: '/blogs/electric-bikes/how-to-choose-the-right-electric-bike-for-commuting'},
];

const TRUST = [
  {label: 'Trade in your old ride', url: '/pages/trade-in'},
  {label: 'Pay over time', url: '/pages/financing'},
  {label: 'Help center', url: '/pages/help-center'},
];

export function BicycleBioHome() {
  return (
    <div className="bg-background text-foreground">
      {/* Full-bleed hero: the header floats transparent over this */}
      <section
        className="relative flex min-h-[85vh] items-end bg-neutral-900 text-white"
        style={HERO_IMAGE ? {backgroundImage: `url(${HERO_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center'} : {backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #14532d 100%)'}}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" aria-hidden="true" />
        <Container className="relative pb-12 md:pb-16">
          <h1 className="max-w-2xl text-4xl font-extrabold uppercase leading-none tracking-tight md:text-6xl">
            Find the e-bike that fits your ride
          </h1>
          <p className="mt-4 max-w-lg text-base font-medium md:text-lg">
            Shop by rider, class and power, or brand, with guides that explain the rest.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LocalizedLink href="/collections/electric-bikes" className="bg-white px-6 py-3 text-sm font-semibold text-black hover:opacity-90">
              Shop e-bikes
            </LocalizedLink>
            <LocalizedLink href="/blogs/electric-bikes/best-electric-bike-guide" className="border border-white px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Read the buying guide
            </LocalizedLink>
          </div>
        </Container>
      </section>

      <Container className="space-y-16 py-14 md:py-20">
        <section aria-labelledby="bb-rider">
          <h2 id="bb-rider" className="text-2xl font-extrabold uppercase tracking-tight md:text-3xl">Shop by rider</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {RIDERS.map((r) => (
              <LocalizedLink key={r.url} href={r.url} className="group flex min-h-40 flex-col justify-end bg-muted p-5 hover:opacity-90">
                <span className="text-lg font-semibold">{r.label}</span>
                <span className="mt-1 text-sm text-muted-foreground">{r.blurb}</span>
              </LocalizedLink>
            ))}
          </div>
        </section>

        <section aria-labelledby="bb-class">
          <h2 id="bb-class" className="text-2xl font-extrabold uppercase tracking-tight md:text-3xl">Class and power</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {CLASSES.map((c) => (
              <LocalizedLink key={c.url} href={c.url} className="rounded-full bg-muted px-5 py-2.5 text-sm font-semibold hover:opacity-80">
                {c.label}
              </LocalizedLink>
            ))}
          </div>
        </section>

        <section aria-labelledby="bb-brands">
          <h2 id="bb-brands" className="text-2xl font-extrabold uppercase tracking-tight md:text-3xl">Brands</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {BRANDS.map((b) => (
              <LocalizedLink key={b.url} href={b.url} className="flex h-28 items-center justify-center bg-muted text-lg font-extrabold uppercase tracking-tight hover:opacity-90">
                {b.label}
              </LocalizedLink>
            ))}
          </div>
        </section>

        <section aria-labelledby="bb-learn">
          <h2 id="bb-learn" className="text-2xl font-extrabold uppercase tracking-tight md:text-3xl">Learn before you buy</h2>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {GUIDES.map((g) => (
              <li key={g.url}>
                <LocalizedLink href={g.url} className="block border-b border-border-subtle py-4 text-lg font-semibold hover:opacity-70">
                  {g.label}
                </LocalizedLink>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Service" className="grid gap-4 md:grid-cols-3">
          {TRUST.map((t) => (
            <LocalizedLink key={t.url} href={t.url} className="bg-muted p-6 text-center text-base font-semibold hover:opacity-90">
              {t.label}
            </LocalizedLink>
          ))}
        </section>
      </Container>
    </div>
  );
}