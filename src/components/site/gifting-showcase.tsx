"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { waLink } from "@/lib/phone";
import { cn } from "@/lib/cn";

export interface GiftBoxOption {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  description: string;
  bestFor: string;
  highlights: string[];
  views: {
    label: string;
    image: string;
    alt: string;
    caption: string;
  }[];
}

export const GIFT_BOX_OPTIONS: GiftBoxOption[] = [
  {
    id: "royal-octagonal",
    name: "The Royal Octagonal Lotus Chest",
    tagline: "Carved wooden keepsake chest with brass diya centerpiece",
    badge: "Festive & Wedding Showstopper",
    description:
      "A magnificent eight-sided carved keepsake chest featuring a multi-tiered sculpted lotus lid and solid brass antique latch. Opens to an eight-variety radial pinwheel of crisp, handcrafted chikkis surrounding a solid brass lotus centerpiece diya.",
    bestFor: "Wedding invitations, royal family gifts, VIP Diwali hampers & festive centerpieces.",
    highlights: [
      "8 radial handcrafted chikki wedges",
      "Solid brass lotus centerpiece diya included",
      "Hand-carved lotus relief lid with brass clasp",
      "Available in Imperial Maroon & Sage Pistachio",
    ],
    views: [
      {
        label: "Imperial Maroon",
        image: "/gifting/royal-maroon-octagonal-box.jpg",
        alt: "Imperial Maroon Octagonal carved gift box filled with radial assorted chikkis and a lit brass lotus diya",
        caption: "Deep crimson maroon chest with multi-tiered sculpted lotus lid and glowing brass diya.",
      },
      {
        label: "Sage Pistachio",
        image: "/gifting/sage-green-octagonal-box.jpg",
        alt: "Sage Pistachio green octagonal gift box with sculpted ivory flowers and radial chikkis",
        caption: "Pastel sage green chest with sculpted botanical floral lid and radial artisan chikkis.",
      },
    ],
  },
  {
    id: "signature-blush",
    name: "The Signature Lotus Keepsake Box",
    tagline: "Pastel blush paper box with embossed gold foil & satin bow",
    badge: "Artisanal Elegance",
    description:
      "Crafted from premium textured blush board embossed with opulent golden lotus blooms. Tied by hand with a lustrous wide golden satin ribbon bow and personalized GH Chikkis tag. The lid opens to reveal golden, glossy chikki slabs layered between fine translucent parchment sheets.",
    bestFor: "Wedding favors, corporate client appreciation, festive family gifting.",
    highlights: [
      "Layered whole-slab handcrafted chikki",
      "Embossed arched jharokha & gold lotus motifs",
      "Lustrous gold satin ribbon bow & custom gift tag",
      "Individually protected with food-grade parchment",
    ],
    views: [
      {
        label: "Tied with Ribbon",
        image: "/gifting/lotus-blush-box-ribbon.jpg",
        alt: "Blush pink gift box tied with wide golden satin ribbon and custom tag, next to brass diya",
        caption: "Exterior presentation: blush paper box with gold foil lotus accents and satin ribbon bow.",
      },
      {
        label: "Inside Arrangement",
        image: "/gifting/lotus-blush-box-open.jpg",
        alt: "Open blush pink gift box showing pristine rows of golden peanut chikki slabs",
        caption: "Interior view: golden, crunchy peanut chikki slabs resting on delicate parchment dividers.",
      },
    ],
  },
  {
    id: "executive-compartment",
    name: "The Executive 6-Compartment Hamper",
    tagline: "Rich chocolate & amber presentation chest with diya",
    badge: "Corporate & Milestones",
    description:
      "A grand presentation hamper in rich matte chocolate brown with ornate golden corner mandalas and a satin ribbon closure. Features five generous compartments of handcrafted chikki varieties and a traditional fluted brass diya nestled in marigold petals.",
    bestFor: "Corporate Diwali gifting, executive hampers, client relationship tokens.",
    highlights: [
      "5 distinct artisanal varieties in generous slabs",
      "Fluted brass centerpiece diya included",
      "Rigid luxury board with golden mandala motifs",
      "Custom branded sleeve & greeting card ready",
    ],
    views: [
      {
        label: "Festive Hamper",
        image: "/gifting/royal-chocolate-gift-box.jpg",
        alt: "Deep chocolate brown 6-compartment chikki gift box with golden ribbon and brass diya",
        caption: "Opulent chocolate box featuring 5 chikki varieties, golden ribbon, and a lit brass diya.",
      },
    ],
  },
  {
    id: "peacock-tin",
    name: "The Peacock Heritage Keepsake Tin",
    tagline: "Jewel-toned teal circular tin with metallic gold feather foil",
    badge: "Celebration Keepsake",
    description:
      "A stunning round gift tin in royal peacock teal, stamped with a shimmering metallic gold peacock plume. Inside, crisp chikki wedges fan out in a radial mosaic — featuring black til, golden sesame, peanut, and mixed nuts around scented dried rose petals.",
    bestFor: "Long-distance and overseas gifting, festive family distributions, celebration favors.",
    highlights: [
      "Airtight reusable embossed metal tin",
      "Radial kaleidoscope of 6 chikki varieties",
      "Center bowl with fragrant rose petals",
      "Travel & flight friendly packaging",
    ],
    views: [
      {
        label: "Royal Teal Tin",
        image: "/gifting/peacock-teal-round-box.jpg",
        alt: "Peacock teal round chikki gift tin with gold feather lid and assorted chikki wedges",
        caption: "Deep peacock teal tin with metallic gold feather foil and radial assorted chikki wedges.",
      },
    ],
  },
];

