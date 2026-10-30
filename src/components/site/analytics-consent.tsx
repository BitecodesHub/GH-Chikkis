"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useSyncExternalStore } from "react";

const STORAGE_KEY = "gh-analytics-consent";
const CHANGE_EVENT = "gh-analytics-consent-change";

type Consent = "granted" | "denied" | "unknown" | null;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getSnapshot(): Consent {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "granted" || stored === "denied" ? stored : "unknown";
}

function getServerSnapshot(): Consent {
  return null;
}

export function AnalyticsConsent({ gaId, nonce }: { gaId: string; nonce?: string }) {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const configured = useRef(false);

  useEffect(() => {
    if (consent !== "granted" || configured.current) return;
    configured.current = true;
    const target = window as unknown as { dataLayer?: unknown[] };
    const dataLayer = (target.dataLayer = target.dataLayer ?? []);
    dataLayer.push(["js", new Date()]);
    dataLayer.push(["config", gaId, { anonymize_ip: true }]);
  }, [consent, gaId]);

  function choose(value: "granted" | "denied") {
    window.localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  if (consent === "granted") {
    return (
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
    );
  }

  if (consent !== "unknown") return null;

  return (
    <div
      role="region"
      aria-label="Analytics cookies"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md border border-line-strong bg-paper-raised p-5 md:right-6 md:left-auto md:mx-0"
    >
      <p className="text-[0.9375rem] font-semibold">Optional analytics</p>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-soft">
        We would like to use Google Analytics to understand how the website is used.
        It loads only if you accept. Read our{" "}
        <Link href="/privacy" className="link-underline">
          privacy policy
        </Link>
        .
      </p>
      <div className="mt-4 flex gap-2">
        <button type="button" className="btn btn-solid btn-sm flex-1" onClick={() => choose("granted")}>
          Accept analytics
        </button>
        <button type="button" className="btn btn-outline btn-sm flex-1" onClick={() => choose("denied")}>
          Decline
        </button>
      </div>
    </div>
  );
}
