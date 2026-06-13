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

// A small "color dot + hex" entry for the card's metadata row.
const hexChip = (hex: string | null): string =>
  hex ? `<span><i style="background:${esc(hex)}"></i>${esc(hex)}</span>` : "";

// One card per brand, rendered as a *mini live specimen*: the top panel uses
// the brand's own background + text, the name set in its text color, and
// button chips filled with its primary (and secondary, when extracted) — so
// each card literally previews what DesignScan pulled out. The metadata strip
// below carries the font, host, and the key hex values.
function card(entry: GalleryEntry): string {
  const label = brandLabel(entry);
  const c = entry.profile.colors;
  const font =
    entry.profile.typography.families[0] ?? entry.profile.typography.fontStack;
  const host = new URL(entry.profile.url).hostname.replace(/^www\./, "");

  // Specimen surface: the brand's own background + readable foreground. Fall
  // back to neutral paper/ink so a card never renders invisibly.
  const bg = c.background ?? "#f3efe7";
  const ink = c.text ?? onColor(bg);
  const primary = c.primary ?? ink;
  const chips = [
    `<span class="chip" style="background:${esc(primary)};color:${onColor(primary)}">Primary</span>`,
    c.secondary
      ? `<span class="chip ghost" style="color:${esc(c.secondary)}">Secondary</span>`
      : "",
  ].join("");
  const hexes = [hexChip(c.primary), hexChip(c.background), hexChip(c.text)]
    .filter(Boolean)
    .join("");

  return `      <a class="card" href="${esc(entry.name)}.preview.html">
        <div class="spec" style="background:${esc(bg)};color:${esc(ink)}">
          <span class="spec-name">${esc(label)}</span>
          <span class="spec-btns">${chips}</span>
        </div>
        <div class="meta">
          <div class="m-row"><strong>${esc(label)}</strong><span class="host">${esc(host)}</span></div>
          <span class="font">${esc(font ?? "—")}</span>
          <div class="hexes">${hexes}</div>
        </div>
        <div class="go">Open preview &rarr;</div>
      </a>`;
}

