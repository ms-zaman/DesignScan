// DesignProfile -> DESIGN.md (Google Labs open format, alpha).
// Spec: github.com/google-labs-code/design.md/blob/main/docs/spec.md
//   front matter = YAML design tokens; body = ordered ## prose sections.
// This is a heuristic pass over auto-extracted tokens — structurally valid and
// lint-clean (every defined token is referenced), but the prose is meant to be
// refined (eventually LLM-assisted).

import { agentNotes } from "./agentNotes.js";
import {
  breakpointEntries,
  isDistinctDark,
  resolveColorRoles,
  scaleTokens,
  shadowTokens,
  type TypeLevel,
  typographyLevels,
} from "./resolve.js";
import type { DesignProfile } from "./types.js";

// The typography level whose size matches an observed control font-size
// (±1px for sub-pixel rendering). The control's size came from the same page
// the scale was built from, so a miss means it was filtered as noise — in
// that case no reference is emitted rather than a wrong one.
function levelForSize(
  levels: TypeLevel[],
  px: number | undefined,
): string | undefined {
  if (px === undefined) return undefined;
  let best: TypeLevel | undefined;
  for (const l of levels) {
    if (
      Math.abs(l.size - px) <= 1 &&
      (!best || Math.abs(l.size - px) < Math.abs(best.size - px))
    )
      best = l;
  }
  return best?.name;
}

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
  levels: TypeLevel[],
  bodyLevel: string | undefined,
  suffix = "",
) {
  const cn = (base: string) => `${base}${suffix}`; // suffixed color-token name
  const ref = (base: string) => `{colors.${base}${suffix}}`;
  const {
    primary,
    onPrimary,
    primaryHover,
    primaryActive,
    background,
    text,
    accent1,
    accent2,
    onAccent2,
    border,
    mutedSurface,
    error,
    success,
    warning,
    info,
  } = resolveColorRoles(profile);

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

  // Observed control geometry: the typography level the control's real
  // font-size maps onto, and its rendered height. Only present when the
  // extraction measured them — nothing here is a convention guess.
  const btnLevel = levelForSize(levels, profile.controls?.button?.fontSizePx);
  const btnHeight = profile.controls?.button?.heightPx;
  const inputLevel = levelForSize(levels, profile.controls?.input?.fontSizePx);
  const inputHeight = profile.controls?.input?.heightPx;

  // Primary button — always present (spec requires a `primary` color).
  lines.push(`  ${cn("button-primary")}:`);
  lines.push(`    backgroundColor: "${ref("primary")}"`);
  use("primary");
  lines.push(`    textColor: "${ref("on-primary")}"`);
  use("on-primary");
  if (btnLevel) lines.push(`    typography: "{typography.${btnLevel}}"`);
  if (roundedMd) lines.push(`    rounded: "{rounded.${roundedMd}}"`);
  if (spacingMd) lines.push(`    padding: "{spacing.${spacingMd}}"`);
  if (btnHeight) lines.push(`    height: ${btnHeight}px`);

  // Hover variant — only when the site was *observed* hover-shifting its
  // primary button (extract.ts physically hovers it). Mirrors button-primary
  // with the shifted background so agents style :hover with the real value
  // instead of inventing a darken().
  if (primaryHover) {
    lines.push(`  ${cn("button-primary-hover")}:`);
    lines.push(`    backgroundColor: "${ref("primary-hover")}"`);
    use("primary-hover");
    lines.push(`    textColor: "${ref("on-primary")}"`);
    if (btnLevel) lines.push(`    typography: "{typography.${btnLevel}}"`);
    if (roundedMd) lines.push(`    rounded: "{rounded.${roundedMd}}"`);
    if (spacingMd) lines.push(`    padding: "{spacing.${spacingMd}}"`);
    if (btnHeight) lines.push(`    height: ${btnHeight}px`);
  }

  // Pressed variant — same provenance as hover: only when the site was
  // *observed* shifting the primary button under a real press (:active).
  if (primaryActive) {
    lines.push(`  ${cn("button-primary-active")}:`);
    lines.push(`    backgroundColor: "${ref("primary-active")}"`);
    use("primary-active");
    lines.push(`    textColor: "${ref("on-primary")}"`);
    if (btnLevel) lines.push(`    typography: "{typography.${btnLevel}}"`);
    if (roundedMd) lines.push(`    rounded: "{rounded.${roundedMd}}"`);
    if (spacingMd) lines.push(`    padding: "{spacing.${spacingMd}}"`);
    if (btnHeight) lines.push(`    height: ${btnHeight}px`);
  }

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
    if (inputLevel) lines.push(`    typography: "{typography.${inputLevel}}"`);
    if (roundedSm) lines.push(`    rounded: "{rounded.${roundedSm}}"`);
    if (spacingSm) lines.push(`    padding: "{spacing.${spacingSm}}"`);
    if (inputHeight) lines.push(`    height: ${inputHeight}px`);
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

  // Divider — a 1px rule painted in the hairline `border` color. The spec has no
  // borderColor property, so the border token lives here as a thin filled bar
  // (backgroundColor + height are both standard component properties).
  if (border) {
    lines.push(`  ${cn("divider")}:`);
    lines.push(`    backgroundColor: "${ref("border")}"`);
    use("border");
    lines.push(`    height: 1px`);
  }

  // Muted surface — a subtle secondary panel fill (e.g. a sidebar/section).
  if (mutedSurface && text) {
    lines.push(`  ${cn("surface-muted")}:`);
    lines.push(`    backgroundColor: "${ref("muted-surface")}"`);
    use("muted-surface");
    lines.push(`    textColor: "${ref("text")}"`);
    use("text");
    if (roundedLg) lines.push(`    rounded: "{rounded.${roundedLg}}"`);
    if (spacingLg) lines.push(`    padding: "{spacing.${spacingLg}}"`);
  }

  // Status / feedback colors — declared by the site, sanity-checked by hue.
  // Emitted as foreground-only message components (the most common honest use
  // of a single saturated status color: validation text, icons, borders); a
  // light fill would need a tint we don't extract. textColor + typography
  // references the token once, so it's never an orphan.
  for (const [role, hex] of [
    ["error", error],
    ["success", success],
    ["warning", warning],
    ["info", info],
  ] as const) {
    if (!hex) continue;
    lines.push(`  ${cn(`${role}-message`)}:`);
    lines.push(`    textColor: "${ref(role)}"`);
    use(role);
    if (bodyLevel) lines.push(`    typography: "{typography.${bodyLevel}}"`);
  }

  const candidates: [string, string | null][] = [
    ["primary", primary],
    ["on-primary", onPrimary],
    ["primary-hover", primaryHover],
    ["primary-active", primaryActive],
    ["background", background],
    ["text", text],
    ["accent-1", accent1],
    ["accent-2", accent2],
    ["on-accent-2", onAccent2],
    ["border", border],
    ["muted-surface", mutedSurface],
    ["error", error],
    ["success", success],
    ["warning", warning],
    ["info", info],
  ];
  const colors = candidates
    .filter(([name, hex]) => hex && used.has(name))
    .map(([name, hex]) => [cn(name), hex] as [string, string]);

  return { colors, componentLines: lines, roundedMd, btnLevel, btnHeight };
}

