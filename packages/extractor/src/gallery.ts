// The brand-seed library's public surface. Given a set of pre-extracted brand
// profiles, build a browsable gallery (index.html) and a markdown index
// (examples/README.md) linking each brand's DESIGN.md + HTML preview. This is
// the non-AI distribution wedge: a curated, SEO-friendly corpus of real
// design-token specs that the engine produces for free.
//
// Pure string builders — no IO, so they're trivially testable. seed.ts does the
// extraction and file writes around them.

import { onColor } from "./resolve.js";
import type { DesignProfile } from "./types.js";

export interface GalleryEntry {
  // Slug used for the artifact filenames (`<name>.DESIGN.md` / `.preview.html`).
  name: string;
  profile: DesignProfile;
}

const esc = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );

// A human label for a brand. The domain slug is the reliable identifier, but a
// page <title> often carries nicer casing (GitHub, Tailwind CSS), so we take the
// title's leading segment when it actually *names* the brand — short, and either
// a single word or sharing a token with the slug. Otherwise we fall back to a
// capitalized slug, which keeps taglines ("Push your ideas to the web") and
// product sentences ("Finally, AI for…") from becoming the label.
export function brandLabel(entry: GalleryEntry): string {
  const slug = entry.name;
  const slugCore = slug.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const title = entry.profile.title?.trim();
  if (title) {
    const head = title.split(/\s*[·\-–—|:]\s+/)[0].trim();
    const words = head.split(/\s+/);
    const headCore = head.replace(/[^a-z0-9]/gi, "").toLowerCase();
    const namesBrand =
      !!headCore &&
      (headCore.includes(slugCore) || slugCore.includes(headCore));
    if (head && (words.length === 1 || (words.length <= 3 && namesBrand))) {
      return head;
    }
  }
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

// Sort entries by label so the corpus has a stable, alphabetical order
// regardless of the order brands were seeded in.
function sorted(entries: GalleryEntry[]): GalleryEntry[] {
  return [...entries].sort((a, b) =>
    brandLabel(a).toLowerCase().localeCompare(brandLabel(b).toLowerCase()),
  );
}

const swatch = (hex: string | null): string => {
  if (!hex) return "";
  return `<span class="sw" style="background:${esc(hex)};color:${onColor(hex)}">${esc(hex)}</span>`;
};

// One card per brand: primary + background swatches, the font, and links to the
// generated spec + preview.
function card(entry: GalleryEntry): string {
  const label = brandLabel(entry);
  const c = entry.profile.colors;
  const font =
    entry.profile.typography.families[0] ?? entry.profile.typography.fontStack;
  return `  <a class="card" href="${esc(entry.name)}.preview.html">
    <div class="swatches">${swatch(c.primary)}${swatch(c.background)}</div>
    <div class="meta">
      <strong>${esc(label)}</strong>
      <span class="font">${esc(font ?? "—")}</span>
      <span class="url">${esc(new URL(entry.profile.url).hostname.replace(/^www\./, ""))}</span>
    </div>
    <div class="links"><span>preview →</span></div>
  </a>`;
}

const GALLERY_STYLE = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { margin: 0; font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; background: #fafafa; }
header { padding: 56px 24px 8px; max-width: 1100px; margin: 0 auto; }
header h1 { margin: 0 0 10px; font-size: 38px; letter-spacing: -0.02em; }
header .tagline { margin: 0 0 18px; color: #444; max-width: 62ch; font-size: 17px; }
header code, section code { background: #efefef; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.btns { display: flex; gap: 10px; flex-wrap: wrap; }
.btns a { text-decoration: none; font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 8px; border: 1px solid #d9d9de; color: #333; background: #fff; }
.btns a.primary { background: #6b46ff; border-color: #6b46ff; color: #fff; }
.btns a:hover { border-color: #6b46ff; color: #6b46ff; }
.btns a.primary:hover { color: #fff; opacity: .9; }
main { max-width: 1100px; margin: 0 auto; padding: 8px 24px 64px; }
section { margin-top: 40px; }
section h2 { margin: 0 0 6px; font-size: 21px; letter-spacing: -0.01em; }
section > p { margin: 0 0 14px; color: #555; max-width: 70ch; }
pre { background: #16161d; color: #e8e8ef; padding: 16px 18px; border-radius: 10px; overflow-x: auto; font: 13px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace; }
pre .c { color: #8a8a99; }
.steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; padding: 0; margin: 14px 0 0; list-style: none; counter-reset: step; }
.steps li { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px 18px; counter-increment: step; }
.steps li::before { content: counter(step); display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: #6b46ff; color: #fff; font-size: 13px; font-weight: 700; margin-bottom: 8px; }
.steps strong { display: block; margin-bottom: 4px; }
.steps p { margin: 0; color: #555; font-size: 14px; }
.formats { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.formats span { background: #fff; border: 1px solid #e5e5e5; border-radius: 999px; padding: 5px 12px; font-size: 13px; color: #444; }
.formats code { background: none; padding: 0; color: #6b46ff; font-weight: 600; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-top: 16px; }
.card { display: flex; flex-direction: column; text-decoration: none; color: inherit; background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; transition: box-shadow .15s, transform .15s; }
.card:hover { box-shadow: 0 8px 24px rgba(0,0,0,.08); transform: translateY(-2px); }
.swatches { display: flex; height: 88px; }
.sw { flex: 1; display: flex; align-items: flex-end; justify-content: flex-start; padding: 6px 8px; font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.meta { padding: 12px 14px 4px; display: flex; flex-direction: column; gap: 2px; }
.meta strong { font-size: 16px; }
.meta .font { color: #444; }
.meta .url { color: #888; font-size: 12px; }
.links { padding: 8px 14px 14px; color: #6b46ff; font-size: 13px; font-weight: 600; }
footer { max-width: 1100px; margin: 0 auto; padding: 0 24px 48px; color: #888; font-size: 13px; }
footer a { color: #6b46ff; }
`;

// Static landing copy above the corpus grid: what DesignScan is, how to run
// it, what it does under the hood, and how an agent consumes it over MCP.
// Plain strings (no user input), so nothing here needs escaping.
const LANDING = `
  <section>
    <h2>Quick start</h2>
    <p>One command, no API key — point it at any live site and get a
    <code>DESIGN.md</code> your coding agent can build with:</p>
    <pre><span class="c"># one-time: install the headless browser</span>
npx playwright install chromium

<span class="c"># any URL &rarr; DESIGN.md (Google Labs open format)</span>
npx @designscan/extractor stripe.com --md --out stripe.DESIGN.md

<span class="c"># other formats, themes, and a visual proof sheet</span>
npx @designscan/extractor vercel.com --format w3c --out vercel.tokens.json
npx @designscan/extractor linear.app --theme both --md --preview --out linear.DESIGN.md</pre>
    <div class="formats">
      <span><code>--md</code> DESIGN.md — YAML tokens + prose, passes the official linter</span>
      <span><code>--format w3c</code> W3C Design Tokens JSON (Style Dictionary, Tokens Studio)</span>
      <span><code>--format css</code> paste-ready CSS custom properties</span>
      <span><code>--format json</code> the raw token profile</span>
    </div>
  </section>

  <section>
    <h2>How it works</h2>
    <ol class="steps">
      <li><strong>Render &amp; observe</strong>
        <p>Headless Chromium loads the live page (hydration-aware) and reads the
        computed styles of every visible element — shadow DOM included. It even
        really hovers and presses the buttons to capture the true
        <code>:hover</code> / <code>:active</code> states, and probes the dark
        theme.</p></li>
      <li><strong>Normalize into tokens</strong>
        <p>Thousands of raw values are clustered into a clean profile: color
        roles (primary, background, text, borders…), the type scale, spacing
        and radius grids, shadows, container width and responsive breakpoints —
        preferring the site's own declared design system
        (<code>--color-primary</code>, <code>--breakpoint-md</code>) when the
        page really paints it.</p></li>
      <li><strong>Emit a spec</strong>
        <p>Out comes a spec-valid <code>DESIGN.md</code>, W3C tokens JSON, or
        CSS variables — plus a self-contained HTML preview that renders every
        token, and deterministic "notes for your coding agent" (contrast,
        hierarchy, font fallbacks).</p></li>
    </ol>
  </section>

  <section>
    <h2>Use it from your coding agent (MCP)</h2>
    <p>DesignScan ships an <a href="https://modelcontextprotocol.io">MCP</a> server
    (listed on the official registry as <code>io.github.ms-zaman/designscan</code>).
    One tool — <code>get_design_tokens(url, format?, theme?)</code> — lets an agent
    pull live tokens mid-task: <em>"restyle this app like stripe.com"</em>.</p>
    <pre><span class="c">// e.g. Claude Code: .mcp.json</span>
{
  "mcpServers": {
    "designscan": { "command": "npx", "args": ["-y", "@designscan/extractor", "mcp"] }
  }
}</pre>
  </section>
`;

// The self-contained gallery page (examples/index.html) — landing + corpus.
export function galleryHtml(entries: GalleryEntry[]): string {
  const list = sorted(entries);
  const cards = list.map(card).join("\n");
  const count = list.length;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>DesignScan — design-token specs for ${count} real brands</title>
<meta name="description" content="DesignScan turns any URL into design tokens: DESIGN.md, W3C tokens JSON, or CSS variables, extracted from the live page. Browse auto-extracted specs for ${count} real websites." />
<style>${GALLERY_STYLE}</style>
</head>
<body>
<header>
  <h1>DesignScan</h1>
  <p class="tagline">Any URL &rarr; design tokens. DesignScan renders a live site,
  observes what it actually paints, and emits a spec-compliant
  <code>DESIGN.md</code> (plus W3C tokens JSON and CSS variables) that an AI
  coding agent can read to match that site's look. Runs locally — no API key.</p>
  <div class="btns">
    <a class="primary" href="https://github.com/ms-zaman/DesignScan">GitHub</a>
    <a href="https://www.npmjs.com/package/@designscan/extractor">npm</a>
    <a href="#corpus">Brand corpus &darr;</a>
  </div>
</header>
<main>
${LANDING}
  <section id="corpus">
    <h2>Brand corpus</h2>
    <p>Design-token specs (<code>DESIGN.md</code> + HTML preview) auto-extracted from
    the live CSS of ${count} real ${count === 1 ? "brand" : "brands"}. Each is a
    spec-compliant token set an AI coding agent can read to match that site's look.</p>
    <div class="grid">
${cards}
    </div>
  </section>
</main>
<footer>Generated by <a href="https://github.com/ms-zaman/DesignScan">DesignScan</a> — URL → design tokens → DESIGN.md.</footer>
</body>
</html>
`;
}

// The markdown index for examples/README.md — a table GitHub renders inline.
export function galleryMarkdown(entries: GalleryEntry[]): string {
  const list = sorted(entries);
  const rows = list
    .map((e) => {
      const label = brandLabel(e);
      const host = new URL(e.profile.url).hostname.replace(/^www\./, "");
      const c = e.profile.colors;
      const font = e.profile.typography.families[0] ?? "—";
      return `| **${label}** | \`${c.primary ?? "—"}\` | \`${c.background ?? "—"}\` | ${font} | [DESIGN.md](${e.name}.DESIGN.md) · [preview](${e.name}.preview.html) · [json](${e.name}.json) | [${host}](${e.profile.url}) |`;
    })
    .join("\n");
  return `# Brand corpus

Auto-extracted design-token specs for ${list.length} real ${list.length === 1 ? "brand" : "brands"}, generated from live CSS by [DesignScan](../). Each row links a spec-compliant \`DESIGN.md\`, a self-contained HTML preview, and the raw token JSON. Open [\`index.html\`](index.html) for the visual gallery.

> Regenerate with \`pnpm seed rebuild\` (from committed JSON, no network) or add brands with \`pnpm seed add <url>\`.

| Brand | Primary | Background | Font | Files | Source |
|-------|---------|------------|------|-------|--------|
${rows}
`;
}
