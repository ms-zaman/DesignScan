// DesignProfile -> "Notes for your coding agent": a deterministic, per-extraction
// guidance block appended to the DESIGN.md body.
//
// The insight: the file is always *consumed by an AI coding agent* (Cursor,
// Claude Code, …). So instead of running our own LLM to resolve semantic intent
// (the deferred "Step 4"), we compute the tricky calls here — contrast, heading
// hierarchy, font fallback — and hand the agent specific, numbered instructions
// it can act on. The reasoning stays deterministic on our side; the *application*
// happens for free inside the user's already-running agent.
//
// Every line is derived from THIS profile's actual values (cited hexes + computed
// WCAG ratios), never generic boilerplate — generic advice gets ignored.

import { luminance, parseColor } from "./color.js";
import { contrastRatio, resolveColorRoles, type TypeLevel } from "./resolve.js";
import type { DesignProfile } from "./types.js";

const r1 = (n: number) => n.toFixed(1); // "4.5"

// WCAG thresholds we reason against.
const AA_BODY = 4.5; // normal-size text
const AA_LARGE = 3; // >= ~24px or 18.66px bold

// How much stronger a darker accent must be (in contrast) before we recommend it
// over the body `text` token for headings — avoids nudging on a negligible gap.
const HEADING_PROMOTE_MARGIN = 1.5;

