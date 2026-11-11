// Path: app/@yotpo/components/review-footer.tsx
// Variant / condition / purchase-date strip under a review. Renders nothing without data.

type ReviewFooterProps = {
  variantTitle?: string | null;
  condition?: string | null;
  purchasedAt?: string | null;
  thumbUrl?: string | null;
};

export function ReviewFooter({variantTitle, condition, purchasedAt, thumbUrl}: ReviewFooterProps) {
  if (!variantTitle && !condition && !purchasedAt) return null;
  return (
    <div className="mt-4 flex items-center gap-3 rounded-lg border border-neutral-300 px-3 py-2 text-xs text-black">
      {thumbUrl ? (
        <img src={thumbUrl} alt="" loading="lazy" className="size-8 shrink-0 rounded object-cover" />
      ) : null}
      <div className="min-w-0">
        {variantTitle ? <p className="truncate font-semibold">{variantTitle}</p> : null}
        <p className="text-neutral-600">
          {condition ? (
            <>
              Condition <span className="font-semibold text-black">{condition}</span>
            </>
          ) : null}
          {condition && purchasedAt ? <span className="mx-1.5">·</span> : null}
          {purchasedAt ? <>Purchased {purchasedAt}</> : null}
        </p>
      </div>
    </div>
  );
}