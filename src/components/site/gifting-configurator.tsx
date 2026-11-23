"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Copy, MessageCircle, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { waLink } from "@/lib/phone";

interface BoxOption {
  id: string;
  name: string;
  image: string;
  material: string;
}

const BOX_OPTIONS: BoxOption[] = [
  {
    id: "royal-octagonal",
    name: "The Royal Octagonal Chest",
    image: "/gifting/royal-maroon-octagonal-box.jpg",
    material: "Carved Sheesham wood & solid brass clasp",
  },
  {
    id: "signature-blush",
    name: "The Signature Lotus Box",
    image: "/gifting/lotus-blush-box-ribbon.jpg",
    material: "800 GSM textured paper with gold foil lotus",
  },
  {
    id: "executive-compartment",
    name: "The Executive Hamper",
    image: "/gifting/royal-chocolate-gift-box.jpg",
    material: "Rigid matte chocolate board & golden mandalas",
  },
  {
    id: "peacock-tin",
    name: "The Peacock Heritage Tin",
    image: "/gifting/peacock-teal-round-box.jpg",
    material: "Seamless airtight embossed lacquer tin",
  },
];

const OCCASIONS = [
  "Corporate Milestones & Client Gifts",
  "Weddings & Bespoke Invitations",
  "Diwali & Festive Traditions",
  "Private Celebrations & Favours",
];

const QUANTITY_TIERS = [
  { label: "25 – 50 boxes", note: "Intimate gatherings & family" },
  { label: "50 – 100 boxes", note: "Festive gifting & celebrations" },
  { label: "100 – 250 boxes", note: "Wedding invites & client lists" },
  { label: "250 – 500+ boxes", note: "Enterprise corporate programs" },
];

const FINISHES = [
  { id: "logo", label: "Custom Branded Belly Band / Logo Sleeve" },
  { id: "ribbon", label: "Hand-Tied Golden Satin Ribbon & Wax Seal" },
  { id: "diya", label: "Solid Brass Lotus Centerpiece Diya" },
  { id: "card", label: "Personalized Calligraphy Greeting Card" },
  { id: "courier", label: "Multi-City White-Glove Courier Dispatch" },
];

