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

// WCAG contrast ratio from two relative luminances.
const contrastRatio = (l1: number, l2: number): number =>
  (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

function pickText(
  weights: Record<string, number>,
  background: string | null,
): string | null {
  // The body-text color is the one covering the most painted text (area-weighted
  // when available; element counts otherwise). We require readable contrast
  // against the background so we never return e.g. white-on-white, and so we
  // skip muted secondary text in favour of the primary foreground.
  const bg = background ? parseColor(background) : null;
  const bgLum = bg ? luminance(bg) : null;
  let best: { hex: string; weight: number } | null = null;
  let fallback: { hex: string; weight: number } | null = null;
  for (const [raw, weight] of Object.entries(weights)) {
    const c = parseColor(raw);
    if (!c || c.a < 0.5) continue;
    const hex = toHex(c);
    if (!fallback || weight > fallback.weight) fallback = { hex, weight };
    if (bgLum !== null && contrastRatio(luminance(c), bgLum) < 3) continue;
    if (!best || weight > best.weight) best = { hex, weight };
  }
  return (best ?? fallback)?.hex ?? null;
}

function pickPrimary(
  raw: RawObservations,
  background: string | null,
): string | null {
  // 1) Solid (opaque) button backgrounds are the clearest signal of the primary
  //    action. Tally them and prefer the most common *non-neutral* (brand) color.
  const solid = new Map<string, number>();
  for (const b of raw.buttons) {
    const c = parseColor(b.bg);
    if (!c || c.a < 0.9) continue;
    const hex = toHex(c);
    solid.set(hex, (solid.get(hex) || 0) + 1);
  }
  if (solid.size) {
    const colored = [...solid.entries()]
      .filter(([hex]) => !isNeutral(parseColor(hex)!))
      .sort((a, b) => b[1] - a[1]);
    if (colored.length) return colored[0][0];

    // 2) Monochrome brand (black/white buttons): the primary is the *filled*
    //    button — the neutral that contrasts most with the page background. Only
    //    accept it if that contrast is real (>=3); a near-background "button"
    //    (e.g. a white card button on a white page) isn't the primary action, so
    //    we fall through to the saturated-accent heuristic instead.
    const bg = background ? parseColor(background) : null;
    const bgLum = bg ? luminance(bg) : 1;
    const best = [...solid.entries()].sort((a, b) => {
      const ca = contrastRatio(luminance(parseColor(a[0])!), bgLum);
      const cb = contrastRatio(luminance(parseColor(b[0])!), bgLum);
      return cb - ca || b[1] - a[1];
    })[0];
    if (best && contrastRatio(luminance(parseColor(best[0])!), bgLum) >= 3) {
      return best[0];
    }
  }

  // 3) Fallback: the most saturated reasonably-frequent color overall.
  const candidates = buildPalette(raw.colorCount)
    .map((p) => ({ ...p, c: parseColor(p.hex)! }))
    .filter((p) => p.c && !isNeutral(p.c) && p.count >= 2)
    .sort((a, b) => saturation(b.c) - saturation(a.c));
  return candidates[0]?.hex ?? null;
}

// Round a "12px"-style frequency map into integer buckets, summing counts and
// dropping anything non-px or <= 0. Rounding folds fractional noise (13.3333px,
// 19.2031px) into the nearest whole pixel.
function pxBuckets(map: Record<string, number>): Map<number, number> {
  const out = new Map<number, number>();
  for (const [raw, count] of Object.entries(map)) {
    const n = px(raw);
    if (n === null) continue;
    const r = Math.round(n);
    if (r <= 0) continue;
    out.set(r, (out.get(r) || 0) + count);
  }
  return out;
}

// Frequency-greedy clustering. Process values most-frequent first; each value
// either joins the nearest existing representative (within tolerance) or becomes
// a new one. This keeps the *dominant* value of each cluster — the fix for the
// old ascending-sort, which kept the smallest (usually-noisiest) value instead.
function clusterByFrequency(
  buckets: Map<number, number>,
  { absTol, relTol }: { absTol: number; relTol: number },
): { value: number; count: number }[] {
  const reps: { value: number; count: number }[] = [];
  for (const [value, count] of [...buckets.entries()].sort(
    (a, b) => b[1] - a[1],
  )) {
    const near = reps.find(
      (r) => Math.abs(r.value - value) <= Math.max(absTol, r.value * relTol),
    );
    if (near) near.count += count;
    else reps.push({ value, count });
  }
  return reps;
}

const byFreqThenValue = (rs: { value: number; count: number }[], max: number) =>
  rs
    .sort((a, b) => b.count - a.count)
    .slice(0, max)
    .map((r) => r.value)
    .sort((a, b) => a - b);

// Spacing follows a base grid. Snap observed paddings/margins/gaps to the
// de-facto 4px unit, tally by snapped bucket, then keep the most-used steps.
// Turns noise (2,3,6,7,11,14.5,19.2…) into a clean ramp (4,8,12,16,24,32…).
const SPACING_GRID = 4;
function buildSpacingScale(map: Record<string, number>, max = 8): number[] {
  const snapped = new Map<number, number>();
  for (const [v, count] of pxBuckets(map)) {
    const s = Math.round(v / SPACING_GRID) * SPACING_GRID;
    if (s <= 0) continue;
    snapped.set(s, (snapped.get(s) || 0) + count);
  }
  return [...snapped.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([v]) => v)
    .sort((a, b) => a - b);
}

// Radii don't sit on a 4px grid (2/6/10 are common), so cluster by frequency
// instead. Drop sub-2px hairlines (borders) and >=64px pills (those become the
// `full` token downstream).
function buildRadiusScale(map: Record<string, number>, max = 7): number[] {
  const buckets = new Map<number, number>();
  for (const [v, count] of pxBuckets(map)) {
    if (v < 2 || v >= 64) continue;
    buckets.set(v, count);
  }
  return byFreqThenValue(
    clusterByFrequency(buckets, { absTol: 1.5, relTol: 0.2 }),
    max,
  );
}

// Type scales are modular (ratio-based), so cluster with a relative tolerance to
// fold near-identical sizes (13 / 13.33 / 14) into one representative. One-off
// sizes (count < 2) are dropped as noise; the generator maps the rest to roles.
function buildSizeScale(map: Record<string, number>, max = 9): number[] {
  const buckets = new Map<number, number>();
  for (const [v, count] of pxBuckets(map)) {
    if (count < 2) continue;
    buckets.set(v, count);
  }
  return byFreqThenValue(
    clusterByFrequency(buckets, { absTol: 1, relTol: 0.08 }),
    max,
  );
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

export function normalize(url: string, raw: RawObservations): DesignProfile {
  const background = pickBackground(raw.bgArea);
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    url,
    title: raw.title,
    fetchedAt: new Date().toISOString(),
    theme: raw.colorScheme ?? "light",
    colors: {
      background,
      text: pickText(raw.textColorArea ?? raw.colorCount, background),
      primary: pickPrimary(raw, background),
      palette: buildPalette(raw.colorCount).slice(0, 16),
    },
    typography: {
      families: cleanFamilies(raw.fontFamilies),
      sizeScalePx: buildSizeScale(raw.fontSizes),
      weights: topWeights(raw.fontWeights),
      lineHeightHeading: numMode(raw.lhHeading),
      lineHeightBody: numMode(raw.lhBody),
      weightHeading: intMode(raw.weightHeading),
      weightBody: intMode(raw.weightBody),
      letterSpacingHeadingEm: numMode(raw.lsHeading, 3),
      letterSpacingBodyEm: numMode(raw.lsBody, 3),
    },
    spacingScalePx: buildSpacingScale(raw.spacings),
    radiusScalePx: buildRadiusScale(raw.radii),
    shadows: Object.entries(raw.shadows)
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => s)
      .slice(0, 4),
  };
}

// Tiny helper kept here so the role picks are reproducible/testable later.
export { luminance };
