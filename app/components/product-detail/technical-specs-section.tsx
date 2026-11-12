import {Fragment} from 'react';
import {ChevronDownIcon} from '~/components/ui/icons';
import type {Specs} from '~/lib/pdp-schema';

// Source order: custom.specs (JSON) first; the old spec page (custom.technical_specifications) as fallback.
// The JSON path renders the same markup and classes as the old page body, so it looks the same.
export function TechnicalSpecsSection({
  html,
  specs,
  title,
}: {
  html: string | null;
  specs?: Specs | null;
  title?: string;
}) {
  if (!specs && !html) return null;
  return (
    <details open id="technical-specifications" className="group scroll-mt-24" data-slot="technical-specifications" data-source={specs ? 'json' : 'page'}>
      <summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
        <h2 className="text-ds-h3 font-semibold">Technical Specifications</h2>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-6 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-5">
        {specs ? (
          <div className="ds-specs">
            {specs.summary.length > 0 ? (
              <ul className="ds-specs-tiles">
                {specs.summary.map((tile, i) => (
                  <li key={i}>
                    <b>{tile.value}</b>
                    <span>{tile.label}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {title ? <p className="ds-specs-muted">{title}</p> : null}
            {specs.groups.map((group, gi) => (
              <Fragment key={gi}>
                {group.title ? <h3>{group.title}</h3> : null}
                <dl>
                  {group.rows.map((row, ri) => (
                    <div key={ri}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </Fragment>
            ))}
          </div>
        ) : (
          <div className="ds-specs" dangerouslySetInnerHTML={{__html: html ?? ''}} />
        )}
      </div>
    </details>
  );
}