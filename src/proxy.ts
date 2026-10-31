import { NextResponse, type NextRequest } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

function nonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function contentSecurityPolicy(nonceValue: string): string {
  const scriptSrc = isProduction
    ? `'self' 'nonce-${nonceValue}' 'strict-dynamic' https://www.googletagmanager.com https://challenges.cloudflare.com`
    : `'self' 'nonce-${nonceValue}' 'strict-dynamic' 'unsafe-eval' https://www.googletagmanager.com https://challenges.cloudflare.com`;
  const connectSrc = isProduction
    ? "'self' https://api.cloudinary.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://graph.facebook.com https://oauth2.googleapis.com https://openidconnect.googleapis.com https://challenges.cloudflare.com"
    : "'self' ws: wss: http://localhost:* https://api.cloudinary.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://graph.facebook.com https://oauth2.googleapis.com https://openidconnect.googleapis.com https://challenges.cloudflare.com";
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://www.google-analytics.com https://www.googletagmanager.com",
    `connect-src ${connectSrc}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin/");
  const hasSessionCookie = request.cookies.has("gh_session");

  if (isAdmin && !hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (isAdminApi && !hasSessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nonceValue = nonce();
  const csp = contentSecurityPolicy(nonceValue);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonceValue);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  if (isProduction) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  if (isAdmin || isAdminApi || pathname === "/login") {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
