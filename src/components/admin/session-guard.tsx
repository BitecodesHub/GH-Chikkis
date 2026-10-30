"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const WARN_WINDOW_MS = 2 * 60_000;
const PING_INTERVAL_MS = 4 * 60_000;

export function SessionGuard({ idleExpiresAt }: { idleExpiresAt: string }) {
  const [warning, setWarning] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(2);
  const router = useRouter();
  const expiryRef = useRef(new Date(idleExpiresAt).getTime());
  const lastPingRef = useRef(0);

  useEffect(() => {
    expiryRef.current = new Date(idleExpiresAt).getTime();
  }, [idleExpiresAt]);

  useEffect(() => {
    const signOut = () => {
      router.replace("/login?expired=1");
    };
    const check = () => {
      const msLeft = expiryRef.current - Date.now();
      if (msLeft <= 0) {
        signOut();
        return;
      }
      if (msLeft <= WARN_WINDOW_MS) {
        setWarning(true);
        setRemainingMinutes(Math.max(1, Math.ceil(msLeft / 60_000)));
      }
    };
    const first = window.setTimeout(check, 1_000);
    const interval = window.setInterval(check, 15_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [router]);

  useEffect(() => {
    lastPingRef.current = Date.now();
    const ping = async () => {
      lastPingRef.current = Date.now();
      try {
        const response = await fetch("/api/admin/session/heartbeat", {
          method: "POST",
          headers: { "content-type": "application/json" },
        });
        if (!response.ok) {
          router.replace("/login?expired=1");
          return;
        }
        const data = (await response.json()) as { idleExpiresAt?: string };
        if (data.idleExpiresAt) {
          expiryRef.current = new Date(data.idleExpiresAt).getTime();
          setWarning(false);
        }
      } catch {
        // A dropped connection should not sign anyone out.
      }
    };
    const onActivity = () => {
      if (Date.now() - lastPingRef.current < PING_INTERVAL_MS) return;
      void ping();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") onActivity();
    };
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  const staySignedIn = async () => {
    try {
      const response = await fetch("/api/admin/session/heartbeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!response.ok) {
        router.replace("/login?expired=1");
        return;
      }
      const data = (await response.json()) as { idleExpiresAt?: string };
      if (data.idleExpiresAt) {
        expiryRef.current = new Date(data.idleExpiresAt).getTime();
        lastPingRef.current = Date.now();
        setWarning(false);
      }
    } catch {
      router.replace("/login?expired=1");
    }
  };

  if (!warning) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-lg border border-line-strong bg-paper-raised p-4 shadow-[0_10px_40px_rgba(34,29,22,0.16)] sm:inset-x-auto sm:right-6 sm:bottom-6">
      <div role="alert" aria-live="assertive">
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-brass-ink">
          Still there?
        </p>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink">
          You will be signed out in about {remainingMinutes}{" "}
          {remainingMinutes === 1 ? "minute" : "minutes"} because the workspace
          has been idle.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={staySignedIn} className="btn btn-solid btn-sm">
          Stay signed in
        </button>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="btn btn-outline btn-sm">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
