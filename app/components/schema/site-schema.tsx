import {useRouteLoaderData} from 'react-router';

const SOCIAL_PROFILES: string[] = [];
const PARENT_LEGAL_NAME = 'Ecombio, Inc.';

type SchemaBrand = {name: string; slug: string};
const ECOMBIO: SchemaBrand = {name: 'Ecombio', slug: 'ecombio'};

export function buildSiteSchema(
  origin: string,
  searchUrl = `${origin}/search`,
  brand: SchemaBrand = ECOMBIO,
) {
  const isParent = brand.slug === 'ecombio';
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${origin}/#organization`,
      name: brand.name,
      ...(isParent
        ? {
            legalName: PARENT_LEGAL_NAME,
            description:
              'Ecombio, Inc. is an American multinational e-commerce company focusing on the micro-mobility market. Our catalog is comprised of electric bikes, electric scooters and electric skateboards from top brands, with free shipping and a 1-year warranty.',
          }
        : {
            description: `${brand.name} is a brand of ${PARENT_LEGAL_NAME}.`,
            parentOrganization: {'@type': 'Organization', name: PARENT_LEGAL_NAME},
          }),
      url: origin,
      logo: `${origin}/og-default.png`,
      address: {
        '@type': 'PostalAddress',
        streetAddress: '9702 Bolsa Ave',
        addressLocality: 'Westminster',
        addressRegion: 'CA',
        postalCode: '92683',
        addressCountry: 'US',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: '+1-657-364-9088',
        email: 'support@ecombio.com',
        areaServed: 'US',
        availableLanguage: 'English',
      },
      ...(SOCIAL_PROFILES.length > 0 ? {sameAs: SOCIAL_PROFILES} : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: brand.name,
      alternateName: [`${brand.name}.com`],
      url: origin,
      publisher: {'@id': `${origin}/#organization`},
      inLanguage: 'en-US',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${searchUrl}?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}

export function SiteSchema({origin, searchUrl}: {origin: string; searchUrl?: string}) {
  const root = useRouteLoaderData('root') as {brand?: string; brandName?: string} | undefined;
  const brand: SchemaBrand =
    root?.brand && root?.brandName ? {slug: root.brand, name: root.brandName} : ECOMBIO;
  return (
    <>
      {buildSiteSchema(origin, searchUrl, brand).map((schema) => (
        <script key={schema['@type']} type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}} />
      ))}
    </>
  );
}