"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ProcessArt } from "@/components/site/line-art";
import { cn } from "@/lib/cn";

interface Step {
  title: string;
  body: string;
  note?: string;
}

interface ChapterMedia {
  video?: string;
  poster: string;
}

// The cook chapter plays real footage; the rest keep their illustration until
// a clip arrives. Dropping a `video` here is all a stage needs to become film.
const CHAPTER_MEDIA: Record<number, ChapterMedia> = {
  0: { video: "/process/cook.mp4", poster: "/process/cook-poster.webp" },
};

const RUNWAY = 1.25;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (callback: () => void) => {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
};
const getReduced = () => window.matchMedia(REDUCED_QUERY).matches;
const getReducedServer = () => false;

export function ProcessFilm({ steps }: { steps: Step[] }) {
  const wrapRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const paneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const backdropRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const renderRef = useRef(0);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [started, setStarted] = useState(false);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, getReducedServer);

  const count = steps.length;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || reduced) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!started || reduced || count === 0) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    let raf = 0;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const vh = window.innerHeight;
      const rect = wrap.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const pinned = count * RUNWAY * vh;
      const target = clamp((window.scrollY - top) / pinned, 0, 1) * count;
      renderRef.current += (target - renderRef.current) * 0.12;
      if (Math.abs(target - renderRef.current) < 0.0004) renderRef.current = target;
      const render = renderRef.current;
      const idx = clamp(Math.floor(render), 0, count - 1);
      const local = render - idx;

      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }

      const px = finePointer ? pointer.current.x : 0;
      const py = finePointer ? pointer.current.y : 0;

      for (let i = 0; i < count; i++) {
        const layer = layerRefs.current[i];
        if (layer) {
          layer.style.opacity = i === idx ? "1" : "0";
          layer.style.setProperty("--p", clamp(render - i, 0, 1).toFixed(4));
        }
        const pane = paneRefs.current[i];
        if (pane) {
          pane.style.transform =
            i === idx
              ? `translate3d(${px * 5}px, ${py * 4 + (0.5 - local) * 12}px, 0) scale(${1.04 + local * 0.03})`
              : "";
        }
        const backdrop = backdropRefs.current[i];
        if (backdrop) {
          backdrop.style.transform =
            i === idx ? `translate3d(${px * 16}px, ${py * 12}px, 0) scale(1.14)` : "scale(1.14)";
        }
        const text = textRefs.current[i];
        if (text) {
          const d = render - i;
          const op = clamp(Math.min((d + 0.04) / 0.04, (1 - d) / 0.04), 0, 1);
          const shift = (1 - op) * 24 * (d < 0.5 ? 1 : -1);
          text.style.opacity = String(op);
          text.style.transform = `translateY(${shift}px)`;
        }
      }

      const video = videoRef.current;
      if (video) {
        const onScreen = rect.bottom > -vh * 0.5 && rect.top < vh * 1.5;
        if (idx === 0 && onScreen) {
          if (video.paused) void video.play().catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      }

      if (hintRef.current) hintRef.current.style.opacity = render > 0.06 ? "0" : "1";
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, reduced, count]);

  const jumpTo = (index: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const vh = window.innerHeight;
    const top = wrap.getBoundingClientRect().top + window.scrollY;
    const pinned = count * RUNWAY * vh;
    window.scrollTo({ top: top + ((index + 0.2) / count) * pinned, behavior: "smooth" });
  };

  if (reduced) {
    return (
      <ol className="mx-auto max-w-3xl">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="grid gap-5 border-t border-line py-9 first:border-t-0 first:pt-0 sm:grid-cols-[auto_1fr] sm:gap-8"
          >
            <div className="flex items-center gap-5 sm:flex-col sm:items-start sm:gap-4">
              <span className="meta tabular-nums">0{index + 1}</span>
              {CHAPTER_MEDIA[index] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={CHAPTER_MEDIA[index].poster}
                  alt=""
                  className="w-[6.5rem] shrink-0 rounded-xl object-cover sm:w-[7.75rem]"
                />
              ) : (
                <ProcessArt step={index} className="w-[6.5rem] shrink-0 sm:w-[7.75rem]" />
              )}
            </div>
            <div>
              <h2 className="display-m text-[clamp(1.6rem,3vw,2.2rem)]">{step.title}</h2>
              <p className="mt-3 max-w-xl text-[1.0625rem] leading-relaxed text-ink-soft">{step.body}</p>
              {step.note ? <p className="meta mt-3">{step.note}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <section
      ref={wrapRef}
      aria-label="The handmade process, as a film"
      className="relative"
      style={{ height: `calc(${count * RUNWAY * 100}vh + 100vh)` }}
    >
      <div
        ref={stageRef}
        className="sticky top-0 h-[100dvh] overflow-hidden bg-ink text-paper"
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          pointer.current.x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
          pointer.current.y = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
        }}
      >
        {steps.map((step, index) => {
          const media = CHAPTER_MEDIA[index];
          return (
            <div
              key={step.title}
              ref={(el) => {
                layerRefs.current[index] = el;
              }}
              className="absolute inset-0 opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              aria-hidden="true"
            >
              <div className="absolute inset-0 overflow-hidden">
                <div
                  ref={(el) => {
                    backdropRefs.current[index] = el;
                  }}
                  className="h-full w-full scale-[1.14] will-change-transform"
                >
                  {media ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={media.poster}
                      alt=""
                      className="h-full w-full object-cover blur-2xl brightness-[0.4] saturate-[0.9]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-[radial-gradient(ellipse_at_50%_35%,#3a3325_0%,#221d16_60%,#171310_100%)]" />
                  )}
                </div>
              </div>

              <div
                className={cn(
                  "absolute inset-0 overflow-hidden",
                  media
                    ? "md:inset-auto md:top-1/2 md:right-[7%] md:h-[84vh] md:aspect-[480/854] md:w-auto md:-translate-y-1/2 md:rounded-[1.75rem] md:ring-1 md:ring-brass/30 md:shadow-[0_50px_140px_-50px_rgba(0,0,0,0.9)]"
                    : "grid place-items-center md:inset-auto md:right-[8%] md:top-1/2 md:h-[68vh] md:w-[34vw] md:max-w-[30rem] md:-translate-y-1/2",
                )}
              >
                <div
                  ref={(el) => {
                    paneRefs.current[index] = el;
                  }}
                  className="h-full w-full will-change-transform"
                >
                  {media ? (
                    <video
                      ref={videoRef}
                      src={media.video}
                      poster={media.poster}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      aria-hidden="true"
                      tabIndex={-1}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="film-scene grid h-full w-full place-items-center">
                      <ProcessArt step={index} decorative className="w-[min(64vw,18rem)] md:w-full" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div
          className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(23,19,16,0.82)_0%,rgba(23,19,16,0.38)_44%,rgba(23,19,16,0)_70%)] md:block"
          aria-hidden="true"
        />
        <div className="film-vignette pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="film-grain pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent"
          aria-hidden="true"
        />

        <span
          className="display-l pointer-events-none absolute left-5 top-16 text-[clamp(4rem,12vw,9rem)] leading-none text-paper/12 md:left-[7vw] md:top-20"
          aria-hidden="true"
        >
          0{active + 1}
        </span>

        {steps.map((step, index) => (
          <div
            key={step.title}
            ref={(el) => {
              textRefs.current[index] = el;
            }}
            className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-16 md:inset-y-0 md:right-auto md:flex md:max-w-[36rem] md:flex-col md:justify-start md:px-[7vw] md:pb-0 md:pt-[30vh]"
          >
            <p className="eyebrow text-brass">Step 0{index + 1}</p>
            <h2 className="display-l mt-3 text-paper">{step.title}</h2>
            <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-paper/80">{step.body}</p>
            {step.note ? <p className="meta mt-3 text-paper/60">{step.note}</p> : null}
          </div>
        ))}

        <div
          className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 md:right-5"
          role="group"
          aria-label="Process stages"
        >
          {steps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              aria-current={active === index ? "step" : undefined}
              aria-label={`Go to step ${index + 1}: ${step.title}`}
              title={step.title}
              onClick={() => jumpTo(index)}
              className={cn(
                "size-2.5 rounded-full border transition-all duration-300",
                active === index
                  ? "scale-125 border-brass bg-brass"
                  : "border-paper/40 bg-transparent hover:border-paper hover:bg-paper/30",
              )}
            />
          ))}
        </div>

        <div
          ref={hintRef}
          className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center transition-opacity duration-500"
          aria-hidden="true"
        >
          <span className="meta flex items-center gap-2 text-paper/60">
            Scroll to cook
            <span className="film-hint-chevron inline-block">↓</span>
          </span>
        </div>
      </div>
    </section>
  );
}