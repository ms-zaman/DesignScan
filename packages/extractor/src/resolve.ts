// Single source of truth: DesignProfile -> resolved token model.
// Both generate.ts (the DESIGN.md YAML/prose) and preview.ts (the HTML proof
// sheet) consume these pure helpers, so the preview can never drift from the
// spec file it sits beside — they resolve the *same* roles, levels, and scales.

import { luminance, parseColor } from "./color.js";
import type { DesignProfile } from "./types.js";

// Readable foreground (near-black or white) for a given surface color. We pick
// whichever has the higher *actual* WCAG contrast — a flat luminance<0.5 cutoff
// mishandles mid-tones (a mid-grey would get white text at ~3:1 when near-black
// would clear AA). The real crossover sits near luminance 0.18, not 0.5.
export const DARK_FG = "#111111";
export const LIGHT_FG = "#ffffff";
const DARK_FG_LUM = luminance({ r: 17, g: 17, b: 17, a: 1 });
export function onColor(hex: string): string {
  const c = parseColor(hex);
  if (!c) return DARK_FG;
  const bgLum = luminance(c);
  const lightContrast = (1 + 0.05) / (bgLum + 0.05);
  const darkContrast = (bgLum + 0.05) / (DARK_FG_LUM + 0.05);
  return lightContrast >= darkContrast ? LIGHT_FG : DARK_FG;
}

