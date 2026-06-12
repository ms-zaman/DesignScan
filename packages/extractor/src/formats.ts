// DesignProfile -> alternative token formats.
//
// The DESIGN.md emitter (generate.ts) targets one alpha spec; these emitters
// make DesignScan "URL -> *your* token format" for teams that have never heard
// of it: the W3C Design Tokens Community Group JSON (interchange — Style
// Dictionary, Tokens Studio, …) and plain CSS custom properties (paste into a
// stylesheet and go). Both consume the SAME resolved roles/levels/scales from
// resolve.ts as generate.ts and preview.ts, so no format can disagree with
// another about what the tokens are.
//
// Dark handling mirrors generate.ts: only a *genuinely distinct* dark pass is
// emitted (isDistinctDark), and only its colors — typography and the px scales
// are shared between themes.

import { parseColor, toHex } from "./color.js";
import { generate } from "./generate.js";
import {
  breakpointEntries,
  type ColorRoles,
  declaredFontName,
  isDistinctDark,
  resolveColorRoles,
  type ScaleEntry,
  scaleEntries,
  shadowTokens,
  typographyLevels,
} from "./resolve.js";
import type { DesignProfile } from "./types.js";

// Every output format DesignScan can emit, routed through one function so the
// CLI and the MCP server can never disagree about what a format name means.
export const OUTPUT_FORMATS = ["json", "md", "w3c", "css"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export function emit(
  format: OutputFormat,
  profile: DesignProfile,
  dark?: DesignProfile,
): string {
  switch (format) {
    case "md":
      return generate(profile, dark);
    case "w3c":
      return w3cTokens(profile, dark);
    case "css":
      return cssVars(profile, dark);
    default:
      // The raw-profile JSON keeps its historical {light, dark} envelope.
      return `${JSON.stringify(dark ? { light: profile, dark } : profile, null, 2)}\n`;
  }
}

// Role -> token name, in emit order. Nulls are skipped per-profile.
function colorEntries(roles: ColorRoles): [string, string][] {
  const entries: [string, string | null][] = [
    ["primary", roles.primary],
    ["on-primary", roles.onPrimary],
    ["primary-hover", roles.primaryHover],
    ["primary-active", roles.primaryActive],
    ["background", roles.background],
    ["text", roles.text],
    ["accent-1", roles.accent1],
    ["accent-2", roles.accent2],
    ["on-accent-2", roles.onAccent2],
    ["border", roles.border],
    ["muted-surface", roles.mutedSurface],
  ];
  return entries.filter((e): e is [string, string] => e[1] !== null);
}

// Split a CSS font-family stack into the array form the DTCG fontFamily type
// wants, unquoting the individual names.
function familyList(stack: string): string[] {
  return stack
    .split(",")
    .map((f) => f.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

// Token name for one scale step: the site's own declared custom-property name
// when one exists, else the generic positional name. The rare collision (the
// site itself declares e.g. `--space-xs` for a DIFFERENT value than our
// positional xs) falls back to an unambiguous value-suffixed name — declared
// names never carry a px suffix, so it can't collide back.
//
// css mode emits full custom-property names (`--space-xs`, site names
// verbatim); w3c mode emits bare group keys (`xs`, site names stripped of the
// `--` prefix — the group already namespaces them).
function cssScaleName(
  e: ScaleEntry,
  prefix: string,
  declaredTaken: Set<string>,
): string {
  if (e.declared) return e.declared;
  const generic = `--${prefix}-${e.generic}`;
  return declaredTaken.has(generic) ? `--${prefix}-${e.px}px` : generic;
}

function w3cScaleName(e: ScaleEntry, declaredTaken: Set<string>): string {
  if (e.declared) return e.declared.replace(/^--/, "");
  return declaredTaken.has(e.generic) ? `${e.generic}-${e.px}px` : e.generic;
}

function declaredNames(entries: ScaleEntry[], strip: boolean): Set<string> {
  return new Set(
    entries
      .filter((e) => e.declared)
      .map((e) =>
        strip
          ? (e.declared as string).replace(/^--/, "")
          : (e.declared as string),
      ),
  );
}

// Shadow layer colors arrive as computed CSS (rgba/oklab/color(srgb …)); DTCG
// wants plain hex, so convert — appending an alpha byte only when translucent.
// Unparseable input passes through verbatim rather than silently vanishing.
function shadowColorHex(color: string): string {
  const c = parseColor(color);
  if (!c) return color;
  const hex = toHex(c);
  if (c.a >= 1) return hex;
  return `${hex}${Math.round(c.a * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

// --- W3C Design Tokens (DTCG) JSON ----------------------------------------
// Format note: we emit the widely-implemented draft shape — `$value` colors as
// hex strings and dimensions as "16px" strings — rather than the newer
// object-valued forms, because that's what today's tooling (Style Dictionary,
// Tokens Studio) actually parses. Revisit when the spec stabilises.

type Group = { [key: string]: unknown };

function w3cColorGroup(roles: ColorRoles): Group {
  const group: Group = { $type: "color" };
  for (const [name, hex] of colorEntries(roles)) {
    group[name] = { $value: hex };
  }
  return group;
}

export function w3cTokens(
  profile: DesignProfile,
  dark?: DesignProfile,
): string {
  const roles = resolveColorRoles(profile);
  const levels = typographyLevels(profile);
  const spacing = scaleEntries(
    profile.spacingScalePx,
    profile.declared?.spacing,
  );
  const radius = scaleEntries(profile.radiusScalePx, profile.declared?.radius);

  const doc: Group = {
    $description: `Design tokens extracted from ${profile.url} by DesignScan on ${profile.fetchedAt.slice(0, 10)}.`,
    color: w3cColorGroup(roles),
  };

  const stack = profile.typography.fontStack || profile.typography.families[0];
  // The site's own font-var name when it declares one (e.g. geist's
  // --font-sans, linear's --font-regular), else our generic "sans".
  const fontKey = declaredFontName(profile)?.replace(/^--/, "") ?? "sans";
  if (stack) {
    doc.font = {
      $type: "fontFamily",
      [fontKey]: { $value: familyList(stack) },
    };
  }

  if (levels.length) {
    const typography: Group = { $type: "typography" };
    for (const l of levels) {
      typography[l.name] = {
        $value: {
          // Alias the shared stack instead of repeating it per level.
          fontFamily: stack ? `{font.${fontKey}}` : l.family,
          fontSize: `${l.size}px`,
          fontWeight: l.weight,
          lineHeight: l.lineHeight,
          ...(l.letterSpacingEm && Math.abs(l.letterSpacingEm) >= 0.001
            ? { letterSpacing: `${l.letterSpacingEm}em` }
            : {}),
        },
      };
    }
    doc.typography = typography;
  }

  for (const [key, entries] of [
    ["space", spacing],
    ["radius", radius],
    ["breakpoint", breakpointEntries(profile)],
  ] as const) {
    if (!entries.length) continue;
    const group: Group = { $type: "dimension" };
    const taken = declaredNames(entries, true);
    for (const e of entries) {
      group[w3cScaleName(e, taken)] = { $value: e.value };
    }
    doc[key] = group;
  }

  if (profile.layout?.containerMaxWidthPx) {
    doc.container = {
      $type: "dimension",
      "max-width": { $value: `${profile.layout.containerMaxWidthPx}px` },
    };
  }

  const shadows = shadowTokens(profile);
  if (shadows.length) {
    const group: Group = { $type: "shadow" };
    for (const s of shadows) {
      const layers = s.layers.map((l) => ({
        color: shadowColorHex(l.color),
        offsetX: `${l.offsetX}px`,
        offsetY: `${l.offsetY}px`,
        blur: `${l.blur}px`,
        spread: `${l.spread}px`,
        ...(l.inset ? { inset: true } : {}),
      }));
      // Single-layer shadows use the object form; stacks use the array form.
      group[s.name] = { $value: layers.length === 1 ? layers[0] : layers };
    }
    doc.shadow = group;
  }

  if (isDistinctDark(profile, dark)) {
    doc.dark = {
      $description:
        "Colors under prefers-color-scheme: dark. Typography and scales are shared with the root tokens.",
      color: w3cColorGroup(resolveColorRoles(dark)),
    };
  }

  return `${JSON.stringify(doc, null, 2)}\n`;
}

// --- CSS custom properties --------------------------------------------------

function cssColorLines(roles: ColorRoles): string[] {
  return colorEntries(roles).map(([name, hex]) => `  --color-${name}: ${hex};`);
}

export function cssVars(profile: DesignProfile, dark?: DesignProfile): string {
  const roles = resolveColorRoles(profile);
  const levels = typographyLevels(profile);
  const spacing = scaleEntries(
    profile.spacingScalePx,
    profile.declared?.spacing,
  );
  const radius = scaleEntries(profile.radiusScalePx, profile.declared?.radius);

  const lines: string[] = [
    `/* Design tokens extracted from ${profile.url} by DesignScan on ${profile.fetchedAt.slice(0, 10)}. */`,
    ":root {",
    ...cssColorLines(roles),
  ];

  const stack = profile.typography.fontStack || profile.typography.families[0];
  // Prefer the site's own font-var name (a stylesheet copied from the site
  // keeps resolving), else our generic --font-sans.
  const fontVar = declaredFontName(profile) ?? "--font-sans";
  if (stack) lines.push(`  ${fontVar}: ${stack};`);

  // One `font` shorthand per level — usable directly as
  // `font: var(--text-display)`. letter-spacing can't ride the shorthand, so
  // it gets its own variable only when the level actually tracks.
  for (const l of levels) {
    lines.push(
      `  --text-${l.name}: ${l.weight} ${l.size}px/${l.lineHeight} var(${fontVar});`,
    );
    if (l.letterSpacingEm && Math.abs(l.letterSpacingEm) >= 0.001) {
      lines.push(`  --text-${l.name}-tracking: ${l.letterSpacingEm}em;`);
    }
  }

  // Scale steps under the site's own names where declared (so the emitted
  // sheet composes with CSS copied from the site), generic names otherwise.
  for (const [prefix, entries] of [
    ["space", spacing],
    ["radius", radius],
  ] as const) {
    const taken = declaredNames(entries, false);
    for (const e of entries) {
      lines.push(`  ${cssScaleName(e, prefix, taken)}: ${e.value};`);
    }
  }

  // Layout facts: the container cap is directly usable (max-width:
  // var(--container-max-width)); the breakpoint vars are documentation —
  // @media preludes can't read var() — published the way tailwind v4
  // publishes its own grid, under the site's names where declared.
  if (profile.layout?.containerMaxWidthPx) {
    lines.push(
      `  --container-max-width: ${profile.layout.containerMaxWidthPx}px;`,
    );
  }
  const breakpoints = breakpointEntries(profile);
  const takenBp = declaredNames(breakpoints, false);
  for (const e of breakpoints) {
    lines.push(`  ${cssScaleName(e, "breakpoint", takenBp)}: ${e.value};`);
  }

  // Cleaned box-shadow values, usable directly: box-shadow: var(--shadow-sm).
  for (const s of shadowTokens(profile)) {
    lines.push(`  --shadow-${s.name}: ${s.value};`);
  }
  lines.push("}");

  if (isDistinctDark(profile, dark)) {
    lines.push(
      "",
      "@media (prefers-color-scheme: dark) {",
      "  :root {",
      ...cssColorLines(resolveColorRoles(dark)).map((l) => `  ${l}`),
      "  }",
      "}",
    );
  }

  return `${lines.join("\n")}\n`;
}
