"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Maximize2, X, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export interface GiftBoxView {
  id: string;
  label: string;
  image: string;
  alt: string;
}

export interface GiftBoxSpec {
  material: string;
  capacity: string;
  centerpiece: string;
  secondLife: string;
}

export interface GiftBox {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  specs: GiftBoxSpec;
  views: GiftBoxView[];
}

export const GIFT_BOXES: GiftBox[] = [
  {
    id: "royal-octagonal",
    name: "The Royal Octagonal Chest",
    subtitle: "Hand-carved wooden keepsake chest with brass diya",
    badge: "Heirloom Edition",
    specs: {
      material: "Hand-carved Sheesham wood & solid brass clasp",
      capacity: "8 radial wedges of artisan chikki",
      centerpiece: "Solid fluted brass lotus diya",
      secondLife: "Cherished keepsake jewelry or tea chest",
    },
    views: [
      {
        id: "maroon",
        label: "Imperial Crimson",
        image: "/gifting/royal-maroon-octagonal-box.jpg",
        alt: "Royal Octagonal Chest in Imperial Maroon with brass diya and radial chikkis",
      },
      {
        id: "sage",
        label: "Sage Celadon",
        image: "/gifting/sage-green-octagonal-box.jpg",
        alt: "Royal Octagonal Chest in Sage Celadon with sculpted floral lid",
      },
    ],
  },
  {
    id: "signature-blush",
    name: "The Signature Lotus Box",
    subtitle: "Textured blush board with gold foil & satin ribbon bow",
    badge: "Artisan Collection",
    specs: {
      material: "800 GSM rigid textured paper board",
      capacity: "Crisp whole-slab artisan chikkis",
      centerpiece: "Gold foil embossed lotus & arched jharokha",
      secondLife: "Lustrous keepsake stationery chest",
    },
    views: [
      {
        id: "ribbon",
        label: "Exterior & Ribbon",
        image: "/gifting/lotus-blush-box-ribbon.jpg",
        alt: "Blush gift box with gold foil lotus and satin ribbon bow beside brass diya",
      },
      {
        id: "open",
        label: "Interior Slabs",
        image: "/gifting/lotus-blush-box-open.jpg",
        alt: "Open blush box showing rows of golden chikki slabs layered in parchment",
      },
    ],
  },
  {
    id: "executive-compartment",
    name: "The Executive Hamper",
    subtitle: "Matte chocolate presentation chest with brass diya",
    badge: "Corporate Distinction",
    specs: {
      material: "Rigid matte chocolate board & golden mandalas",
      capacity: "5 distinct artisan chikki varieties in slabs",
      centerpiece: "Fluted brass lotus diya with marigolds",
      secondLife: "Executive desk organizer & memory box",
    },
    views: [
      {
        id: "hamper",
        label: "Executive Hamper",
        image: "/gifting/royal-chocolate-gift-box.jpg",
        alt: "Chocolate brown 6-compartment chikki gift box with golden ribbon and brass diya",
      },
    ],
  },
  {
    id: "peacock-tin",
    name: "The Peacock Heritage Tin",
    subtitle: "Jewel-toned teal tin with metallic gold plume",
    badge: "Celebration Keepsake",
    specs: {
      material: "Airtight seamless embossed lacquer tin",
      capacity: "6 signature varieties in radial kaleidoscope",
      centerpiece: "Fragrant dried rose petals",
      secondLife: "Reusable confectionery & spice canister",
    },
    views: [
      {
        id: "tin",
        label: "Royal Teal Tin",
        image: "/gifting/peacock-teal-round-box.jpg",
        alt: "Peacock teal round tin with gold feather foil lid and radial chikkis",
      },
    ],
  },
];

