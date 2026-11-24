"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Check,
  CheckCircle2,
  Copy,
  MessageCircle,
  ArrowRight,
  X,
  Layers,
  Stamp,
  Truck,
  Gift,
  Award,
  Flame,
  Info,
  Sliders,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { waLink } from "@/lib/phone";

/* =========================================================================
   TYPES & DATA MODELS
   ========================================================================= */

export interface GiftBoxView {
  id: string;
  label: string;
  image: string;
  alt: string;
  finishType?: "color" | "state";
  colorSwatch?: string;
}

export interface GiftBoxSpec {
  material: string;
  capacity: string;
  centerpiece: string;
  secondLife: string;
  dimensions?: string;
}

export interface CraftsmanshipHotspot {
  id: string;
  title: string;
  description: string;
  x: number; // percentage from left
  y: number; // percentage from top
}

export interface GiftBox {
  id: string;
  name: string;
  tagline: string;
  subtitle: string;
  badge: string;
  specs: GiftBoxSpec;
  views: GiftBoxView[];
  hotspots: CraftsmanshipHotspot[];
  story: string;
}

export interface ChikkiVariety {
  id: string;
  name: string;
  gujaratiName: string;
  image: string;
  crunchProfile: string;
  flavorNotes: string;
  ingredients: string;
  highlight: string;
  badge: string;
}

export const CHIKKI_VARIETIES: ChikkiVariety[] = [
  {
    id: "groundnut",
    name: "Classic Groundnut",
    gujaratiName: "સીંગ ચીકી",
    image: "/products/groundnut-chikki.jpg",
    crunchProfile: "Crisp Snap · Golden Gloss",
    flavorNotes: "Rich nutty aroma, roasted peanut warmth & deep jaggery caramel",
    ingredients: "Saurashtra groundnuts, pure organic jaggery",
    highlight: "Slow-roasted whole peanuts cracked and set to a gossamer golden sheen",
    badge: "The Benchmark",
  },
  {
    id: "dry-fruit",
    name: "Royal Dry Fruit",
    gujaratiName: "ડ્રાય ફ્રૂટ ચીકી",
    image: "/products/dry-fruit-chikki.jpg",
    crunchProfile: "Luxurious Crunch · Multi-Layered",
    flavorNotes: "Buttery California almonds, rich cashews & earthy pistachio slivers",
    ingredients: "Almonds, cashews, pistachios, pure jaggery, cardamom",
    highlight: "Caramelized whole-nut medley hand-pressed with aromatic winter spices",
    badge: "Festive Favorite",
  },
  {
    id: "black-til",
    name: "Heirloom Black Sesame",
    gujaratiName: "કાળા તલની ચીકી",
    image: "/products/black-til-chikki.jpg",
    crunchProfile: "Fine Seed Crisp · Intense Roast",
    flavorNotes: "Deep earthy undertones, toasted nuttiness & comforting gud richness",
    ingredients: "Unpolished black sesame seeds, organic jaggery",
    highlight: "Ancient heirloom seeds roasted until popping, delivering wholesome vitality",
    badge: "Heritage Selection",
  },
  {
    id: "white-til",
    name: "Pearlescent White Til",
    gujaratiName: "સફેદ તલની ચીકી",
    image: "/products/white-til-chikki.jpg",
    crunchProfile: "Delicate Melt · Feather Snap",
    flavorNotes: "Sweet nutty fragrance, velvety toasted seed finish with warming spice",
    ingredients: "Hand-sorted white til seeds, spiced jaggery syrup",
    highlight: "Gently toasted winter sesame rolled into gossamer brittles",
    badge: "Winter Tradition",
  },
  {
    id: "coconut",
    name: "Slow-Toasted Coconut",
    gujaratiName: "કોપરા ચીકી",
    image: "/products/coconut-chikki.jpg",
    crunchProfile: "Tender Flake · Amber Crisp",
    flavorNotes: "Toasted tropical coconut shreds with aromatic caramelized molasses",
    ingredients: "Sun-dried desiccated coconut, organic jaggery",
    highlight: "Fine ribbons of coconut toasted slow over gentle flame to golden amber",
    badge: "Tropical Amber",
  },
  {
    id: "daliya",
    name: "Roasted Daliya",
    gujaratiName: "દાળિયા ચીકી",
    image: "/products/daliya-chikki.jpg",
    crunchProfile: "Airy Snap · Light Roasted Crunch",
    flavorNotes: "Mildly savory-sweet roasted Bengal gram with golden caramel bind",
    ingredients: "Roasted split chickpeas (daliya chana), pure jaggery",
    highlight: "Crisp and airy, offering an effortless melt with zero oily residue",
    badge: "Crisp & Light",
  },
  {
    id: "mamra",
    name: "Crispy Mamra",
    gujaratiName: "મમરા ચીકી",
    image: "/products/mamra-chikki.jpg",
    crunchProfile: "Airy Crackle · Gossamer Crunch",
    flavorNotes: "Delicate puffed rice kissed with a micro-thin web of golden jaggery",
    ingredients: "Puffed rice (mamra), pure organic jaggery",
    highlight: "Featherlight roasted rice clouds bound with brittle caramelized sugar",
    badge: "Puffed Gold",
  },
];

