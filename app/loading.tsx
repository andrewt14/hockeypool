// Prefetched, so tapping a tab or team shows this instantly while the page's data loads.
export default function Loading() {
  return (
    <div aria-busy className="animate-pulse px-4 pt-6" role="status" aria-label="Loading">
      <div className="h-3 w-24 rounded bg-panel" />
      <div className="mt-2 mb-5 h-8 w-44 rounded bg-panel" />
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-20 rounded-2xl border border-line bg-card" />
        ))}
      </div>
    </div>
  );
}
