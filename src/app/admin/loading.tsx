/**
 * Every workspace screen is rendered on the server, so a menu click leaves the
 * old page on screen until the new one is ready. This is the shape of a normal
 * screen — heading, numbers, list — so the click answers at once and the real
 * numbers arrive in the same places.
 */
export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="skeleton h-3 w-24" />
          <div className="skeleton mt-3 h-8 w-64 max-w-full" />
          <div className="skeleton mt-3 h-4 w-80 max-w-full" />
        </div>
        <div className="skeleton h-9 w-32 rounded-full" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="surface p-5">
            <div className="skeleton h-3 w-28" />
            <div className="skeleton mt-5 h-7 w-24" />
            <div className="skeleton mt-3 h-3 w-36 max-w-full" />
          </div>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <div className="surface lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-3 w-16" />
          </div>
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center gap-4 px-5 py-4">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton ml-auto h-4 w-20" />
              <div className="skeleton h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="surface">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-3 w-16" />
          </div>
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-2 px-5 py-4">
              <div className="skeleton h-4 w-48 max-w-full" />
              <div className="skeleton h-3 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