export const GIFT_BOXES: GiftBox[] = [
  {
    id: "royal-octagonal",
    name: "The Royal Octagonal Chest",
    tagline: "Heirloom Sheesham Wood & Solid Brass",
    subtitle: "Hand-carved wooden keepsake chest with centerpiece brass diya",
    badge: "Heirloom Edition",
    story: "Handcrafted in Gujarat by traditional wood and brass masters. The octagonal geometry symbolizes festive prosperity, opening to reveal 8 radial wedges of artisan chikki around a solid fluted lotus diya.",
    specs: {
      material: "Hand-carved Sheesham wood & solid brass clasp",
      capacity: "8 radial wedges (approx. 800g – 1kg artisan assortment)",
      centerpiece: "Solid hand-fluted brass lotus diya",
      secondLife: "Cherished heirloom jewelry chest or ceremonial altar piece",
      dimensions: "28 cm × 28 cm × 7 cm",
    },
    hotspots: [
      {
        id: "diya",
        title: "Hand-Fluted Brass Diya",
        description: "Cast in solid brass by Gujarati metal artisans. Designed to be reused for decades in your prayer altar or festive table.",
        x: 50,
        y: 48,
      },
      {
        id: "carving",
        title: "Artisanal Wood Carving",
        description: "Carved from sustainably harvested Sheesham timber with traditional floral reliefs and natural wax finish.",
        x: 22,
        y: 35,
      },
      {
        id: "radial",
        title: "Radial Confection Wedges",
        description: "Precision-cut chikki wedges arranged in an auspicious geometric mandala, separated with food-grade parchment.",
        x: 75,
        y: 65,
      },
    ],
    views: [
      {
        id: "maroon",
        label: "Imperial Crimson",
        image: "/gifting/royal-maroon-octagonal-box.jpg",
        alt: "Royal Octagonal Chest in Imperial Maroon with brass diya and radial chikkis",
        finishType: "color",
        colorSwatch: "#782228",
      },
      {
        id: "sage",
        label: "Sage Celadon",
        image: "/gifting/sage-green-octagonal-box.jpg",
        alt: "Royal Octagonal Chest in Sage Celadon with sculpted floral lid",
        finishType: "color",
        colorSwatch: "#556b4f",
      },
    ],
  },
  {
    id: "signature-blush",
    name: "The Signature Lotus Box",
    tagline: "Textured Blush Board & Satin Ribbon Bow",
    subtitle: "Embossed lotus jharokha with hand-tied champagne ribbon and brass diya",
    badge: "Artisan Collection",
    story: "Conceived as an intimate gesture of celebration. Made from rigid 800 GSM textured roseate board, hot-stamped with genuine metallic gold foil lotus motifs and bound with a hand-tied satin ribbon.",
    specs: {
      material: "800 GSM textured paper board & gold foil debossing",
      capacity: "Crisp whole-slab artisan chikkis (approx. 500g – 750g)",
      centerpiece: "Gold foil embossed lotus arch & optional brass diya",
      secondLife: "Elegant keepsake stationery chest, memory box or gift caddy",
      dimensions: "24 cm × 18 cm × 6 cm",
    },
    hotspots: [
      {
        id: "foil",
        title: "Metallic Gold Foil Lotus",
        description: "Embossed under 12-ton hydraulic pressure, creating tactile raised petals that reflect candlelight.",
        x: 32,
        y: 32,
      },
      {
        id: "ribbon",
        title: "Hand-Tied Satin Ribbon",
        description: "Double-faced satin ribbon tied by hand in Ahmedabad, accented with a custom calligraphy gift tag.",
        x: 35,
        y: 52,
      },
      {
        id: "slabs",
        title: "Parchment-Layered Slabs",
        description: "Whole-slab chikkis individually separated by glassine butter parchment to preserve crystal crunch.",
        x: 70,
        y: 60,
      },
    ],
    views: [
      {
        id: "ribbon",
        label: "Sealed Presentation (Ribbon)",
        image: "/gifting/lotus-blush-box-ribbon.jpg",
        alt: "Blush gift box with gold foil lotus and satin ribbon bow beside brass diya",
        finishType: "state",
      },
      {
        id: "open",
        label: "Unboxed Reveal (Interior Slabs)",
        image: "/gifting/lotus-blush-box-open.jpg",
        alt: "Open blush box showing rows of golden chikki slabs layered in parchment",
        finishType: "state",
      },
    ],
  },
  {
    id: "executive-compartment",
    name: "The Executive Hamper",
    tagline: "Matte Chocolate & Festive Mandalas",
    subtitle: "Multi-compartment presentation chest with marigolds and solid brass diya",
    badge: "Corporate Distinction",
    story: "Designed specifically for corporate partners, enterprise client milestones, and board distributions. Deep matte chocolate board stamped with warm gold mandalas and divided into generous confection wells.",
    specs: {
      material: "Heavy gauge matte chocolate board & golden mandalas",
      capacity: "5 distinct artisan chikki varieties in full slabs (approx. 800g)",
      centerpiece: "Solid fluted brass lotus diya with fresh marigold petals",
      secondLife: "Executive desk organizer, watch valet or cherished keepsake",
      dimensions: "30 cm × 22 cm × 6.5 cm",
    },
    hotspots: [
      {
        id: "compartments",
        title: "5 Distinct Confection Wells",
        description: "Individual compartments allowing recipients to sample different nuts, seeds, and roasted grains.",
        x: 60,
        y: 40,
      },
      {
        id: "mandala",
        title: "Gold Mandala Stamping",
        description: "Auspicious Indian sun mandalas stamped across the chocolate lid with your organization's custom branding.",
        x: 25,
        y: 30,
      },
    ],
    views: [
      {
        id: "hamper",
        label: "Executive Hamper",
        image: "/gifting/royal-chocolate-gift-box.jpg",
        alt: "Chocolate brown 6-compartment chikki gift box with golden ribbon and brass diya",
        finishType: "state",
      },
    ],
  },
  {
    id: "peacock-tin",
    name: "The Peacock Heritage Tin",
    tagline: "Jewel-Toned Embossed Lacquer Tin",
    subtitle: "Airtight seamless teal tin with gold peacock feather motif",
    badge: "Celebration Keepsake",
    story: "A jewel of Indian packaging tradition. Seamless airtight food-grade lacquer tin in peacock teal, embossed with shimmering gold peacock plumes and dried organic rose petals at its heart.",
    specs: {
      material: "Seamless airtight embossed lacquer tin",
      capacity: "6 signature varieties in radial kaleidoscope fan (approx. 650g)",
      centerpiece: "Fragrant dried organic Kannauj rose petals",
      secondLife: "Reusable confectionery container, heirloom tea caddy or spice tin",
      dimensions: "22 cm diameter × 6 cm height",
    },
    hotspots: [
      {
        id: "tinplate",
        title: "Airtight Lacquer Tin",
        description: "Blocks humidity and light completely, guaranteeing optimal chikki crunch for over 90 days without additives.",
        x: 75,
        y: 30,
      },
      {
        id: "peacock",
        title: "Embossed Peacock Plume",
        description: "Detailed embossed feather motif inspired by the royal peacocks of Gujarat, highlighted in gold foil.",
        x: 65,
        y: 20,
      },
      {
        id: "rose",
        title: "Dried Rose Petals",
        description: "Natural organic rose petals in the center well, infusing an unforgettable festive fragrance upon opening.",
        x: 36,
        y: 52,
      },
    ],
    views: [
      {
        id: "tin",
        label: "Peacock Heritage Tin",
        image: "/gifting/peacock-teal-round-box.jpg",
        alt: "Peacock teal round tin with gold feather foil lid and radial chikkis",
        finishType: "state",
      },
    ],
  },
];

