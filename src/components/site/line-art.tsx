import { cn } from "@/lib/cn";

const OLIVE = "var(--color-olive)";
const OLIVE_DEEP = "var(--color-olive-deep)";
const OLIVE_SOFT = "var(--color-olive-soft)";
const PAPER = "var(--color-paper-raised)";
const PAPER_DEEP = "var(--color-paper-deep)";
const BRASS = "var(--color-brass)";
const JAGGERY = "var(--color-terracotta-soft)";
const JAGGERY_DEEP = "var(--color-terracotta)";
const LINE = "var(--color-line-strong)";

/* ------------------------------------------------------------------ *
 * Ingredients
 * ------------------------------------------------------------------ */

export type Shape =
  | "peanut"
  | "seed"
  | "seed-dark"
  | "almond"
  | "cashew"
  | "raisin"
  | "shred"
  | "flake"
  | "grain";

export interface PieceDef {
  shape: Shape;
  x: number;
  y: number;
  r?: number;
  s?: number;
}

export function Peanut({
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
      <path
        d="M-16-8C-8-3-8 3-16 8M0-2C6 1 6 5 0 10M16-8C24-3 24 3 16 8"
        stroke={BRASS}
        strokeWidth="1.5"
        fill="none"
      />
    </g>
  );
}

export function Seed({
  x,
  y,
  rotate,
  scale = 1,
  dark = false,
}: {
  x: number;
  y: number;
  rotate: number;
  scale?: number;
  dark?: boolean;
}) {
  const cx = x;
  const cy = y;
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={7 * scale}
      ry={3.4 * scale}
      transform={`rotate(${rotate} ${cx} ${cy})`}
      fill={dark ? OLIVE : PAPER}
      stroke={dark ? OLIVE_DEEP : BRASS}
      strokeWidth="1.2"
    />
  );
}

export function Almond({
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
      <path d="M0-22C15-22 19-5 0 24C-19-5-15-22 0-22Z" fill={PAPER} stroke={OLIVE} strokeWidth="2.5" />
      <path d="M0-14V14" stroke={BRASS} strokeWidth="1.4" />
    </g>
  );
}

