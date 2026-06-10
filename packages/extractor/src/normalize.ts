import {
  chroma,
  gradientStops,
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

// Subtle near-background neutrals: a hairline `border` and a secondary surface
// fill (`muted-surface`). Both sit close to the background in luminance — a
// border a touch more visible than a fill. We work off the area-weighted
// background map (real fills) plus captured border colors when present, gating
// on a low contrast band so dark section blocks and the background itself never
// qualify.
function pickSurfaces(
  raw: RawObservations,
  background: string | null,
): { border: string | null; mutedSurface: string | null } {
  if (!background) return { border: null, mutedSurface: null };
  const bg = parseColor(background);
  if (!bg) return { border: null, mutedSurface: null };
  const bgLum = luminance(bg);
  const bgHex = toHex(bg);

  // Borders and muted surfaces are neutral hairlines/fills, never decorative
  // brand color. Reject clearly-colorful candidates (a saturated link-blue
  // "border" like #2997ff, a code-block tint) while keeping subtly-tinted greys
  // (#e5edf5 ~0.06). The cap sits well above real tinted greys, well below
  // accents — see the dogfood findings on tailwind/apple/figma.
  const CHROMA_MAX = 0.18;
  const tooColorful = (c: ReturnType<typeof parseColor>) =>
    !!c && chroma(c) > CHROMA_MAX;

  // Candidate subtle fills from the area map: visibly distinct from the
  // background but not a heavy/dark block (which is a real surface/section).
  const fills: { hex: string; area: number; ctr: number }[] = [];
  for (const [rawColor, area] of Object.entries(raw.bgArea)) {
    const c = parseColor(rawColor);
    if (!c || c.a < 0.9 || tooColorful(c)) continue;
    const hex = toHex(c);
    if (hex === bgHex) continue;
    const ctr = contrastRatio(luminance(c), bgLum);
    if (ctr < 1.025 || ctr > 2) continue;
    fills.push({ hex, area, ctr });
  }
  // Drop slivers (stray 1px fills); keep the meaningful surfaces.
  const maxArea = Math.max(0, ...fills.map((c) => c.area));
  const meaningful = fills.filter((c) => c.area >= maxArea * 0.05);
  // A muted/recessed surface should sit on the *content* side of the background,
  // not lighter than it: a pure-white "surface" on an already off-white page
  // (supabase/vercel — #ffffff on #fafafa) is the document base showing through
  // and reads as invisible. On a light page require the fill to be no lighter
  // than the background; on a dark page, no darker. (Borders may go either way,
  // so this gates only the muted role.)
  const recessed = (hex: string) => {
    const c = parseColor(hex);
    if (!c) return false;
    const l = luminance(c);
    return bgLum > 0.5 ? l <= bgLum + 1e-6 : l >= bgLum - 1e-6;
  };
  // muted-surface: the subtlest *recessed* meaningful fill (closest to the bg).
  const muted =
    [...meaningful]
      .filter((c) => recessed(c.hex))
      .sort((a, b) => a.ctr - b.ctr)[0]?.hex ?? null;

  // border: prefer a real captured border color (opaque, hairline contrast),
  // else the most visible subtle fill — kept distinct from muted-surface.
  let border: string | null = null;
  for (const [rawColor] of Object.entries(raw.borderColors ?? {}).sort(
    (a, b) => b[1] - a[1],
  )) {
    const c = parseColor(rawColor);
    if (!c || c.a < 0.5 || tooColorful(c)) continue;
    const hex = toHex(c);
    if (hex === bgHex) continue;
    const ctr = contrastRatio(luminance(c), bgLum);
    if (ctr < 1.05 || ctr > 4.5) continue; // a hairline, not text or a block
    border = hex;
    break;
  }
  if (!border) {
    // Guess a border from the subtle fills, but only recessed ones — a fill
    // lighter than an off-white page (the document base showing through) is as
    // invisible as a border as it is as a muted surface.
    const visible = [...meaningful]
      .filter((c) => recessed(c.hex))
      .sort((a, b) => b.ctr - a.ctr);
    border =
      visible.find((c) => c.hex !== muted)?.hex ?? visible[0]?.hex ?? null;
  }
  // When both roles collapse onto the same single subtle color, keep only the
  // border (the more broadly useful token).
  return {
    border,
    mutedSurface: muted && muted !== border ? muted : null,
  };
}

// User-agent default link colors (unvisited blue, visited purple, active red).
// An unstyled <a> reports these, so they signal "the site didn't style this
// link" rather than a brand color — exclude them from the primary heuristic.
const DEFAULT_LINK_COLORS = new Set([
  "#0000ee",
  "#0000ff",
  "#551a8b",
  "#ee0000",
]);

// A primary must clear at least this contrast against the background to count as
// a visible accent. The bar is deliberately low (near-identical colors only):
// it rejects a button that resolves to ~the page background, without touching
// any genuinely visible brand color.
const PRIMARY_MIN_CONTRAST = 1.5;

// Custom-property names that *are* the primary/brand color, matched on whole
// name segments (split on -/_ and camelCase) so `--color-primary` and
// `--hds-color-button-primary-bg` qualify but tailwind's palette entries
// (`--color-blue-500`) don't. Substring matching is a trap here: an `on-`
// pattern silently excluded stripe's correct `--hds-color-button-primary-bg`
// (butt**on-**primary…), which let a wrong candidate through.
const PRIMARY_SEGMENTS = new Set(["primary", "brand"]);
// Segments *about* the primary rather than the primary itself: foregrounds,
// state variants, washes, borders, scrims. shadcn's `--primary-foreground` is
// the text painted ON the primary — trusting it would invert the brand; linear
// declares `--color-fg-primary` (near-white) and `--color-overlay-primary` (a
// black scrim) alongside its real `--color-brand-bg`. "link" defers to the
// dedicated painted-link heuristic below. A false exclusion only costs us a
// fallback to the statistical vote, never a wrong pick. Plain "bg" stays
// allowed on purpose: `--color-brand-bg` is the brand fill we want, while a
// page-background `--bg-primary` self-rejects on the contrast/neutral gates.
const EXCLUDED_SEGMENTS = new Set([
  "foreground",
  "fg",
  "text",
  "on",
  "contrast",
  "inverse",
  "muted",
  "subtle",
  "soft",
  "hover",
  "active",
  "focus",
  "visited",
  "disabled",
  "border",
  "outline",
  "ring",
  "shadow",
  "gradient",
  "alpha",
  "transparent",
  "tint",
  "dim",
  "overlay",
  "scrim",
  "backdrop",
  "link",
  "line",
  "selection",
  "placeholder",
  "icon",
  // Gradient endpoints: GitHub's --brand-Label-color-green-blue-start is a
  // decorative label gradient stop, not the brand.
  "start",
  "end",
  "stop",
  "from",
  "to",
  "via",
  // Ranked/auxiliary palette roles are by definition not THE primary.
  "secondary",
  "tertiary",
  "support",
  "logo",
  // A var that calls itself an accent/highlight is declaring an *accent* —
  // our taxonomy keeps those separate from primary. GitHub's neon
  // --brand-color-accent-primary / --brand-tiles-highlightColor are hero-glow
  // decorations; its real primary is the green CTA the button heuristic finds.
  "accent",
  "highlight",
]);
// A variable that names its own hue (--brand-Icon-color-coral, tailwind's
// --color-blue-500) is a palette/decorative entry — the singular brand color
// doesn't need to say which color it is.
const HUE_SEGMENTS = new Set([
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "magenta",
  "pink",
  "rose",
  "coral",
  "salmon",
  "crimson",
  "mint",
  "navy",
  "gold",
  "silver",
  "bronze",
  "white",
  "black",
  "gray",
  "grey",
]);
const nameSegments = (name: string): string[] =>
  name
    .replace(/^--/, "")
    .split(/[-_]/)
    .flatMap((s) => s.split(/(?=[A-Z])/)) // GitHub camelCases: iconColor
    .map((s) => s.toLowerCase())
    .filter(Boolean);

// Step 0 of pickPrimary: the site's own declaration. When :root carries a
// semantically named custom property (--primary, --color-brand, …) that parses
// to a saturated color the page *actually painted*, the site is telling us its
// primary — no vote needed. (Dogfood: linear's frequency heuristics picked a
// warm accent; its declared --color-brand-bg is the truth.)
// Deliberately strict — every rejection falls through to the heuristics:
// - numeric segments are palette scales (stripe's --hds-color-util-brand-900
//   is a ramp entry, not the brand);
// - neutrals are never accepted: GitHub namespaces its whole marketing design
//   system under --brand-* (including plain white), and monochrome brands are
//   already served by the mono-button heuristic below;
// - painted-on-page is a hard gate, so a variable from an unused theme or a
//   namespace can't smuggle in a color the visitor never saw.
function declaredPrimary(
  raw: RawObservations,
  background: string | null,
): string | null {
  const props = raw.customProps;
  if (!props) return null;

  // Colors the page actually painted (any signal: fills, text, buttons, links,
  // gradient stops).
  const painted = new Set<string>();
  for (const key of [
    ...Object.keys(raw.colorCount),
    ...Object.keys(raw.bgArea),
    ...raw.buttons.map((b) => b.bg),
    ...raw.links.map((l) => l.color),
  ]) {
    const c = parseColor(key);
    if (c) painted.add(toHex(c));
  }
  for (const image of Object.keys(raw.gradientImages ?? {})) {
    for (const stop of gradientStops(image)) {
      const c = parseColor(stop);
      if (c) painted.add(toHex(c));
    }
  }

  const bg = background ? parseColor(background) : null;
  const bgLum = bg ? luminance(bg) : null;

  const candidates: { name: string; hex: string }[] = [];
  for (const [name, value] of Object.entries(props)) {
    const segs = nameSegments(name);
    if (!segs.some((s) => PRIMARY_SEGMENTS.has(s))) continue;
    if (
      segs.some(
        (s) =>
          EXCLUDED_SEGMENTS.has(s) || HUE_SEGMENTS.has(s) || /^\d+$/.test(s),
      )
    )
      continue;
    const c = parseColor(value);
    // Mirror the link heuristic's bar: opaque, saturated, non-neutral, not a
    // UA default — translucent washes and grey "brand" namespace entries out.
    if (!c || c.a < 0.9 || isNeutral(c) || saturation(c) < 0.4) continue;
    const hex = toHex(c);
    if (DEFAULT_LINK_COLORS.has(hex)) continue;
    if (!painted.has(hex)) continue;
    if (
      bgLum !== null &&
      contrastRatio(luminance(c), bgLum) < PRIMARY_MIN_CONTRAST
    )
      continue;
    candidates.push({ name: name.toLowerCase(), hex });
  }
  if (!candidates.length) return null;

  // The most canonical (shortest) name wins; name as the final key keeps the
  // pick deterministic.
  candidates.sort(
    (a, b) => a.name.length - b.name.length || (a.name < b.name ? -1 : 1),
  );
  return candidates[0].hex;
}

function pickPrimary(
  raw: RawObservations,
  background: string | null,
): string | null {
  // 0) The site's own declared design system (see declaredPrimary above).
  const declared = declaredPrimary(raw, background);
  if (declared) return declared;

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
    const bg = background ? parseColor(background) : null;
    const bgLum = bg ? luminance(bg) : null;
    // A primary must read as a distinct accent, not as the page itself. A
    // "colored" button that resolves to ~the background (sentry's near-black
    // #150f23 on a near-black page is non-neutral but invisible) is rejected so
    // a real signal can win instead. With no known background we can't test, so
    // the candidate is kept.
    const distinct = (hex: string) =>
      bgLum === null ||
      contrastRatio(luminance(parseColor(hex)!), bgLum) >= PRIMARY_MIN_CONTRAST;
    const colored = [...solid.entries()]
      .filter(([hex]) => !isNeutral(parseColor(hex)!) && distinct(hex))
      .sort((a, b) => b[1] - a[1]);
    if (colored.length) return colored[0][0];

    // 2) Monochrome brand (black/white buttons): the primary is the *filled*
    //    button — the neutral that contrasts most with the page background. Only
    //    accept it if that contrast is real (>=3); a near-background "button"
    //    (e.g. a white card button on a white page) isn't the primary action, so
    //    we fall through to the saturated-accent heuristic instead.
    const monoLum = bgLum ?? 1;
    const best = [...solid.entries()].sort((a, b) => {
      const ca = contrastRatio(luminance(parseColor(a[0])!), monoLum);
      const cb = contrastRatio(luminance(parseColor(b[0])!), monoLum);
      return cb - ca || b[1] - a[1];
    })[0];
    if (best && contrastRatio(luminance(parseColor(best[0])!), monoLum) >= 3) {
      return best[0];
    }
  }

  // 3) Links often carry the brand/accent color even when the CTA is a gradient
  //    or a monochrome button (airbnb's pink #ff385c lives only in a link, never
  //    a solid button bg). Use the most common *saturated* link color before the
  //    palette guess. This is fallback-only — sites with a real colored button
  //    already returned above — so it can't override a correct primary.
  //    Skip the user-agent default link colors: an unstyled <a> reports the
  //    browser's built-in blue/purple/red, which is never the brand (dogfood:
  //    spotify picked #0000ee over its real green). Those are not design choices.
  const linkCount = new Map<string, number>();
  for (const l of raw.links) {
    const c = parseColor(l.color);
    if (!c || c.a < 0.9 || isNeutral(c) || saturation(c) < 0.4) continue;
    const hex = toHex(c);
    if (DEFAULT_LINK_COLORS.has(hex)) continue;
    linkCount.set(hex, (linkCount.get(hex) ?? 0) + 1);
  }
  const topLink = [...linkCount.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topLink) return topLink[0];

  // 4) Gradient stop colors. A brand color often lives *only* in a hero/CTA
  //    gradient (spotify's green, anthropic's coral) — never a flat fill, a
  //    link, or a solid button — so every flat-color heuristic above misses it.
  //    Mine the saturated stop colors out of the captured gradients, weight them
  //    by the painted gradient area, and take the dominant one. Fallback-only:
  //    a real colored button or link already returned, so this never overrides a
  //    stronger signal; it only beats the last-resort palette guess below (which
  //    is what these sites wrongly fell through to before). Skip neutral/low-
  //    saturation stops (gradients routinely fade to white/black) and the UA
  //    default link colors, mirroring the link heuristic.
  //    Unlike the flat-color tallies we do NOT require opacity here: brand colors
  //    are frequently used at low alpha for a soft glow (figma's blurple lives
  //    only in `rgba(77, 73, 252, 0.125)` stops), yet the RGB channels still
  //    carry the real brand hue. The neutral/saturation gate already drops the
  //    translucent black/white overlays that make up most decorative gradients.
  const gradAccent = new Map<string, number>();
  for (const [image, area] of Object.entries(raw.gradientImages ?? {})) {
    for (const stop of gradientStops(image)) {
      const c = parseColor(stop);
      if (!c || isNeutral(c) || saturation(c) < 0.4) continue;
      const hex = toHex(c);
      if (DEFAULT_LINK_COLORS.has(hex)) continue;
      gradAccent.set(hex, (gradAccent.get(hex) ?? 0) + area);
    }
  }
  const topGrad = [...gradAccent.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topGrad) return topGrad[0];

  // 5) Last resort: the most saturated reasonably-frequent color overall.
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

// CSS generic font families — a valid stack should end in one so the browser
// always has something to fall back to.
const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "math",
]);