// Build the markdown lines for the "## Notes for your coding agent" section, or
// an empty array if the profile is too sparse to say anything useful (no header
// is emitted upstream when this is empty).
export function agentNotes(
  profile: DesignProfile,
  levels: TypeLevel[],
): string[] {
  const roles = resolveColorRoles(profile);
  const { background, text, primary, onPrimary, accent1, accent2 } = roles;
  const notes: string[] = [];

  const hasHeading = levels.some((l) => l.size >= 24);

  // 1. Heading hierarchy — the exact gap a naive consumer hits: the `text` token
  // is tuned for body copy and reads muted at large sizes. If a darker, dimmer
  // color exists that's clearly stronger on the background, name it for headings.
  if (background && text && hasHeading) {
    const textC = contrastRatio(text, background);
    // The strong dark color can land in any accent slot (palette order decides),
    // so weigh every resolved non-body role, not just accent-2.
    const darker = [accent2, accent1, primary]
      .filter((c): c is string => !!c)
      .map((c) => ({ c, contrast: contrastRatio(c, background) }))
      // must be genuinely dark (a real heading-text color, not a bright accent)
      // and meaningfully stronger than the body text token.
      .filter(
        ({ c, contrast }) =>
          isDark(c) && contrast >= textC + HEADING_PROMOTE_MARGIN,
      )
      .sort((a, b) => b.contrast - a.contrast)[0];
    if (darker) {
      notes.push(
        `- **Headings:** the \`text\` token (${text}) sits at ${r1(textC)}:1 on ` +
          `\`background\` — fine for body copy, but it reads muted at display sizes. ` +
          `For large headings use \`${nameOf(roles, darker.c)}\` (${darker.c}, ` +
          `${r1(darker.contrast)}:1) to keep visual hierarchy. Reserve \`text\` for ` +
          `paragraph and UI copy.`,
      );
    }
  }

  // 2. Body-text contrast — flag sub-AA body color so the agent darkens long-form
  // copy instead of shipping the extracted (possibly low-contrast) value as-is.
  if (background && text) {
    const textC = contrastRatio(text, background);
    if (textC < AA_BODY) {
      notes.push(
        `- **Body contrast:** \`text\` on \`background\` is ${r1(textC)}:1, below ` +
          `WCAG AA for normal text (${AA_BODY}:1)${
            textC >= AA_LARGE
              ? ` though it clears AA-large (${AA_LARGE}:1)`
              : ""
          }. Darken \`text\` for sustained reading, or reserve the extracted value ` +
          `for secondary/muted copy only.`,
      );
    }
  }

  // 3. Font fallback — the brand face is almost never installed on the consumer's
  // machine. The stack already carries the site's own fallbacks; tell the agent
  // what it degrades to so it isn't surprised by different metrics.
  const stack = profile.typography.fontStack;
  const brand = profile.typography.families[0];
  if (stack && brand) {
    const generic = genericOf(stack);
    notes.push(
      `- **Fonts:** the brand face \`${brand}\` likely isn't installed locally. ` +
        `Use the full stack \`${stack}\` verbatim — it falls back to ` +
        `${generic ? `\`${generic}\`` : "a system font"}, so expect slightly ` +
        `different metrics; keep the declared weights and letterSpacing to stay ` +
        `on-brand.`,
    );
  }

  // 4. Primary button — confirm the contract holds so the agent trusts it (and
  // doesn't "fix" a passing combo). Cheap reassurance, computed not assumed.
  if (primary && onPrimary) {
    const c = contrastRatio(onPrimary, primary);
    notes.push(
      `- **Primary actions:** \`primary\` (${primary}) with \`on-primary\` ` +
        `(${onPrimary}) text is ${r1(c)}:1${
          c >= AA_BODY ? " (passes AA)" : " — verify label legibility"
        }. Reserve \`primary\` for the single most important action per view.`,
    );
  }

  // 4b. Hover micro-interaction — the parts of the observed hover the token
  // schema can't carry (shadow / lift). Observed on the live button, so the
  // agent can reproduce the real interaction instead of inventing one.
  const fx = profile.primaryButtonHover;
  if (fx && (fx.shadow || fx.transform)) {
    const bits: string[] = [];
    if (fx.transform) bits.push(`moves (\`transform: ${fx.transform}\`)`);
    if (fx.shadow) bits.push(`carries \`box-shadow: ${fx.shadow}\``);
    notes.push(
      `- **Primary button hover:** observed on the live site, the button also ` +
        `${bits.join(" and ")} on \`:hover\`` +
        `${profile.colors.primaryHover ? "" : " (its background color does not change)"}` +
        `. Reproduce this for fidelity.`,
    );
  }

  // 5. Links — only when accent-1 is its own (non-primary) color, so the agent
  // doesn't conflate link color with the button color.
  if (accent1 && accent1 !== primary) {
    notes.push(
      `- **Links:** use \`accent-1\` (${accent1}) for inline links, distinct from ` +
        `the \`primary\` button color.`,
    );
  }

  // 6. Shape & spacing rhythm — keep the agent on the extracted scale instead of
  // inventing arbitrary radii/gaps that break the visual system.
  if (profile.radiusScalePx.length) {
    notes.push(
      "- **Shape:** stay on the `rounded` scale — small values for inputs/buttons, " +
        "larger for cards, `full` only for pills and avatars. Don't introduce radii " +
        "outside it.",
    );
  }
  if (profile.spacingScalePx.length) {
    const base = profile.spacingScalePx[0];
    notes.push(
      `- **Spacing:** compose padding, gaps, and margins from the \`spacing\` scale ` +
        `(a ${base}px-based rhythm) rather than arbitrary pixel values.`,
    );
  }

  // 7. Declared-token provenance — when the site publishes its own scale as
  // custom properties (mined + painted-corroborated in normalize), say so: the
  // values stop being statistical guesses, and the agent can mirror the site's
  // own variable names instead of inventing a parallel vocabulary.
  const d = profile.declared;
  if (d) {
    const px = (rec: Record<string, number>) =>
      Object.entries(rec)
        .slice(0, 4)
        .map(([n, v]) => `\`${n}: ${v}px\``)
        .join(", ");
    const groups: string[] = [];
    if (d.radius) groups.push(`radii (${px(d.radius)})`);
    if (d.spacing) groups.push(`spacing (${px(d.spacing)})`);
    if (d.fontFamilies) {
      const names = Object.keys(d.fontFamilies)
        .slice(0, 3)
        .map((n) => `\`${n}\``)
        .join(", ");
      groups.push(`fonts (${names})`);
    }
    if (groups.length) {
      notes.push(
        `- **Declared tokens:** the site publishes its design scale as CSS custom ` +
          `properties — ${groups.join("; ")} — and the page paints these exact ` +
          `values. Treat them as the canonical scale and reuse the site's own ` +
          `variable names when you create tokens.`,
      );
    }
  }

  return notes;
}

// A color is "dark" enough to serve as heading text on a light surface.
function isDark(hex: string): boolean {
  const c = parseColor(hex);
  return !!c && luminance(c) < 0.25;
}

// The role name (e.g. "accent-2") for a resolved hex, for friendly references in
// the prose. Falls back to the bare hex if it isn't one of the named roles.
function nameOf(
  roles: ReturnType<typeof resolveColorRoles>,
  hex: string,
): string {
  const map: [string, string | null][] = [
    ["primary", roles.primary],
    ["accent-1", roles.accent1],
    ["accent-2", roles.accent2],
    ["text", roles.text],
  ];
  return map.find(([, v]) => v === hex)?.[0] ?? hex;
}

// The trailing generic family (sans-serif / serif / monospace) a stack degrades
// to, if declared.
function genericOf(stack: string): string | null {
  const last = stack
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .pop();
  return last && /^(sans-serif|serif|monospace|system-ui|ui-\w+)$/.test(last)
    ? last
    : null;
}
