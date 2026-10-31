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

type Nut = { x: number; y: number; rx: number; ry: number; rotate: number };

const PEANUTS: Nut[] = [
  { x: 46, y: 30, rx: 17, ry: 11, rotate: -14 },
  { x: 92, y: 52, rx: 16, ry: 10, rotate: 22 },
  { x: 138, y: 26, rx: 18, ry: 11, rotate: 8 },
  { x: 186, y: 48, rx: 15, ry: 10, rotate: -26 },
  { x: 232, y: 28, rx: 17, ry: 11, rotate: 16 },
  { x: 70, y: 70, rx: 14, ry: 9, rotate: 34 },
  { x: 160, y: 74, rx: 15, ry: 9, rotate: -8 },
  { x: 258, y: 62, rx: 13, ry: 8, rotate: 26 },
];

const SESAME: Nut[] = [
  { x: 34, y: 22, rx: 5, ry: 2.6, rotate: 18 },
  { x: 62, y: 44, rx: 5, ry: 2.6, rotate: -32 },
  { x: 96, y: 20, rx: 5, ry: 2.6, rotate: 62 },
  { x: 124, y: 56, rx: 5, ry: 2.6, rotate: 8 },
  { x: 152, y: 30, rx: 5, ry: 2.6, rotate: -48 },
  { x: 182, y: 66, rx: 5, ry: 2.6, rotate: 28 },
  { x: 210, y: 24, rx: 5, ry: 2.6, rotate: -12 },
  { x: 238, y: 52, rx: 5, ry: 2.6, rotate: 44 },
  { x: 266, y: 30, rx: 5, ry: 2.6, rotate: -26 },
  { x: 48, y: 66, rx: 5, ry: 2.6, rotate: 52 },
];

function NutShape({ nut, dark }: { nut: Nut; dark: boolean }) {
  return (
    <ellipse
      cx={nut.x}
      cy={nut.y}
      rx={nut.rx}
      ry={nut.ry}
      transform={`rotate(${nut.rotate} ${nut.x} ${nut.y})`}
      fill={dark ? "#3f2a12" : "url(#chikki-nut)"}
      stroke={dark ? "#2b1c0b" : "#a4702e"}
      strokeWidth={dark ? 0.8 : 1.1}
      opacity={dark ? 0.85 : 1}
    />
  );
}

function Bar({
  transform,
  width = 300,
  height = 96,
  dark,
  seeds,
}: {
  transform: string;
  width?: number;
  height?: number;
  dark: boolean;
  seeds: Nut[];
}) {
  return (
    <g transform={transform}>
      <rect
        x={4}
        y={height - 14}
        width={width - 8}
        height={22}
        rx={12}
        fill="url(#chikki-edge)"
      />
      <rect x={0} y={0} width={width} height={height} rx={16} fill="url(#chikki-face)" />
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={16}
        fill="none"
        stroke="#8a5a24"
        strokeWidth={1.6}
        opacity={0.55}
      />
      <rect x={12} y={7} width={width - 24} height={9} rx={5} fill="#fff" opacity={0.16} />
      {seeds.map((nut, index) => (
        <NutShape key={index} nut={nut} dark={dark} />
      ))}
    </g>
  );
}

export function ChikkiStack({ className }: { className?: string }) {
  return (
    <figure className={cn("", className)}>
      <svg
        viewBox="0 0 520 460"
        role="img"
        aria-label="Illustration of handmade chikki bars with peanuts and sesame"
        className="h-auto w-full"
      >
        <defs>
          <linearGradient id="chikki-face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dda45c" />
            <stop offset="48%" stopColor="#c5813a" />
            <stop offset="100%" stopColor="#a2652a" />
          </linearGradient>
          <linearGradient id="chikki-edge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8a5a24" />
            <stop offset="100%" stopColor="#63401a" />
          </linearGradient>
          <linearGradient id="chikki-nut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fdf4e2" />
            <stop offset="100%" stopColor="#e8d3a8" />
          </linearGradient>
          <radialGradient id="chikki-glow" cx="50%" cy="40%" r="62%">
            <stop offset="0%" stopColor="#fff7e6" />
            <stop offset="70%" stopColor="#f3e6ca" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f3e6ca" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="260" cy="222" rx="248" ry="206" fill="url(#chikki-glow)" />
        <ellipse cx="256" cy="386" rx="182" ry="24" fill="#c2ab84" opacity="0.4" />

        <Bar transform="translate(96 132) rotate(-7)" dark={false} seeds={PEANUTS} />
        <Bar
          transform="translate(148 232) rotate(4)"
          width={244}
          height={78}
          dark
          seeds={SESAME}
        />

        <g transform="translate(372 300) rotate(26)">
          <rect x={2} y={30} width={84} height={14} rx={7} fill="url(#chikki-edge)" />
          <rect x={0} y={0} width={88} height={40} rx={12} fill="url(#chikki-face)" />
          <path d="M0 0L34 0L22 40L0 40Z" fill="#f6f1e6" opacity="0.5" />
          <ellipse cx={58} cy={18} rx={12} ry={8} transform="rotate(-12 58 18)" fill="url(#chikki-nut)" stroke="#a4702e" strokeWidth={1.1} />
          <ellipse cx={34} cy={28} rx={5} ry={2.6} transform="rotate(30 34 28)" fill="#3f2a12" opacity={0.8} />
        </g>

        <g fill="#b98a4a" opacity="0.75">
          <circle cx="126" cy="356" r="4" />
          <circle cx="150" cy="372" r="2.6" />
          <circle cx="404" cy="368" r="3.4" />
          <circle cx="428" cy="352" r="2.2" />
          <circle cx="196" cy="386" r="2" />
        </g>

        <rect
          x="255"
          y="42"
          width="9"
          height="9"
          transform="rotate(45 259.5 46.5)"
          fill={BRASS}
        />
      </svg>
      <figcaption className="meta mt-4 text-center">
        An illustrated study of the cut — not a photograph of a batch.
      </figcaption>
    </figure>
  );
}
