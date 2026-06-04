// DesignProfile -> DESIGN.md (Google Labs open format, alpha).
// Spec: github.com/google-labs-code/design.md/blob/main/docs/spec.md
//   front matter = YAML design tokens; body = ordered ## prose sections.
// This is a heuristic pass over auto-extracted tokens — structurally valid and
// lint-clean (every defined token is referenced), but the prose is meant to be
// refined (eventually LLM-assisted).

import { luminance, parseColor } from "./color.js";
import type { DesignProfile } from "./types.js";

const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

// Readable foreground for a given surface color.
function onColor(hex: string): string {
  const c = parseColor(hex);
  return c && luminance(c) < 0.5 ? "#ffffff" : "#111111";
}

interface TypeLevel {
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
function typographyLevels(profile: DesignProfile): TypeLevel[] {
  const MIN_PX = 12;
  const MAX_LEVELS = 9;
  const sizes = [...profile.typography.sizeScalePx]
    .filter((s) => s >= MIN_PX)
    .sort((a, b) => b - a)
    .slice(0, MAX_LEVELS);
  if (sizes.length === 0) return [];

  const t = profile.typography;
  const family = t.families[0] || "sans-serif";
  const headingWeight =
    t.weightHeading ?? (t.weights.length ? Math.max(...t.weights) : 600);
  const bodyWeight =
    t.weightBody ?? (t.weights.includes(400) ? 400 : t.weights[0] ?? 400);
  const lhHeading = t.lineHeightHeading ?? 1.2;
  const lhBody = t.lineHeightBody ?? 1.5;

  const bucket = (px: number) =>
    px >= 40 ? "display"
    : px >= 32 ? "headline-lg"
    : px >= 26 ? "headline-md"
    : px >= 22 ? "headline-sm"
    : px >= 18 ? "title"
    : px >= 16 ? "body-lg"
    : px >= 14 ? "body"
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
const SCALE = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"];

function scaleTokens(values: number[]): [string, string][] {
  return values
    .filter((n) => n < 9999)
    .slice(0, SCALE.length)
    .map((n, idx) => [SCALE[idx], `${n}px`] as [string, string]);
}

// Build the colors map AND the components that reference them together, so we
// only ever emit a color token that some component actually uses (keeps the
// linter's "defined but never referenced" warnings at zero).
function buildColorsAndComponents(
  profile: DesignProfile,
  rounded: [string, string][],
  spacing: [string, string][],
  bodyLevel: string | undefined,
) {
  const primary =
    profile.colors.primary ||
    profile.colors.palette[0]?.hex ||
    profile.colors.text ||
    "#000000";
  const onPrimary = onColor(primary);
  const background = profile.colors.background;
  const text = profile.colors.text;

  const taken = new Set([primary, background, text].filter(Boolean) as string[]);
  const extras = profile.colors.palette
    .map((p) => p.hex)
    .filter((h) => !taken.has(h));
  const accent1 = extras[0] ?? null;
  const accent2 = extras[1] ?? null;
  const onAccent2 = accent2 ? onColor(accent2) : null;

  const pick = (entries: [string, string][], preferred: string, idx: number) =>
    entries.find(([k]) => k === preferred)?.[0] ?? entries[idx]?.[0];
  const roundedSm = pick(rounded, "sm", 0);
  const roundedMd = pick(rounded, "md", Math.min(1, rounded.length - 1));
  const roundedLg = pick(rounded, "lg", rounded.length - 1);
  const roundedFull = rounded.length ? "full" : undefined;
  const spacingSm = pick(spacing, "sm", 0);
  const spacingMd = pick(spacing, "md", Math.min(1, spacing.length - 1));
  const spacingLg = pick(spacing, "lg", spacing.length - 1);

  const used = new Set<string>();
  const use = (name: string) => used.add(name);
  const lines: string[] = [];

  // Primary button — always present (spec requires a `primary` color).
  lines.push("  button-primary:");
  lines.push(`    backgroundColor: "{colors.primary}"`);
  use("primary");
  lines.push(`    textColor: "{colors.on-primary}"`);
  use("on-primary");
  if (roundedMd) lines.push(`    rounded: "{rounded.${roundedMd}}"`);
  if (spacingMd) lines.push(`    padding: "{spacing.${spacingMd}}"`);

  if (background && text) {
    lines.push("  surface:");
    lines.push(`    backgroundColor: "{colors.background}"`);
    lines.push(`    textColor: "{colors.text}"`);
    use("background");
    use("text");
    if (roundedLg) lines.push(`    rounded: "{rounded.${roundedLg}}"`);
    if (spacingLg) lines.push(`    padding: "{spacing.${spacingLg}}"`);

    lines.push("  input:");
    lines.push(`    backgroundColor: "{colors.background}"`);
    lines.push(`    textColor: "{colors.text}"`);
    if (roundedSm) lines.push(`    rounded: "{rounded.${roundedSm}}"`);
    if (spacingSm) lines.push(`    padding: "{spacing.${spacingSm}}"`);
  }

  if (text && bodyLevel) {
    lines.push("  body-text:");
    lines.push(`    textColor: "{colors.text}"`);
    use("text");
    lines.push(`    typography: "{typography.${bodyLevel}}"`);
  }

  // Link — gives accent-1 a home so it isn't an orphan token.
  if (accent1) {
    lines.push("  link:");
    lines.push(`    textColor: "{colors.accent-1}"`);
    use("accent-1");
    if (bodyLevel) lines.push(`    typography: "{typography.${bodyLevel}}"`);
  }

  // Badge / tag — consumes accent-2 (+ its readable foreground).
  if (accent2 && onAccent2) {
    lines.push("  badge:");
    lines.push(`    backgroundColor: "{colors.accent-2}"`);
    use("accent-2");
    lines.push(`    textColor: "{colors.on-accent-2}"`);
    use("on-accent-2");
    if (roundedFull) lines.push(`    rounded: "{rounded.${roundedFull}}"`);
    else if (roundedSm) lines.push(`    rounded: "{rounded.${roundedSm}}"`);
  }

  const candidates: [string, string | null][] = [
    ["primary", primary],
    ["on-primary", onPrimary],
    ["background", background],
    ["text", text],
    ["accent-1", accent1],
    ["accent-2", accent2],
    ["on-accent-2", onAccent2],
  ];
  const colors = candidates.filter(
    ([name, hex]) => hex && used.has(name),
  ) as [string, string][];

  return { colors, componentLines: lines, roundedMd };
}

const COLOR_LABEL: Record<string, string> = {
  primary: "the dominant brand/accent color, used for primary actions",
  "on-primary": "the readable foreground used on primary surfaces",
  background: "the base surface color behind most content",
  text: "the primary foreground / body-text color",
  "accent-1": "a supporting accent (used for links)",
  "accent-2": "a secondary accent (used for badges/tags)",
  "on-accent-2": "the readable foreground on the secondary accent",
};

export function generate(profile: DesignProfile): string {
  const levels = typographyLevels(profile);
  const rounded = scaleTokens(profile.radiusScalePx);
  const spacing = scaleTokens(profile.spacingScalePx);
  const bodyLevel =
    levels.find((l) => l.name === "body")?.name ??
    levels.find((l) => l.size >= 14 && l.size <= 18)?.name ??
    levels[levels.length - 1]?.name;

  const { colors, componentLines, roundedMd } = buildColorsAndComponents(
    profile,
    rounded,
    spacing,
    bodyLevel,
  );
  const cmap = Object.fromEntries(colors);

  // ---- YAML front matter ---------------------------------------------------
  const fm: string[] = [];
  fm.push("version: alpha");
  fm.push(`name: ${q(profile.title || profile.url)}`);
  fm.push(
    `description: ${q(`Auto-extracted from ${profile.url} by DesignScan.`)}`,
  );

  fm.push("colors:");
  for (const [k, v] of colors) fm.push(`  ${k}: ${q(v)}`);

  if (levels.length) {
    fm.push("typography:");
    for (const l of levels) {
      fm.push(`  ${l.name}:`);
      fm.push(`    fontFamily: ${q(l.family)}`);
      fm.push(`    fontSize: ${l.size}px`);
      fm.push(`    fontWeight: ${q(String(l.weight))}`);
      fm.push(`    lineHeight: ${l.lineHeight}`);
      if (l.letterSpacingEm && Math.abs(l.letterSpacingEm) >= 0.001) {
        fm.push(`    letterSpacing: ${q(`${l.letterSpacingEm}em`)}`);
      }
    }
  }

  if (rounded.length) {
    fm.push("rounded:");
    for (const [k, v] of rounded) fm.push(`  ${k}: ${v}`);
    fm.push(`  full: 9999px`);
  }

  if (spacing.length) {
    fm.push("spacing:");
    for (const [k, v] of spacing) fm.push(`  ${k}: ${v}`);
  }

  fm.push("components:");
  fm.push(...componentLines);

  // ---- Markdown body (spec section order) ----------------------------------
  const body: string[] = [];

  body.push("## Overview");
  body.push("");
  body.push(
    `Auto-extracted from ${profile.url} by DesignScan on ${profile.fetchedAt.slice(0, 10)}. ` +
      "These tokens reflect the computed styles observed on the live page — a " +
      "high-fidelity starting point. Refine the rationale below before shipping.",
  );

  body.push("");
  body.push("## Colors");
  body.push("");
  for (const [name, hex] of colors) {
    const label = COLOR_LABEL[name] ?? "a supporting palette color";
    body.push(`- **${name} (${hex}):** ${label}.`);
  }

  if (levels.length) {
    const fams = profile.typography.families;
    const sizes = levels.map((l) => l.size);
    body.push("");
    body.push("## Typography");
    body.push("");
    body.push(
      `Primary typeface: **${fams[0] || "sans-serif"}**` +
        (fams.length > 1 ? `, with ${fams.slice(1, 3).join(", ")}` : "") +
        `. Sizes range ${Math.min(...sizes)}px–${Math.max(...sizes)}px across ` +
        `${levels.length} level(s)` +
        (profile.typography.weights.length
          ? `; weights observed: ${profile.typography.weights.join(", ")}.`
          : "."),
    );
  }

  if (spacing.length) {
    body.push("");
    body.push("## Layout");
    body.push("");
    body.push(
      `Spacing follows an observed scale of ${spacing.map(([, v]) => v).join(", ")} — ` +
        "usable for padding, gaps, and margins.",
    );
  }

  body.push("");
  body.push("## Elevation & Depth");
  body.push("");
  body.push(
    profile.shadows.length
      ? `Depth is conveyed with ${profile.shadows.length} shadow level(s) observed on the page.`
      : "The page relies on flat surfaces and color contrast rather than shadows.",
  );

  if (rounded.length) {
    body.push("");
    body.push("## Shapes");
    body.push("");
    body.push(
      `Corner radii observed: ${rounded.map(([, v]) => v).join(", ")}. Use ` +
        "the smaller values for inputs and chips, larger for cards and surfaces.",
    );
  }

  body.push("");
  body.push("## Components");
  body.push("");
  body.push(
    "- **Primary button:** filled with the primary color (`{colors.primary}`) and " +
      "`{colors.on-primary}` text" +
      (roundedMd ? `, rounded to \`{rounded.${roundedMd}}\`` : "") +
      ".",
  );
  if (cmap.background && cmap.text) {
    body.push("- **Surface / card & input:** `{colors.background}` with `{colors.text}` foreground.");
  }
  if (cmap["accent-1"]) {
    body.push("- **Link:** `{colors.accent-1}` text for inline links.");
  }
  if (cmap["accent-2"]) {
    body.push("- **Badge / tag:** `{colors.accent-2}` background with `{colors.on-accent-2}` text.");
  }

  body.push("");
  body.push("## Do's and Don'ts");
  body.push("");
  body.push("- **Do** reserve `primary` for the most important actions.");
  body.push(
    "- **Don't** treat these auto-extracted values as final — verify contrast " +
      "and intent before production.",
  );

  return `---\n${fm.join("\n")}\n---\n\n${body.join("\n")}\n`;
}