export function GiftingShowcase({
  whatsappNumber,
}: {
  whatsappNumber?: string | null;
}) {
  const [activeViews, setActiveViews] = useState<Record<string, number>>({
    "royal-octagonal": 0,
    "signature-blush": 0,
    "executive-compartment": 0,
    "peacock-tin": 0,
  });

  const handleToggleView = (boxId: string, index: number) => {
    setActiveViews((prev) => ({ ...prev, [boxId]: index }));
  };

  return (
    <div className="space-y-12">
      <div className="grid gap-8 lg:grid-cols-2">
        {GIFT_BOX_OPTIONS.map((box) => {
          const currentViewIndex = activeViews[box.id] ?? 0;
          const currentView = box.views[currentViewIndex] ?? box.views[0];
          const whatsappHref = whatsappNumber
            ? waLink(
                whatsappNumber,
                `Hello GH Chikkis! I would like to enquire about the "${box.name}" for a gifting order.`,
              )
            : null;

          return (
            <article
              key={box.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-paper-raised shadow-xs transition-all duration-300 hover:border-line-strong hover:shadow-md"
            >
              {/* Visual Container */}
              <div className="relative aspect-[3/2] w-full overflow-hidden bg-paper-deep">
                <Image
                  src={currentView.image}
                  alt={currentView.alt}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                  priority={box.id === "royal-octagonal" || box.id === "signature-blush"}
                />

                {/* Subtle gradient vignette at bottom */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 via-black/15 to-transparent"
                />

                {/* Category Badge Top Left */}
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-paper/95 px-3 py-1 text-[0.75rem] font-semibold tracking-wider text-ink uppercase shadow-xs backdrop-blur-xs">
                    <span className="size-1.5 rounded-full bg-terracotta" />
                    {box.badge}
                  </span>
                </div>

                {/* Multi-view Toggles (if box has > 1 view) */}
                {box.views.length > 1 ? (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-paper/95 p-1 shadow-sm backdrop-blur-xs">
                    {box.views.map((v, idx) => (
                      <button
                        key={v.label}
                        type="button"
                        onClick={() => handleToggleView(box.id, idx)}
                        className={cn(
                          "rounded-full px-3 py-1 text-[0.75rem] font-medium transition-all",
                          idx === currentViewIndex
                            ? "bg-olive text-paper shadow-2xs font-semibold"
                            : "text-ink-soft hover:text-ink hover:bg-paper-deep",
                        )}
                        aria-pressed={idx === currentViewIndex}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {/* Photo Caption Bottom Left */}
                <p className="absolute bottom-3 left-4 max-w-[65%] text-[0.75rem] font-medium text-white/95 drop-shadow-sm line-clamp-1">
                  {currentView.caption}
                </p>
              </div>

              {/* Content Block */}
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <div>
                  <h3 className="display-s text-ink">{box.name}</h3>
                  <p className="mt-1 text-[0.875rem] font-medium text-terracotta">
                    {box.tagline}
                  </p>
                </div>

                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {box.description}
                </p>

                {/* Key Highlights */}
                <div className="mt-5 space-y-2 border-t border-line/60 pt-4">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-wider text-ink-muted">
                    Packaging Details
                  </p>
                  <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {box.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-2 text-[0.8125rem] text-ink"
                      >
                        <span
                          className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brass"
                          aria-hidden="true"
                        />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Best For Tagline */}
                <div className="mt-4 rounded-lg bg-paper px-3.5 py-2 text-[0.8125rem] text-ink-soft">
                  <strong className="font-semibold text-ink">Ideal for:</strong>{" "}
                  {box.bestFor}
                </div>

                {/* Card Actions */}
                <div className="mt-6 flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={`/contact#enquiry`}
                    className="btn btn-solid text-[0.875rem] py-2 px-4.5"
                  >
                    Enquire for this box
                  </Link>
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline text-[0.875rem] py-2 px-4.5"
                    >
                      WhatsApp about this
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