export const OCCASIONS = [
  "Corporate Milestones & Client Gifts",
  "Weddings & Bespoke Invitations",
  "Diwali & Festive Traditions",
  "Private Celebrations & Favours",
];

export const QUANTITY_TIERS = [
  { label: "25 – 50 boxes", note: "Intimate gatherings & team milestones" },
  { label: "50 – 100 boxes", note: "Festive gifting & celebratory distributions" },
  { label: "100 – 250 boxes", note: "Wedding invites & VIP client lists" },
  { label: "250 – 500+ boxes", note: "Enterprise corporate programs & multi-city" },
];

export const BESPOKE_FINISHES = [
  {
    id: "logo",
    label: "Custom Branded Belly Band / Logo Sleeve",
    detail: "Full-color or metallic foil band featuring your corporate emblem, wedding monogram or message",
    icon: Stamp,
  },
  {
    id: "ribbon",
    label: "Hand-Tied Golden Satin Ribbon & Wax Seal",
    detail: "Double-faced champagne gold satin ribbon sealed with genuine stamped wax medallion",
    icon: Gift,
  },
  {
    id: "diya",
    label: "Solid Brass Lotus Centerpiece Diya",
    detail: "Traditional hand-fluted solid brass oil lamp placed at the heart of the gift chest",
    icon: Flame,
  },
  {
    id: "card",
    label: "Personalized Calligraphy Greeting Card",
    detail: "Heavy cotton-rag deckle-edge note card with customized recipient greeting & founder note",
    icon: Award,
  },
  {
    id: "courier",
    label: "Multi-City White-Glove Courier Dispatch",
    detail: "Individual shock-protected shipping direct to client doorsteps across Pan-India and overseas",
    icon: Truck,
  },
];

/* =========================================================================
   MASTER COMPONENT: THE GH CHIKKI GIFT ATELIER
   ========================================================================= */

