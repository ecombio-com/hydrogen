// Path: app/routes/($locale)._index.tsx
import {useLoaderData} from 'react-router';
import type {Route} from './+types/($locale)._index';
import {CategoryCarousel} from '~/components/home/category-carousel';
import {FeatureSplit} from '~/components/home/feature-split';
import {Hero} from '~/components/home/hero';
import {VideoFeature} from '~/components/home/video-feature';
import {HomeShowcaseTabs} from '~/components/home/home-showcase-tabs';
import {NewsletterSection} from '~/components/home/newsletter-section';
import {PopularCategories} from '~/components/home/popular-categories';
import {StudyCarousel} from '~/components/home/study-carousel';
import {VideoCarousel} from '~/components/home/video-carousel';
import {Container} from '~/components/ui/container';
import {Page} from '~/components/ui/page';
import {Sections} from '~/components/ui/sections';
import {buildMeta} from '~/lib/blog';
import {getUrls} from '~/lib/blog.server';
import {BicycleBioHome} from '~/components/home/BicycleBioHome';
import {getStorefrontConfig} from '~/lib/storefront-config';
import CollectionRoute, {loader as collectionLoader} from './($locale).collections.$handle';
import {communityStories, heroSlides, shopCategories} from '~/lib/home';
import {getShowcaseSection} from '~/lib/home-showcase.server';
import {
  getHomeCategorySections,
  getHomeCmsContent,
  getHomeShopCategories,
  getHomeShowcaseContent,
  getHomeVideo,
  type ReviewLike,
} from '~/lib/home.server';

const TITLE = 'Home | Ecombio';
const BB_TITLE = 'BicycleBio | Electric bikes by rider, class and brand';
const BB_DESCRIPTION = 'Find the e-bike that fits your ride. Shop by rider, class and power, or brand, with guides that explain the rest.';
const DESCRIPTION =
  'Shop electric bikes, scooters and skateboards from top brands, with free shipping and a 1-year warranty.';

export const meta: Route.MetaFunction = ({data}) =>
  (data as any)?.isBrandHome
    ? buildMeta({description: (data as any)?.collection?.description ?? '', title: (data as any)?.collection?.title ?? '', url: '/'})
    :
  data?.isBicycleBio
    ? buildMeta({description: BB_DESCRIPTION, title: BB_TITLE, url: data.canonicalUrl ?? '/'})
    : buildMeta({description: DESCRIPTION, title: TITLE, url: data?.canonicalUrl ?? '/'});

export async function loader(args: Route.LoaderArgs) {
  const {context, request} = args;
  const {storefront, yotpo} = context;
  const homeCollection = getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID).homeCollectionHandle;
  if (homeCollection) {
    const res: any = await collectionLoader({...args, params: {...args.params, handle: homeCollection}} as any);
    const payload = res && typeof res === 'object' && 'data' in res && 'init' in res ? res.data : res;
    return {...payload, isBrandHome: true} as any;
  }
  if (getStorefrontConfig(context.env.PUBLIC_STOREFRONT_ID).brand === 'bicyclebio') {
    const canonical = getUrls(request).canonical;
    return {
      isBicycleBio: true,
      canonicalUrl: canonical,
      homeVideo: null,
      categorySections: [],
      shopCategories: [],
      showcase: null,
      slides: [],
      stories: [],
      studies: [],
    };
  }
  const [cms, showcaseContent, categorySections, shopCategoryItems, homeVideo] = await Promise.all([
    getHomeCmsContent(storefront, {
      getReviews: (id) =>
        yotpo.getProductReviews(id) as unknown as Promise<{reviews: ReviewLike[]} | null>,
    }),
    getHomeShowcaseContent(storefront),
    getHomeCategorySections(storefront),
    getHomeShopCategories(storefront),
    getHomeVideo(storefront),
  ]);
  const showcase = await getShowcaseSection(storefront, showcaseContent, yotpo);
  return {
    isBicycleBio: false,
    canonicalUrl: getUrls(request).canonical,
    homeVideo,
    categorySections,
    shopCategories: shopCategoryItems.length > 0 ? shopCategoryItems : shopCategories,
    showcase,
    slides: cms.slides ?? heroSlides,
    stories: cms.stories ?? communityStories,
    // Drop article bodies: the cards only need title, image, excerpt and date.
    studies: (cms.studies ?? []).map((article) => ({...article, body: undefined})),
  };
}

export default function HomeRoute() {
  const data = useLoaderData<typeof loader>();
  if ((data as any).isBrandHome) return <CollectionRoute {...({loaderData: data} as any)} />;
  return data.isBicycleBio ? <BicycleBioHome /> : <EcombioHome />;
}

function EcombioHome() {
  const {categorySections, shopCategories: categories, homeVideo, showcase, slides, stories, studies} =
    useLoaderData<typeof loader>();
  return (
    <Page className="pt-0">
      <Sections>
        <Hero slides={slides} />

        <Container>
          <CategoryCarousel title="Shop by category" items={categories} />
        </Container>

        {showcase ? (
          <Container>
            <HomeShowcaseTabs
              title={showcase.title}
              subtitle={showcase.subtitle}
              tabs={showcase.tabs}
              initialProducts={showcase.initialProducts}
            />
          </Container>
        ) : null}

        {categorySections.map((section: any) => (
          <Container key={section.id}>
            <PopularCategories title={section.title} subtitle={section.subtitle} items={section.items} />
          </Container>
        ))}

        <Container>
          <VideoCarousel title="Community stories" items={stories} />
        </Container>

        <Container>
          <StudyCarousel title="Guides and articles" items={studies} />
        </Container>

        <Container>
          <NewsletterSection privacyHref="/policies/privacy-policy" />
        </Container>

        <Container>
          <div className="flex flex-col gap-ds-large md:gap-ds-xxlarge">
            <FeatureSplit
              title="Trade in your old ride"
              description="Get credit toward your next e-bike when you trade in the one you are not using."
              ctaLabel="Get started"
              href="/pages/trade-in"
              imageSide="left"
              background="transparent"
              image={{
                src: 'https://cdn.shopify.com/s/files/1/0726/0641/7110/files/site-home-trade-in.webp?v=1791494937',
                alt: 'Cash falling from the sky',
              }}
            />
            <FeatureSplit
              title="We are B-Corp certified"
              description="Being a B-Corp means we hold ourselves to high standards, from our environmental impact to our hiring practices."
              ctaLabel="Read more"
              href="/pages/our-impact"
              imageSide="right"
              background="transparent"
              image={{
                src: 'https://cdn.shopify.com/s/files/1/0726/0641/7110/files/site-home-b-corp.webp?v=1791494934',
                alt: 'Certified B Corporation',
              }}
            />
            {homeVideo ? (
              <VideoFeature
                title={homeVideo.title}
                description={homeVideo.description}
                videoUrl={homeVideo.videoUrl}
                videoTitle={homeVideo.title}
              />
            ) : null}
          </div>
        </Container>
      </Sections>
    </Page>
  );
}