const GALLERY_STYLE = `
:root{
  --maxw:1120px;
  /* Warm-paper editorial palette: no pure white, one confident accent, no
     gradients — deliberately the opposite of the violet "AI template" look. */
  --bg:#f3efe7;--fg:#1d1b16;--muted:#6c675c;--line:#e3ddd0;--card:#fbf9f3;--soft:#ece5d8;
  --accent:#1f6b4c;--accent-ink:#175338;--accent-wash:#e5ede7;
  --panel:#1b1a15;--panel-line:rgba(255,255,255,.08);
  --radius:14px;--shadow:0 1px 2px rgba(29,27,22,.05),0 10px 28px rgba(29,27,22,.07);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--fg);line-height:1.6;-webkit-font-smoothing:antialiased;
  font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
a{color:inherit}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}
code{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85em;
  background:var(--accent-wash);color:var(--accent-ink);padding:.14em .42em;border-radius:6px}

/* nav */
nav{position:sticky;top:0;z-index:20;background:rgba(243,239,231,.82);backdrop-filter:saturate(180%) blur(12px);
  -webkit-backdrop-filter:saturate(180%) blur(12px);border-bottom:1px solid var(--line)}
nav .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
.brand{display:flex;align-items:center;gap:11px;text-decoration:none;font-weight:700;font-size:17px;letter-spacing:-.01em;color:var(--fg)}
.brand .mark{width:30px;height:30px;border-radius:9px;background:var(--accent);
  display:grid;place-items:center;color:#fff;font-weight:800;font-size:16px}
.nav-links{display:flex;align-items:center;gap:24px}
.nav-links a{text-decoration:none;color:var(--muted);font-size:14px;font-weight:500}
.nav-links a:hover{color:var(--fg)}

.btn{display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-size:14px;font-weight:600;
  padding:10px 18px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--fg);
  transition:border-color .15s,color .15s,background .15s,transform .15s,box-shadow .15s;cursor:pointer}
.btn:hover{border-color:var(--accent);color:var(--accent-ink)}
.btn-primary{border:1px solid var(--accent);color:#fff;background:var(--accent);box-shadow:0 4px 14px rgba(31,107,76,.22)}
.btn-primary:hover{color:#fff;background:var(--accent-ink);border-color:var(--accent-ink);transform:translateY(-1px);box-shadow:0 8px 20px rgba(31,107,76,.28)}
.btn-sm{padding:8px 15px;font-size:13.5px}

/* hero — light & warm, no dark slab, no glow */
.hero{position:relative;overflow:hidden;text-align:center;padding:92px 24px 80px;
  background:radial-gradient(60% 50% at 50% -8%,var(--accent-wash),transparent 70%)}
.hero .inner{position:relative;max-width:820px;margin:0 auto}
.badge{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:var(--accent-ink);
  background:var(--card);border:1px solid var(--line);padding:6px 14px;border-radius:999px;margin-bottom:26px;box-shadow:var(--shadow)}
.badge b{color:var(--fg);font-weight:700}
.hero h1{margin:0 0 20px;font-weight:800;letter-spacing:-.03em;line-height:1.04;font-size:clamp(40px,6.4vw,62px)}
.hero h1 .hl{color:var(--accent);box-shadow:inset 0 -.18em 0 var(--accent-wash)}
.hero .sub{margin:0 auto 34px;max-width:640px;font-size:19px;line-height:1.55;color:var(--muted)}
.hero .cta{display:flex;gap:13px;justify-content:center;flex-wrap:wrap;margin-bottom:46px}

/* terminal mock — code stays dark (a universal convention, not the AI tell) */
.terminal{max-width:660px;margin:0 auto;text-align:left;background:var(--panel);border:1px solid var(--panel-line);
  border-radius:14px;box-shadow:0 24px 60px rgba(29,27,22,.22);overflow:hidden}
.terminal .bar{display:flex;align-items:center;gap:7px;padding:13px 16px;border-bottom:1px solid var(--panel-line)}
.terminal .bar i{width:11px;height:11px;border-radius:50%;display:block}
.dot-r{background:#ff5f57}.dot-y{background:#febc2e}.dot-g{background:#28c840}
.terminal .bar span{margin-left:10px;color:#8a8678;font-size:12px;font-family:'JetBrains Mono',ui-monospace,monospace}
.terminal pre{margin:0;padding:18px 20px;overflow-x:auto;background:none;color:#ece8dc;
  font:13.5px/1.75 'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace}
.t-p{color:#8a8678}.t-ok{color:#5bbd86}.t-k{color:#7fcfa2}.t-s{color:#e3b66b}.t-c{color:#7d7a6c}

/* trust strip */
.trust{background:var(--soft);border-bottom:1px solid var(--line)}
.trust .wrap{padding:30px 24px;text-align:center}
.trust .eyebrow{margin:0 0 14px}
.trust .names{display:flex;flex-wrap:wrap;gap:12px 30px;justify-content:center;color:var(--muted);font-weight:700;font-size:15px;letter-spacing:-.01em}

/* sections */
.section{padding:80px 0}
.section.alt{background:var(--soft);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.head{text-align:center;max-width:660px;margin:0 auto 48px}
.eyebrow{font-size:12.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--accent);margin:0 0 12px}
.section h2{margin:0 0 14px;font-weight:800;letter-spacing:-.02em;font-size:clamp(27px,3.6vw,38px)}
.head p{margin:0;font-size:17px;color:var(--muted)}

/* steps */
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:20px}
.step{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:28px;box-shadow:var(--shadow)}
.step .ico{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;margin-bottom:18px;color:var(--accent);
  background:var(--accent-wash)}
.step .ico svg{width:24px;height:24px}
.step h3{margin:0 0 9px;font-size:18.5px;letter-spacing:-.01em}
.step p{margin:0;color:var(--muted);font-size:15px}
.step code{font-size:.8em}

/* code block */
.code{max-width:780px;margin:0 auto;background:var(--panel);border:1px solid var(--panel-line);border-radius:var(--radius);overflow:hidden;box-shadow:0 18px 44px rgba(29,27,22,.16)}
.code pre{margin:0;padding:24px 26px;overflow-x:auto;background:none;color:#ece8dc;
  font:13.5px/1.85 'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace}
.code .t-c{color:#7d7a6c}.code .t-k{color:#7fcfa2}.code .t-s{color:#e3b66b}

/* formats */
.formats{display:grid;grid-template-columns:repeat(auto-fit,minmax(244px,1fr));gap:16px;max-width:920px;margin:0 auto}
.fmt{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px;box-shadow:var(--shadow)}
.fmt code{display:inline-block;margin-bottom:9px;font-weight:700;font-size:13px}
.fmt p{margin:0;color:var(--muted);font-size:14px}

/* corpus — each card is a mini live specimen in the brand's own colors */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(264px,1fr));gap:22px}
.card{display:flex;flex-direction:column;text-decoration:none;color:inherit;background:var(--card);border:1px solid var(--line);
  border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);transition:transform .18s,box-shadow .18s,border-color .18s}
.card:hover{transform:translateY(-4px);border-color:var(--accent);box-shadow:0 18px 40px rgba(29,27,22,.14)}
.spec{position:relative;padding:22px 20px 20px;min-height:128px;display:flex;flex-direction:column;justify-content:space-between;
  border-bottom:1px solid var(--line)}
.spec .spec-name{font-weight:800;font-size:22px;letter-spacing:-.02em;line-height:1.1;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.spec .spec-btns{display:flex;gap:8px;margin-top:18px}
.spec .chip{font:600 12px/1 'Inter',system-ui,sans-serif;padding:8px 13px;border-radius:8px;white-space:nowrap}
.spec .chip.ghost{background:transparent;border:1px solid currentColor}
.meta{padding:15px 18px 6px;display:flex;flex-direction:column;gap:7px}
.meta .m-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.meta strong{font-size:15.5px;letter-spacing:-.01em}
.meta .host{color:var(--muted);font-size:12.5px;white-space:nowrap}
.meta .font{color:var(--muted);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.meta .hexes{display:flex;flex-wrap:wrap;gap:5px 12px;margin-top:1px}
.meta .hexes span{display:inline-flex;align-items:center;gap:6px;color:var(--muted);
  font:500 11.5px 'JetBrains Mono',ui-monospace,monospace}
.meta .hexes i{width:11px;height:11px;border-radius:3px;border:1px solid rgba(29,27,22,.12);flex:none}
.card .go{margin-top:auto;padding:11px 18px 15px;color:var(--accent-ink);font-size:13px;font-weight:700}

/* footer — light, grounded on the recessed paper band */
footer{background:var(--soft);color:var(--muted);border-top:1px solid var(--line)}
footer .wrap{display:flex;flex-wrap:wrap;justify-content:space-between;gap:44px;padding:56px 24px 40px}
footer .f-brand{max-width:320px}
footer .f-brand .brand{color:var(--fg)}
footer .f-brand p{margin:16px 0 0;font-size:14px;line-height:1.6;color:var(--muted)}
footer .cols{display:flex;gap:60px;flex-wrap:wrap}
footer h4{margin:0 0 15px;color:var(--fg);font-size:12.5px;letter-spacing:.05em;text-transform:uppercase}
footer .cols a{display:block;text-decoration:none;color:var(--muted);font-size:14px;margin-bottom:11px}
footer .cols a:hover{color:var(--accent-ink)}
.foot-base{border-top:1px solid var(--line)}
.foot-base .wrap{padding:20px 24px;font-size:13px;color:var(--muted)}

@media (max-width:720px){
  .nav-links .hide-sm{display:none}
  .section{padding:60px 0}
  .hero{padding:72px 20px 64px}
}
`;

