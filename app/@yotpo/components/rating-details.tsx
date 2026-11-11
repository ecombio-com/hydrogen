// Path: app/@yotpo/components/rating-details.tsx
// Sub-ratings (e.g. Battery 4.1/5) with a "See more" toggle. Renders nothing without items.

import {useState} from 'react';

export type SubRating = {label: string; score: number};

export function RatingDetails({items, initialCount = 3}: {items: SubRating[]; initialCount?: number}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  const shown = open ? items : items.slice(0, initialCount);
  return (
    <div className="mt-4">
      <h3 className="text-sm font-bold text-black">Rating details</h3>
      <ul className="mt-2 space-y-1">
        {shown.map((item) => (
          <li key={item.label} className="flex justify-between text-xs text-black">
            <span>{item.label}</span>
            <span className="font-bold">{item.score.toFixed(1)}/5</span>
          </li>
        ))}
      </ul>
      {items.length > initialCount ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="mt-3 w-full rounded-lg border border-neutral-300 py-2 text-xs font-semibold text-black"
        >
          {open ? 'See less' : 'See more'}
        </button>
      ) : null}
    </div>
  );
}