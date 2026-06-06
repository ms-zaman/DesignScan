import { describe, expect, it } from "vitest";
import { generate } from "./generate.js";
import type { DesignProfile } from "./types.js";

function profile(overrides: Partial<DesignProfile> = {}): DesignProfile {
  return {
    schemaVersion: "1.1",
    url: "https://example.com",
    title: "Example",
    fetchedAt: "2026-06-04T12:00:00.000Z",
    theme: "light",
    colors: {
      background: "#ffffff",
      text: "#222222",
      primary: "#1a73e8",
      palette: [
        { hex: "#1a73e8", count: 9 },
        { hex: "#ff5722", count: 4 },
      ],
    },
    typography: {
      families: ["Inter", "Georgia"],
      sizeScalePx: [12, 14, 16, 24, 40],
      weights: [400, 600, 700],
    },
    spacingScalePx: [4, 8, 16, 32],
    radiusScalePx: [4, 8],
    shadows: ["0 1px 2px rgba(0,0,0,0.1)"],
    ...overrides,
  };
}

function frontMatter(md: string): string {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error("no front matter");
  return m[1];
}

describe("generate – structure", () => {
  it("wraps tokens in a --- delimited YAML front matter", () => {
    const md = generate(profile());
    expect(md.startsWith("---\n")).toBe(true);
    expect(() => frontMatter(md)).not.toThrow();
  });

  it("stamps the alpha version and the title as name", () => {
    const fm = frontMatter(generate(profile({ title: "Acme" })));
    expect(fm).toContain("version: alpha");
    expect(fm).toContain('name: "Acme"');
  });

  it("notes the dark theme in the description, and omits it for light", () => {
    expect(generate(profile({ theme: "dark" }))).toContain("(dark theme)");
    expect(generate(profile({ theme: "light" }))).not.toContain("(dark theme)");
  });

  it("orders the prose sections per the spec", () => {
    const md = generate(profile());
    const order = [
      "Overview",
      "Colors",
      "Typography",
      "Layout",
      "Elevation & Depth",
      "Shapes",
      "Components",
      "Do's and Don'ts",
    ];
    const positions = order.map((s) => md.indexOf(`## ${s}`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
  });
});

describe("generate – colors", () => {
  it("always emits a primary token (spec requires it)", () => {
    const fm = frontMatter(generate(profile()));
    expect(fm).toMatch(/^\s{2}primary: "#1a73e8"$/m);
  });

  it("falls back to the top palette color when primary is null", () => {
    const fm = frontMatter(
      generate(
        profile({
          colors: {
            background: null,
            text: null,
            primary: null,
            palette: [{ hex: "#abcdef", count: 3 }],
          },
        }),
      ),
    );
    expect(fm).toMatch(/^\s{2}primary: "#abcdef"$/m);
  });

  it("derives a contrast-safe on-primary (white on a dark primary)", () => {
    const fm = frontMatter(
      generate(
        profile({
          colors: {
            background: "#fff",
            text: "#000",
            primary: "#10131a",
            palette: [],
          },
        }),
      ),
    );
    expect(fm).toContain('on-primary: "#ffffff"');
  });

  it("uses near-black on-primary for a light primary", () => {
    const fm = frontMatter(
      generate(
        profile({
          colors: {
            background: "#000",
            text: "#fff",
            primary: "#f5f5f5",
            palette: [],
          },
        }),
      ),
    );
    expect(fm).toContain('on-primary: "#111111"');
  });
});

describe("generate – scales & references", () => {
  it("maps the radius scale to named levels plus a full alias", () => {
    const fm = frontMatter(generate(profile()));
    expect(fm).toMatch(
      /rounded:\n\s{2}xs: 4px\n\s{2}sm: 8px\n\s{2}full: 9999px/,
    );
  });

  it("only emits component token references that resolve in the tree", () => {
    const md = generate(profile());
    const fm = frontMatter(md);
    const refs = [...md.matchAll(/\{([a-z]+)\.([a-z0-9-]+)\}/gi)];
    for (const [, group, key] of refs) {
      // the group header and the key must both be present in the front matter
      expect(fm).toContain(`${group}:`);
      expect(fm).toMatch(new RegExp(`^\\s{2}${key}:`, "m"));
    }
  });

  it("omits the typography block when no sizes were found", () => {
    const md = generate(
      profile({ typography: { families: [], sizeScalePx: [], weights: [] } }),
    );
    expect(md).not.toContain("typography:");
    expect(md).not.toContain("## Typography");
  });
});

describe("generate – typography fidelity", () => {
  it("drops sub-12px sizes as noise", () => {
    const md = generate(
      profile({
        typography: {
          families: ["Inter"],
          sizeScalePx: [9, 10, 12, 16, 40],
          weights: [400],
        },
      }),
    );
    expect(md).not.toContain("fontSize: 9px");
    expect(md).not.toContain("fontSize: 10px");
    expect(md).toContain("fontSize: 12px");
    expect(md).toContain("fontSize: 40px");
  });

  it("uses data-driven line-height and weight when present", () => {
    const fm = frontMatter(
      generate(
        profile({
          typography: {
            families: ["Inter"],
            sizeScalePx: [16, 40],
            weights: [400, 800],
            weightHeading: 800,
            weightBody: 400,
            lineHeightHeading: 1.1,
            lineHeightBody: 1.6,
          },
        }),
      ),
    );
    // display (40px) is a heading -> weight 800, line-height 1.1
    expect(fm).toMatch(/display:\n(?:.*\n)*?\s{4}fontWeight: "800"/);
    expect(fm).toContain("lineHeight: 1.1");
    expect(fm).toContain("lineHeight: 1.6");
  });

  it("emits letterSpacing only when a non-trivial value is present", () => {
    const withLs = generate(
      profile({
        typography: {
          families: ["Inter"],
          sizeScalePx: [40],
          weights: [700],
          letterSpacingHeadingEm: -0.02,
        },
      }),
    );
    expect(withLs).toContain('letterSpacing: "-0.02em"');

    const withoutLs = generate(
      profile({
        typography: { families: ["Inter"], sizeScalePx: [40], weights: [700] },
      }),
    );
    expect(withoutLs).not.toContain("letterSpacing:");
  });
});

describe("generate – no orphan colors", () => {
  // Every color defined in the front matter must be referenced by a component,
  // or the design.md linter warns. This guards the invariant directly.
  function colorKeys(fm: string): string[] {
    return [...fm.matchAll(/^ {2}([a-z0-9-]+): "#/gm)].map((m) => m[1]);
  }

  it("references every defined color (single-accent site)", () => {
    const md = generate(profile());
    const keys = colorKeys(frontMatter(md));
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) expect(md).toContain(`{colors.${k}}`);
  });

  it("wires link + badge for a two-accent site, still no orphans", () => {
    const md = generate(
      profile({
        colors: {
          background: "#ffffff",
          text: "#111111",
          primary: "#1a73e8",
          palette: [
            { hex: "#1a73e8", count: 9 },
            { hex: "#ff5722", count: 5 },
            { hex: "#34a853", count: 4 },
          ],
        },
      }),
    );
    expect(md).toContain("link:");
    expect(md).toContain("badge:");
    const keys = colorKeys(frontMatter(md));
    expect(keys).toContain("accent-1");
    expect(keys).toContain("accent-2");
    expect(keys).toContain("on-accent-2");
    for (const k of keys) expect(md).toContain(`{colors.${k}}`);
  });
});