// The dominant text element already declares a real fallback chain
// (`sohne-var, "SF Pro Display", sans-serif`); cleanFamilies discards it by
// keeping only the first name. Preserve it here as a paste-ready CSS stack: drop
// emoji/symbol fonts (UI noise, never a design choice), re-quote multi-word
// names, and guarantee a trailing generic so the value is safe to use verbatim.
function buildFontStack(map: Record<string, number>): string | undefined {
  const dominant = modeKey(map);
  if (!dominant) return undefined;
  const parts = dominant
    .split(",")
    .map((p) => p.replace(/["']/g, "").trim())
    .filter((p) => p && !/emoji|symbol/i.test(p));
  if (!parts.length) return undefined;
  const last = parts[parts.length - 1].toLowerCase();
  if (!GENERIC_FAMILIES.has(last)) {
    // Infer the generic from the declared one if present anywhere, else assume
    // sans-serif (the overwhelming default for product/marketing sites).
    const declaredGeneric = parts.find((p) =>
      GENERIC_FAMILIES.has(p.toLowerCase()),
    );
    parts.push(declaredGeneric ?? "sans-serif");
  }
  const quote = (p: string) =>
    GENERIC_FAMILIES.has(p.toLowerCase()) || !/\s/.test(p) ? p : `"${p}"`;
  return [...new Set(parts)].map(quote).join(", ");
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
  const surfaces = pickSurfaces(raw, background);
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
      border: surfaces.border,
      mutedSurface: surfaces.mutedSurface,
      palette: buildPalette(raw.colorCount).slice(0, 16),
    },
    typography: {
      families: cleanFamilies(raw.fontFamilies),
      fontStack: buildFontStack(raw.fontFamilies),
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

// Sanity-check a finished profile and return human-readable warnings about
// extractions that almost certainly aren't the real site — bot-protection
// interstitials (Cloudflare's "Just a moment...") and near-empty renders that
// yield no usable tokens. Returns [] for a healthy profile. The CLI surfaces
// these so a degenerate result is never mistaken for real design tokens.
const CHALLENGE_TITLE =
  /just a moment|attention required|checking (if you are|your browser)|verify(ing)? you are human|are you (a )?human|enable javascript|access denied|please wait|ddos|cloudflare|captcha|bot detection/i;

export function profileWarnings(profile: DesignProfile): string[] {
  const warnings: string[] = [];
  const title = profile.title ?? "";
  if (CHALLENGE_TITLE.test(title)) {
    warnings.push(
      `The page looks like a bot-protection / interstitial screen ("${title}"), ` +
        "not the real site — the extracted tokens are unreliable.",
    );
  }

  const c = profile.colors;
  const missing = [
    !c.primary && "primary",
    !c.background && "background",
    !c.text && "text",
  ].filter(Boolean) as string[];
  const thin =
    c.palette.length < 3 && profile.typography.sizeScalePx.length < 2;
  if (missing.length >= 2 || thin) {
    warnings.push(
      "Very few design signals were detected" +
        (missing.length ? ` (missing ${missing.join(", ")})` : "") +
        `; only ${c.palette.length} palette color(s). The site may block ` +
        "automated browsers, require a login, or render almost no CSS.",
    );
  }
  return warnings;
}

// Tiny helper kept here so the role picks are reproducible/testable later.
export { luminance };
