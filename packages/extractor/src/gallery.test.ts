import { describe, expect, it } from "vitest";
import {
  brandLabel,
  type GalleryEntry,
  galleryHtml,
  galleryMarkdown,
} from "./gallery.js";
import type { DesignProfile } from "./types.js";
import { PROFILE_SCHEMA_VERSION } from "./types.js";

function profile(overrides: Partial<DesignProfile> = {}): DesignProfile {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    url: "https://example.com",
    title: "Example",
    fetchedAt: "2026-06-08T00:00:00.000Z",
    theme: "light",
    colors: {
      background: "#ffffff",
      text: "#111111",
      primary: "#533afd",
      palette: [],
    },
    typography: { families: ["Inter"], sizeScalePx: [16], weights: [400] },
    spacingScalePx: [8],
    radiusScalePx: [4],
    shadows: [],
    ...overrides,
  };
}

const entry = (name: string, p: Partial<DesignProfile> = {}): GalleryEntry => ({
  name,
  profile: profile(p),
});

describe("brandLabel", () => {
  it("trims a trailing tagline after a separator", () => {
    expect(
      brandLabel(
        entry("stripe", { title: "Stripe | Financial Infrastructure" }),
      ),
    ).toBe("Stripe");
    expect(
      brandLabel(entry("linear", { title: "Linear – The system for product" })),
    ).toBe("Linear");
  });

  it("keeps a clean title as-is", () => {
    expect(brandLabel(entry("acme", { title: "Acme" }))).toBe("Acme");
  });

  it("keeps the title's nicer casing when it names the brand", () => {
    expect(
      brandLabel(
        entry("github", { title: "GitHub · Build and ship software" }),
      ),
    ).toBe("GitHub");
    expect(
      brandLabel(
        entry("tailwindcss", { title: "Tailwind CSS - Rapidly build" }),
      ),
    ).toBe("Tailwind CSS");
  });

  it("falls back to a capitalized slug when the title is a tagline", () => {
    expect(
      brandLabel(entry("netlify", { title: "Push your ideas to the web" })),
    ).toBe("Netlify");
    expect(
      brandLabel(
        entry("sentry", { title: "Application Performance Monitoring" }),
      ),
    ).toBe("Sentry");
  });

  it("falls back to a capitalized slug when there is no title", () => {
    expect(brandLabel(entry("acme", { title: "" }))).toBe("Acme");
  });
});

describe("galleryHtml", () => {
  const entries = [
    entry("stripe", {
      title: "Stripe | x",
      url: "https://stripe.com",
      colors: {
        background: "#ffffff",
        text: "#111",
        primary: "#533afd",
        palette: [],
      },
    }),
    entry("linear", { title: "Linear – y", url: "https://linear.app" }),
  ];

  it("renders one linked card per brand with the primary swatch", () => {
    const html = galleryHtml(entries);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain('href="stripe.preview.html"');
    expect(html).toContain('href="linear.preview.html"');
    expect(html).toContain("#533afd");
    // labels are the trimmed titles
    expect(html).toContain("<strong>Stripe</strong>");
    expect(html).toContain("<strong>Linear</strong>");
  });

  it("reflects the brand count in the SEO title/description", () => {
    const html = galleryHtml(entries);
    expect(html).toMatch(
      /<title>DesignScan — design-token specs for 2 real brands/,
    );
    expect(html).toContain('name="description"');
  });

  it("orders cards alphabetically by label, not input order", () => {
    const html = galleryHtml([...entries].reverse());
    expect(html.indexOf("Linear")).toBeLessThan(html.indexOf("Stripe"));
  });

  it("escapes hostile text so the gallery can't inject markup", () => {
    const html = galleryHtml([
      entry("evil", { title: "<script>alert(1)</script>" }),
    ]);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("carries the landing sections: quick start, how it works, MCP", () => {
    const html = galleryHtml(entries);
    // The page must explain itself, not just list cards (it's the public
    // front door): runnable command, pipeline explanation, agent setup.
    expect(html).toContain("Quick start");
    expect(html).toContain(
      "npx @designscan/extractor stripe.com --md --out stripe.DESIGN.md",
    );
    expect(html).toContain("How it works");
    expect(html).toContain("mcpServers");
    expect(html).toContain('href="#corpus"');
    expect(html).toContain('id="corpus"');
    // Project links for the people who land here first.
    expect(html).toContain("https://github.com/ms-zaman/DesignScan");
    expect(html).toContain(
      "https://www.npmjs.com/package/@designscan/extractor",
    );
  });
});

describe("galleryMarkdown", () => {
  it("builds a table row per brand with file links and source", () => {
    const md = galleryMarkdown([
      entry("stripe", { title: "Stripe | x", url: "https://stripe.com" }),
    ]);
    expect(md).toContain(
      "| Brand | Primary | Background | Font | Files | Source |",
    );
    expect(md).toContain("**Stripe**");
    expect(md).toContain("[DESIGN.md](stripe.DESIGN.md)");
    expect(md).toContain("[preview](stripe.preview.html)");
    expect(md).toContain("[stripe.com](https://stripe.com)");
    expect(md).toContain("`#533afd`");
  });
});