// WCAG contrast ratio between two hex colors (1–21). Unparseable input -> 1
// (treated as no contrast) so callers reject it.
export function contrastRatio(a: string, b: string): number {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return 1;
  const la = luminance(ca);
  const lb = luminance(cb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Minimum contrast an accent must have against the background to be usable.
// accent-1 is link text (body-sized) on the background, so it needs real
// readability (AA-ish). accent-2 is a badge *background* — its own text is
// contrast-picked separately, so the pill only has to be visibly distinct from
// the surface behind it (a low bar that still rejects e.g. a white badge on a
// near-white page).
const ACCENT1_MIN_CONTRAST = 3; // readable link text
const ACCENT2_MIN_CONTRAST = 1.4; // visible chip vs surface

export interface TypeLevel {
  name: string;
  family: string;
  size: number;
  weight: number;
  lineHeight: number; // unitless multiplier
  letterSpacingEm?: number;
}

// Map a flat px size scale onto semantic typography levels, largest first.
// Tiny sizes (<12px) are dropped as icon/badge/legal noise, and the scale is
// capped so we don't emit a dozen near-identical levels.
export function typographyLevels(profile: DesignProfile): TypeLevel[] {
  const MIN_PX = 12;
  const MAX_LEVELS = 9;
  const sizes = [...profile.typography.sizeScalePx]
    .filter((s) => s >= MIN_PX)
    .sort((a, b) => b - a)
    .slice(0, MAX_LEVELS);
  if (sizes.length === 0) return [];

  const t = profile.typography;
  // Prefer the paste-ready stack (primary + the site's own fallbacks); fall back
  // to the bare primary name for profiles captured before schema 1.2.
  const family = t.fontStack || t.families[0] || "sans-serif";
  const headingWeight =
    t.weightHeading ?? (t.weights.length ? Math.max(...t.weights) : 600);
  const bodyWeight =
    t.weightBody ?? (t.weights.includes(400) ? 400 : (t.weights[0] ?? 400));
  const lhHeading = t.lineHeightHeading ?? 1.2;
  const lhBody = t.lineHeightBody ?? 1.5;

  const bucket = (px: number) =>
    px >= 40
      ? "display"
      : px >= 32
        ? "headline-lg"
        : px >= 26
          ? "headline-md"
          : px >= 22
            ? "headline-sm"
            : px >= 18
              ? "title"
              : px >= 16
                ? "body-lg"
                : px >= 14
                  ? "body"
                  : "label";
  const isHeading = (px: number) => px >= 18;

  const used = new Set<string>();
  return sizes.map((size) => {
    let name = bucket(size);
    if (used.has(name)) name = `${name}-${size}`; // rare collision guard
    used.add(name);
    return {
      name,
      family,
      size,
      weight: isHeading(size) ? headingWeight : bodyWeight,
      lineHeight: isHeading(size) ? lhHeading : lhBody,
      letterSpacingEm: isHeading(size)
        ? t.letterSpacingHeadingEm
        : t.letterSpacingBodyEm,
    };
  });
}

// Ordered scale names for radius / spacing maps.
export const SCALE = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"];

export function scaleTokens(values: number[]): [string, string][] {
  return values
    .filter((n) => n < 9999)
    .slice(0, SCALE.length)
    .map((n, idx) => [SCALE[idx], `${n}px`] as [string, string]);
}

// A scale step enriched with the site's own name for it, when the site's
// declared design system (profile.declared — mined from :root custom
// properties and corroborated against painted values) publishes one. The
// voted scale stays authoritative for WHICH values exist; declared only
// contributes NAMES. Emitters that speak variable formats (css/w3c) prefer
// the declared name so their output composes with the site's own vocabulary.
export interface ScaleEntry {
  px: number;
  value: string; // "8px"
  generic: string; // positional xs/sm/md/… name
  declared?: string; // the site's custom-property name, e.g. "--radius-md"
}

export function scaleEntries(
  values: number[],
  declared?: Record<string, number>,
): ScaleEntry[] {
  // Invert declared (name -> px) to px -> name; shortest name wins (the
  // canonical alias), lexicographic on ties for determinism.
  const byPx = new Map<number, string>();
  for (const [name, px] of Object.entries(declared ?? {})) {
    const cur = byPx.get(px);
    if (
      !cur ||
      name.length < cur.length ||
      (name.length === cur.length && name < cur)
    )
      byPx.set(px, name);
  }
  return scaleTokens(values).map(([generic, value]) => {
    const px = Number.parseFloat(value);
    const declaredName = byPx.get(px);
    return {
      px,
      value,
      generic,
      ...(declaredName ? { declared: declaredName } : {}),
    };
  });
}

// The site's own name for its primary font stack: the declared fontFamilies
// entry whose first family matches the resolved stack's first family
// (shortest name on ties). Null when the site declares no matching font var.
export function declaredFontName(profile: DesignProfile): string | null {
  const fams = profile.declared?.fontFamilies;
  if (!fams) return null;
  const first = (s: string) =>
    (s.split(",")[0] ?? "")
      .trim()
      .replace(/^['"]|['"]$/g, "")
      .toLowerCase();
  const target = first(
    profile.typography.fontStack || profile.typography.families[0] || "",
  );
  if (!target) return null;
  const matches = Object.entries(fams)
    .filter(([, stack]) => first(stack) === target)
    .map(([name]) => name)
    .sort((a, b) => a.length - b.length || a.localeCompare(b));
  return matches[0] ?? null;
}

// The resolved color roles for one theme — the exact hexes generate.ts maps to
// `primary`, `background`, etc. `null` means the role couldn't be filled (e.g. a
// page with no second palette color has no accent-2).
export interface ColorRoles {
  primary: string;
  onPrimary: string;
  // Observed hover shift of the primary button (null when none was seen).
  // Resolved upstream in normalize by physically hovering the button.
  primaryHover: string | null;
  // Observed pressed (:active) shift — same provenance, really pressed.
  primaryActive: string | null;
  background: string | null;
  text: string | null;
  accent1: string | null;
  accent2: string | null;
  onAccent2: string | null;
  // Subtle near-background neutrals (resolved upstream in normalize, where the
  // raw border colors / background fills live): a hairline and a muted surface.
  border: string | null;
  mutedSurface: string | null;
}

// Resolve a profile's palette into named roles. Primary falls back through the
// palette so it is always defined (the spec requires a `primary`); accents are
// the next distinct palette entries; on-* foregrounds are contrast-picked.
export function resolveColorRoles(profile: DesignProfile): ColorRoles {
  const primary =
    profile.colors.primary ||
    profile.colors.palette[0]?.hex ||
    profile.colors.text ||
    "#000000";
  const background = profile.colors.background;
  const text = profile.colors.text;

  const taken = new Set(
    [primary, background, text].filter(Boolean) as string[],
  );
  const extras = profile.colors.palette
    .map((p) => p.hex)
    .filter((h) => !taken.has(h));

  // Pick accents that are actually *visible* against the background, in palette
  // order. Without this, the frequency-ranked palette can hand us a structural
  // color that's invisible in its role — e.g. a near-black link on a dark page,
  // or a white badge on a near-white surface. With no background to test
  // against we fall back to raw palette order. accent-2 is taken from what's
  // left so the two roles don't collapse onto the same hex.
  const usable = (minContrast: number) => (hex: string) =>
    !background || contrastRatio(hex, background) >= minContrast;
  const accent1 = extras.find(usable(ACCENT1_MIN_CONTRAST)) ?? null;
  const accent2 =
    extras.filter((h) => h !== accent1).find(usable(ACCENT2_MIN_CONTRAST)) ??
    null;

  // Only meaningful when it belongs to the primary we actually resolved: if
  // primary fell back through the palette (normalize's pick was null), a
  // hover/press observed on a *different* button must not tag along.
  const ownsStates = profile.colors.primary === primary;
  const primaryHover = ownsStates
    ? (profile.colors.primaryHover ?? null)
    : null;
  const primaryActive = ownsStates
    ? (profile.colors.primaryActive ?? null)
    : null;

  return {
    primary,
    onPrimary: onColor(primary),
    primaryHover,
    primaryActive,
    background,
    text,
    accent1,
    accent2,
    onAccent2: accent2 ? onColor(accent2) : null,
    border: profile.colors.border ?? null,
    mutedSurface: profile.colors.mutedSurface ?? null,
  };
}

// ---- shadows ---------------------------------------------------------------
// profile.shadows holds raw computed box-shadow strings (frequency-ranked, ≤4).
// Computed values are noisy: Tailwind ring resets pad real shadows with
// "rgba(0, 0, 0, 0) 0px 0px 0px 0px" placeholder layers, and some observed
// stacks are entirely no-op. We strip invisible layers (transparent color or
// zero geometry), drop shadows with nothing left, dedupe, and name the
// survivors smallest→largest by visual footprint so every emitter presents
// the same elevation scale.

export interface ShadowLayer {
  color: string; // the layer's color exactly as computed (rgba/oklab/color())
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  inset: boolean;
}

export interface ShadowToken {
  name: string; // sm → xl, smallest visual footprint first
  value: string; // cleaned CSS box-shadow (no-op layers removed)
  layers: ShadowLayer[];
}

const SHADOW_SCALE = ["sm", "md", "lg", "xl"];

// Split a multi-shadow value on top-level commas only — the color functions
// inside each layer carry commas of their own.
function splitShadowLayers(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

// Computed box-shadow layers lead with a color function (Chromium
// serialization), then 2–4 lengths: offset-x offset-y blur spread. Author-form
// strings (color last, unitless zeros) parse too — lengths are read positionally
// from whatever remains once the color is removed.
function parseShadowLayer(text: string): ShadowLayer {
  const colorMatch = text.match(/[a-z][a-z0-9-]*\([^()]*\)/i);
  const color = colorMatch?.[0] ?? "";
  const rest = colorMatch ? text.replace(colorMatch[0], " ") : text;
  const lengths = rest
    .split(/\s+/)
    .filter((t) => /^-?(\d*\.)?\d+(px)?$/.test(t))
    .map((t) => Number.parseFloat(t));
  const [offsetX = 0, offsetY = 0, blur = 0, spread = 0] = lengths;
  return {
    color,
    offsetX,
    offsetY,
    blur,
    spread,
    inset: /\binset\b/.test(rest),
  };
}

// A layer paints nothing when its color is fully transparent or its geometry
// is all zeros (no offset, no blur, no spread).
function paintsSomething(l: ShadowLayer): boolean {
  const c = parseColor(l.color);
  if (c && c.a === 0) return false;
  return l.offsetX !== 0 || l.offsetY !== 0 || l.blur !== 0 || l.spread !== 0;
}

// Visual footprint of a shadow = its most prominent layer. Negative spread
// tightens rather than grows, so it doesn't count against the blur.
function shadowFootprint(layers: ShadowLayer[]): number {
  return Math.max(
    ...layers.map(
      (l) =>
        l.blur +
        Math.max(l.spread, 0) +
        Math.max(Math.abs(l.offsetX), Math.abs(l.offsetY)),
    ),
  );
}

export function shadowTokens(profile: DesignProfile): ShadowToken[] {
  const seen = new Set<string>();
  const cleaned: { value: string; layers: ShadowLayer[] }[] = [];
  for (const raw of profile.shadows) {
    const kept = splitShadowLayers(raw)
      .map((text) => ({ text, layer: parseShadowLayer(text) }))
      .filter(({ layer }) => paintsSomething(layer));
    if (!kept.length) continue;
    const value = kept.map((k) => k.text).join(", ");
    if (seen.has(value)) continue;
    seen.add(value);
    cleaned.push({ value, layers: kept.map((k) => k.layer) });
  }
  return cleaned
    .sort((a, b) => shadowFootprint(a.layers) - shadowFootprint(b.layers))
    .slice(0, SHADOW_SCALE.length)
    .map((s, i) => ({ name: SHADOW_SCALE[i], ...s }));
}

// Whether a `prefers-color-scheme: dark` pass produced a *genuinely* different
// theme. Many sites gate dark mode on a class/localStorage toggle and ignore the
// media query, so the "dark" pass just re-extracts light — in which case both
// the DESIGN.md and the preview should treat it as "no dark theme" rather than
// emit duplicate tokens. generate.ts and preview.ts share this so they agree.
export function isDistinctDark(
  light: DesignProfile,
  dark?: DesignProfile,
): dark is DesignProfile {
  const eq = (a?: string | null, b?: string | null) =>
    (a ?? "").toLowerCase() === (b ?? "").toLowerCase();
  return (
    !!dark &&
    !(
      eq(dark.colors.background, light.colors.background) &&
      eq(dark.colors.text, light.colors.text) &&
      eq(dark.colors.primary, light.colors.primary)
    )
  );
}
