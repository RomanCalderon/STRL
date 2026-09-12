const pulse =
  "animate-pulse motion-reduce:animate-none bg-[color-mix(in_srgb,var(--ink)_8%,var(--paper))]";

export function OverlayFallback() {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 p-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading overlay"
    >
      <div className="mx-auto max-w-lg rounded-2xl bg-[var(--paper)] p-4 shadow-xl">
        <div className={`h-6 w-32 rounded ${pulse}`} />
        <div className={`mt-4 h-10 w-full rounded-full ${pulse}`} />
        <div className={`mt-3 h-4 w-2/3 rounded ${pulse}`} />
      </div>
    </div>
  );
}