export function GiftingAtelier({
  whatsappNumber,
}: {
  whatsappNumber?: string | null;
}) {
  // 1. Studio State
  const [selectedBoxId, setSelectedBoxId] = useState<string>("royal-octagonal");
  const [selectedViewId, setSelectedViewId] = useState<string>("maroon");
  const [selectedVarieties, setSelectedVarieties] = useState<string[]>(
    CHIKKI_VARIETIES.map((v) => v.id),
  );
  const [selectedOccasion, setSelectedOccasion] = useState<string>(OCCASIONS[0]);
  const [selectedTier, setSelectedTier] = useState<string>(QUANTITY_TIERS[1].label);
  const [selectedFinishes, setSelectedFinishes] = useState<string[]>([
    "ribbon",
    "diya",
    "logo",
  ]);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);
  const [activeVarietyModal, setActiveVarietyModal] = useState<ChikkiVariety | null>(null);
  const [copied, setCopied] = useState(false);

  // Active Box & View
  const activeBox =
    GIFT_BOXES.find((b) => b.id === selectedBoxId) ?? GIFT_BOXES[0];
  const activeView =
    activeBox.views.find((v) => v.id === selectedViewId) ?? activeBox.views[0];

  // When changing box, auto-pick default view
  const handleSelectBox = (boxId: string) => {
    setSelectedBoxId(boxId);
    const box = GIFT_BOXES.find((b) => b.id === boxId) ?? GIFT_BOXES[0];
    setSelectedViewId(box.views[0]?.id ?? "");
    setActiveHotspotId(null);
  };

  // Toggle chikki variety
  const handleToggleVariety = (varietyId: string) => {
    setSelectedVarieties((prev) => {
      if (prev.includes(varietyId)) {
        if (prev.length <= 1) return prev; // At least one variety
        return prev.filter((id) => id !== varietyId);
      }
      return [...prev, varietyId];
    });
  };

  // Quick variety sets
  const handleSelectAllVarieties = () => {
    setSelectedVarieties(CHIKKI_VARIETIES.map((v) => v.id));
  };
  const handleSelectNutTrio = () => {
    setSelectedVarieties(["groundnut", "dry-fruit", "coconut"]);
  };
  const handleSelectWinterTradition = () => {
    setSelectedVarieties(["groundnut", "white-til", "black-til", "daliya"]);
  };

  // Toggle finish
  const handleToggleFinish = (finishId: string) => {
    setSelectedFinishes((prev) =>
      prev.includes(finishId)
        ? prev.filter((id) => id !== finishId)
        : [...prev, finishId],
    );
  };

  // Selected varieties labels
  const chosenVarietiesList = CHIKKI_VARIETIES.filter((v) =>
    selectedVarieties.includes(v.id),
  );
  const chosenFinishesList = BESPOKE_FINISHES.filter((f) =>
    selectedFinishes.includes(f.id),
  );

  // Unboxing state for Signature Lotus Box
  const isSignatureBlush = activeBox.id === "signature-blush";
  const isLotusUnboxed = isSignatureBlush && activeView.id === "open";

  const handleToggleUnbox = () => {
    if (isSignatureBlush) {
      setSelectedViewId(activeView.id === "open" ? "ribbon" : "open");
    } else if (activeBox.id === "royal-octagonal") {
      setSelectedViewId(activeView.id === "maroon" ? "sage" : "maroon");
    }
  };

  // Generate formatted enquiry brief
  const formattedBrief = `Hello GH Chikkis! I would like to enquire about a bespoke gifting order from the GH Chikki Gift Atelier:

• Keepsake Box Format: ${activeBox.name} (${activeView.label})
• Chikki Assortment (${chosenVarietiesList.length} varieties): ${chosenVarietiesList.map((v) => v.name).join(", ")}
• Occasion / Purpose: ${selectedOccasion}
• Approximate Volume: ${selectedTier}
• Desired Presentation Finishes: ${
    chosenFinishesList.length > 0
      ? chosenFinishesList.map((f) => f.label).join(", ")
      : "Standard presentation"
  }

Please share availability, confirmed turnaround times for our date, and an individual quote.`;

  const whatsappHref = whatsappNumber
    ? waLink(whatsappNumber, formattedBrief)
    : null;

  const handleCopyBrief = () => {
    navigator.clipboard.writeText(formattedBrief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  // Scroll to section helper
  const scrollToStudio = () => {
    const el = document.getElementById("atelier-studio");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative w-full">
      {/* ============================================================ */}
      {/* 1. ATELIER BANNER & LIVING GIFT STAGE                         */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden pt-4 pb-12 md:pb-20">
        {/* Subtle decorative radial gold glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -top-24 bg-[radial-gradient(ellipse_at_top,rgba(196,153,66,0.12),transparent_70%)]"
        />

        {/* Eyebrow and Headline */}
        <div className="text-center max-w-3xl mx-auto px-4 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-line-strong/80 bg-paper-raised px-4 py-1.5 text-[0.8125rem] font-semibold text-olive shadow-2xs">
            <Sparkles className="size-3.5 text-brass" />
            <span>The GH Chikki Gift Atelier</span>
          </div>
          <h1 className="font-display mt-5 text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-ink text-balance leading-[1.08]">
            Don’t just choose a gift. <br className="hidden sm:inline" />
            <span className="italic font-normal text-terracotta">Experience making one.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-ink-soft max-w-2xl mx-auto leading-relaxed">
            Curate heirloom wooden chests, jewel-toned lacquer tins, and our seven pure jaggery chikki varieties. Every detail is shaped around your celebration.
          </p>
        </div>

        {/* ============================================================ */}
        {/*  THE LIVING GIFT BOX SHOWCASE (Interactive Hero Stage)       */}
        {/* ============================================================ */}
        <div className="max-w-6xl mx-auto px-4">
          <div className="relative rounded-3xl border border-line-strong/80 bg-paper-raised p-4 sm:p-8 md:p-10 shadow-md overflow-hidden">
            {/* Top Stage Bar: Box selector pills */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-olive animate-pulse" />
                <span className="text-[0.8125rem] font-bold uppercase tracking-wider text-ink-soft">
                  Stage 01 — Select Presentation Box
                </span>
              </div>

              {/* Box Selector Tab Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {GIFT_BOXES.map((box) => {
                  const isSelected = box.id === selectedBoxId;
                  return (
                    <button
                      key={box.id}
                      type="button"
                      onClick={() => handleSelectBox(box.id)}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium transition-all cursor-pointer",
                        isSelected
                          ? "bg-olive text-paper shadow-2xs font-semibold scale-[1.02]"
                          : "border border-line bg-paper text-ink-soft hover:border-line-strong hover:text-ink",
                      )}
                    >
                      {box.name.replace("The ", "")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage Centerpiece: The Living Box Canvas */}
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:gap-10 items-center">
              {/* Left Column: The Interactive Living Box Image Container */}
              <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-paper-deep border border-line shadow-inner group">
                <Image
                  src={activeView.image}
                  alt={activeView.alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 65vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.015]"
                />

                {/* Subtle vignette layer */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"
                />

                {/* Craftsmanship Hotspots (Interactive Pins) */}
                {activeBox.hotspots.map((spot) => {
                  const isSpotActive = activeHotspotId === spot.id;
                  return (
                    <div
                      key={spot.id}
                      style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setActiveHotspotId(isSpotActive ? null : spot.id)
                        }
                        className={cn(
                          "relative size-7 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-md",
                          isSpotActive
                            ? "bg-terracotta text-paper ring-4 ring-terracotta/30 scale-125"
                            : "bg-paper/95 text-olive border border-olive/40 hover:scale-110 hover:bg-olive hover:text-paper",
                        )}
                        aria-label={`Inspect ${spot.title}`}
                      >
                        <span className="size-2 rounded-full bg-current animate-ping opacity-60 absolute" />
                        <span className="size-2 rounded-full bg-current" />
                      </button>

                      {/* Expanded Hotspot Tooltip */}
                      {isSpotActive ? (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-3.5 rounded-2xl bg-ink text-paper shadow-xl z-30 text-left border border-white/10 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[0.8125rem] font-bold text-brass tracking-wide">
                              {spot.title}
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveHotspotId(null)}
                              className="text-paper/60 hover:text-paper"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                          <p className="mt-1 text-[0.75rem] text-paper/85 leading-relaxed">
                            {spot.description}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {/* Bottom Overlay Pill: Box Name & Finish Switcher */}
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper/90 backdrop-blur-md px-4 py-2.5 border border-line-strong/60 shadow-sm">
                  <div className="min-w-0">
                    <p className="text-[0.875rem] font-bold text-ink truncate">
                      {activeBox.name}
                    </p>
                    <p className="text-[0.75rem] text-ink-soft truncate">
                      {activeView.label} · {activeBox.badge}
                    </p>
                  </div>

                  {/* Dynamic Unbox / Finish Switch Action */}
                  {isSignatureBlush ? (
                    <button
                      type="button"
                      onClick={handleToggleUnbox}
                      className="inline-flex items-center gap-1.5 rounded-full bg-olive px-3.5 py-1.5 text-[0.75rem] font-semibold text-paper hover:bg-olive-deep shadow-2xs transition-all cursor-pointer"
                    >
                      <Sparkles className="size-3" />
                      <span>{isLotusUnboxed ? "Seal Ribbon" : "Unbox & Reveal Slabs"}</span>
                    </button>
                  ) : activeBox.id === "royal-octagonal" ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[0.6875rem] font-semibold text-ink-muted uppercase mr-1">
                        Finish:
                      </span>
                      {activeBox.views.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedViewId(v.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium transition-all cursor-pointer",
                            selectedViewId === v.id
                              ? "bg-ink text-paper font-semibold shadow-2xs"
                              : "bg-paper-raised text-ink-soft hover:bg-paper",
                          )}
                        >
                          <span
                            className="size-2 rounded-full border border-black/20"
                            style={{ backgroundColor: v.colorSwatch }}
                          />
                          <span>{v.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="rounded-full bg-paper-raised px-2.5 py-1 text-[0.6875rem] font-semibold text-olive">
                      {activeBox.specs.material.split("&")[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Column: Physical Specifications & Atelier Narrative */}
              <div className="flex flex-col justify-between space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-terracotta">
                    <Award className="size-3" />
                    <span>{activeBox.badge}</span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-semibold text-ink mt-3">
                    {activeBox.tagline}
                  </h2>
                  <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
                    {activeBox.story}
                  </p>
                </div>

                {/* Material & Craftsmanship Specs Grid */}
                <div className="space-y-3 pt-4 border-t border-line text-[0.8125rem]">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-ink-muted font-medium">Material:</span>
                    <span className="text-ink font-semibold text-right max-w-[65%]">
                      {activeBox.specs.material}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-ink-muted font-medium">Capacity:</span>
                    <span className="text-ink font-semibold text-right max-w-[65%]">
                      {activeBox.specs.capacity}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-ink-muted font-medium">Centerpiece:</span>
                    <span className="text-ink font-semibold text-right max-w-[65%]">
                      {activeBox.specs.centerpiece}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-ink-muted font-medium">Heirloom Second Life:</span>
                    <span className="text-olive font-semibold text-right max-w-[65%]">
                      {activeBox.specs.secondLife}
                    </span>
                  </div>
                </div>

                {/* CTA to configure with this box */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={scrollToStudio}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-olive px-6 py-3 text-[0.875rem] font-semibold text-paper shadow-xs hover:bg-olive-deep transition-all cursor-pointer"
                  >
                    <span>Curate Gift with this Box</span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. THE CHIKKI CONSTELLATION (Interactive Variety Curator)     */}
      {/* ============================================================ */}
      <section id="constellation" className="container-page py-16 md:py-24 border-t border-line/80">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-4 py-1.5 text-[0.8125rem] font-semibold text-brass shadow-2xs">
            <Layers className="size-3.5 text-brass" />
            <span>The Seven Signature Varieties</span>
          </div>
          <h2 className="display-m mt-4 text-balance">
            The Chikki Constellation.
          </h2>
          <p className="mt-3 text-base text-ink-soft max-w-2xl mx-auto leading-relaxed">
            Every piece is cooked in small batches in Ahmedabad using pure, slow-simmered organic jaggery and zero liquid glucose. Tap any piece to inspect its flavor profile and curate your custom box assortment.
          </p>

          {/* Quick Filter & Curator Presets */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllVarieties}
              className={cn(
                "rounded-full px-4 py-1.5 text-[0.8125rem] font-semibold transition-all cursor-pointer",
                selectedVarieties.length === CHIKKI_VARIETIES.length
                  ? "bg-olive text-paper shadow-2xs"
                  : "border border-line bg-paper text-ink-soft hover:bg-paper-raised",
              )}
            >
              All 7 Varieties (Grand Assortment)
            </button>
            <button
              type="button"
              onClick={handleSelectNutTrio}
              className="rounded-full border border-line bg-paper px-4 py-1.5 text-[0.8125rem] font-semibold text-ink-soft hover:bg-paper-raised cursor-pointer"
            >
              Nut & Coconut Trio
            </button>
            <button
              type="button"
              onClick={handleSelectWinterTradition}
              className="rounded-full border border-line bg-paper px-4 py-1.5 text-[0.8125rem] font-semibold text-ink-soft hover:bg-paper-raised cursor-pointer"
            >
              Winter Sesame & Grain Quartet
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-[0.8125rem] font-medium text-ink-muted">
            <span>Selected for your box:</span>
            <span className="font-bold text-olive">
              {selectedVarieties.length} of {CHIKKI_VARIETIES.length} varieties
            </span>
          </div>
        </div>

        {/* Constellation Grid of 7 Handcrafted Pieces */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {CHIKKI_VARIETIES.map((variety) => {
            const isSelected = selectedVarieties.includes(variety.id);
            return (
              <div
                key={variety.id}
                className={cn(
                  "group relative flex flex-col justify-between rounded-3xl border p-5 transition-all duration-300 shadow-2xs hover:shadow-md",
                  isSelected
                    ? "border-olive/80 bg-paper ring-1 ring-olive/30"
                    : "border-line bg-paper-raised/70 opacity-80 hover:opacity-100 hover:border-line-strong",
                )}
              >
                <div>
                  {/* Image Canvas with Jewel Disc Effect */}
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-paper-deep border border-line shadow-inner">
                    <Image
                      src={variety.image}
                      alt={variety.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Top Pill: Gujarati name */}
                    <div className="absolute top-2.5 left-2.5 rounded-full bg-paper/90 backdrop-blur-xs px-2.5 py-0.5 text-[0.6875rem] font-bold text-ink-soft border border-line">
                      {variety.gujaratiName}
                    </div>

                    {/* Top Right: Selection Checkmark Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleVariety(variety.id)}
                      className={cn(
                        "absolute top-2.5 right-2.5 size-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm",
                        isSelected
                          ? "bg-olive text-paper scale-100"
                          : "bg-paper/90 text-ink-muted border border-line hover:text-ink",
                      )}
                      aria-label={`${isSelected ? "Remove" : "Add"} ${variety.name}`}
                    >
                      {isSelected ? <Check className="size-4 stroke-[3]" /> : <span className="size-2 rounded-full bg-ink-muted" />}
                    </button>
                  </div>

                  {/* Variety Title & Badge */}
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold text-ink">
                      {variety.name}
                    </h3>
                    <span className="text-[0.6875rem] font-semibold text-terracotta uppercase tracking-wider">
                      {variety.badge}
                    </span>
                  </div>

                  <p className="mt-1 text-[0.8125rem] text-ink-soft leading-snug">
                    {variety.highlight}
                  </p>

                  <div className="mt-3 pt-3 border-t border-line/60 space-y-1.5 text-[0.75rem]">
                    <p className="text-ink-muted">
                      <span className="font-semibold text-ink">Snap:</span> {variety.crunchProfile}
                    </p>
                    <p className="text-ink-muted line-clamp-1">
                      <span className="font-semibold text-ink">Notes:</span> {variety.flavorNotes}
                    </p>
                  </div>
                </div>

                {/* Bottom Action: Toggle / Inquire */}
                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveVarietyModal(variety)}
                    className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-ink-muted hover:text-olive transition-colors cursor-pointer"
                  >
                    <Info className="size-3" />
                    <span>Tasting Notes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleVariety(variety.id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-[0.75rem] font-semibold transition-all cursor-pointer",
                      isSelected
                        ? "bg-olive/15 text-olive hover:bg-olive hover:text-paper"
                        : "border border-line bg-paper text-ink-soft hover:bg-paper-deep hover:text-ink",
                    )}
                  >
                    {isSelected ? "Included in Box" : "+ Include in Box"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Tasting Profile Modal for Individual Variety */}
      {activeVarietyModal ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setActiveVarietyModal(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-paper p-6 sm:p-8 shadow-2xl border border-line-strong text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveVarietyModal(null)}
              className="absolute top-5 right-5 p-1 rounded-full text-ink-muted hover:text-ink hover:bg-paper-deep transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-paper-deep border border-line mb-5">
              <Image
                src={activeVarietyModal.image}
                alt={activeVarietyModal.name}
                fill
                className="object-cover"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-2xl font-semibold text-ink">
                {activeVarietyModal.name}
              </h3>
              <span className="text-[0.75rem] font-bold text-olive bg-olive/10 px-3 py-1 rounded-full">
                {activeVarietyModal.gujaratiName}
              </span>
            </div>

            <p className="mt-3 text-[0.875rem] text-ink-soft leading-relaxed">
              {activeVarietyModal.highlight}
            </p>

            <div className="mt-5 space-y-2.5 rounded-2xl bg-paper-raised p-4 border border-line text-[0.8125rem]">
              <p>
                <strong className="text-ink font-semibold">Texture & Snap:</strong>{" "}
                <span className="text-ink-soft">{activeVarietyModal.crunchProfile}</span>
              </p>
              <p>
                <strong className="text-ink font-semibold">Aroma & Flavor:</strong>{" "}
                <span className="text-ink-soft">{activeVarietyModal.flavorNotes}</span>
              </p>
              <p>
                <strong className="text-ink font-semibold">Pure Ingredients:</strong>{" "}
                <span className="text-ink-soft">{activeVarietyModal.ingredients}</span>
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveVarietyModal(null)}
                className="btn btn-outline btn-sm"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleToggleVariety(activeVarietyModal.id);
                  setActiveVarietyModal(null);
                }}
                className="btn btn-solid btn-sm"
              >
                {selectedVarieties.includes(activeVarietyModal.id)
                  ? "Remove from Box"
                  : "Add to Box Assortment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ============================================================ */}
      {/* 3. THE GIFT-MAKING STUDIO (Upgraded Interactive Configurator) */}
      {/* ============================================================ */}
      <section id="atelier-studio" className="container-page py-16 md:py-24 border-t border-line/80 scroll-mt-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-paper-raised px-4 py-1.5 text-[0.8125rem] font-semibold text-olive shadow-2xs">
            <Sliders className="size-3.5 text-olive" />
            <span>The Tailoring Studio</span>
          </div>
          <h2 className="display-m mt-4 text-balance">
            Compose your bespoke gift order.
          </h2>
          <p className="mt-3 text-base text-ink-soft max-w-2xl mx-auto leading-relaxed">
            Every gifting order is quoted individually. As you tailor each element below, your live composition and detailed enquiry brief stay completely synchronized.
          </p>
        </div>

        {/* Main Studio Grid: Left Options, Right Living Composition */}
        <div className="grid gap-10 lg:grid-cols-[1.3fr_0.9fr] lg:gap-14 items-start">
          {/* Left Column: The 5 Tailoring Steps */}
          <div className="space-y-10">
            {/* Step 1: Packaging Format & Finish */}
            <div className="rounded-3xl border border-line-strong/80 bg-paper-raised p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-[0.75rem] font-bold uppercase tracking-widest text-olive">
                  Step 1 — Choose Packaging Format
                </span>
                <span className="text-[0.75rem] font-medium text-ink-muted">
                  {GIFT_BOXES.length} heirloom formats
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {GIFT_BOXES.map((box) => {
                  const isSelected = box.id === selectedBoxId;
                  return (
                    <button
                      key={box.id}
                      type="button"
                      onClick={() => handleSelectBox(box.id)}
                      className={cn(
                        "group relative flex items-center gap-3.5 rounded-2xl border p-3 text-left transition-all cursor-pointer",
                        isSelected
                          ? "border-olive bg-paper ring-1 ring-olive shadow-xs"
                          : "border-line bg-paper/60 hover:border-line-strong hover:bg-paper",
                      )}
                    >
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-paper-deep">
                        <Image
                          src={box.views[0]?.image ?? ""}
                          alt={box.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[0.875rem] font-semibold text-ink truncate">
                            {box.name.replace("The ", "")}
                          </p>
                          {isSelected ? (
                            <CheckCircle2 className="size-4 shrink-0 text-olive" />
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[0.75rem] text-ink-soft line-clamp-1">
                          {box.specs.material}
                        </p>
                        <p className="mt-1 text-[0.6875rem] font-medium text-terracotta">
                          {box.badge}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Box Finish Switcher (for active box) */}
              {activeBox.views.length > 1 ? (
                <div className="mt-4 pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[0.8125rem] font-semibold text-ink">
                    Select Finish for {activeBox.name}:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {activeBox.views.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedViewId(v.id)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.75rem] font-medium transition-all cursor-pointer",
                          selectedViewId === v.id
                            ? "bg-olive text-paper font-semibold shadow-2xs"
                            : "border border-line bg-paper text-ink-soft hover:bg-paper-deep",
                        )}
                      >
                        {v.colorSwatch ? (
                          <span
                            className="size-2.5 rounded-full border border-black/20"
                            style={{ backgroundColor: v.colorSwatch }}
                          />
                        ) : null}
                        <span>{v.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Step 2: Selected Chikki Assortment */}
            <div className="rounded-3xl border border-line-strong/80 bg-paper-raised p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-[0.75rem] font-bold uppercase tracking-widest text-olive">
                  Step 2 — Curated Chikki Assortment
                </span>
                <span className="text-[0.75rem] font-medium text-olive font-semibold">
                  {chosenVarietiesList.length} varieties selected
                </span>
              </div>

              <p className="text-[0.8125rem] text-ink-soft mb-3">
                Select your preferred flavours below or explore the Constellation above:
              </p>

              <div className="flex flex-wrap gap-2">
                {CHIKKI_VARIETIES.map((v) => {
                  const isChecked = selectedVarieties.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleToggleVariety(v.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium transition-all cursor-pointer",
                        isChecked
                          ? "bg-olive text-paper font-semibold shadow-2xs"
                          : "border border-line bg-paper text-ink-soft hover:border-line-strong",
                      )}
                    >
                      <span>{v.name}</span>
                      {isChecked ? <Check className="size-3.5 stroke-[3]" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Occasion or Celebration */}
            <div className="rounded-3xl border border-line-strong/80 bg-paper-raised p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-[0.75rem] font-bold uppercase tracking-widest text-olive">
                  Step 3 — Occasion or Purpose
                </span>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {OCCASIONS.map((occ) => {
                  const isSelected = occ === selectedOccasion;
                  return (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => setSelectedOccasion(occ)}
                      className={cn(
                        "rounded-full px-4 py-2 text-[0.8125rem] font-medium transition-all cursor-pointer",
                        isSelected
                          ? "bg-olive text-paper shadow-2xs font-semibold"
                          : "border border-line bg-paper text-ink-soft hover:border-line-strong hover:text-ink",
                      )}
                    >
                      {occ}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Approximate Volume */}
            <div className="rounded-3xl border border-line-strong/80 bg-paper-raised p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-[0.75rem] font-bold uppercase tracking-widest text-olive">
                  Step 4 — Approximate Volume
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {QUANTITY_TIERS.map((tier) => {
                  const isSelected = tier.label === selectedTier;
                  return (
                    <button
                      key={tier.label}
                      type="button"
                      onClick={() => setSelectedTier(tier.label)}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-2xl border p-3.5 text-center transition-all cursor-pointer",
                        isSelected
                          ? "border-olive bg-paper ring-1 ring-olive shadow-2xs"
                          : "border-line bg-paper/60 hover:border-line-strong hover:bg-paper",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[0.9375rem] font-bold",
                          isSelected ? "text-olive" : "text-ink",
                        )}
                      >
                        {tier.label.split(" ")[0]}
                      </span>
                      <span className="text-[0.6875rem] text-ink-muted mt-0.5">
                        boxes
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 5: Bespoke Finishes */}
            <div className="rounded-3xl border border-line-strong/80 bg-paper-raised p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="text-[0.75rem] font-bold uppercase tracking-widest text-olive">
                  Step 5 — Bespoke Finishes & Delivery
                </span>
                <span className="text-[0.75rem] font-medium text-ink-muted">
                  Optional artisanal touches
                </span>
              </div>

              <div className="space-y-2.5">
                {BESPOKE_FINISHES.map((finish) => {
                  const isChecked = selectedFinishes.includes(finish.id);
                  const Icon = finish.icon;
                  return (
                    <label
                      key={finish.id}
                      className={cn(
                        "flex items-start gap-3.5 rounded-2xl border p-3.5 text-[0.875rem] transition-all cursor-pointer select-none",
                        isChecked
                          ? "border-olive/70 bg-paper shadow-2xs"
                          : "border-line bg-paper/50 hover:border-line-strong",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleFinish(finish.id)}
                        className="mt-1 size-4 rounded text-olive focus:ring-olive border-line"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 shrink-0 text-olive" />
                          <p className="font-semibold text-ink leading-snug">
                            {finish.label}
                          </p>
                        </div>
                        <p className="mt-1 text-[0.75rem] text-ink-soft leading-relaxed">
                          {finish.detail}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN: THE GRAND FINALE (Thoughtfully Composed Card)   */}
          {/* ============================================================ */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="rounded-3xl border border-line-strong bg-paper p-6 sm:p-8 shadow-md">
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-line">
                <div className="inline-flex items-center gap-2 text-[0.75rem] font-bold uppercase tracking-widest text-brass">
                  <Award className="size-4" />
                  <span>Your Composed Gift</span>
                </div>
                <span className="rounded-full bg-olive/10 px-2.5 py-0.5 text-[0.6875rem] font-bold text-olive">
                  Live Atelier Summary
                </span>
              </div>

              {/* Selected Box Snapshot */}
              <div className="mt-6 flex items-center gap-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-paper-deep border border-line shadow-xs">
                  <Image
                    src={activeView.image}
                    alt={activeBox.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-semibold text-ink truncate">
                    {activeBox.name}
                  </p>
                  <p className="text-[0.75rem] text-terracotta font-medium">
                    {activeView.label} · {activeBox.badge}
                  </p>
                  <p className="mt-1 text-[0.6875rem] text-ink-muted line-clamp-1">
                    {activeBox.specs.material}
                  </p>
                </div>
              </div>

              {/* Composition Breakdown */}
              <div className="mt-6 space-y-3 rounded-2xl bg-paper-raised p-4 border border-line text-[0.8125rem]">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-ink-muted font-medium">Occasion:</span>
                  <span className="text-ink font-semibold text-right">{selectedOccasion}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-ink-muted font-medium">Volume Tier:</span>
                  <span className="text-ink font-semibold text-right">{selectedTier}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-ink-muted font-medium">Chikki Assortment:</span>
                  <span className="text-olive font-semibold text-right">
                    {chosenVarietiesList.length} signature varieties
                  </span>
                </div>
              </div>

              {/* Assortment Badges */}
              <div className="mt-4">
                <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-ink-muted mb-2">
                  Curated Flavours ({chosenVarietiesList.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {chosenVarietiesList.map((v) => (
                    <span
                      key={v.id}
                      className="rounded-full bg-paper-deep px-2.5 py-1 text-[0.6875rem] font-medium text-ink-soft border border-line/60"
                    >
                      {v.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Selected Finishes */}
              {chosenFinishesList.length > 0 ? (
                <div className="mt-4">
                  <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-ink-muted mb-2">
                    Bespoke Presentation Touches:
                  </p>
                  <ul className="space-y-1 text-[0.75rem] text-ink-soft">
                    {chosenFinishesList.map((f) => (
                      <li key={f.id} className="flex items-center gap-1.5">
                        <Check className="size-3 text-olive shrink-0" />
                        <span className="truncate">{f.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Primary Actions */}
              <div className="mt-8 space-y-3 pt-6 border-t border-line">
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-olive px-6 py-3.5 text-[0.9375rem] font-semibold text-paper shadow-xs hover:bg-olive-deep hover:shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <MessageCircle className="size-4" />
                    <span>Start Gifting Enquiry via WhatsApp</span>
                  </a>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/contact#enquiry`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line-strong bg-paper px-4 py-2.5 text-[0.8125rem] font-semibold text-ink hover:bg-paper-raised transition-all cursor-pointer text-center"
                  >
                    <span>Website Enquiry</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleCopyBrief}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line-strong bg-paper px-4 py-2.5 text-[0.8125rem] font-semibold text-ink hover:bg-paper-raised transition-all cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3.5 text-olive" />
                        <span className="text-olive">Brief Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5 text-ink-muted" />
                        <span>Copy Brief</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quiet Brand Promise */}
              <p className="mt-4 text-center text-[0.6875rem] text-ink-muted leading-relaxed">
                Lead times and delivery options depend on your order size and date. We’ll confirm what’s possible before you commit.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Re-export compatible components so any legacy imports remain valid
export function GiftingShowcase() {
  return null;
}

export function GiftingConfigurator() {
  return null;
}