// Three "how it works" step icons (inline so the page stays self-contained).
const ICONS = {
  observe:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  normalize:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 8.5 12 14l10-5.5L12 3Z"/><path d="m2 15.5 10 5.5 10-5.5"/></svg>',
  emit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>',
};

// Static landing copy: hero + how it works + quick start + MCP. Plain strings
// (no user input), so nothing here needs escaping.
const LANDING_SECTIONS = `
  <section class="section" id="how-it-works">
    <div class="wrap">
      <div class="head">
        <p class="eyebrow">How it works</p>
        <h2>From a live URL to a token spec, in one pass</h2>
        <p>No manual entry, no design-file export, no API key. DesignScan reads
        what the page actually renders and hands your agent a spec it can build with.</p>
      </div>
      <div class="steps">
        <div class="step">
          <div class="ico">${ICONS.observe}</div>
          <h3>Render &amp; observe</h3>
          <p>Headless Chromium loads the live page (hydration-aware) and reads the
          computed styles of every visible element — shadow DOM included. It even
          really hovers and presses the buttons to capture true
          <code>:hover</code> / <code>:active</code> states, and probes dark mode.</p>
        </div>
        <div class="step">
          <div class="ico">${ICONS.normalize}</div>
          <h3>Normalize into tokens</h3>
          <p>Thousands of raw values cluster into a clean profile — color roles,
          type scale, spacing &amp; radius grids, shadows, container width and
          responsive breakpoints — preferring the site's own declared system
          (<code>--color-primary</code>, <code>--breakpoint-md</code>) when the page paints it.</p>
        </div>
        <div class="step">
          <div class="ico">${ICONS.emit}</div>
          <h3>Emit a spec</h3>
          <p>Out comes a spec-valid <code>DESIGN.md</code>, W3C tokens JSON, or
          CSS variables — plus a self-contained HTML preview that renders every
          token and deterministic "notes for your coding agent."</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section alt" id="quick-start">
    <div class="wrap">
      <div class="head">
        <p class="eyebrow">Quick start</p>
        <h2>One command, any site</h2>
        <p>Point it at a URL and get a <code>DESIGN.md</code> your coding agent
        can build with — or pick another output format.</p>
      </div>
      <div class="code">
<pre><span class="t-c"># one-time: install the headless browser</span>
npx playwright <span class="t-k">install</span> chromium

<span class="t-c"># any URL → DESIGN.md (Google Labs open format)</span>
npx designscan stripe.com --md --out stripe.DESIGN.md

<span class="t-c"># other formats, themes, and a visual proof sheet</span>
npx designscan vercel.com <span class="t-k">--format</span> <span class="t-s">w3c</span> --out vercel.tokens.json
npx designscan linear.app <span class="t-k">--theme</span> <span class="t-s">both</span> --md --preview --out linear.DESIGN.md</pre>
      </div>
      <div class="formats" style="margin-top:24px">
        <div class="fmt"><code>--md</code><p>DESIGN.md — YAML tokens + prose, passes the official linter.</p></div>
        <div class="fmt"><code>--format w3c</code><p>W3C Design Tokens JSON for Style Dictionary &amp; Tokens Studio.</p></div>
        <div class="fmt"><code>--format css</code><p>Paste-ready CSS custom properties.</p></div>
        <div class="fmt"><code>--format json</code><p>The raw token profile for your own pipeline.</p></div>
      </div>
    </div>
  </section>

  <section class="section" id="mcp">
    <div class="wrap">
      <div class="head">
        <p class="eyebrow">For coding agents</p>
        <h2>Pull live tokens over MCP</h2>
        <p>DesignScan ships an <a href="https://modelcontextprotocol.io">MCP</a>
        server (on the official registry as <code>io.github.ms-zaman/designscan</code>).
        One tool — <code>get_design_tokens(url, format?, theme?)</code> — lets an
        agent fetch tokens mid-task: <em>"restyle this app like stripe.com."</em></p>
      </div>
      <div class="code">
<pre><span class="t-c">// e.g. Claude Code: .mcp.json</span>
{
  <span class="t-s">"mcpServers"</span>: {
    <span class="t-s">"designscan"</span>: { <span class="t-s">"command"</span>: <span class="t-s">"npx"</span>, <span class="t-s">"args"</span>: [<span class="t-s">"-y"</span>, <span class="t-s">"@designscan/extractor"</span>, <span class="t-s">"mcp"</span>] }
  }
}</pre>
      </div>
    </div>
  </section>
`;

