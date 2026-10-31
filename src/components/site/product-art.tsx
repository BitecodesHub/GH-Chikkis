import Image from "next/image";
import { cn } from "@/lib/cn";

const OLIVE = "var(--color-olive)";
const PAPER = "var(--color-paper-raised)";
const PAPER_DEEP = "var(--color-paper-deep)";
const BRASS = "var(--color-brass)";

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label={label} className="h-full w-full">
      <rect width="240" height="240" rx="26" fill={PAPER_DEEP} />
      {children}
      <rect
        x="112"
        y="26"
        width="7"
        height="7"
        transform="rotate(45 115.5 29.5)"
        fill={BRASS}
      />
    </svg>
  );
}

function Peanut({
  x,
  y,
  rotate,
  scale = 1,
}: {
  x: number;
  y: number;
  rotate: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path
        d="M-34 0C-34-17-20-24-10-15C-4-10 4-10 10-15C20-24 34-17 34 0C34 17 20 24 10 15C4 10-4 10-10 15C-20 24-34 17-34 0Z"
        fill={PAPER}
        stroke={OLIVE}
        strokeWidth="2.5"
      />
      <path d="M-16-8C-8-3-8 3-16 8M0-2C6 1 6 5 0 10M16-8C24-3 24 3 16 8" stroke={BRASS} strokeWidth="1.5" fill="none" />
    </g>
  );
}

function Seeds({ dark }: { dark: boolean }) {
  const seeds = Array.from({ length: 17 }, (_, index) => {
    const angle = (index * 137.5 * Math.PI) / 180;
    const radius = 14 + (index % 5) * 18;
    return {
      x: 120 + Math.cos(angle) * radius,
      y: 124 + Math.sin(angle) * radius * 0.82,
      rotate: (index * 61) % 180,
    };
  });
  return (
    <>
      {seeds.map((seed, index) => (
        <ellipse
          key={index}
          cx={seed.x}
          cy={seed.y}
          rx="7"
          ry="3.4"
          transform={`rotate(${seed.rotate} ${seed.x} ${seed.y})`}
          fill={dark ? OLIVE : PAPER}
          stroke={dark ? "var(--color-olive-deep)" : BRASS}
          strokeWidth="1.2"
        />
      ))}
    </>
  );
}

function Almond({ x, y, rotate, scale = 1 }: { x: number; y: number; rotate: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path
        d="M0-22C15-22 19-5 0 24C-19-5-15-22 0-22Z"
        fill={PAPER}
        stroke={OLIVE}
        strokeWidth="2.5"
      />
      <path d="M0-14V14" stroke={BRASS} strokeWidth="1.4" />
    </g>
  );
}

function Cashew({ x, y, rotate, scale = 1 }: { x: number; y: number; rotate: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path
        d="M-16-12C4-28 26-8 13 12C7 21-2 23-9 18"
        fill="none"
        stroke={OLIVE}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M-16-12C4-28 26-8 13 12C7 21-2 23-9 18"
        fill="none"
        stroke={PAPER}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </g>
  );
}

function Shred({ x, y, rotate, width = 54 }: { x: number; y: number; rotate: number; width?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path
        d={`M${-width / 2} 0C${-width / 4} -14 ${width / 4} -14 ${width / 2} 0`}
        fill="none"
        stroke={OLIVE}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d={`M${-width / 2} 0C${-width / 4} -14 ${width / 4} -14 ${width / 2} 0`}
        fill="none"
        stroke={PAPER}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </g>
  );
}

function Mound({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M-30 18C-30-2-16-14 0-14C16-14 30-2 30 18Z"
        fill={PAPER}
        stroke={OLIVE}
        strokeWidth="2.5"
      />
      <path d="M-18 6C-10-2 10-2 18 6" stroke={BRASS} strokeWidth="1.6" fill="none" />
    </g>
  );
}

