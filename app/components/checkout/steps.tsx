const STEPS = ['Cart', 'Address', 'Payment'] as const;

export function CheckoutSteps({current}: {current: (typeof STEPS)[number]}) {
  const at = STEPS.indexOf(current);
  return (
    <ol className="mb-8 flex items-center gap-3 text-sm">
      {STEPS.map((s, i) => (
        <li key={s} className={i <= at ? 'font-semibold text-black' : 'text-neutral-400'}>
          {i + 1}. {s}{i < STEPS.length - 1 ? <span className="ml-3 text-neutral-300">›</span> : null}
        </li>
      ))}
    </ol>
  );
}
