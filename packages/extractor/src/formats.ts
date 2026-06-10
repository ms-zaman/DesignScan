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

import {
  type ColorRoles,
  isDistinctDark,
  resolveColorRoles,
  scaleTokens,
  typographyLevels,
} from "./resolve.js";
import type { DesignProfile } from "./types.js";

// Role -> token name, in emit order. Nulls are skipped per-profile.
function colorEntries(roles: ColorRoles): [string, string][] {
  const entries: [string, string | null][] = [
    ["primary", roles.primary],
    ["on-primary", roles.onPrimary],
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
  const spacing = scaleTokens(profile.spacingScalePx);
  const radius = scaleTokens(profile.radiusScalePx);

  const doc: Group = {
    $description: `Design tokens extracted from ${profile.url} by DesignScan on ${profile.fetchedAt.slice(0, 10)}.`,
    color: w3cColorGroup(roles),
  };

  const stack = profile.typography.fontStack || profile.typography.families[0];
  if (stack) {
    doc.font = {
      $type: "fontFamily",
      sans: { $value: familyList(stack) },
    };
  }

  if (levels.length) {
    const typography: Group = { $type: "typography" };
    for (const l of levels) {
      typography[l.name] = {
        $value: {
          // Alias the shared stack instead of repeating it per level.
          fontFamily: stack ? "{font.sans}" : l.family,
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

  for (const [key, tokens] of [
    ["space", spacing],
    ["radius", radius],
  ] as const) {
    if (!tokens.length) continue;
    const group: Group = { $type: "dimension" };
    for (const [name, val] of tokens) group[name] = { $value: val };
    doc[key] = group;
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
  const spacing = scaleTokens(profile.spacingScalePx);
  const radius = scaleTokens(profile.radiusScalePx);

  const lines: string[] = [
    `/* Design tokens extracted from ${profile.url} by DesignScan on ${profile.fetchedAt.slice(0, 10)}. */`,
    ":root {",
    ...cssColorLines(roles),
  ];

  const stack = profile.typography.fontStack || profile.typography.families[0];
  if (stack) lines.push(`  --font-sans: ${stack};`);

  // One `font` shorthand per level — usable directly as
  // `font: var(--text-display)`. letter-spacing can't ride the shorthand, so
  // it gets its own variable only when the level actually tracks.
  for (const l of levels) {
    lines.push(
      `  --text-${l.name}: ${l.weight} ${l.size}px/${l.lineHeight} var(--font-sans);`,
    );
    if (l.letterSpacingEm && Math.abs(l.letterSpacingEm) >= 0.001) {
      lines.push(`  --text-${l.name}-tracking: ${l.letterSpacingEm}em;`);
    }
  }

  for (const [prefix, tokens] of [
    ["space", spacing],
    ["radius", radius],
  ] as const) {
    for (const [name, val] of tokens) {
      lines.push(`  --${prefix}-${name}: ${val};`);
    }
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