function Grain({ x, y, rotate, scale = 1 }: { x: number; y: number; rotate: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <path
        d="M0-16C8-8 8 8 0 16C-8 8-8-8 0-16Z"
        fill={PAPER}
        stroke={OLIVE}
        strokeWidth="2.2"
      />
      <path d="M0-10V10" stroke={BRASS} strokeWidth="1.2" />
    </g>
  );
}

function Art({ slug }: { slug: string }) {
  switch (slug) {
    case "groundnut-chikki":
      return (
        <Frame label="Line illustration of groundnuts">
          <Peanut x={94} y={96} rotate={-20} scale={0.9} />
          <Peanut x={148} y={132} rotate={16} scale={1.05} />
          <Peanut x={104} y={166} rotate={48} scale={0.62} />
        </Frame>
      );
    case "white-til-chikki":
      return (
        <Frame label="Illustration of white sesame seeds">
          <Seeds dark={false} />
        </Frame>
      );
    case "black-til-chikki":
      return (
        <Frame label="Illustration of black sesame seeds">
          <Seeds dark />
        </Frame>
      );
    case "dry-fruit-chikki":
      return (
        <Frame label="Line illustration of dry fruits">
          <Almond x={92} y={92} rotate={-24} scale={0.9} />
          <Cashew x={148} y={92} rotate={18} scale={0.8} />
          <Almond x={122} y={158} rotate={18} scale={0.7} />
          <circle cx="168" cy="154" r="13" fill={PAPER} stroke={OLIVE} strokeWidth="2.5" />
          <path d="M160 154H176" stroke={BRASS} strokeWidth="1.6" />
        </Frame>
      );
    case "coconut-chikki":
      return (
        <Frame label="Line illustration of coconut shreds">
          <Shred x={112} y={92} rotate={-14} />
          <Shred x={128} y={126} rotate={8} width={64} />
          <Shred x={104} y={160} rotate={22} width={48} />
          <Shred x={152} y={72} rotate={44} width={34} />
        </Frame>
      );
    case "mawa-chikki":
      return (
        <Frame label="Line illustration of milk sweets">
          <Mound x={92} y={140} />
          <Mound x={148} y={144} scale={0.8} />
          <Mound x={120} y={100} scale={0.62} />
          <path
            d="M120 60C127 68 127 76 120 82C113 76 113 68 120 60Z"
            fill={PAPER}
            stroke={BRASS}
            strokeWidth="2"
          />
        </Frame>
      );
    case "daliya-chikki":
      return (
        <Frame label="Line illustration of wheat grains">
          <path d="M120 176V74" stroke={OLIVE} strokeWidth="3" strokeLinecap="round" />
          <Grain x={104} y={92} rotate={-38} />
          <Grain x={136} y={92} rotate={38} />
          <Grain x={104} y={124} rotate={-38} />
          <Grain x={136} y={124} rotate={38} />
          <Grain x={120} y={64} rotate={0} scale={0.85} />
        </Frame>
      );
    default:
      return (
        <Frame label="Decorative chikki illustration">
          <Seeds dark={false} />
        </Frame>
      );
  }
}

export function ProductArt({ slug, className }: { slug: string; className?: string }) {
  return (
    <div className={cn("aspect-square overflow-hidden", className)}>
      <Art slug={slug} />
    </div>
  );
}

const PHOTOS: Record<string, string> = {
  "groundnut-chikki": "Groundnut chikki cut into squares in a cream bowl",
  "dry-fruit-chikki": "Dry fruit chikki with almonds, cashews and pistachios",
  "coconut-chikki": "Coconut and sesame chikki cut into squares in a cream bowl",
};

export function ProductPhoto({
  slug,
  className,
  sizes = "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 46vw",
  priority = false,
}: {
  slug: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const alt = PHOTOS[slug];
  if (!alt) return <ProductArt slug={slug} className={className} />;
  return (
    <Image
      src={`/products/${slug}.jpg`}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={cn("object-cover", className)}
    />
  );
}

