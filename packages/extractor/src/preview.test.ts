import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { normalize } from "./normalize.js";
import { preview } from "./preview.js";
import { resolveColorRoles } from "./resolve.js";
import type { RawObservations } from "./types.js";

// The preview is the DESIGN.md's visual mirror, so the contract that matters is:
// every resolved token actually appears (painted) in the HTML, and the dark
// panel/toggle shows up exactly when generate.ts would emit a dark block.

const fxDir = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const load = (name: string) =>
  JSON.parse(
    readFileSync(join(fxDir, `${name}.raw.json`), "utf8"),
  ) as RawObservations;
const profileFor = (name: string) =>
  normalize("https://example.com", load(name));

describe("preview – HTML proof sheet", () => {
  it("is a self-contained, offline HTML document", () => {
    const html = preview(profileFor("stripe"));
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<style>"); // styles inlined, no external sheet
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
    expect(html).not.toMatch(/src="https?:/i); // no remote assets
  });

  it("paints every resolved color role from the profile", () => {
    const p = profileFor("stripe");
    const roles = resolveColorRoles(p);
    const html = preview(p);
    for (const hex of [
      roles.primary,
      roles.background,
      roles.text,
      roles.accent1,
      roles.accent2,
    ]) {
      if (hex) expect(html.toLowerCase()).toContain(hex.toLowerCase());
    }
  });

  it("renders type specimens at their real px size and weight", () => {
    const html = preview(profileFor("stripe"));
    // Stripe display level is 48px; the specimen must carry the real size.
    expect(html).toMatch(/font-size:48px/);
    expect(html).toContain("font-weight:");
  });

  it("renders the site's real declared font stack (proprietary font + fallbacks)", () => {
    const html = preview(profileFor("stripe"));
    // Stripe declares `sohne-var, "SF Pro Display", sans-serif` — the preview
    // uses that paste-ready stack verbatim, so the specimen degrades gracefully
    // when the brand font isn't installed.
    expect(html).toContain("sohne-var");
    expect(html).toContain("sans-serif"); // a generic fallback is present
  });

  it("survives double-quoted family names inside style attributes", () => {
    // Stripe's declared stack is `sohne-var, "SF Pro Display", sans-serif`.
    // A raw " inside the double-quoted style="" attribute terminates it early,
    // so the browser silently dropped font-size/weight/line-height and every
    // specimen rendered at the default 16px — this broke 11 of the 14 gallery
    // previews (GitHub's "Mona Sans", GitLab's "GitLab Sans", …). The stack
    // must be rewritten to single quotes before it lands in an attribute.
    const html = preview(profileFor("stripe"));
    expect(html).not.toContain('"SF Pro Display"');
    expect(html).toContain("'SF Pro Display'");
    // And the proof that matters: every type-specimen style attribute still
    // carries its size declaration after the attribute is parsed.
    const specimens = [
      ...html.matchAll(/class="type-specimen" style="([^"]*)"/g),
    ];
    expect(specimens.length).toBeGreaterThan(0);
    for (const [, style] of specimens) {
      expect(style).toContain("font-size:");
    }
  });

  it("adds a Light/Dark toggle + dark panel for a genuinely distinct dark theme", () => {
    const html = preview(profileFor("vercel-light"), profileFor("vercel-dark"));
    expect(html).toContain('data-theme-btn="dark"');
    expect(html).toContain('data-theme-panel="dark"');
    expect(html).toContain("#000000"); // vercel dark background painted
  });

  it("omits the toggle when the dark pass equals light (no real dark theme)", () => {
    const stripe = profileFor("stripe");
    const html = preview(stripe, stripe);
    expect(html).not.toContain("data-theme-btn");
    expect(html).not.toContain('data-theme-panel="dark"');
  });

  it("paints border + muted-surface swatches and the divider/surface-muted components", () => {
    const p = profileFor("stripe"); // has border #e5edf5 + muted #f8fafd
    const html = preview(p);
    expect(html.toLowerCase()).toContain("#e5edf5"); // border swatch
    expect(html.toLowerCase()).toContain("#f8fafd"); // muted-surface swatch
    expect(html).toContain(">border<");
    expect(html).toContain(">muted-surface<");
    expect(html).toContain(">divider<");
    expect(html).toContain(">surface-muted<");
  });

  it("keeps button and badge content-hugging inside the flex column", () => {
    // The component list is a flex column; its default align-items:stretch
    // pulled the button and badge edge-to-edge so they read as banners.
    // Cards/dividers/inputs stay full-width on purpose.
    const html = preview(profileFor("stripe"));
    const button = html.match(/<button style="([^"]*)"/)?.[1] ?? "";
    expect(button).toContain("align-self:flex-start");
    const badge = html.match(/<span style="([^"]*)"[^>]*>Badge/)?.[1] ?? "";
    expect(badge).toContain("align-self:flex-start");
  });

  it("makes the primary button really hover to the observed hover color", () => {
    const p = profileFor("stripe");
    p.colors.primaryHover = "#4631b8";
    const html = preview(p);
    // The specimen carries inline handlers (a stylesheet :hover can't out-rank
    // the style="" attribute), the label documents the hex, and the swatch
    // grid gains a primary-hover chip.
    expect(html).toContain("onmouseover=\"this.style.background='#4631b8'\"");
    expect(html).toContain("onmouseout=");
    expect(html).toContain(">primary-hover<");
    expect(html).toContain("button-primary · :hover #4631b8");
  });

  it("emits no hover handlers when no hover shift was observed", () => {
    const html = preview(profileFor("stripe"));
    expect(html).not.toContain("onmouseover");
    expect(html).not.toContain("primary-hover");
  });

  it("escapes the page title into the document", () => {
    const html = preview(profileFor("stripe"));
    expect(html).toContain("DesignScan preview");
    expect(html).not.toContain("<script>alert"); // sanity: no raw injection path
  });
});

describe("preview – hover micro-interaction", () => {
  it("reproduces shadow + lift in the specimen's hover handlers", () => {
    const p = profileFor("stripe");
    p.colors.primaryHover = "#4631b8";
    p.primaryButtonHover = {
      shadow: "rgba(0, 0, 0, 0.2) 0px 4px 12px 0px",
      transform: "translateY(-2px)",
    };
    const html = preview(p);
    expect(html).toContain("this.style.background='#4631b8'");
    expect(html).toContain(
      "this.style.boxShadow='rgba(0, 0, 0, 0.2) 0px 4px 12px 0px'",
    );
    expect(html).toContain("this.style.transform='translateY(-2px)'");
    // mouseout restores: bg to the rest primary, fx by clearing.
    expect(html).toContain("this.style.boxShadow=''");
    expect(html).toContain("this.style.transform=''");
  });
});
