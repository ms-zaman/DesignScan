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

  it("escapes the page title into the document", () => {
    const html = preview(profileFor("stripe"));
    expect(html).toContain("DesignScan preview");
    expect(html).not.toContain("<script>alert"); // sanity: no raw injection path
  });
});
