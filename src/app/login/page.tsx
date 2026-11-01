import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionContext } from "@/lib/auth/session";
import { brandLogoSrc } from "@/lib/brand";
import { Wordmark } from "@/components/site/wordmark";
import { Diamond } from "@/components/ui/diamond";
import { env, googleConfigured } from "@/lib/env";
import { devSignIn, passwordSignIn, startGoogleSignIn } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Private workspace for GH Chikkis.",
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  "not-allowed": "That account is approved but currently deactivated. Ask the Owner.",
  denied: "Sign-in was cancelled.",
  state: "That sign-in link expired. Please try again.",
  "google-off": "Google sign-in is not configured yet.",
  "google-failed": "Google sign-in could not be completed. Please try again.",
  password: "That email and password combination did not match an account.",
  rate: "Too many sign-in attempts. Please wait a few minutes.",
  "dev-off": "Development sign-in is not enabled.",
  "dev-email": "Enter the email of an approved account.",
  "dev-rate": "Too many sign-in attempts. Please wait a few minutes.",
};

const NOTICES: Record<string, string> = {
  "signed-out": "You have been signed out.",
  expired: "You were signed out after a period of inactivity.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSessionContext();
  if (session) redirect("/admin");

  const params = await searchParams;
  const errorKey = typeof params.error === "string" ? params.error : "";
  const noticeKey = typeof params.notice === "string" ? params.notice : "";
  const error = ERRORS[errorKey];
  const notice = NOTICES[noticeKey];
  const logoSrc = brandLogoSrc();

  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-olive-deep px-12 py-12 text-paper lg:flex xl:px-16">
        <Wordmark tone="paper" logoSrc={logoSrc} />
        <div className="relative max-w-md py-16">
          <p className="flex items-center gap-3 text-[0.75rem] font-medium uppercase tracking-[0.16em] text-paper/60">
            <Diamond size="sm" className="border-paper/50" />
            Private workspace
          </p>
          <h1 className="display-l mt-6 text-paper">
            The kitchen,
            <br />
            behind the counter.
          </h1>
          <p className="mt-6 max-w-sm text-[0.9375rem] leading-relaxed text-paper/70">
            Enquiries, orders, invoices and the day-to-day running of GH
            Chikkis — in one place.
          </p>
        </div>
        <p className="text-[0.75rem] tracking-[0.08em] text-paper/45 uppercase">
          Authorised staff only · GH Chikkis, Ahmedabad
        </p>
      </section>

      <section className="flex min-h-dvh flex-col px-6 py-10 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between lg:hidden">
          <Wordmark tone="ink" logoSrc={logoSrc} />
          <Link href="/" className="meta link-underline">
            Back to site
          </Link>
        </div>

        <div className="flex flex-1 items-center py-12">
          <div className="mx-auto w-full max-w-sm">
            <p className="eyebrow">Staff sign in</p>
            <h2 className="display-m mt-4">Welcome back.</h2>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
              Sign in with the email and password the Owner set up for you, or
              with an approved Google account.
            </p>

            {notice ? (
              <p
                role="status"
                className="surface mt-6 rounded-2xl px-4 py-3 text-[0.875rem] leading-relaxed text-ink-soft"
              >
                {notice}
              </p>
            ) : null}
            {error ? (
              <p
                role="alert"
                className="mt-6 rounded-2xl border border-terracotta bg-paper-raised px-4 py-3 text-[0.875rem] leading-relaxed text-ink"
              >
                {error}
              </p>
            ) : null}

            <form action={passwordSignIn} className="mt-8 space-y-4">
              <div>
                <label className="label" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  className="field"
                  autoComplete="username"
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  className="field"
                  autoComplete="current-password"
                  required
                />
              </div>
              <button type="submit" className="btn btn-solid w-full">
                Sign in
              </button>
            </form>

            {googleConfigured ? (
              <>
                <div className="my-7 flex items-center gap-4">
                  <span aria-hidden="true" className="h-px flex-1 bg-line" />
                  <span className="meta uppercase tracking-[0.14em]">or</span>
                  <span aria-hidden="true" className="h-px flex-1 bg-line" />
                </div>
                <form action={startGoogleSignIn}>
                  <button type="submit" className="btn btn-outline w-full">
                    Continue with Google
                  </button>
                </form>
              </>
            ) : (
              <p className="help mt-5">
                Google sign-in is off until{" "}
                <code className="font-mono text-[0.8125rem]">
                  GOOGLE_CLIENT_ID
                </code>{" "}
                and{" "}
                <code className="font-mono text-[0.8125rem]">
                  GOOGLE_CLIENT_SECRET
                </code>{" "}
                are added.
              </p>
            )}

            {env.devAuthEnabled ? (
              <div className="mt-8 rounded-2xl border border-dashed border-line-strong px-4 py-5">
                <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-brass-ink">
                  Local development
                </p>
                <p className="help mt-1">
                  Skip Google and sign in as an approved account. This option
                  never appears in production.
                </p>
                <form action={devSignIn} className="mt-4">
                  <label className="label" htmlFor="dev-email">
                    Account email
                  </label>
                  <input
                    id="dev-email"
                    name="email"
                    type="email"
                    className="field"
                    defaultValue={env.ownerEmail}
                    autoComplete="off"
                    required
                  />
                  <button type="submit" className="btn btn-outline mt-3 w-full">
                    Sign in for development
                  </button>
                </form>
              </div>
            ) : null}

            <p className="mt-8 text-[0.8125rem] leading-relaxed text-ink-muted">
              Access is limited to accounts approved by the Owner. If you need
              access, speak to the Owner directly.
            </p>
            <Link href="/" className="meta link-underline mt-6 inline-block">
              Return to the website
            </Link>
          </div>
        </div>

        <p className="text-[0.75rem] text-ink-muted lg:hidden">
          Authorised staff only · GH Chikkis, Ahmedabad
        </p>
      </section>
    </main>
  );
}