export function Cashew({
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

export function Raisin({ x, y, rotate }: { x: number; y: number; rotate: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <ellipse rx="9" ry="7" fill={PAPER} stroke={OLIVE} strokeWidth="2.2" />
      <path d="M-5 0C-2-3 2 3 5 0" stroke={BRASS} strokeWidth="1.3" fill="none" />
    </g>
  );
}

export function Shred({
  x,
  y,
  rotate,
  width = 54,
}: {
  x: number;
  y: number;
  rotate: number;
  width?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path
        d={`M${-width / 2} 0C${-width / 4} -14 ${width / 4} -14 ${width / 2} 0`}
        fill="none"
        stroke={OLIVE}
        strokeWidth={Math.max(4, width * 0.17)}
        strokeLinecap="round"
      />
      <path
        d={`M${-width / 2} 0C${-width / 4} -14 ${width / 4} -14 ${width / 2} 0`}
        fill="none"
        stroke={PAPER}
        strokeWidth={Math.max(2.4, width * 0.1)}
        strokeLinecap="round"
      />
    </g>
  );
}

export function Flake({
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
        d="M-24-3C-24-13-13-16 0-16C13-16 24-13 24-3C24 8 13 15 0 15C-13 15-24 8-24-3Z"
        fill={PAPER}
        stroke={OLIVE}
        strokeWidth="2.4"
      />
      <path d="M-14-4C-7-9 7-9 14-4" stroke={BRASS} strokeWidth="1.4" fill="none" />
    </g>
  );
}

export function Grain({
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
      <path d="M0-16C8-8 8 8 0 16C-8 8-8-8 0-16Z" fill={PAPER} stroke={OLIVE} strokeWidth="2.2" />
      <path d="M0-10V10" stroke={BRASS} strokeWidth="1.2" />
    </g>
  );
}

export function Piece({ shape, x, y, r = 0, s = 1 }: PieceDef) {
  switch (shape) {
    case "peanut":
      return <Peanut x={x} y={y} rotate={r} scale={s} />;
    case "seed":
      return <Seed x={x} y={y} rotate={r} scale={s} />;
    case "seed-dark":
      return <Seed x={x} y={y} rotate={r} scale={s} dark />;
    case "almond":
      return <Almond x={x} y={y} rotate={r} scale={s} />;
    case "cashew":
      return <Cashew x={x} y={y} rotate={r} scale={s} />;
    case "raisin":
      return <Raisin x={x} y={y} rotate={r} />;
    case "shred":
      return <Shred x={x} y={y} rotate={r} width={54 * s} />;
    case "flake":
      return <Flake x={x} y={y} rotate={r} scale={s} />;
    case "grain":
      return <Grain x={x} y={y} rotate={r} scale={s} />;
  }
}

/* ------------------------------------------------------------------ *
 * Kitchenware
 * ------------------------------------------------------------------ */

export function Bowl({
  cx = 120,
  cy = 150,
  rx = 52,
  depth,
  mouth = PAPER,
  handles = false,
}: {
  cx?: number;
  cy?: number;
  rx?: number;
  depth?: number;
  mouth?: string;
  handles?: boolean;
}) {
  const d = depth ?? rx * 0.72;
  const left = cx - rx;
  const right = cx + rx;
  const bottom = cy + d;
  const baseLeft = cx - rx * 0.44;
  const baseRight = cx + rx * 0.44;
  return (
    <g>
      <path
        d={`M${left} ${cy}Q${left + 3} ${bottom} ${baseLeft} ${bottom}H${baseRight}Q${right - 3} ${bottom} ${right} ${cy}Z`}
        fill={PAPER}
        stroke={OLIVE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {handles ? (
        <>
          <path
            d={`M${left - 3} ${cy + 5}q-9-1-9-9`}
            fill="none"
            stroke={OLIVE}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d={`M${right + 3} ${cy + 5}q9-1 9-9`}
            fill="none"
            stroke={OLIVE}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : null}
      <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.2} fill={mouth} stroke={OLIVE} strokeWidth="3" />
    </g>
  );
}

function Flame({
  x,
  y,
  scale = 1,
  delay = "",
}: {
  x: number;
  y: number;
  scale?: number;
  delay?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className={cn("art-flicker", delay)}>
        <path
          d="M0-34c9 12 15 16 15 22 0 9-6 12-15 12s-15-3-15-12c0-6 6-10 15-22Z"
          fill={JAGGERY}
          stroke={JAGGERY_DEEP}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <ellipse cx="0" cy="-8" rx="6" ry="8.5" fill={BRASS} opacity="0.8" />
      </g>
    </g>
  );
}

export function Bar({
  x,
  y,
  rotate,
  width = 44,
  delay = "",
}: {
  x: number;
  y: number;
  rotate: number;
  width?: number;
  delay?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <g className={cn("art-fall", delay)}>
        <rect
          x={-width / 2}
          y={-8}
          width={width}
          height={16}
          rx={4}
          fill={JAGGERY}
          fillOpacity="0.28"
          stroke={OLIVE}
          strokeWidth="2.4"
        />
        <circle cx={-width * 0.22} cy={0} r={2.4} fill={BRASS} />
        <circle cx={width * 0.06} cy={-2} r={2.4} fill={BRASS} />
        <circle cx={width * 0.26} cy={2} r={2.4} fill={BRASS} />
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ *
 * Tile frame
 * ------------------------------------------------------------------ */

function Tile({
  label,
  decorative = false,
  children,
}: {
  label: string;
  decorative?: boolean;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 240 240"
      className="h-full w-full"
      role={decorative ? "presentation" : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
    >
      <rect width="240" height="240" rx="26" fill={PAPER_DEEP} />
      {children}
      <rect x="112" y="26" width="7" height="7" transform="rotate(45 115.5 29.5)" fill={BRASS} />
    </svg>
  );
}

/* ------------------------------------------------------------------ *
 * Process scenes
 * ------------------------------------------------------------------ */

function CookScene() {
  return (
    <>
      <path
        d="M92 110c-7-12 5-18-1-30"
        fill="none"
        stroke={OLIVE_SOFT}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.6"
        className="art-steam"
      />
      <path
        d="M116 106c-7-12 5-18-1-30"
        fill="none"
        stroke={OLIVE_SOFT}
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.45"
        className="art-steam art-steam-2"
      />
      <path d="M62 220h116" stroke={OLIVE} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <Flame x={84} y={216} scale={0.5} delay="art-flicker-2" />
      <Flame x={156} y={216} scale={0.5} delay="art-flicker-3" />
      <Flame x={120} y={214} />
      <Bowl cx={120} cy={134} rx={58} depth={42} handles mouth={JAGGERY} />
      <path d="M84 126h17l-4 9H88Z" fill={JAGGERY_DEEP} opacity="0.85" />
      <path d="M104 140c11-5 24 5 34-1" fill="none" stroke={BRASS} strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
      <g className="art-stir">
        <path d="M180 50L146 112" stroke={OLIVE} strokeWidth="5" strokeLinecap="round" />
        <ellipse
          cx={139}
          cy={122}
          rx={16}
          ry={9}
          transform="rotate(-26 139 122)"
          fill={PAPER}
          stroke={OLIVE}
          strokeWidth="3"
        />
      </g>
    </>
  );
}

function PourScene() {
  return (
    <>
      <Bowl cx={104} cy={168} rx={50} depth={34} />
      <Piece shape="peanut" x={86} y={164} r={-14} s={0.24} />
      <Piece shape="peanut" x={122} y={167} r={16} s={0.2} />
      <Piece shape="seed-dark" x={104} y={172} r={24} s={0.8} />
      <g transform="translate(158 78) rotate(-150)">
        <g className="art-rock">
          <path
            d="M-22-16C-22 8-12 18 0 18C12 18 22 8 22-16Z"
            fill={PAPER}
            stroke={OLIVE}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <ellipse cx="0" cy="-16" rx="22" ry="6" fill={PAPER_DEEP} stroke={OLIVE} strokeWidth="3" />
        </g>
      </g>
      <path
        d="M132 88C130 108 122 126 112 162"
        fill="none"
        stroke={JAGGERY}
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.35"
        className="art-flow-under"
      />
      <path
        d="M132 88C130 108 122 126 112 162"
        fill="none"
        stroke={JAGGERY}
        strokeWidth="4.5"
        strokeLinecap="round"
        className="art-flow"
      />
      <circle cx={126} cy={158} r={2.6} fill={JAGGERY} className="art-drop" />
      <circle cx={98} cy={154} r={2} fill={JAGGERY} opacity="0.8" className="art-drop" />
    </>
  );
}

function PressScene() {
  return (
    <>
      <path d="M32 196h176" stroke={OLIVE} strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      <rect x="52" y="158" width="136" height="34" rx="6" fill={PAPER} stroke={OLIVE} strokeWidth="3" />
      <circle cx={78} cy={172} r={4} fill={PAPER} stroke={BRASS} strokeWidth="1.6" />
      <circle cx={110} cy={183} r={4} fill={PAPER} stroke={BRASS} strokeWidth="1.6" />
      <circle cx={152} cy={170} r={4} fill={PAPER} stroke={BRASS} strokeWidth="1.6" />
      <circle cx={176} cy={182} r={4} fill={PAPER} stroke={BRASS} strokeWidth="1.6" />
      <path
        d="M56 130h128"
        stroke={LINE}
        strokeWidth="2.5"
        strokeDasharray="7 9"
        strokeLinecap="round"
      />
      <g className="art-press">
        <path
          d="M64 138v12m-4-5l4 5 4-5"
          fill="none"
          stroke={OLIVE_SOFT}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M176 138v12m-4-5l4 5 4-5"
          fill="none"
          stroke={OLIVE_SOFT}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <g className="art-roll">
        <path d="M76 108H56M164 108h20" stroke={OLIVE} strokeWidth="4" strokeLinecap="round" />
        <circle cx={54} cy={108} r={5.5} fill={BRASS} />
        <circle cx={186} cy={108} r={5.5} fill={BRASS} />
        <rect x="76" y="96" width="88" height="24" rx="12" fill={PAPER} stroke={OLIVE} strokeWidth="3" />
        <path
          d="M92 108h56"
          stroke={BRASS}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
        />
      </g>
    </>
  );
}

function CutScene() {
  return (
    <>
      <rect x="44" y="150" width="152" height="34" rx="6" fill={PAPER} stroke={OLIVE} strokeWidth="3" />
      <circle cx={66} cy={164} r={3.6} fill={PAPER} stroke={BRASS} strokeWidth="1.6" />
      <circle cx={112} cy={176} r={3.6} fill={PAPER} stroke={BRASS} strokeWidth="1.6" />
      <circle cx={178} cy={166} r={3.6} fill={PAPER} stroke={BRASS} strokeWidth="1.6" />
      <path d="M88 152v30M134 152v30" stroke={OLIVE} strokeWidth="2.2" opacity="0.65" />
      <g transform="translate(166 116)">
        <g className="art-slice">
          <path
            d="M-15-8H15V22L-15 36Z"
            fill={PAPER}
            stroke={OLIVE}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M-11 30L13 19" stroke={BRASS} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
          <rect x="-8" y="-48" width="16" height="40" rx="7" fill={OLIVE_DEEP} />
          <circle cx="0" cy="-28" r="2.4" fill={BRASS} />
        </g>
      </g>
    </>
  );
}

function WrapScene() {
  return (
    <>
      <Bar x={120} y={62} rotate={-6} delay="art-fall-2" />
      <Bar x={96} y={90} rotate={9} width={38} delay="art-fall-3" />
      <Bar x={142} y={114} rotate={-14} width={34} />
      <rect x="78" y="150" width="84" height="42" rx="6" fill={PAPER} stroke={OLIVE} strokeWidth="3" />
      <path d="M120 152v38" stroke={BRASS} strokeWidth="3.5" strokeLinecap="round" />
      <rect x="70" y="137" width="100" height="15" rx="5" fill={PAPER} stroke={OLIVE} strokeWidth="3" />
      <rect x="79" y="140" width="82" height="6" rx="3" fill={PAPER_DEEP} />
      <path d="M120 139v12" stroke={BRASS} strokeWidth="3.5" strokeLinecap="round" />
    </>
  );
}

const PROCESS_SCENES: { label: string; Scene: () => React.ReactNode }[] = [
  { label: "Illustration of jaggery melting in a vessel over a flame", Scene: CookScene },
  { label: "Illustration of ghee poured from a pot into a vessel of nuts", Scene: PourScene },
  { label: "Illustration of a rolling pin pressing a slab of chikki", Scene: PressScene },
  { label: "Illustration of a knife cutting the warm slab into pieces", Scene: CutScene },
  { label: "Illustration of chikki pieces being packed into a box", Scene: WrapScene },
];

export function ProcessArt({
  step,
  decorative = false,
  className,
}: {
  step: number;
  decorative?: boolean;
  className?: string;
}) {
  const index = ((step % PROCESS_SCENES.length) + PROCESS_SCENES.length) % PROCESS_SCENES.length;
  const { label, Scene } = PROCESS_SCENES[index];
  return (
    <div className={cn("aspect-square overflow-hidden", className)}>
      <Tile label={label} decorative={decorative}>
        <Scene />
      </Tile>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Ingredient scenes — the variety going into the vessel
 * ------------------------------------------------------------------ */

interface VarietyArt {
  label: string;
  settled: PieceDef[];
  falling: PieceDef[];
}

const VARIETIES: Record<string, VarietyArt> = {
  "groundnut-chikki": {
    label: "Line illustration of groundnuts falling into a vessel",
    settled: [
      { shape: "peanut", x: 92, y: 150, r: -16, s: 0.36 },
      { shape: "peanut", x: 140, y: 154, r: 14, s: 0.32 },
      { shape: "peanut", x: 116, y: 142, r: 42, s: 0.26 },
    ],
    falling: [
      { shape: "peanut", x: 118, y: 48, r: -22, s: 0.5 },
      { shape: "peanut", x: 80, y: 92, r: 18, s: 0.38 },
      { shape: "peanut", x: 158, y: 108, r: -6, s: 0.34 },
    ],
  },
  "white-til-chikki": {
    label: "Line illustration of white sesame seeds falling into a vessel",
    settled: [
      { shape: "seed", x: 86, y: 150, r: 20, s: 1.3 },
      { shape: "seed", x: 110, y: 157, r: -16, s: 1.3 },
      { shape: "seed", x: 136, y: 149, r: 34, s: 1.3 },
      { shape: "seed", x: 160, y: 156, r: -8, s: 1.2 },
      { shape: "seed", x: 98, y: 141, r: 12, s: 1.05 },
      { shape: "seed", x: 146, y: 140, r: -30, s: 1.05 },
    ],
    falling: [
      { shape: "seed", x: 116, y: 50, r: 18, s: 1.9 },
      { shape: "seed", x: 86, y: 90, r: -28, s: 1.6 },
      { shape: "seed", x: 152, y: 106, r: 44, s: 1.5 },
      { shape: "seed", x: 130, y: 72, r: 8, s: 1.35 },
    ],
  },
  "black-til-chikki": {
    label: "Line illustration of black sesame seeds falling into a vessel",
    settled: [
      { shape: "seed-dark", x: 86, y: 151, r: 18, s: 1.3 },
      { shape: "seed-dark", x: 112, y: 158, r: -26, s: 1.3 },
      { shape: "seed-dark", x: 138, y: 150, r: 32, s: 1.3 },
      { shape: "seed-dark", x: 162, y: 155, r: -6, s: 1.2 },
      { shape: "seed-dark", x: 100, y: 142, r: 26, s: 1.05 },
      { shape: "seed-dark", x: 148, y: 141, r: -14, s: 1.05 },
    ],
    falling: [
      { shape: "seed-dark", x: 118, y: 48, r: -12, s: 1.9 },
      { shape: "seed-dark", x: 88, y: 88, r: 38, s: 1.6 },
      { shape: "seed-dark", x: 154, y: 104, r: -34, s: 1.5 },
      { shape: "seed-dark", x: 132, y: 74, r: 16, s: 1.35 },
    ],
  },
  "dry-fruit-chikki": {
    label: "Line illustration of almonds and cashews falling into a vessel",
    settled: [
      { shape: "almond", x: 94, y: 150, r: -18, s: 0.6 },
      { shape: "cashew", x: 142, y: 152, r: 12, s: 0.6 },
      { shape: "raisin", x: 118, y: 143, r: 8 },
    ],
    falling: [
      { shape: "almond", x: 114, y: 52, r: -24, s: 0.8 },
      { shape: "cashew", x: 78, y: 96, r: 22, s: 0.72 },
      { shape: "raisin", x: 158, y: 110, r: -10 },
      { shape: "almond", x: 146, y: 72, r: 32, s: 0.52 },
    ],
  },
  "coconut-chikki": {
    label: "Line illustration of coconut chips falling into a vessel",
    settled: [
      { shape: "shred", x: 96, y: 152, r: -12, s: 0.6 },
      { shape: "shred", x: 142, y: 156, r: 16, s: 0.5 },
      { shape: "shred", x: 118, y: 144, r: -4, s: 0.38 },
    ],
    falling: [
      { shape: "shred", x: 118, y: 50, r: -18, s: 0.95 },
      { shape: "shred", x: 80, y: 94, r: 24, s: 0.72 },
      { shape: "shred", x: 156, y: 110, r: -8, s: 0.6 },
    ],
  },
  "mamra-chikki": {
    label: "Line illustration of mamra flakes falling into a vessel",
    settled: [
      { shape: "flake", x: 94, y: 150, r: -14, s: 0.55 },
      { shape: "flake", x: 140, y: 154, r: 18, s: 0.48 },
      { shape: "flake", x: 116, y: 142, r: -4, s: 0.4 },
    ],
    falling: [
      { shape: "flake", x: 116, y: 48, r: -22, s: 0.7 },
      { shape: "flake", x: 80, y: 92, r: 16, s: 0.58 },
      { shape: "flake", x: 156, y: 108, r: -6, s: 0.5 },
    ],
  },
  "daliya-chikki": {
    label: "Line illustration of daliya grains falling into a vessel",
    settled: [
      { shape: "grain", x: 92, y: 152, r: -22, s: 0.65 },
      { shape: "grain", x: 120, y: 157, r: 18, s: 0.6 },
      { shape: "grain", x: 148, y: 150, r: -8, s: 0.55 },
      { shape: "grain", x: 106, y: 142, r: 30, s: 0.48 },
    ],
    falling: [
      { shape: "grain", x: 118, y: 48, r: -16, s: 0.95 },
      { shape: "grain", x: 84, y: 92, r: 26, s: 0.78 },
      { shape: "grain", x: 154, y: 108, r: -4, s: 0.66 },
    ],
  },
};

const FALLING_DELAYS = ["", "art-fall-2", "art-fall-3", "art-fall-2"];

export function IngredientArt({
  slug,
  decorative = false,
  className,
}: {
  slug: string;
  decorative?: boolean;
  className?: string;
}) {
  const art = VARIETIES[slug] ?? {
    label: "Line illustration of sesame seeds falling into a vessel",
    settled: VARIETIES["white-til-chikki"].settled,
    falling: VARIETIES["white-til-chikki"].falling,
  };
  return (
    <div className={cn("aspect-square overflow-hidden", className)}>
      <Tile label={art.label} decorative={decorative}>
        <Bowl cx={120} cy={150} rx={66} depth={36} />
        {art.settled.map((piece, index) => (
          <Piece key={`settled-${index}`} {...piece} />
        ))}
        {art.falling.map((piece, index) => (
          <g key={`falling-${index}`} className={cn("art-fall", FALLING_DELAYS[index % 4])}>
            <Piece {...piece} />
          </g>
        ))}
      </Tile>
    </div>
  );
}