export function GiftingConfigurator({
  selectedBoxId,
  whatsappNumber,
}: {
  selectedBoxId?: string;
  whatsappNumber?: string | null;
}) {
  const [chosenBoxId, setChosenBoxId] = useState<string>(
    selectedBoxId ?? "royal-octagonal",
  );
  const [chosenOccasion, setChosenOccasion] = useState<string>(OCCASIONS[0]);
  const [chosenTier, setChosenTier] = useState<string>(QUANTITY_TIERS[1].label);
  const [chosenFinishes, setChosenFinishes] = useState<string[]>([
    "ribbon",
    "diya",
  ]);
  const [copied, setCopied] = useState(false);

  const activeBox =
    BOX_OPTIONS.find((b) => b.id === chosenBoxId) ?? BOX_OPTIONS[0];

  const toggleFinish = (id: string) => {
    setChosenFinishes((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  const selectedFinishLabels = FINISHES.filter((f) =>
    chosenFinishes.includes(f.id),
  ).map((f) => f.label);

  const formattedBrief = `Hello GH Chikkis! I would like to enquire about a bespoke gifting order:
• Box Format: ${activeBox.name}
• Occasion: ${chosenOccasion}
• Approximate Volume: ${chosenTier}
• Desired Finishes: ${selectedFinishLabels.length > 0 ? selectedFinishLabels.join(", ") : "Standard presentation"}

Please let me know lead times and an individual quote for this requirement.`;

  const whatsappHref = whatsappNumber
    ? waLink(whatsappNumber, formattedBrief)
    : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedBrief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div
      id="configurator"
      className="scroll-mt-24 rounded-3xl border border-line-strong/60 bg-paper-raised p-6 sm:p-10 md:p-12 shadow-sm"
    >
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-[0.75rem] font-semibold text-olive uppercase tracking-wider">
          <Sparkles className="size-3" />
          Interactive Studio
        </div>
        <h2 className="display-m mt-3 text-balance">
          Configure your bespoke gifting order.
        </h2>
        <p className="mt-2 text-[0.9375rem] text-ink-soft">
          Select your packaging format, estimated quantity, and presentation finishes. Generate a complete brief in seconds for a bespoke quote.
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.3fr_0.9fr] lg:gap-14">
        {/* Left Column: Interactive Options */}
        <div className="space-y-8">
          {/* Step 1: Format */}
          <div>
            <label className="text-[0.75rem] font-bold uppercase tracking-widest text-ink-muted">
              Step 1 — Choose Packaging Format
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {BOX_OPTIONS.map((box) => {
                const isSelected = box.id === chosenBoxId;
                return (
                  <button
                    key={box.id}
                    type="button"
                    onClick={() => setChosenBoxId(box.id)}
                    className={cn(
                      "group relative flex items-center gap-3.5 rounded-2xl border p-3 text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-olive bg-paper ring-1 ring-olive shadow-xs"
                        : "border-line bg-paper/60 hover:border-line-strong hover:bg-paper",
                    )}
                  >
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-paper-deep">
                      <Image
                        src={box.image}
                        alt={box.name}
                        fill
                        sizes="56px"
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
                        {box.material}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Occasion */}
          <div>
            <label className="text-[0.75rem] font-bold uppercase tracking-widest text-ink-muted">
              Step 2 — Select Occasion or Purpose
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {OCCASIONS.map((occ) => {
                const isSelected = occ === chosenOccasion;
                return (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => setChosenOccasion(occ)}
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

          {/* Step 3: Volume */}
          <div>
            <label className="text-[0.75rem] font-bold uppercase tracking-widest text-ink-muted">
              Step 3 — Approximate Volume
            </label>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {QUANTITY_TIERS.map((tier) => {
                const isSelected = tier.label === chosenTier;
                return (
                  <button
                    key={tier.label}
                    type="button"
                    onClick={() => setChosenTier(tier.label)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all cursor-pointer",
                      isSelected
                        ? "border-olive bg-paper ring-1 ring-olive shadow-2xs"
                        : "border-line bg-paper/60 hover:border-line-strong hover:bg-paper",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[0.875rem] font-bold",
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

          {/* Step 4: Finishes */}
          <div>
            <label className="text-[0.75rem] font-bold uppercase tracking-widest text-ink-muted">
              Step 4 — Presentation & Bespoke Finishes
            </label>
            <div className="mt-3 space-y-2">
              {FINISHES.map((finish) => {
                const isChecked = chosenFinishes.includes(finish.id);
                return (
                  <label
                    key={finish.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 text-[0.875rem] transition-all cursor-pointer select-none",
                      isChecked
                        ? "border-olive/60 bg-paper font-medium text-ink shadow-2xs"
                        : "border-line bg-paper/40 text-ink-soft hover:bg-paper",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleFinish(finish.id)}
                      className="size-4 rounded border-line text-olive focus:ring-olive"
                    />
                    <span>{finish.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Specification Board */}
        <div>
          <div className="sticky top-24 rounded-2xl border border-line-strong/80 bg-paper p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between border-b border-line/60 pb-4">
              <div>
                <span className="text-[0.6875rem] font-bold uppercase tracking-widest text-terracotta">
                  Live Configuration
                </span>
                <h3 className="font-display text-lg font-semibold text-ink mt-0.5">
                  Order Summary
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-paper-raised px-2.5 py-1 text-[0.6875rem] font-medium text-ink hover:bg-paper-deep transition-colors cursor-pointer"
                title="Copy configuration text"
              >
                {copied ? (
                  <>
                    <Check className="size-3 text-olive" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3 text-ink-soft" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Selected box miniature */}
            <div className="mt-5 flex items-center gap-3.5 rounded-xl border border-line/50 bg-paper-raised p-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-paper-deep">
                <Image
                  src={activeBox.image}
                  alt={activeBox.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[0.875rem] font-semibold text-ink truncate">
                  {activeBox.name}
                </p>
                <p className="text-[0.75rem] text-ink-soft truncate">
                  {activeBox.material}
                </p>
              </div>
            </div>

            {/* Config summary details */}
            <dl className="mt-5 space-y-2.5 text-[0.8125rem]">
              <div className="flex items-baseline justify-between border-b border-line/40 pb-2">
                <dt className="text-ink-muted">Occasion:</dt>
                <dd className="font-medium text-ink text-right truncate max-w-[60%]">
                  {chosenOccasion}
                </dd>
              </div>
              <div className="flex items-baseline justify-between border-b border-line/40 pb-2">
                <dt className="text-ink-muted">Volume:</dt>
                <dd className="font-medium text-ink text-right">
                  {chosenTier}
                </dd>
              </div>
              <div className="flex items-start justify-between border-b border-line/40 pb-2">
                <dt className="text-ink-muted shrink-0">Finishes:</dt>
                <dd className="font-medium text-ink text-right text-[0.75rem]">
                  {selectedFinishLabels.length > 0
                    ? `${selectedFinishLabels.length} custom options selected`
                    : "Standard packaging"}
                </dd>
              </div>
            </dl>

            <div className="mt-5 rounded-lg bg-paper-deep/60 p-3 text-[0.75rem] text-ink-soft leading-relaxed">
              Every order is quoted individually based on current artisan kitchen scheduling and requested date.
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-2.5">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-olive px-4 py-2.5 text-[0.875rem] font-semibold text-paper shadow-2xs hover:bg-olive-deep transition-all cursor-pointer"
                >
                  <MessageCircle className="size-4" />
                  <span>Send Brief via WhatsApp</span>
                </a>
              ) : null}

              <Link
                href="/contact#enquiry"
                className="flex w-full items-center justify-center gap-2 rounded-full border border-line-strong bg-paper-raised px-4 py-2.5 text-[0.875rem] font-semibold text-ink hover:bg-paper-deep transition-all cursor-pointer"
              >
                <span>Submit Website Enquiry</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
