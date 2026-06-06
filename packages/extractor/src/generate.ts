// DesignProfile -> DESIGN.md (Google Labs open format, alpha).
// Spec: github.com/google-labs-code/design.md/blob/main/docs/spec.md
//   front matter = YAML design tokens; body = ordered ## prose sections.
// This is a heuristic pass over auto-extracted tokens — structurally valid and
// lint-clean (every defined token is referenced), but the prose is meant to be
// refined (eventually LLM-assisted).

import {
  isDistinctDark,
  resolveColorRoles,
  scaleTokens,
  typographyLevels,
} from "./resolve.js";
import type { DesignProfile } from "./types.js";

const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

// Build the colors map AND the components that reference them together, so we
// only ever emit a color token that some component actually uses (keeps the
// linter's "defined but never referenced" warnings at zero).
//
// `suffix` lets us emit a parallel theme (e.g. "-dark"): color tokens and
// component keys are suffixed, while the shared rounded/spacing scales are
// referenced unsuffixed. This keeps both themes inside one spec-valid file
// (the spec forbids duplicate `## Colors` headings but accepts extra tokens).
function buildColorsAndComponents(
  profile: DesignProfile,
  rounded: [string, string][],
  spacing: [string, string][],
  bodyLevel: string | undefined,
  suffix = "",
) {
  const cn = (base: string) => `${base}${suffix}`; // suffixed color-token name
  const ref = (base: string) => `{colors.${base}${suffix}}`;
  const { primary, onPrimary, background, text, accent1, accent2, onAccent2 } =
    resolveColorRoles(profile);

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
  lines.push(`  ${cn("button-primary")}:`);
  lines.push(`    backgroundColor: "${ref("primary")}"`);
  use("primary");
  lines.push(`    textColor: "${ref("on-primary")}"`);
  use("on-primary");
  if (roundedMd) lines.push(`    rounded: "{rounded.${roundedMd}}"`);
  if (spacingMd) lines.push(`    padding: "{spacing.${spacingMd}}"`);

  if (background && text) {
    lines.push(`  ${cn("surface")}:`);
    lines.push(`    backgroundColor: "${ref("background")}"`);
    lines.push(`    textColor: "${ref("text")}"`);
    use("background");
    use("text");
    if (roundedLg) lines.push(`    rounded: "{rounded.${roundedLg}}"`);
    if (spacingLg) lines.push(`    padding: "{spacing.${spacingLg}}"`);

    lines.push(`  ${cn("input")}:`);
    lines.push(`    backgroundColor: "${ref("background")}"`);
    lines.push(`    textColor: "${ref("text")}"`);
    if (roundedSm) lines.push(`    rounded: "{rounded.${roundedSm}}"`);
    if (spacingSm) lines.push(`    padding: "{spacing.${spacingSm}}"`);
  }

  if (text && bodyLevel) {
    lines.push(`  ${cn("body-text")}:`);
    lines.push(`    textColor: "${ref("text")}"`);
    use("text");
    lines.push(`    typography: "{typography.${bodyLevel}}"`);
  }

  // Link — gives accent-1 a home so it isn't an orphan token.
  if (accent1) {
    lines.push(`  ${cn("link")}:`);
    lines.push(`    textColor: "${ref("accent-1")}"`);
    use("accent-1");
    if (bodyLevel) lines.push(`    typography: "{typography.${bodyLevel}}"`);
  }

  // Badge / tag — consumes accent-2 (+ its readable foreground).
  if (accent2 && onAccent2) {
    lines.push(`  ${cn("badge")}:`);
    lines.push(`    backgroundColor: "${ref("accent-2")}"`);
    use("accent-2");
    lines.push(`    textColor: "${ref("on-accent-2")}"`);
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
  const colors = candidates
    .filter(([name, hex]) => hex && used.has(name))
    .map(([name, hex]) => [cn(name), hex] as [string, string]);

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

// `dark`, when supplied, is a second profile captured under
// `prefers-color-scheme: dark`. Both themes are merged into ONE spec-valid file:
// shared typography/spacing/rounded scales, light colors + `*-dark` colors, and
// `*-dark` component variants — all under the single required section headings.
export function generate(profile: DesignProfile, dark?: DesignProfile): string {
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
  // Only emit a dark block when the dark pass is genuinely distinct (see
  // isDistinctDark) — otherwise we'd bloat the file with duplicate tokens and
  // imply a dark theme that doesn't exist. The dark theme reuses the shared
  // scales, so it only contributes colors and component variants (suffixed
  // "-dark").
  const distinctDark = isDistinctDark(profile, dark);
  const darkBlock = distinctDark
    ? buildColorsAndComponents(dark, rounded, spacing, bodyLevel, "-dark")
    : null;
  const cmap = Object.fromEntries(colors);
  const themeNote = darkBlock
    ? " (light + dark themes)"
    : profile.theme === "dark"
      ? " (dark theme)"
      : "";

  // ---- YAML front matter ---------------------------------------------------
  const fm: string[] = [];
  fm.push("version: alpha");
  fm.push(`name: ${q(profile.title || profile.url)}`);
  fm.push(
    `description: ${q(`Auto-extracted from ${profile.url} by DesignScan${themeNote}.`)}`,
  );

  fm.push("colors:");
  for (const [k, v] of colors) fm.push(`  ${k}: ${q(v)}`);
  if (darkBlock)
    for (const [k, v] of darkBlock.colors) fm.push(`  ${k}: ${q(v)}`);

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
  if (darkBlock) fm.push(...darkBlock.componentLines);

  // ---- Markdown body (spec section order) ----------------------------------
  const body: string[] = [];

  body.push("## Overview");
  body.push("");
  body.push(
    `Auto-extracted from ${profile.url} by DesignScan on ${profile.fetchedAt.slice(0, 10)}${themeNote}. ` +
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
  if (darkBlock) {
    body.push("");
    body.push(
      "**Dark theme.** The same roles captured under " +
        "`prefers-color-scheme: dark`, exposed as parallel `*-dark` tokens (with " +
        "matching `*-dark` component variants):",
    );
    for (const [name, hex] of darkBlock.colors) {
      const label =
        COLOR_LABEL[name.replace(/-dark$/, "")] ?? "a supporting palette color";
      body.push(`- **${name} (${hex}):** ${label}.`);
    }
  } else if (dark) {
    body.push("");
    body.push(
      "_No distinct dark theme was detected — the site renders the same palette " +
        "under `prefers-color-scheme: dark` (its dark mode, if any, is likely " +
        "gated on a class or stored preference rather than the OS setting)._",
    );
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
    body.push(
      "- **Surface / card & input:** `{colors.background}` with `{colors.text}` foreground.",
    );
  }
  if (cmap["accent-1"]) {
    body.push("- **Link:** `{colors.accent-1}` text for inline links.");
  }
  if (cmap["accent-2"]) {
    body.push(
      "- **Badge / tag:** `{colors.accent-2}` background with `{colors.on-accent-2}` text.",
    );
  }
  if (darkBlock) {
    body.push(
      "- **Dark variants:** every component above has a `*-dark` counterpart " +
        "(e.g. `button-primary-dark`, `surface-dark`) wired to the `*-dark` colors.",
    );
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
