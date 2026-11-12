import type {ReactNode} from 'react';
import {ChevronDownIcon} from '~/components/ui/icons';
import type {Faq} from '~/lib/pdp-schema';
import {parseAccordions} from '~/lib/product';

// Source order: custom.faq (JSON) first; the old FAQ page (custom.frequently_asked_questions) as fallback.
export function FrequentlyAskedQuestionsSection({html, faq}: {html: string | null; faq?: Faq | null}) {
  const jsonItems = faq?.items ?? [];
  const pageItems = jsonItems.length ? [] : html ? parseAccordions(html) : [];
  const source = jsonItems.length ? 'json' : html ? 'page' : 'none';
  return (
    <section data-slot="frequently-asked-questions" data-source={source}>
      <h2 className="text-ds-h3 font-semibold">Frequently Asked Questions</h2>
      <div className="mt-5">
        {jsonItems.length > 0 ? (
          <div className="divide-y border-y">
            {jsonItems.map((item) => (
              <FaqRow key={item.q} question={item.q}>
                {item.a.split(/\n\s*\n/).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </FaqRow>
            ))}
          </div>
        ) : pageItems.length > 0 ? (
          <div className="divide-y border-y">
            {pageItems.map((item) => (
              <FaqRow key={item.question} question={item.question} html={item.answer} />
            ))}
          </div>
        ) : html ? (
          <div
            className="prose prose-sm max-w-none text-foreground/80"
            dangerouslySetInnerHTML={{__html: html}}
          />
        ) : (
          <p className="text-ds-regular text-foreground/60">
            Frequently asked questions aren't available for this product yet.
          </p>
        )}
      </div>
    </section>
  );
}

function FaqRow({question, html, children}: {question: string; html?: string; children?: ReactNode}) {
  return (
    <details className="group py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-ds-regular font-medium [&::-webkit-details-marker]:hidden">
        {question}
        <ChevronDownIcon
          aria-hidden="true"
          className="size-6 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      {html !== undefined ? (
        <div
          className="prose prose-sm mt-3 max-w-none text-foreground/80"
          dangerouslySetInnerHTML={{__html: html}}
        />
      ) : (
        <div className="prose prose-sm mt-3 max-w-none text-foreground/80">{children}</div>
      )}
    </details>
  );
}