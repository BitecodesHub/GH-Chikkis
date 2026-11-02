/**
 * Every public page is rendered on the server, so a navbar click can take a
 * second or two. Without this boundary the screen simply sits there showing the
 * page the visitor already left; with it, the click answers at once.
 */
export default function SiteLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="border-b border-line">
        <div className="container-page py-14 md:py-20">
          <div className="skeleton h-3 w-28" />
          <div className="skeleton mt-6 h-10 w-full max-w-xl" />
          <div className="skeleton mt-5 h-4 w-full max-w-md" />
        </div>
      </div>

      <div className="container-page space-y-4 py-14 md:py-20">
        <div className="skeleton h-4 w-full max-w-2xl" />
        <div className="skeleton h-4 w-full max-w-3xl" />
        <div className="skeleton h-4 w-2/3" />
        <div className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton h-40 rounded-3xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
