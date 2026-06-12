// DesignProfile -> a self-contained HTML proof sheet that *renders* the tokens.
//
// The DESIGN.md is the spec; this is its visual mirror. A user can't tell from
// raw hex/px whether the extraction is any good (is the text readable? is the
// link color invisible? are the headings actually bold?) — so we paint every
// resolved role, type level, scale, and component with the real values, inside
// a neutral grey chrome that stays readable no matter how odd the tokens are.
//
// Output is one offline .html file (tokens inlined as CSS custom properties, no
// build step, no network). It resolves the SAME roles/levels/scales as
// generate.ts via resolve.ts, so the preview can never disagree with the file
// it sits beside. When a distinct dark theme exists it embeds both and offers a
// Light/Dark toggle.

import {
  breakpointEntries,
  type ColorRoles,
  isDistinctDark,
  resolveColorRoles,
  type ScaleEntry,
  type ShadowToken,
  scaleTokens,
  shadowTokens,
  type TypeLevel,
  typographyLevels,
} from "./resolve.js";
import type { DesignProfile } from "./types.js";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// A websafe fallback chain so the specimen still renders something sane when the
// site's font is proprietary / not installed locally (e.g. "sohne-var").
const FALLBACK_STACK =
  "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
// `family` may already be a full CSS stack (resolve.ts prefers the site's
// declared fallbacks); in that case use it verbatim. A bare single name gets
// quoted and backed by the websafe chain.
// Double quotes are rewritten to single quotes (CSS treats them identically):
// these stacks land inside double-quoted style="" attributes, where a raw "
// terminates the attribute and silently drops every declaration after
// font-family — GitHub's "Mona Sans" / Stripe's "SF Pro Display" rendered all
// type specimens at the browser-default 16px and unstyled buttons.
const fontStack = (family: string | undefined) => {
  if (!family) return FALLBACK_STACK;
  const f = family.replace(/"/g, "'");
  if (f.includes(",")) return f; // already a stack
  return `'${f.replace(/'/g, "")}', ${FALLBACK_STACK}`;
};

const SPECIMEN = "The quick brown fox jumps";

// --- per-theme content (everything below the chrome) ----------------------

function colorsSection(roles: ColorRoles): string {
  const swatches: [string, string | null][] = [
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
  const cells = swatches
    .filter(([, hex]) => hex)
    .map(([name, hex]) => {
      const h = hex as string;
      return `<figure class="swatch">
        <div class="chip" style="background:${esc(h)}"></div>
        <figcaption><b>${name}</b><code>${esc(h)}</code></figcaption>
      </figure>`;
    })
    .join("\n");
  return `<section><h2>Colors</h2><div class="swatches">${cells}</div></section>`;
}

function typographySection(levels: TypeLevel[]): string {
  if (!levels.length) return "";
  const rows = levels
    .map((l) => {
      const ls =
        l.letterSpacingEm && Math.abs(l.letterSpacingEm) >= 0.001
          ? `letter-spacing:${l.letterSpacingEm}em;`
          : "";
      const style =
        `font-family:${fontStack(l.family)};` +
        `font-size:${l.size}px;font-weight:${l.weight};` +
        `line-height:${l.lineHeight};${ls}`;
      return `<div class="type-row">
        <div class="type-meta"><b>${esc(l.name)}</b><span>${l.size}px · ${l.weight} · lh ${l.lineHeight}</span></div>
        <div class="type-specimen" style="${style}">${esc(SPECIMEN)}</div>
      </div>`;
    })
    .join("\n");
  return `<section><h2>Typography</h2><div class="type-list">${rows}</div></section>`;
}

function scaleSection(
  title: string,
  tokens: [string, string][],
  kind: "spacing" | "radius",
): string {
  if (!tokens.length) return "";
  const items = tokens
    .map(([name, val]) => {
      const px = Number.parseInt(val, 10) || 0;
      const box =
        kind === "spacing"
          ? `<div class="bar" style="width:${px}px"></div>`
          : `<div class="radius-box" style="border-radius:${px}px"></div>`;
      return `<figure class="scale-item">${box}<figcaption><b>${name}</b><code>${esc(val)}</code></figcaption></figure>`;
    })
    .join("\n");
  return `<section><h2>${title}</h2><div class="scale-row">${items}</div></section>`;
}

// The reshape grid + container cap as proportional width bars (all scaled
// against the largest value), so the relative rhythm of the breakpoints is
// visible at a glance. Same resolved entries as the emitters, so labels match.
function layoutSection(
  layout: DesignProfile["layout"],
  breakpoints: ScaleEntry[],
): string {
  const container = layout?.containerMaxWidthPx;
  if (!container && !breakpoints.length) return "";
  const maxPx = Math.max(container ?? 0, ...breakpoints.map((b) => b.px));
  const pct = (px: number) => ((px / maxPx) * 100).toFixed(1);
  const row = (label: string, sub: string, px: number, cls: string) =>
    `<div class="bp-row">
      <div class="bp-meta"><b>${esc(label)}</b><code>${esc(sub)}</code></div>
      <div class="bp-bar ${cls}" style="width:${pct(px)}%"></div>
    </div>`;
  const rows = [
    ...breakpoints.map((b) =>
      row(b.declared ?? b.generic, b.value, b.px, "bp-break"),
    ),
    ...(container
      ? [row("container", `max-width ${container}px`, container, "bp-cap")]
      : []),
  ];
  return `<section><h2>Layout</h2><div class="bp-list">${rows.join("\n")}</div></section>`;
}

// Renders the same cleaned + named scale the DESIGN.md `shadows:` block and
// the css/w3c emitters carry, so the proof sheet labels match the tokens.
function shadowSection(shadows: ShadowToken[]): string {
  if (!shadows.length)
    return `<section><h2>Elevation</h2><p class="muted">No shadows observed — the page relies on flat surfaces.</p></section>`;
  const cards = shadows
    .map(
      (s) =>
        `<figure class="shadow-item"><div class="shadow-box" style="box-shadow:${esc(s.value)}"></div><figcaption><b>${s.name}</b></figcaption></figure>`,
    )
    .join("\n");
  return `<section><h2>Elevation</h2><div class="shadow-row">${cards}</div></section>`;
}

// The six components generate.ts emits, rendered from the resolved roles +
// scales so they match the DESIGN.md component definitions exactly.
function componentsSection(
  roles: ColorRoles,
  rounded: [string, string][],
  spacing: [string, string][],
  bodyLevel: TypeLevel | undefined,
  hoverFx?: { shadow?: string; transform?: string },
  activeFx?: { shadow?: string; transform?: string },
  controls?: DesignProfile["controls"],
): string {
  const pick = (entries: [string, string][], preferred: string, idx: number) =>
    entries.find(([k]) => k === preferred)?.[1] ??
    entries[Math.max(0, Math.min(idx, entries.length - 1))]?.[1] ??
    "0px";
  const rMd = pick(rounded, "md", 1);
  const rLg = pick(rounded, "lg", rounded.length - 1);
  const rSm = pick(rounded, "sm", 0);
  const pMd = pick(spacing, "md", 1);
  const pLg = pick(spacing, "lg", spacing.length - 1);
  const pSm = pick(spacing, "sm", 0);
  const bodyFont = fontStack(bodyLevel?.family);
  const bodySize = bodyLevel ? `${bodyLevel.size}px` : "14px";
  // Observed control geometry (schema 1.5): paint the real button/input
  // font-size and height so the specimen matches the DESIGN.md component spec.
  const btnSize = controls?.button?.fontSizePx
    ? `${controls.button.fontSizePx}px`
    : bodySize;
  const btnH = controls?.button?.heightPx
    ? `height:${controls.button.heightPx}px;box-sizing:border-box;`
    : "";
  const inputSize = controls?.input?.fontSizePx
    ? `${controls.input.fontSizePx}px`
    : bodySize;
  const inputH = controls?.input?.heightPx
    ? `height:${controls.input.heightPx}px;box-sizing:border-box;`
    : "";
  // Real hairline color when extracted; a faint neutral otherwise so the card
  // edge still reads.
  const brd = roles.border ?? "rgba(0,0,0,.12)";

  const parts: string[] = [];

  // button-primary. align-self:flex-start opts out of the flex column's
  // default stretch: a button (and the badge below) must hug its content —
  // stretched edge-to-edge it reads as a banner, not a component. Cards,
  // dividers and inputs keep the full width on purpose.
  // When a hover shift was observed on the live site, the specimen really
  // hovers to it — color, shadow, and lift alike. Inline handlers (not a
  // :hover rule) because the rest state lives in a style="" attribute, which
  // a stylesheet rule can't out-rank without !important, and they scope per
  // theme for free. mouseout restores: background to the rest value, the fx
  // by clearing the inline property (the specimen declares neither at rest).
  const overParts: string[] = [];
  const outParts: string[] = [];
  if (roles.primaryHover) {
    overParts.push(`this.style.background='${roles.primaryHover}'`);
    outParts.push(`this.style.background='${roles.primary}'`);
  }
  if (hoverFx?.shadow) {
    overParts.push(`this.style.boxShadow='${hoverFx.shadow}'`);
    outParts.push(`this.style.boxShadow=''`);
  }
  if (hoverFx?.transform) {
    overParts.push(`this.style.transform='${hoverFx.transform}'`);
    outParts.push(`this.style.transform=''`);
  }
  const hover = overParts.length
    ? ` onmouseover="${esc(overParts.join(";"))}" onmouseout="${esc(outParts.join(";"))}"`
    : "";

  // Pressed (:active) — mirrors the hover wiring. mouseup restores the hover
  // state (the pointer is still over the button when it's released).
  const downParts: string[] = [];
  const upParts: string[] = [];
  const restoreBg = roles.primaryHover ?? roles.primary;
  if (roles.primaryActive) {
    downParts.push(`this.style.background='${roles.primaryActive}'`);
    upParts.push(`this.style.background='${restoreBg}'`);
  }
  if (activeFx?.shadow) {
    downParts.push(`this.style.boxShadow='${activeFx.shadow}'`);
    upParts.push(
      hoverFx?.shadow
        ? `this.style.boxShadow='${hoverFx.shadow}'`
        : `this.style.boxShadow=''`,
    );
  }
  if (activeFx?.transform) {
    downParts.push(`this.style.transform='${activeFx.transform}'`);
    upParts.push(
      hoverFx?.transform
        ? `this.style.transform='${hoverFx.transform}'`
        : `this.style.transform=''`,
    );
  }
  const press = downParts.length
    ? ` onmousedown="${esc(downParts.join(";"))}" onmouseup="${esc(upParts.join(";"))}"`
    : "";

  const stateLabels = [
    roles.primaryHover ? ` · :hover ${esc(roles.primaryHover)}` : "",
    roles.primaryActive || downParts.length
      ? ` · :active${roles.primaryActive ? ` ${esc(roles.primaryActive)}` : ""}`
      : "",
  ].join("");
  parts.push(`<div class="cmp">
    <span class="cmp-label">button-primary${stateLabels}</span>
    <button${hover}${press} style="align-self:flex-start;background:${esc(roles.primary)};color:${esc(roles.onPrimary)};border:0;border-radius:${rMd};padding:${pMd} calc(${pMd} * 2);font:600 ${btnSize}/1 ${bodyFont};${btnH}cursor:pointer">Primary action</button>
  </div>`);

  // surface / card + input + body-text (need background & text); card edge and
  // input border painted in the extracted `border` color.
  if (roles.background && roles.text) {
    parts.push(`<div class="cmp">
      <span class="cmp-label">surface · input · body-text${roles.border ? " · border" : ""}</span>
      <div style="background:${esc(roles.background)};color:${esc(roles.text)};border:1px solid ${esc(brd)};border-radius:${rLg};padding:${pLg};font:400 ${bodySize}/1.5 ${bodyFont};box-shadow:0 1px 3px rgba(0,0,0,.06)">
        <p style="margin:0 0 ${pMd}">Body text on the surface color — this is what reading copy looks like.</p>
        <input placeholder="input field" style="background:${esc(roles.background)};color:${esc(roles.text)};border:1px solid ${esc(brd)};border-radius:${rSm};padding:${pSm};font:400 ${inputSize}/1 ${bodyFont};${inputH}width:60%" />
      </div>
    </div>`);
  }

  // divider — a 1px rule in the hairline color
  if (roles.border) {
    parts.push(`<div class="cmp">
      <span class="cmp-label">divider</span>
      <div style="height:1px;background:${esc(roles.border)}"></div>
    </div>`);
  }

  // surface-muted — subtle secondary panel
  if (roles.mutedSurface && roles.text) {
    parts.push(`<div class="cmp">
      <span class="cmp-label">surface-muted</span>
      <div style="background:${esc(roles.mutedSurface)};color:${esc(roles.text)};border-radius:${rLg};padding:${pLg};font:400 ${bodySize}/1.5 ${bodyFont}">Subtle secondary surface — sidebars, sections, callouts.</div>
    </div>`);
  }

  // link
  if (roles.accent1) {
    parts.push(`<div class="cmp">
      <span class="cmp-label">link</span>
      <div class="cmp-onsurface" style="background:${esc(roles.background ?? "#fff")};border-color:${esc(brd)}">
        <a href="#" style="color:${esc(roles.accent1)};font:400 ${bodySize}/1.5 ${bodyFont}">Inline link example →</a>
      </div>
    </div>`);
  }

  // badge
  if (roles.accent2 && roles.onAccent2) {
    parts.push(`<div class="cmp">
      <span class="cmp-label">badge</span>
      <span style="align-self:flex-start;background:${esc(roles.accent2)};color:${esc(roles.onAccent2)};border-radius:9999px;padding:${pSm} ${pMd};font:500 ${bodySize}/1 ${bodyFont}">Badge</span>
    </div>`);
  }

  return `<section><h2>Components</h2><div class="cmp-grid">${parts.join("\n")}</div></section>`;
}

function themeContent(profile: DesignProfile): string {
  const roles = resolveColorRoles(profile);
  const levels = typographyLevels(profile);
  const rounded = scaleTokens(profile.radiusScalePx);
  const spacing = scaleTokens(profile.spacingScalePx);
  const bodyLevel =
    levels.find((l) => l.name === "body") ??
    levels.find((l) => l.size >= 14 && l.size <= 18) ??
    levels[levels.length - 1];
  return [
    colorsSection(roles),
    typographySection(levels),
    scaleSection("Spacing", spacing, "spacing"),
    scaleSection("Radius", rounded, "radius"),
    layoutSection(profile.layout, breakpointEntries(profile)),
    shadowSection(shadowTokens(profile)),
    componentsSection(
      roles,
      rounded,
      spacing,
      bodyLevel,
      profile.primaryButtonHover,
      profile.primaryButtonActive,
      profile.controls,
    ),
  ].join("\n");
}

const STYLE = `
:root{--bg:#f4f5f7;--panel:#fff;--ink:#1a1d24;--muted:#6b7280;--line:#e5e7eb}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 28px;background:var(--panel);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:2}
header h1{font-size:16px;margin:0;font-weight:600}
header .sub{color:var(--muted);font-size:12px;margin-top:2px}
header a{color:var(--muted)}
main{max-width:980px;margin:0 auto;padding:28px}
section{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:20px 24px;margin-bottom:20px}
section h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin:0 0 16px}
.swatches,.scale-row,.shadow-row{display:flex;flex-wrap:wrap;gap:16px}
.swatch,.scale-item,.shadow-item{margin:0;text-align:center}
.chip{width:96px;height:64px;border-radius:8px;border:1px solid var(--line)}
figcaption{margin-top:8px;font-size:12px;display:flex;flex-direction:column;gap:2px}
figcaption code{color:var(--muted);font-size:11px}
.type-list{display:flex;flex-direction:column;gap:18px}
.type-row{display:grid;grid-template-columns:160px 1fr;gap:16px;align-items:baseline;border-top:1px solid var(--line);padding-top:14px}
.type-row:first-child{border-top:0;padding-top:0}
.type-meta{display:flex;flex-direction:column}
.type-meta span{color:var(--muted);font-size:11px}
.type-specimen{color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar{height:24px;min-width:2px;background:#9ca3af;border-radius:3px}
.scale-item{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.scale-item figcaption{align-items:flex-start}
.radius-box{width:56px;height:56px;background:#9ca3af}
.bp-list{display:flex;flex-direction:column;gap:10px}
.bp-row{display:grid;grid-template-columns:160px 1fr;gap:16px;align-items:center}
.bp-meta{display:flex;flex-direction:column;font-size:12px}
.bp-meta code{color:var(--muted);font-size:11px}
.bp-bar{height:18px;border-radius:3px;min-width:2px}
.bp-break{background:#9ca3af}
.bp-cap{background:#4b5563}
.shadow-box{width:120px;height:72px;background:#fff;border:1px solid var(--line);border-radius:8px}
.shadow-row{padding:8px 0}
.shadow-item figcaption{color:var(--muted)}
.cmp-grid{display:flex;flex-direction:column;gap:20px}
.cmp{display:flex;flex-direction:column;gap:8px}
.cmp-label{font-size:11px;color:var(--muted);font-family:ui-monospace,monospace}
.cmp-onsurface{padding:16px;border-radius:8px;border:1px solid var(--line)}
.muted{color:var(--muted)}
.toggle{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.toggle button{border:0;background:var(--panel);color:var(--muted);padding:6px 14px;cursor:pointer;font:inherit;font-size:13px}
.toggle button.active{background:var(--ink);color:#fff}
[hidden]{display:none}
`;

const TOGGLE_SCRIPT = `
<script>
(function(){
  var btns=document.querySelectorAll('[data-theme-btn]');
  var panels=document.querySelectorAll('[data-theme-panel]');
  btns.forEach(function(b){b.addEventListener('click',function(){
    var t=b.getAttribute('data-theme-btn');
    btns.forEach(function(x){x.classList.toggle('active',x===b)});
    panels.forEach(function(p){p.hidden=p.getAttribute('data-theme-panel')!==t});
  })});
})();
</script>`;

// `dark`, when supplied and genuinely distinct, adds a second panel + a
// Light/Dark toggle. We reuse generate.ts's "distinct" test so the preview and
// the DESIGN.md agree on whether a real dark theme exists.
export function preview(profile: DesignProfile, dark?: DesignProfile): string {
  const distinctDark = isDistinctDark(profile, dark);

  const title = profile.title || profile.url;
  const toggle = distinctDark
    ? `<div class="toggle">
          <button data-theme-btn="light" class="active">Light</button>
          <button data-theme-btn="dark">Dark</button>
        </div>`
    : "";

  const lightPanel = `<div data-theme-panel="light">${themeContent(profile)}</div>`;
  const darkPanel = distinctDark
    ? `<div data-theme-panel="dark" hidden>${themeContent(dark)}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} — DesignScan preview</title>
<style>${STYLE}</style>
</head>
<body>
<header>
  <div>
    <h1>${esc(title)}</h1>
    <div class="sub">DesignScan preview · <a href="${esc(profile.url)}">${esc(profile.url)}</a> · ${profile.fetchedAt.slice(0, 10)}</div>
  </div>
  ${toggle}
</header>
<main>
${lightPanel}
${darkPanel}
</main>
${distinctDark ? TOGGLE_SCRIPT : ""}
</body>
</html>
`;
}