export function GiftingShowcase({
  onSelectBox,
}: {
  onSelectBox?: (boxId: string) => void;
}) {
  const [activeBoxIndex, setActiveBoxIndex] = useState(0);
  const [activeViewIndex, setActiveViewIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const activeBox = GIFT_BOXES[activeBoxIndex] ?? GIFT_BOXES[0];
  const activeView = activeBox.views[activeViewIndex] ?? activeBox.views[0];

  const handleSelectBox = (index: number) => {
    setActiveBoxIndex(index);
    setActiveViewIndex(0);
  };

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsLightboxOpen(false);
    };
    if (isLightboxOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen]);

  return (
    <div className="w-full">
      {/* ------------------------------------------------------------ */}
      {/*  Apple-Style Segmented Navigation Bar                         */}
      {/* ------------------------------------------------------------ */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex max-w-full overflow-x-auto rounded-full border border-line-strong/60 bg-paper-raised p-1.5 shadow-xs scrollbar-none">
          {GIFT_BOXES.map((box, idx) => {
            const isSelected = idx === activeBoxIndex;
            return (
              <button
                key={box.id}
                type="button"
                onClick={() => handleSelectBox(idx)}
                className={cn(
                  "relative shrink-0 rounded-full px-4 sm:px-5 py-2 text-[0.8125rem] sm:text-[0.875rem] font-medium transition-all duration-200 cursor-pointer",
                  isSelected
                    ? "bg-olive text-paper shadow-2xs font-semibold"
                    : "text-ink-soft hover:text-ink hover:bg-paper-deep/60",
                )}
                aria-pressed={isSelected}
              >
                {box.name.replace("The ", "")}
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/*  Central Staging Stage (3:2 Aspect Ratio)                     */}
      {/* ------------------------------------------------------------ */}
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl sm:rounded-3xl border border-line-strong/40 bg-paper-deep shadow-md transition-all duration-300">
        <div className="relative aspect-[3/2] w-full overflow-hidden bg-ink/5">
          {/* Main Product Image with subtle scale on hover */}
          <Image
            key={activeView.image}
            src={activeView.image}
            alt={activeView.alt}
            fill
            priority
            sizes="(min-width: 1280px) 1024px, 100vw"
            className="object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
          />

          {/* Top Left: Category Badge */}
          <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-paper/90 px-3.5 py-1 text-[0.6875rem] sm:text-[0.75rem] font-semibold uppercase tracking-wider text-ink shadow-2xs backdrop-blur-md border border-line/60">
              <Sparkles className="size-3 text-brass" />
              {activeBox.badge}
            </span>
          </div>

          {/* Top Right: Fullscreen Lightbox Button */}
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 inline-flex items-center gap-1.5 rounded-full bg-paper/90 px-3 py-1.5 text-[0.75rem] font-medium text-ink shadow-2xs backdrop-blur-md border border-line/60 hover:bg-paper transition-all hover:scale-105 cursor-pointer"
            title="Inspect in full resolution"
            aria-label="Inspect in full resolution"
          >
            <Maximize2 className="size-3.5" />
            <span className="hidden sm:inline">Inspect Details</span>
          </button>

          {/* Bottom Left: Angle / Variant Switcher (if > 1 view) */}
          {activeBox.views.length > 1 ? (
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-10 flex items-center gap-1.5 rounded-full bg-paper/95 p-1 shadow-sm backdrop-blur-md border border-line/60">
              {activeBox.views.map((v, vIdx) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveViewIndex(vIdx)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[0.75rem] font-medium transition-all cursor-pointer",
                    vIdx === activeViewIndex
                      ? "bg-olive text-paper shadow-2xs font-semibold"
                      : "text-ink-soft hover:text-ink hover:bg-paper-deep/60",
                  )}
                  aria-pressed={vIdx === activeViewIndex}
                >
                  {v.label}
                </button>
              ))}
            </div>
          ) : null}

          {/* Bottom Right: Quick Action Pill */}
          <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-10">
            <a
              href="#configurator"
              onClick={(e) => {
                e.preventDefault();
                onSelectBox?.(activeBox.id);
                const el = document.getElementById("configurator");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-4 py-2 text-[0.8125rem] font-semibold text-paper shadow-sm hover:bg-terracotta-soft transition-all hover:scale-105 cursor-pointer"
            >
              <span>Configure This Box</span>
              <ChevronRight className="size-4" />
            </a>
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        {/*  Apple-Style Specification Bar Beneath Image                */}
        {/* ---------------------------------------------------------- */}
        <div className="border-t border-line/80 bg-paper-raised p-6 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between pb-6 border-b border-line/60">
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-semibold text-ink">
                {activeBox.name}
              </h3>
              <p className="mt-1 text-[0.875rem] text-ink-soft">
                {activeBox.subtitle}
              </p>
            </div>
            <span className="text-[0.75rem] font-medium uppercase tracking-widest text-brass">
              Bespoke Artisan Finish
            </span>
          </div>

          {/* Minimalist 4-Spec Grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="rounded-xl border border-line/50 bg-paper p-3.5">
              <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-ink-muted">
                Crafted Material
              </p>
              <p className="mt-1 text-[0.8125rem] font-semibold text-ink leading-snug">
                {activeBox.specs.material}
              </p>
            </div>
            <div className="rounded-xl border border-line/50 bg-paper p-3.5">
              <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-ink-muted">
                Accommodates
              </p>
              <p className="mt-1 text-[0.8125rem] font-semibold text-ink leading-snug">
                {activeBox.specs.capacity}
              </p>
            </div>
            <div className="rounded-xl border border-line/50 bg-paper p-3.5">
              <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-ink-muted">
                Centerpiece
              </p>
              <p className="mt-1 text-[0.8125rem] font-semibold text-ink leading-snug">
                {activeBox.specs.centerpiece}
              </p>
            </div>
            <div className="rounded-xl border border-line/50 bg-paper p-3.5">
              <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-ink-muted">
                Keepsake Value
              </p>
              <p className="mt-1 text-[0.8125rem] font-semibold text-ink leading-snug">
                {activeBox.specs.secondLife}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/*  Full-Resolution Lightbox Modal                              */}
      {/* ------------------------------------------------------------ */}
      {isLightboxOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8 backdrop-blur-md transition-opacity duration-300"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-5xl w-full overflow-hidden rounded-2xl bg-paper-deep shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[3/2] w-full">
              <Image
                src={activeView.image}
                alt={activeView.alt}
                fill
                sizes="(min-width: 1280px) 1200px, 100vw"
                className="object-contain"
              />
            </div>
            <div className="flex items-center justify-between border-t border-line/60 bg-paper p-4 px-6">
              <div>
                <p className="text-[0.875rem] font-semibold text-ink">
                  {activeBox.name} — {activeView.label}
                </p>
                <p className="text-[0.75rem] text-ink-soft">
                  Handcrafted presentation by GH Chikkis Ahmedabad
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-full bg-paper-deep text-ink hover:bg-line transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
