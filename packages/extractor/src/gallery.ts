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
header { padding: 48px 24px 24px; max-width: 1100px; margin: 0 auto; }
header h1 { margin: 0 0 8px; font-size: 32px; letter-spacing: -0.02em; }
header p { margin: 0; color: #555; max-width: 60ch; }
header code { background: #efefef; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
main { max-width: 1100px; margin: 0 auto; padding: 16px 24px 64px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
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

// The self-contained gallery page (examples/index.html).
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
<meta name="description" content="Auto-extracted DESIGN.md design-token specifications (colors, type, spacing, radii) for ${count} real websites. Generated from live CSS by DesignScan." />
<style>${GALLERY_STYLE}</style>
</head>
<body>
<header>
  <h1>DesignScan brand corpus</h1>
  <p>Design-token specs (<code>DESIGN.md</code> + HTML preview) auto-extracted from
  the live CSS of ${count} real ${count === 1 ? "brand" : "brands"}. Each is a
  spec-compliant token set an AI coding agent can read to match that site's look.</p>
</header>
<main>
  <div class="grid">
${cards}
  </div>
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
