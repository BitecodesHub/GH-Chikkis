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
  frames: string;
  count: number;
  poster: string;
}

// Chapters gain a film as footage arrives; the rest keep their living still.
const CHAPTER_MEDIA: Record<number, ChapterMedia> = {
  0: { frames: "/process/cook/f", count: 64, poster: "/process/cook-poster.webp" },
};

const frameUrl = (media: ChapterMedia, index: number) =>
  `${media.frames}${String(index).padStart(3, "0")}.webp`;

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const mediaRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imagesRef = useRef<Record<number, (HTMLImageElement | undefined)[]>>({});
  const loadedRef = useRef<Record<number, number>>({});
  const renderRef = useRef(0);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, getReducedServer);
  const [started, setStarted] = useState(false);

  const count = steps.length;

  // Wake the film only when it approaches the viewport, then preload its frames.
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
      { rootMargin: "900px 0px" },
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!started || reduced) return;
    let cancelled = false;
    for (const key of Object.keys(CHAPTER_MEDIA)) {
      const ci = Number(key);
      const media = CHAPTER_MEDIA[ci];
      const arr = (imagesRef.current[ci] ||= []);
      let next = 0;
      const worker = async () => {
        while (!cancelled && next < media.count) {
          const k = next++;
          const img = new Image();
          img.src = frameUrl(media, k);
          await new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
          if (cancelled) return;
          arr[k] = img;
          loadedRef.current[ci] = (loadedRef.current[ci] || 0) + 1;
        }
      };
      void Promise.all([worker(), worker(), worker(), worker()]);
    }
    return () => {
      cancelled = true;
    };
  }, [started, reduced]);

  useEffect(() => {
    if (!started || reduced || count === 0) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let cssW = 0;
    let cssH = 0;

    const sizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      // The source footage is 480px wide; a larger backing store adds nothing.
      const w = Math.min(Math.round(rect.width * dpr), 720);
      const h = Math.round((w * rect.height) / Math.max(rect.width, 1));
      if (w !== cssW || h !== cssH) {
        cssW = w;
        cssH = h;
        canvas.width = w;
        canvas.height = h;
      }
    };
    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);

    const drawCover = (img: HTMLImageElement, alpha: number, zoom: number) => {
      const iw = img.naturalWidth || 480;
      const ih = img.naturalHeight || 854;
      const scale = Math.max(cssW / iw, cssH / ih) * zoom;
      const sw = cssW / scale;
      const sh = cssH / scale;
      const sx = (iw - sw) / 2;
      const sy = (ih - sh) / 2;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cssW, cssH);
      ctx.globalAlpha = 1;
    };

    const nearest = (arr: (HTMLImageElement | undefined)[], want: number) => {
      const base = Math.round(want);
      for (let d = 0; d < arr.length; d++) {
        const lo = base - d;
        const hi = base + d;
        if (lo >= 0 && arr[lo]) return { img: arr[lo] as HTMLImageElement, index: lo };
        if (hi < arr.length && arr[hi]) return { img: arr[hi] as HTMLImageElement, index: hi };
      }
      return null;
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const vh = window.innerHeight;
      const top = wrap.getBoundingClientRect().top + window.scrollY;
      const pinned = count * 1.3 * vh;
      const target = clamp((window.scrollY - top) / pinned, 0, 1) * count;
      renderRef.current += (target - renderRef.current) * 0.14;
      if (Math.abs(target - renderRef.current) < 0.0004) renderRef.current = target;
      const render = renderRef.current;
      const idx = clamp(Math.floor(render), 0, count - 1);
      const local = render - idx;

      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }

      const media = CHAPTER_MEDIA[idx];
      const loaded = (loadedRef.current[idx] || 0) > 0;
      const filmOn = Boolean(media) && loaded;

      for (let i = 0; i < count; i++) {
        const layer = mediaRefs.current[i];
        if (layer) {
          const isActive = i === idx;
          const hasMedia = Boolean(CHAPTER_MEDIA[i]);
          const mediaLoaded = (loadedRef.current[i] || 0) > 0;
          layer.style.opacity = isActive ? (hasMedia && mediaLoaded ? "0" : "1") : "0";
          if (isActive && !CHAPTER_MEDIA[i]) {
            layer.style.transform = `scale(${1.02 + local * 0.05}) translateY(${(0.5 - local) * 2}%)`;
          }
        }
        const text = textRefs.current[i];
        if (text) {
          const d = render - i;
          const op = clamp(Math.min((d + 0.15) / 0.15, (1 - d) / 0.12), 0, 1);
          const shift = (1 - op) * 24 * (d < 0.5 ? 1 : -1);
          text.style.opacity = String(op);
          text.style.transform = `translateY(${shift}px)`;
        }
      }

      canvas.style.opacity = filmOn ? "1" : "0";
      if (filmOn && media) {
        const arr = imagesRef.current[idx] || [];
        const want = local * (media.count - 1);
        const a = nearest(arr, Math.floor(want));
        const b = nearest(arr, Math.ceil(want));
        ctx.clearRect(0, 0, cssW, cssH);
        const zoom = 1.02 + local * 0.05;
        if (a) drawCover(a.img, 1, zoom);
        if (b && b.index !== a?.index) drawCover(b.img, want - Math.floor(want), zoom);
      }

      if (hintRef.current) {
        hintRef.current.style.opacity = render > 0.06 ? "0" : "1";
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", sizeCanvas);
    };
  }, [started, reduced, count]);

  const jumpTo = (index: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const vh = window.innerHeight;
    const top = wrap.getBoundingClientRect().top + window.scrollY;
    const pinned = count * 1.3 * vh;
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
      style={{ height: `calc(${count * 130}vh + 100vh)` }}
    >
      <div className="film-stage sticky top-0 h-[100dvh] overflow-hidden bg-ink text-paper">
        {steps.map((step, index) => (
          <div
            key={step.title}
            ref={(el) => {
              mediaRefs.current[index] = el;
            }}
            className="absolute inset-0 opacity-0 transition-opacity duration-500"
            aria-hidden="true"
          >
            {CHAPTER_MEDIA[index] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={CHAPTER_MEDIA[index].poster}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-[radial-gradient(ellipse_at_50%_35%,#3a3325_0%,#221d16_60%,#171310_100%)]">
                <ProcessArt step={index} decorative className="w-[min(60vw,22rem)]" />
              </div>
            )}
          </div>
        ))}

        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-500"
          aria-hidden="true"
        />

        <div className="film-vignette pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="film-grain pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent"
          aria-hidden="true"
        />

        <span
          className="display-l pointer-events-none absolute left-5 top-16 text-[clamp(4rem,12vw,9rem)] leading-none text-paper/12 md:left-10 md:top-20"
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
            className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-16 md:px-10 md:pb-14"
          >
            <p className="eyebrow text-brass">Step 0{index + 1}</p>
            <h2 className="display-l mt-3 text-paper">{step.title}</h2>
            <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-paper/80">{step.body}</p>
            {step.note ? <p className="meta mt-3 text-paper/60">{step.note}</p> : null}
          </div>
        ))}

        <div
          className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-col items-center gap-3 md:right-7"
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