import Link from "next/link";

export function NotFoundContent() {
  return (
    <section className="container-page py-20 md:py-28">
      <div className="mx-auto max-w-xl text-center">
        <p className="eyebrow mt-6 justify-center">404</p>
        <h1 className="display-l mt-4">This page isn’t on the menu.</h1>
        <p className="lede mt-5">
          The link may be old, or the page may have moved. The chikki is still here.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-solid">
            Back home
          </Link>
          <Link href="/collection" className="btn btn-outline">
            View the collection
          </Link>
          <Link href="/contact#enquiry" className="btn btn-quiet">
            Send an enquiry
          </Link>
        </div>
      </div>
    </section>
  );
}
