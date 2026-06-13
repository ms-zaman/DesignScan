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

describe("generate – dual (light + dark)", () => {
  const dark = (over: Partial<DesignProfile["colors"]> = {}) =>
    profile({
      theme: "dark",
      colors: {
        background: "#000000",
        text: "#eeeeee",
        primary: "#8ab4f8",
        palette: [{ hex: "#8ab4f8", count: 9 }],
        ...over,
      },
    });

  it("merges a distinct dark theme as parallel *-dark tokens and variants", () => {
    const md = generate(profile(), dark());
    const fm = frontMatter(md);
    expect(fm).toMatch(/^\s{2}background-dark: "#000000"$/m);
    expect(fm).toMatch(/^\s{2}primary-dark: "#8ab4f8"$/m);
    expect(fm).toContain("button-primary-dark:");
    expect(fm).toContain("surface-dark:");
    expect(md).toContain("(light + dark themes)");
    expect(md).toContain("**Dark theme.**");
    // still one Colors section (spec forbids duplicates)
    expect(md.match(/## Colors/g)?.length).toBe(1);
  });

  it("references every *-dark token it defines (no orphans)", () => {
    const fm = frontMatter(generate(profile(), dark()));
    for (const m of fm.matchAll(/^\s{2}([a-z0-9-]+-dark): "/gm)) {
      expect(fm).toContain(`{colors.${m[1]}}`);
    }
  });

  it("skips the dark block when the dark pass is identical to light", () => {
    // Same background/text/primary -> site doesn't honour prefers-color-scheme.
    const md = generate(
      profile(),
      dark({ background: "#ffffff", text: "#222222", primary: "#1a73e8" }),
    );
    expect(md).not.toContain("-dark:");
    expect(md).not.toContain("(light + dark themes)");
    expect(md).toContain("No distinct dark theme");
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

  it("picks near-black on a mid-tone surface (AA-correct, not a 0.5 cutoff)", () => {
    // #8a8f98 has luminance ~0.27: a flat <0.5 rule would pick white at 3.25:1
    // (fails AA); near-black gives ~6.4:1.
    const fm = frontMatter(
      generate(
        profile({
          colors: {
            background: "#fff",
            text: "#000",
            primary: "#8a8f98",
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

describe("generate – primary-active (observed pressed state)", () => {
  it("emits the token, the component variant, and the prose bullet", () => {
    const md = generate(
      profile({
        colors: {
          background: "#ffffff",
          text: "#222222",
          primary: "#1a73e8",
          primaryActive: "#1059b8",
          palette: [{ hex: "#1a73e8", count: 9 }],
        },
      }),
    );
    expect(md).toContain('primary-active: "#1059b8"');
    expect(md).toContain("button-primary-active:");
    expect(md).toContain("`{colors.primary-active}`");
    expect(md).toContain("use it for `:active`");
  });

  it("describes the press micro-interaction when the button reshapes", () => {
    const md = generate(
      profile({
        primaryButtonActive: { shadow: "none", transform: "translateY(4px)" },
      }),
    );
    expect(md).toContain("moves `translateY(4px)`");
    expect(md).toContain("box-shadow becomes `none`");
  });

  it("notes the real dark gate when the dark pass was class-unlocked", () => {
    const light = profile();
    const dark = profile({
      theme: "dark",
      darkMechanism: "class-dark",
      colors: {
        background: "#0d1117",
        text: "#e6edf3",
        primary: "#3fb950",
        palette: [{ hex: "#3fb950", count: 9 }],
      },
    });
    const md = generate(light, dark);
    expect(md).toContain('gates dark mode on `<html class="dark">`');
    expect(md).not.toContain(
      "The same roles captured under `prefers-color-scheme: dark`",
    );
  });
});

describe("generate – control geometry on components", () => {
  it("cross-references the observed button typography level and height", () => {
    const md = generate(
      profile({
        controls: {
          button: { fontSizePx: 14, heightPx: 40 },
          input: { fontSizePx: 16, heightPx: 36 },
        },
      }),
    );
    // 14px maps onto the "body" level, 16px onto "body-lg" (fixture scale).
    expect(md).toMatch(
      /button-primary:\n(\s{4}.+\n)*\s{4}typography: "\{typography\.body\}"/,
    );
    expect(md).toMatch(/button-primary:\n(\s{4}.+\n)*\s{4}height: 40px/);
    expect(md).toMatch(
      /\n {2}input:\n(\s{4}.+\n)*\s{4}typography: "\{typography\.body-lg\}"/,
    );
    expect(md).toMatch(/\n {2}input:\n(\s{4}.+\n)*\s{4}height: 36px/);
    expect(md).toContain("set in `{typography.body}`, 40px tall as observed");
  });

  it("emits no typography ref when the control size missed the page scale", () => {
    const md = generate(
      profile({ controls: { button: { fontSizePx: 10, heightPx: 40 } } }),
    );
    // 10px was filtered from the typography scale as noise (and is >1px from
    // the 12px label level) — a wrong ref would be worse than none. Height is
    // independent and still real.
    expect(md).not.toMatch(/button-primary:\n(\s{4}.+\n)*\s{4}typography:/);
    expect(md).toMatch(/button-primary:\n(\s{4}.+\n)*\s{4}height: 40px/);
  });

  it("emits neither without observed controls (pre-1.5 profiles)", () => {
    const md = generate(profile());
    expect(md).not.toMatch(/button-primary:\n(\s{4}.+\n)*\s{4}typography:/);
    expect(md).not.toMatch(/button-primary:\n(\s{4}.+\n)*\s{4}height:/);
  });
});

describe("generate – shadows", () => {
  const SHADOWS = [
    "rgba(50, 50, 93, 0.25) 0px 30px 60px -10px",
    "rgba(23, 23, 23, 0.06) 0px 3px 6px 0px",
  ];

  it("emits the cleaned scale as a shadows front-matter block, smallest first", () => {
    const fm = frontMatter(generate(profile({ shadows: SHADOWS })));
    expect(fm).toMatch(
      /shadows:\n\s{2}sm: "rgba\(23, 23, 23, 0\.06\) 0px 3px 6px 0px"\n\s{2}md: "rgba\(50, 50, 93, 0\.25\) 0px 30px 60px -10px"/,
    );
  });

  it("lists each level with its literal value in the Elevation section", () => {
    const md = generate(profile({ shadows: SHADOWS }));
    expect(md).toContain("- **sm:** `rgba(23, 23, 23, 0.06) 0px 3px 6px 0px`");
    expect(md).toContain(
      "- **md:** `rgba(50, 50, 93, 0.25) 0px 30px 60px -10px`",
    );
  });

  it("never references {shadows.*} — the spec has no such token group", () => {
    // Verified against @google/design.md 0.2.0: a shadows: data block lints
    // clean, but any {shadows.x} reference is a lint ERROR. Guard the contract.
    const md = generate(profile({ shadows: SHADOWS }));
    expect(md).not.toContain("{shadows.");
  });

  it("omits the block and keeps the flat-surfaces prose when nothing survives cleaning", () => {
    const md = generate(
      profile({ shadows: ["rgba(0, 0, 0, 0) 0px 0px 0px 0px"] }),
    );
    expect(md).not.toContain("shadows:");
    expect(md).toContain("flat surfaces");
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

  it("wires border + muted-surface into divider/surface-muted, still no orphans", () => {
    const md = generate(
      profile({
        colors: {
          background: "#ffffff",
          text: "#222222",
          primary: "#1a73e8",
          border: "#e5e7eb",
          mutedSurface: "#f7f8fa",
          palette: [{ hex: "#1a73e8", count: 9 }],
        },
      }),
    );
    expect(md).toContain("divider:");
    expect(md).toContain("height: 1px");
    expect(md).toContain("surface-muted:");
    const keys = colorKeys(frontMatter(md));
    expect(keys).toContain("border");
    expect(keys).toContain("muted-surface");
    // The invariant that keeps the linter quiet: no orphan color tokens.
    for (const k of keys) expect(md).toContain(`{colors.${k}}`);
  });

  it("omits divider/surface-muted when no subtle surfaces were found", () => {
    const md = generate(profile()); // helper profile has no border/mutedSurface
    expect(md).not.toContain("divider:");
    expect(md).not.toContain("surface-muted:");
  });
});

describe("generate – primary-hover", () => {
  const withHover = () =>
    profile({
      colors: {
        background: "#ffffff",
        text: "#222222",
        primary: "#1a73e8",
        primaryHover: "#1557b0",
        palette: [{ hex: "#1a73e8", count: 9 }],
      },
    });

  it("emits the color token, a hover component variant, and the prose note", () => {
    const md = generate(withHover());
    expect(md).toContain('primary-hover: "#1557b0"');
    expect(md).toContain("button-primary-hover:");
    expect(md).toContain('backgroundColor: "{colors.primary-hover}"');
    expect(md).toContain("Primary button (hover):");
    expect(md).toContain("observed on the live site");
  });

  it("emits none of it when the profile has no observed hover", () => {
    const md = generate(profile());
    expect(md).not.toContain("primary-hover");
    expect(md).not.toContain("button-primary-hover");
  });
});

describe("generate – layout & breakpoints", () => {
  const layoutProfile = () =>
    profile({
      layout: { containerMaxWidthPx: 1200, breakpointsPx: [640, 768, 1024] },
    });

  it("emits a data-only breakpoints front-matter group, ascending", () => {
    const fm = frontMatter(generate(layoutProfile()));
    expect(fm).toMatch(
      /breakpoints:\n\s{2}sm: 640px\n\s{2}md: 768px\n\s{2}lg: 1024px/,
    );
  });

  it("never references {breakpoints.*} — the spec has no such token group", () => {
    // Same contract as shadows: a data block lints clean, a reference is a
    // lint ERROR (and no component property could consume one anyway).
    const md = generate(layoutProfile());
    expect(md).not.toContain("{breakpoints.");
  });

  it("describes the container and the reshape grid in the Layout prose", () => {
    const md = generate(layoutProfile());
    expect(md).toContain("capped at **1200px**");
    expect(md).toContain("640px, 768px, 1024px");
    expect(md).toContain("@media (min-width: …)");
  });

  it("emits none of it when nothing was observed", () => {
    const md = generate(profile());
    expect(md).not.toContain("breakpoints:");
    expect(md).not.toContain("capped at");
    // The Layout section itself survives (it still carries spacing).
    expect(md).toContain("## Layout");
  });

  it("keeps the Layout section for container-only observations (no spacing)", () => {
    const md = generate(
      profile({ spacingScalePx: [], layout: { containerMaxWidthPx: 1080 } }),
    );
    expect(md).toContain("## Layout");
    expect(md).toContain("**1080px**");
    expect(md).not.toContain("breakpoints:");
  });
});

describe("generate – status colors", () => {
  const withStatus = (status: Record<string, string>) =>
    profile({
      colors: {
        background: "#ffffff",
        text: "#222222",
        primary: "#1a73e8",
        status,
        palette: [{ hex: "#1a73e8", count: 9 }],
      },
    });

  it("emits declared status colors as tokens + foreground message components", () => {
    const md = generate(
      withStatus({ error: "#d8351e", success: "#00b261", warning: "#f5a623" }),
    );
    const fm = frontMatter(md);
    expect(fm).toMatch(/^\s{2}error: "#d8351e"$/m);
    expect(fm).toMatch(/^\s{2}success: "#00b261"$/m);
    expect(fm).toContain("error-message:");
    expect(fm).toContain('textColor: "{colors.error}"');
    expect(md).toContain("## Components");
    expect(md).toContain("Feedback messages");
  });

  it("never leaves a status color as an orphan token (lint contract)", () => {
    // Every color in the front matter must be referenced by some component,
    // or @google/design.md warns. Each declared status color gets a *-message.
    const md = generate(withStatus({ info: "#2563eb" }));
    const fm = frontMatter(md);
    expect(fm).toMatch(/^\s{2}info: "#2563eb"$/m);
    expect(fm).toContain("info-message:");
  });

  it("omits the feedback block entirely when no status colors were declared", () => {
    const md = generate(profile());
    expect(md).not.toContain("-message:");
    expect(md).not.toContain("Feedback messages");
  });
});