const COLOR_LABEL: Record<string, string> = {
  primary: "the dominant brand/accent color, used for primary actions",
  "on-primary": "the readable foreground used on primary surfaces",
  "primary-hover": "the primary button background as observed on hover",
  "primary-active":
    "the primary button background as observed while pressed (:active)",
  background: "the base surface color behind most content",
  text: "the primary foreground / body-text color",
  "accent-1": "a supporting accent (used for links)",
  "accent-2": "a secondary accent (used for badges/tags)",
  "on-accent-2": "the readable foreground on the secondary accent",
  border: "the hairline color for dividers, card edges, and input borders",
  "muted-surface": "a subtle secondary surface fill for panels and sections",
  error:
    "the feedback color for errors, destructive actions, and invalid input",
  success: "the feedback color for success and confirmation states",
  warning: "the feedback color for warnings and caution states",
  info: "the feedback color for informational notices",
};

// Ordered role buckets for the Colors prose, so it reads as a system rather
// than a flat list. Names map to the unsuffixed color tokens; the dark theme
// keeps its own separate block below.
const COLOR_GROUPS: [string, string[]][] = [
  [
    "Brand & actions",
    ["primary", "on-primary", "primary-hover", "primary-active"],
  ],
  ["Surfaces & text", ["background", "text", "border", "muted-surface"]],
  ["Accents", ["accent-1", "accent-2", "on-accent-2"]],
  ["Feedback", ["error", "success", "warning", "info"]],
];

