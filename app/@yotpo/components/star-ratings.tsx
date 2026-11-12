import type React from 'react';
// Path: app/@yotpo/components/star-ratings.tsx
// Presentational: the route loader fetches the summary and passes it in.
// Renders nothing when the summary is null (Yotpo unavailable).
// The whole badge links to the reviews section (default #reviews).

import type {YotpoRatingSummary} from '../types';
import {StarRow} from './star';

// Jump to the reviews without a router navigation. A plain "#reviews" link changes the URL hash,
// which the router treats as a navigation and then restores the old scroll position (the
// "first click snaps back, second click works" bug). This scrolls and sets the hash quietly.
function jumpTo(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (!href.startsWith('#') || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const el = document.getElementById(href.slice(1));
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({behavior: 'smooth', block: 'start'});
  window.history.replaceState(window.history.state, '', href);
}

export function StarRating({
  summary,
  href = '#reviews',
  compact = false,
}: {
  summary: YotpoRatingSummary | null;
  href?: string;
  /** Back Market style: small stars, "4.6/5", "(58 reviews)". */
  compact?: boolean;
}) {
  if (!summary) return null;

  const {averageScore, totalReviews} = summary;

  if (totalReviews === 0) {
    return (
      <a
        href={href}
        onClick={(e) => jumpTo(e, href)}
        className="inline-flex items-center font-sans text-sm font-bold text-black underline-offset-2 transition-opacity hover:opacity-70"
      >
        Write a review
      </a>
    );
  }

  const label = `${Number(averageScore.toFixed(1))} out of 5 stars, ${totalReviews} ${
    totalReviews === 1 ? 'review' : 'reviews'
  }. Jump to reviews`;

  if (compact) {
    return (
      <a href={href}
        onClick={(e) => jumpTo(e, href)} aria-label={label} className="inline-flex items-center gap-2 text-sm text-black">
        <StarRow score={averageScore} label="" starClassName="h-4 w-4" color="#000" />
        <span className="font-semibold">{Number(averageScore.toFixed(1))}/5</span>
        <span className="underline underline-offset-2">
          ({totalReviews.toLocaleString('en-US')} {totalReviews === 1 ? 'review' : 'reviews'})
        </span>
      </a>
    );
  }

  return (
    <a
      href={href}
        onClick={(e) => jumpTo(e, href)}
      aria-label={label}
      className="inline-flex items-center gap-2.5 font-sans hover:opacity-80"
    >
      <StarRow score={averageScore} label="" starClassName="h-5 w-5" color="#000" />
      <span className="text-base font-bold text-black">{averageScore.toFixed(1)}</span>
      <span className="h-4 w-px bg-neutral-400" />
      <span className="text-base font-bold text-black underline-offset-2 transition-opacity hover:opacity-70">
        {totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'}
      </span>
    </a>
  );
}
