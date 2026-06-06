import {
  isNeutral,
  luminance,
  parseColor,
  saturation,
  toHex,
} from "./color.js";
import type { DesignProfile, RawObservations } from "./types.js";
import { PROFILE_SCHEMA_VERSION } from "./types.js";

const px = (s: string): number | null => {
  const m = s.match(/^(-?\d*\.?\d+)px$/);
  return m ? parseFloat(m[1]) : null;
};

// Collapse near-duplicate hex colors and rank by how often they appeared.
function buildPalette(colorCount: Record<string, number>) {
  const merged = new Map<string, number>();
  for (const [raw, count] of Object.entries(colorCount)) {
    const c = parseColor(raw);
    if (!c || c.a < 0.5) continue; // skip translucent overlays
    const hex = toHex(c);
    merged.set(hex, (merged.get(hex) || 0) + count);
  }
  return [...merged.entries()]
    .map(([hex, count]) => ({ hex, count }))
    .sort((a, b) => b.count - a.count);
}

function pickBackground(bgArea: Record<string, number>): string | null {
  let best: { hex: string; area: number } | null = null;
  for (const [raw, area] of Object.entries(bgArea)) {
    const c = parseColor(raw);
    if (!c || c.a < 0.5) continue;
    if (!best || area > best.area) best = { hex: toHex(c), area };
  }
  return best?.hex ?? null;
}

function pickText(colorCount: Record<string, number>): string | null {
  // Most frequent foreground color wins; that's almost always body text.
  let best: { hex: string; count: number } | null = null;
  for (const [raw, count] of Object.entries(colorCount)) {
    const c = parseColor(raw);
    if (!c || c.a < 0.5) continue;
    if (!best || count > best.count) best = { hex: toHex(c), count };
  }
  return best?.hex ?? null;
}

function pickPrimary(raw: RawObservations): string | null {
  // 1) Most common solid, non-neutral button background = brand color.
  const btnBg = new Map<string, number>();
  for (const b of raw.buttons) {
    const c = parseColor(b.bg);
    if (!c || c.a < 0.5 || isNeutral(c)) continue;
    const hex = toHex(c);
    btnBg.set(hex, (btnBg.get(hex) || 0) + 1);
  }
  const topBtn = [...btnBg.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topBtn) return topBtn[0];

  // 2) Fallback: the most saturated reasonably-frequent color overall.
  const candidates = buildPalette(raw.colorCount)
    .map((p) => ({ ...p, c: parseColor(p.hex)! }))
    .filter((p) => p.c && !isNeutral(p.c) && p.count >= 2)
    .sort((a, b) => saturation(b.c) - saturation(a.c));
  return candidates[0]?.hex ?? null;
}

// Turn a frequency map of "12px"-style values into a sorted, de-noised scale.
function numericScale(
  map: Record<string, number>,
  { minCount = 1, max = 12 }: { minCount?: number; max?: number } = {},
): number[] {
  const vals = new Map<number, number>();
  for (const [raw, count] of Object.entries(map)) {
    const n = px(raw);
    if (n === null || n <= 0) continue;
    vals.set(n, (vals.get(n) || 0) + count);
  }
  return [...vals.entries()]
    .filter(([, count]) => count >= minCount)
    .map(([n]) => n)
    .sort((a, b) => a - b)
    .slice(0, max);
}

function cleanFamilies(map: Record<string, number>): string[] {
  const first = new Map<string, number>();
  for (const [raw, count] of Object.entries(map)) {
    const fam = raw.split(",")[0].replace(/["']/g, "").trim();
    if (!fam) continue;
    first.set(fam, (first.get(fam) || 0) + count);
  }
  return [...first.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([f]) => f)
    .slice(0, 5);
}

function topWeights(map: Record<string, number>): number[] {
  return [...new Set(Object.keys(map).map((w) => parseInt(w, 10)))]
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
}

// Most frequent key of a frequency map (undefined when the map is empty).
function modeKey(map?: Record<string, number>): string | undefined {
  if (!map) return undefined;
  let best: string | undefined;
  let bestCount = -1;
  for (const [k, c] of Object.entries(map)) {
    if (c > bestCount) {
      bestCount = c;
      best = k;
    }
  }
  return best;
}

const numMode = (
  map?: Record<string, number>,
  round = 2,
): number | undefined => {
  const k = modeKey(map);
  if (k === undefined) return undefined;
  const n = parseFloat(k);
  if (Number.isNaN(n)) return undefined;
  const f = 10 ** round;
  return Math.round(n * f) / f;
};

const intMode = (map?: Record<string, number>): number | undefined => {
  const k = modeKey(map);
  if (k === undefined) return undefined;
  const n = parseInt(k, 10);
  return Number.isNaN(n) ? undefined : n;
};

// Collapse a noisy observed scale (e.g. 2,4,5.5,6,7,8,9) into a clean ramp by
// rounding and dropping values closer than `minGap` to the previous kept one.
function snapScale(values: number[], minGap = 2): number[] {
  const out: number[] = [];
  for (const v of values.map((n) => Math.round(n))) {
    if (out.length === 0 || v - out[out.length - 1] >= minGap) out.push(v);
  }
  return out;
}

export function normalize(url: string, raw: RawObservations): DesignProfile {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    url,
    title: raw.title,
    fetchedAt: new Date().toISOString(),
    colors: {
      background: pickBackground(raw.bgArea),
      text: pickText(raw.colorCount),
      primary: pickPrimary(raw),
      palette: buildPalette(raw.colorCount).slice(0, 16),
    },
    typography: {
      families: cleanFamilies(raw.fontFamilies),
      sizeScalePx: numericScale(raw.fontSizes, { minCount: 2 }),
      weights: topWeights(raw.fontWeights),
      lineHeightHeading: numMode(raw.lhHeading),
      lineHeightBody: numMode(raw.lhBody),
      weightHeading: intMode(raw.weightHeading),
      weightBody: intMode(raw.weightBody),
      letterSpacingHeadingEm: numMode(raw.lsHeading, 3),
      letterSpacingBodyEm: numMode(raw.lsBody, 3),
    },
    spacingScalePx: snapScale(
      numericScale(raw.spacings, { minCount: 3, max: 10 }),
    ),
    radiusScalePx: numericScale(raw.radii, { minCount: 1, max: 8 }),
    shadows: Object.entries(raw.shadows)
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => s)
      .slice(0, 4),
  };
}

// Tiny helper kept here so the role picks are reproducible/testable later.
export { luminance };
