"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Gift-box data  — visual only, no long descriptions                */
/* ------------------------------------------------------------------ */
interface GiftView {
  image: string;
  alt: string;
  label: string;
}

interface GiftBox {
  id: string;
  name: string;
  badge: string;
  views: GiftView[];
}

const GIFT_BOXES: GiftBox[] = [
  {
    id: "royal-octagonal",
    name: "The Royal Octagonal Chest",
    badge: "Festive & Wedding",
    views: [
      {
        label: "Imperial Maroon",
        image: "/gifting/royal-maroon-octagonal-box.jpg",
        alt: "Imperial Maroon carved octagonal gift box with radial chikkis and brass diya",
      },
      {
        label: "Sage Pistachio",
        image: "/gifting/sage-green-octagonal-box.jpg",
        alt: "Sage Pistachio octagonal gift box with sculpted flowers and radial chikkis",
      },
    ],
  },
  {
    id: "signature-blush",
    name: "The Signature Lotus Box",
    badge: "Artisan Elegance",
    views: [
      {
        label: "Ribbon Wrapped",
        image: "/gifting/lotus-blush-box-ribbon.jpg",
        alt: "Blush pink gift box with golden satin ribbon and custom tag",
      },
      {
        label: "Inside Arrangement",
        image: "/gifting/lotus-blush-box-open.jpg",
        alt: "Open blush gift box showing rows of golden peanut chikki slabs",
      },
    ],
  },
  {
    id: "executive-compartment",
    name: "The Executive Hamper",
    badge: "Corporate & Milestones",
    views: [
      {
        label: "Festive Hamper",
        image: "/gifting/royal-chocolate-gift-box.jpg",
        alt: "Chocolate brown 6-compartment chikki gift box with golden ribbon and diya",
      },
    ],
  },
  {
    id: "peacock-tin",
    name: "The Peacock Heritage Tin",
    badge: "Celebration Keepsake",
    views: [
      {
        label: "Royal Teal",
        image: "/gifting/peacock-teal-round-box.jpg",
        alt: "Peacock teal round tin with gold feather lid and assorted chikki wedges",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Main showcase — full-screen immersive explorer                    */
/* ------------------------------------------------------------------ */
export function GiftingShowcase() {
  const [activeBox, setActiveBox] = useState(0);
  const [activeView, setActiveView] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const box = GIFT_BOXES[activeBox];
  const view = box.views[activeView] ?? box.views[0];

  /* Auto-rotate boxes every 5s until user interacts */
  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => {
      setUserInteracted((interacted) => {
        if (interacted) {
          if (autoplayRef.current) clearInterval(autoplayRef.current);
          return true;
        }
        setIsTransitioning(true);
        setTimeout(() => {
          setActiveBox((prev) => (prev + 1) % GIFT_BOXES.length);
          setActiveView(0);
          setIsTransitioning(false);
        }, 300);
        return false;
      });
    }, 5000);
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [startAutoplay]);

  const selectBox = (idx: number) => {
    setUserInteracted(true);
    if (idx === activeBox) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveBox(idx);
      setActiveView(0);
      setIsTransitioning(false);
    }, 300);
  };

  const selectView = (idx: number) => {
    setUserInteracted(true);
    if (idx === activeView) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveView(idx);
      setIsTransitioning(false);
    }, 200);
  };

  return (
    <div className="gift-explorer">
      {/* ---- Main Stage ---- */}
      <div className="gift-explorer__stage">
        <div
          className={cn(
            "gift-explorer__image-wrap",
            isTransitioning && "gift-explorer__image-wrap--fading",
          )}
        >
          <Image
            src={view.image}
            alt={view.alt}
            fill
            sizes="(min-width: 1024px) 65vw, 100vw"
            priority={activeBox < 2}
            className="object-cover"
          />
          {/* Bottom gradient overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
          />
        </div>

        {/* Floating name + badge on stage */}
        <div className="absolute bottom-0 inset-x-0 p-5 sm:p-8 z-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-[0.6875rem] font-bold uppercase tracking-widest text-white/90 backdrop-blur-sm">
                {box.badge}
              </span>
              <h3 className="mt-2 font-display text-xl sm:text-2xl md:text-3xl font-semibold text-white drop-shadow-md tracking-tight">
                {box.name}
              </h3>
            </div>

            {/* View switcher pills (if multi-view) */}
            {box.views.length > 1 ? (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/15 p-1 backdrop-blur-sm">
                {box.views.map((v, idx) => (
                  <button
                    key={v.label}
                    type="button"
                    onClick={() => selectView(idx)}
                    className={cn(
                      "rounded-full px-3 py-1 text-[0.75rem] font-medium transition-all duration-200",
                      idx === activeView
                        ? "bg-white text-ink shadow-sm font-semibold"
                        : "text-white/80 hover:text-white hover:bg-white/15",
                    )}
                    aria-pressed={idx === activeView}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Progress bar auto-rotate indicator */}
        {!userInteracted ? (
          <div className="absolute top-0 inset-x-0 z-10 flex gap-1 p-3">
            {GIFT_BOXES.map((_, idx) => (
              <div
                key={idx}
                className="h-[3px] flex-1 rounded-full bg-white/25 overflow-hidden"
              >
                <div
                  className={cn(
                    "h-full rounded-full bg-white/90",
                    idx === activeBox
                      ? "gift-explorer__progress"
                      : idx < activeBox
                        ? "w-full"
                        : "w-0",
                  )}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* ---- Thumbnail strip ---- */}
      <div className="gift-explorer__strip">
        {GIFT_BOXES.map((b, idx) => (
          <button
            key={b.id}
            type="button"
            onClick={() => selectBox(idx)}
            className={cn(
              "gift-explorer__thumb",
              idx === activeBox && "gift-explorer__thumb--active",
            )}
            aria-pressed={idx === activeBox}
            aria-label={b.name}
          >
            <Image
              src={b.views[0].image}
              alt={b.views[0].alt}
              fill
              sizes="120px"
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className={cn(
                "absolute inset-0 rounded-xl transition-all duration-300",
                idx === activeBox
                  ? "ring-2 ring-terracotta ring-offset-2 ring-offset-paper bg-transparent"
                  : "bg-black/20 hover:bg-black/5",
              )}
            />
            <span
              className={cn(
                "absolute bottom-1.5 inset-x-1.5 text-center text-[0.625rem] font-semibold leading-tight text-white drop-shadow-md truncate",
                idx !== activeBox && "opacity-0",
              )}
            >
              {b.name.replace("The ", "")}
            </span>
          </button>
        ))}

        {/* Mobile view switcher (below thumbs) */}
        {box.views.length > 1 ? (
          <div className="sm:hidden flex items-center gap-1.5 self-center rounded-full bg-paper-deep p-1 w-full justify-center">
            {box.views.map((v, idx) => (
              <button
                key={v.label}
                type="button"
                onClick={() => selectView(idx)}
                className={cn(
                  "rounded-full px-3 py-1 text-[0.75rem] font-medium transition-all",
                  idx === activeView
                    ? "bg-olive text-paper shadow-2xs font-semibold"
                    : "text-ink-soft hover:text-ink",
                )}
                aria-pressed={idx === activeView}
              >
                {v.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
