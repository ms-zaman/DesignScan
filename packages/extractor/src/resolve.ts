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
function contrast(a: string, b: string): number {
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

// The resolved color roles for one theme — the exact hexes generate.ts maps to
// `primary`, `background`, etc. `null` means the role couldn't be filled (e.g. a
// page with no second palette color has no accent-2).
export interface ColorRoles {
  primary: string;
  onPrimary: string;
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
    !background || contrast(hex, background) >= minContrast;
  const accent1 = extras.find(usable(ACCENT1_MIN_CONTRAST)) ?? null;
  const accent2 =
    extras.filter((h) => h !== accent1).find(usable(ACCENT2_MIN_CONTRAST)) ??
    null;

  return {
    primary,
    onPrimary: onColor(primary),
    background,
    text,
    accent1,
    accent2,
    onAccent2: accent2 ? onColor(accent2) : null,
    border: profile.colors.border ?? null,
    mutedSurface: profile.colors.mutedSurface ?? null,
  };
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