// The DesignScan wordmark + solid accent mark, reused in the nav and footer.
const BRAND = (cls = "") =>
  `<a class="brand ${cls}" href="${cls ? "#" : "."}"><span class="mark">D</span>DesignScan</a>`;

// The self-contained landing page (examples/index.html): nav + hero + sections
// + the brand corpus grid + footer.
export function galleryHtml(entries: GalleryEntry[]): string {
  const list = sorted(entries);
  const cards = list.map(card).join("\n");
  const count = list.length;
  // A muted "trusted on" row of real brand names from the corpus itself.
  const trustNames = list
    .slice(0, 8)
    .map((e) => `<span>${esc(brandLabel(e))}</span>`)
    .join("\n        ");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>DesignScan — design-token specs for ${count} real brands</title>
<meta name="description" content="DesignScan turns any URL into design tokens: DESIGN.md, W3C tokens JSON, or CSS variables, extracted from the live page. Browse auto-extracted specs for ${count} real websites." />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" />
<style>${GALLERY_STYLE}</style>
</head>
<body>
<nav>
  <div class="wrap">
    ${BRAND()}
    <div class="nav-links">
      <a class="hide-sm" href="#how-it-works">How it works</a>
      <a class="hide-sm" href="#quick-start">Quick start</a>
      <a class="hide-sm" href="#corpus">Corpus</a>
      <a href="https://www.npmjs.com/package/@designscan/extractor">npm</a>
      <a class="btn btn-primary btn-sm" href="https://github.com/ms-zaman/DesignScan">GitHub →</a>
    </div>
  </div>
</nav>

<header class="hero">
  <div class="inner">
    <span class="badge"><b>Open source</b> · MCP-ready · no API key</span>
    <h1>Any URL → <span class="hl">design tokens</span></h1>
    <p class="sub">DesignScan renders a live site, observes what it actually
    paints, and emits a spec-compliant <code>DESIGN.md</code> — plus W3C tokens
    JSON and CSS variables — that an AI coding agent can read to match that
    site's look.</p>
    <div class="cta">
      <a class="btn btn-primary" href="#quick-start">Get started</a>
      <a class="btn" href="#corpus">Browse the corpus</a>
    </div>
    <div class="terminal">
      <div class="bar"><i class="dot-r"></i><i class="dot-y"></i><i class="dot-g"></i><span>zsh</span></div>
<pre><span class="t-p">$</span> npx designscan stripe.com <span class="t-k">--md</span>
<span class="t-ok">✓</span> wrote stripe.DESIGN.md

<span class="t-c">---</span>
<span class="t-k">colors</span>:
  primary: <span class="t-s">"#635bff"</span>
  background: <span class="t-s">"#ffffff"</span>
  text: <span class="t-s">"#425466"</span>
<span class="t-k">typography</span>:
  display: { fontSize: <span class="t-s">48px</span>, fontWeight: <span class="t-s">"600"</span> }
<span class="t-c">---</span></pre>
    </div>
  </div>
</header>

<div class="trust">
  <div class="wrap">
    <p class="eyebrow">Battle-tested on real design systems</p>
    <div class="names">
        ${trustNames}
    </div>
  </div>
</div>

<main>
${LANDING_SECTIONS}
  <section class="section alt" id="corpus">
    <div class="wrap">
      <div class="head">
        <p class="eyebrow">Brand corpus</p>
        <h2>${count} real ${count === 1 ? "brand" : "brands"}, auto-extracted</h2>
        <p>Each card links a spec-compliant <code>DESIGN.md</code> and a
        self-contained HTML preview, generated from the brand's live CSS —
        a working sample of exactly what DesignScan produces.</p>
      </div>
      <div class="grid">
${cards}
      </div>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <div class="f-brand">
      ${BRAND()}
      <p>The open-source engine that turns any live URL into design tokens —
      <code>DESIGN.md</code>, W3C tokens JSON, or CSS variables.</p>
    </div>
    <div class="cols">
      <div>
        <h4>Project</h4>
        <a href="https://github.com/ms-zaman/DesignScan">GitHub</a>
        <a href="https://www.npmjs.com/package/@designscan/extractor">npm</a>
        <a href="#corpus">Brand corpus</a>
      </div>
      <div>
        <h4>Use it</h4>
        <a href="#quick-start">Quick start</a>
        <a href="#mcp">MCP server</a>
        <a href="https://modelcontextprotocol.io">About MCP</a>
      </div>
    </div>
  </div>
  <div class="foot-base"><div class="wrap">Generated by DesignScan — URL → design tokens → DESIGN.md.</div></div>
</footer>
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