// `dark`, when supplied, is a second profile captured under
// `prefers-color-scheme: dark`. Both themes are merged into ONE spec-valid file:
// shared typography/spacing/rounded scales, light colors + `*-dark` colors, and
// `*-dark` component variants — all under the single required section headings.
export function generate(profile: DesignProfile, dark?: DesignProfile): string {
  const levels = typographyLevels(profile);
  const rounded = scaleTokens(profile.radiusScalePx);
  const spacing = scaleTokens(profile.spacingScalePx);
  const shadows = shadowTokens(profile);
  const breakpoints = breakpointEntries(profile);
  const containerPx = profile.layout?.containerMaxWidthPx;
  const bodyLevel =
    levels.find((l) => l.name === "body")?.name ??
    levels.find((l) => l.size >= 14 && l.size <= 18)?.name ??
    levels[levels.length - 1]?.name;

  const { colors, componentLines, roundedMd, btnLevel, btnHeight } =
    buildColorsAndComponents(profile, rounded, spacing, levels, bodyLevel);
  // Only emit a dark block when the dark pass is genuinely distinct (see
  // isDistinctDark) — otherwise we'd bloat the file with duplicate tokens and
  // imply a dark theme that doesn't exist. The dark theme reuses the shared
  // scales, so it only contributes colors and component variants (suffixed
  // "-dark").
  const distinctDark = isDistinctDark(profile, dark);
  const darkBlock = distinctDark
    ? buildColorsAndComponents(
        dark,
        rounded,
        spacing,
        levels,
        bodyLevel,
        "-dark",
      )
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

  // Data-only group: the alpha spec has no shadow component sub-token and
  // `{shadows.*}` references don't resolve in the linter, but extra top-level
  // token groups lint clean — so the cleaned elevation scale ships as values
  // agents read directly (the Elevation section explains how to apply them).
  if (shadows.length) {
    fm.push("shadows:");
    for (const s of shadows) fm.push(`  ${s.name}: ${q(s.value)}`);
  }

  // Data-only like shadows: the spec has no breakpoint token group (and no
  // component property could reference one — they belong in @media), so the
  // observed reshape grid ships as plain values the Layout section explains.
  // Generic sm/md/… names here by design; the site's own var names surface in
  // the css/w3c emitters.
  if (breakpoints.length) {
    fm.push("breakpoints:");
    for (const b of breakpoints) fm.push(`  ${b.generic}: ${b.value}`);
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
  // Group the bullets by role so the section reads as a system, not a flat
  // dump — especially now that brand-state and feedback colors swell the list.
  // Bold lead-in lines (not ## headings) keep everything inside the one Colors
  // section the spec's section-order requires. Any future token not mapped to
  // a group falls into "Other" so nothing is silently dropped.
  const byName = new Map(colors);
  const grouped = new Set<string>();
  for (const [groupLabel, names] of COLOR_GROUPS) {
    const present = names.filter((n) => byName.has(n));
    if (!present.length) continue;
    body.push(`**${groupLabel}**`);
    body.push("");
    for (const name of present) {
      grouped.add(name);
      body.push(
        `- **${name} (${byName.get(name)}):** ${COLOR_LABEL[name] ?? "a supporting palette color"}.`,
      );
    }
    body.push("");
  }
  const ungrouped = colors.filter(([name]) => !grouped.has(name));
  if (ungrouped.length) {
    body.push("**Other**");
    body.push("");
    for (const [name, hex] of ungrouped) {
      body.push(
        `- **${name} (${hex}):** ${COLOR_LABEL[name] ?? "a supporting palette color"}.`,
      );
    }
    body.push("");
  }
  // Trim the trailing blank the loop leaves so spacing matches the rest of the
  // body (the dark block / next section re-adds its own).
  if (body[body.length - 1] === "") body.pop();
  if (darkBlock) {
    const gateLabel: Record<string, string> = {
      "class-dark": '`<html class="dark">`',
      "data-theme-dark": '`<html data-theme="dark">`',
      "data-color-mode-dark": '`<html data-color-mode="dark">`',
    };
    const gate = dark?.darkMechanism
      ? gateLabel[dark.darkMechanism]
      : undefined;
    body.push("");
    body.push(
      gate
        ? `**Dark theme.** This site gates dark mode on ${gate} — it ignores ` +
            "`prefers-color-scheme`, so replicate that gate (the palette below " +
            "was captured by applying it). Exposed as parallel `*-dark` tokens " +
            "(with matching `*-dark` component variants):"
        : "**Dark theme.** The same roles captured under " +
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

  if (spacing.length || containerPx || breakpoints.length) {
    body.push("");
    body.push("## Layout");
    body.push("");
    if (containerPx) {
      body.push(
        `Content sits in a horizontally centered container capped at ` +
          `**${containerPx}px** — cap top-level page sections at this width ` +
          `rather than letting text run the full viewport.`,
      );
    }
    if (breakpoints.length) {
      if (containerPx) body.push("");
      body.push(
        `The page reshapes at ${breakpoints.length} observed breakpoint(s): ` +
          `${breakpoints.map((b) => b.value).join(", ")} (see the \`breakpoints\` ` +
          "tokens in the front matter). Write `@media (min-width: …)` rules at " +
          "these exact boundaries instead of a framework's defaults.",
      );
    }
    if (spacing.length) {
      if (containerPx || breakpoints.length) body.push("");
      body.push(
        `Spacing follows an observed scale of ${spacing.map(([, v]) => v).join(", ")} — ` +
          "usable for padding, gaps, and margins.",
      );
    }
  }

  body.push("");
  body.push("## Elevation & Depth");
  body.push("");
  if (shadows.length) {
    body.push(
      `Depth is conveyed with ${shadows.length} shadow level(s) observed on the page, ` +
        "smallest to largest (see the `shadows` tokens in the front matter):",
    );
    body.push("");
    for (const s of shadows) body.push(`- **${s.name}:** \`${s.value}\``);
    body.push("");
    body.push(
      "_Apply these as `box-shadow` — the smaller levels on resting cards and " +
        "inputs, the larger on overlays (dropdowns, modals). Don't invent " +
        "intermediate shadows; this is the page's whole elevation vocabulary._",
    );
  } else {
    body.push(
      "The page relies on flat surfaces and color contrast rather than shadows.",
    );
  }

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
      (btnLevel ? `, set in \`{typography.${btnLevel}}\`` : "") +
      (btnHeight ? `, ${btnHeight}px tall as observed` : "") +
      ".",
  );
  if (cmap["primary-hover"]) {
    body.push(
      "- **Primary button (hover):** background shifts to `{colors.primary-hover}` — " +
        "observed on the live site, use it for `:hover` instead of a computed darken.",
    );
  }
  if (cmap["primary-active"]) {
    body.push(
      "- **Primary button (pressed):** background shifts to `{colors.primary-active}` — " +
        "observed by really pressing the live button, use it for `:active`.",
    );
  }
  if (profile.primaryButtonActive) {
    const fx = profile.primaryButtonActive;
    const bits = [
      ...(fx.transform ? [`moves \`${fx.transform}\``] : []),
      ...(fx.shadow ? [`box-shadow becomes \`${fx.shadow}\``] : []),
    ];
    if (bits.length) {
      body.push(
        `- **Primary button (pressed, micro-interaction):** ${bits.join("; ")} — ` +
          "the press physically reshapes the button, not just its color.",
      );
    }
  }
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
  if (cmap.border) {
    body.push(
      "- **Divider:** a 1px rule in `{colors.border}` — also the hairline for card edges and input borders.",
    );
  }
  if (cmap["muted-surface"]) {
    body.push(
      "- **Muted surface:** `{colors.muted-surface}` for subtle secondary panels and sections.",
    );
  }
  const statusBullets = (["error", "success", "warning", "info"] as const)
    .filter((r) => cmap[r])
    .map((r) => `\`{colors.${r}}\``);
  if (statusBullets.length) {
    body.push(
      `- **Feedback messages:** ${statusBullets.join(", ")} for validation, ` +
        "alerts, and status text/icons (the site's declared semantic colors).",
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

  // Notes for the consuming AI agent — deterministic, per-extraction guidance
  // (contrast, heading hierarchy, font fallback) so the agent applies the tokens
  // with intent instead of guessing. The length guard only drops the heading if
  // every note somehow elided (a profile with no resolvable primary).
  const notes = agentNotes(profile, levels);
  if (notes.length) {
    body.push("");
    body.push("## Notes for your coding agent");
    body.push("");
    body.push(
      "Computed from this extraction — act on these before treating the tokens as final:",
    );
    body.push("");
    body.push(...notes);
  }

  return `---\n${fm.join("\n")}\n---\n\n${body.join("\n")}\n`;
}
