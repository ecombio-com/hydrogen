import {useEffect} from 'react';
import {useAnalytics} from '@shopify/hydrogen';
import {startGa4} from '~/lib/analytics/ga4';

export function Ga4Tag({id, nonce}: {id?: string; nonce?: string}) {
  if (!id) return null;
  return (
    <>
      <script
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
gtag('js',new Date());
gtag('config','${id}',{send_page_view:false});`,
        }}
      />
      <script
        nonce={nonce}
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
      />
    </>
  );
}

export function Ga4Subscriber() {
  const {subscribe, register} = useAnalytics();
  const {ready} = register('Ga4');

  useEffect(() => {
    const stop = startGa4(subscribe as any);
    ready();
    return stop;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
