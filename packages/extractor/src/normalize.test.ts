import { describe, expect, it } from "vitest";
import { normalize, profileWarnings } from "./normalize.js";
import type { ButtonSample, RawObservations } from "./types.js";
import { PROFILE_SCHEMA_VERSION } from "./types.js";

// A minimal, empty observation set. Each test overrides only the fields it
// cares about, keeping the intent of every case obvious.
function raw(overrides: Partial<RawObservations> = {}): RawObservations {
  return {
    title: "Example",
    colorCount: {},
    bgArea: {},
    fontFamilies: {},
    fontSizes: {},
    fontWeights: {},
    lineHeights: {},
    letterSpacings: {},
    radii: {},
    borderWidths: {},
    shadows: {},
    spacings: {},
    buttons: [],
    links: [],
    ...overrides,
  };
}

function button(overrides: Partial<ButtonSample> = {}): ButtonSample {
  return {
    bg: "rgb(0, 0, 0)",
    color: "rgb(255, 255, 255)",
    radius: "4px",
    fontSize: "14px",
    weight: "400",
    padding: "8px",
    ...overrides,
  };
}

describe("normalize – metadata", () => {
  it("passes through url and title and stamps an ISO fetchedAt", () => {
    const profile = normalize("https://example.com", raw({ title: "Hi" }));
    expect(profile.url).toBe("https://example.com");
    expect(profile.title).toBe("Hi");
    expect(() => new Date(profile.fetchedAt).toISOString()).not.toThrow();
    expect(profile.fetchedAt).toBe(new Date(profile.fetchedAt).toISOString());
  });

  it("defaults theme to light and records the captured color scheme", () => {
    expect(normalize("u", raw()).theme).toBe("light");
    expect(normalize("u", raw({ colorScheme: "dark" })).theme).toBe("dark");
  });

  it("stamps the current profile schema version", () => {
    const profile = normalize("u", raw());
    expect(profile.schemaVersion).toBe(PROFILE_SCHEMA_VERSION);
  });
});

describe("normalize – colors", () => {
  it("picks the background covering the largest area", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: {
          "rgb(255, 255, 255)": 5000,
          "rgb(0, 0, 0)": 200,
        },
      }),
    );
    expect(profile.colors.background).toBe("#ffffff");
  });

  it("ignores translucent backgrounds (alpha < 0.5)", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: {
          "rgba(255, 255, 255, 0.2)": 9999,
          "rgb(10, 10, 10)": 100,
        },
      }),
    );
    expect(profile.colors.background).toBe("#0a0a0a");
  });

  it("picks the most frequent foreground color as text", () => {
    const profile = normalize(
      "u",
      raw({
        colorCount: {
          "rgb(34, 34, 34)": 50,
          "rgb(120, 120, 120)": 5,
        },
      }),
    );
    expect(profile.colors.text).toBe("#222222");
  });

  it("skips a no-contrast foreground against the background (no white-on-white)", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(255, 255, 255)": 5000 }, // white background
        colorCount: {
          "rgb(255, 255, 255)": 50, // most frequent, but invisible on white
          "rgb(0, 0, 0)": 12, // readable -> should win
        },
      }),
    );
    expect(profile.colors.background).toBe("#ffffff");
    expect(profile.colors.text).toBe("#000000");
  });

  it("merges near-duplicate colors that share a hex and ranks by count", () => {
    const profile = normalize(
      "u",
      raw({
        colorCount: {
          "rgb(255, 0, 0)": 3, // -> #ff0000
          "rgba(255, 0, 0, 1)": 2, // -> #ff0000 (merged => 5)
          "rgb(0, 0, 255)": 4, // -> #0000ff
        },
      }),
    );
    expect(profile.colors.palette[0]).toEqual({ hex: "#ff0000", count: 5 });
    expect(profile.colors.palette[1]).toEqual({ hex: "#0000ff", count: 4 });
  });

  it("caps the palette at 16 entries", () => {
    const colorCount: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      colorCount[`rgb(${i}, 0, 0)`] = i + 1;
    }
    const profile = normalize("u", raw({ colorCount }));
    expect(profile.colors.palette).toHaveLength(16);
  });

  it("chooses the most common non-neutral button background as primary", () => {
    const profile = normalize(
      "u",
      raw({
        buttons: [
          button({ bg: "rgb(220, 20, 60)" }),
          button({ bg: "rgb(220, 20, 60)" }),
          button({ bg: "rgb(128, 128, 128)" }), // neutral, ignored
        ],
      }),
    );
    expect(profile.colors.primary).toBe("#dc143c");
  });

  it("falls back to the most saturated frequent color when no buttons qualify", () => {
    const profile = normalize(
      "u",
      raw({
        colorCount: {
          "rgb(255, 0, 0)": 3, // vivid, count >= 2
          "rgb(100, 100, 100)": 9, // neutral, skipped
          "rgb(120, 110, 110)": 1, // count < 2, skipped
        },
      }),
    );
    expect(profile.colors.primary).toBe("#ff0000");
  });

  it("returns null primary when nothing qualifies", () => {
    const profile = normalize(
      "u",
      raw({ colorCount: { "rgb(128,128,128)": 9 } }),
    );
    expect(profile.colors.primary).toBeNull();
  });

  it("uses a saturated link color when buttons are monochrome (airbnb case)", () => {
    // airbnb's CTA buttons are grey (#f2f2f2) and the brand pink #ff385c lives
    // only in a link — the link fallback recovers it.
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(255, 255, 255)": 1_000_000 },
        buttons: [button({ bg: "rgb(242, 242, 242)" })], // neutral CTA
        links: [
          { color: "rgb(34, 34, 34)" }, // neutral, ignored
          { color: "rgb(255, 56, 92)" }, // #ff385c brand pink
        ],
      }),
    );
    expect(profile.colors.primary).toBe("#ff385c");
  });

  it("ignores the default browser link blue (#0000ee) as a primary signal", () => {
    // spotify case: an unstyled <a> reports #0000ee — never the brand. With no
    // other styled link and no colored button, primary falls through to null
    // rather than emitting the UA default.
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(18, 18, 18)": 1_000_000 }, // dark page
        buttons: [button({ bg: "rgb(40, 40, 40)" })], // neutral CTA
        links: [{ color: "rgb(0, 0, 238)" }], // #0000ee UA default
        colorCount: { "rgb(18,18,18)": 50, "rgb(179,179,179)": 30 }, // all neutral
      }),
    );
    expect(profile.colors.primary).not.toBe("#0000ee");
    expect(profile.colors.primary).toBeNull();
  });

  it("still uses a real styled link over the default-link exclusion", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(255, 255, 255)": 1_000_000 },
        buttons: [button({ bg: "rgb(242, 242, 242)" })],
        links: [
          { color: "rgb(0, 0, 238)" }, // UA default — skipped
          { color: "rgb(255, 56, 92)" }, // #ff385c real brand link
        ],
      }),
    );
    expect(profile.colors.primary).toBe("#ff385c");
  });

  it("recovers a brand color that lives only in a gradient (spotify case)", () => {
    // spotify's green #1db954 appears only in a hero/CTA gradient — no colored
    // button, no styled link — so the flat-color heuristics miss it. The
    // gradient step recovers it instead of the wrong last-resort palette guess.
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(18, 18, 18)": 1_000_000 }, // dark page
        buttons: [button({ bg: "rgb(40, 40, 40)" })], // neutral CTA
        gradientImages: {
          "linear-gradient(90deg, rgb(29, 185, 84) 0%, rgb(0, 0, 0) 100%)": 500_000,
        },
        colorCount: { "rgb(18,18,18)": 50, "rgb(179,179,179)": 30 }, // neutrals
      }),
    );
    expect(profile.colors.primary).toBe("#1db954");
  });

  it("area-weights gradient stops so the dominant gradient's brand color wins", () => {
    const profile = normalize(
      "u",
      raw({
        gradientImages: {
          // small decorative gradient
          "linear-gradient(rgb(255, 0, 0), rgb(0, 0, 0))": 1_000,
          // large hero gradient -> its saturated stop should win
          "linear-gradient(rgb(29, 185, 84), rgb(255, 255, 255))": 800_000,
        },
      }),
    );
    expect(profile.colors.primary).toBe("#1db954");
  });

  it("recovers a brand hue from a low-alpha gradient glow (figma case)", () => {
    // figma's blurple #4d49fc lives only in translucent glow stops
    // (rgba(77, 73, 252, 0.125)); the RGB still carries the brand hue, so the
    // gradient step recovers it even though the stop is mostly transparent.
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(255, 255, 255)": 1_000_000 },
        gradientImages: {
          "radial-gradient(circle at 20% 80%, rgba(77, 73, 252, 0.125) 0%, rgba(0, 0, 0, 0) 50%)": 600_000,
        },
      }),
    );
    expect(profile.colors.primary).toBe("#4d49fc");
  });

  it("ignores neutral gradient fades (white/black) with no saturated stop", () => {
    const profile = normalize(
      "u",
      raw({
        gradientImages: {
          "linear-gradient(rgb(255, 255, 255), rgb(0, 0, 0))": 900_000,
        },
      }),
    );
    expect(profile.colors.primary).toBeNull();
  });

  it("does not let a gradient stop override a real colored button", () => {
    const profile = normalize(
      "u",
      raw({
        buttons: [button({ bg: "rgb(83, 58, 253)" })], // #533afd CTA
        gradientImages: {
          "linear-gradient(rgb(29, 185, 84), rgb(0, 0, 0))": 900_000,
        },
      }),
    );
    expect(profile.colors.primary).toBe("#533afd");
  });

  it("does not let a gradient stop override a saturated brand link", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(255, 255, 255)": 1_000_000 },
        buttons: [button({ bg: "rgb(242, 242, 242)" })], // neutral CTA
        links: [{ color: "rgb(255, 56, 92)" }], // #ff385c brand link
        gradientImages: {
          "linear-gradient(rgb(29, 185, 84), rgb(0, 0, 0))": 900_000,
        },
      }),
    );
    expect(profile.colors.primary).toBe("#ff385c");
  });

  it("does not let a link color override a real colored button", () => {
    // The button is the stronger signal; the link must not win.
    const profile = normalize(
      "u",
      raw({
        buttons: [button({ bg: "rgb(83, 58, 253)" })], // #533afd CTA
        links: [{ color: "rgb(255, 56, 92)" }], // saturated link
      }),
    );
    expect(profile.colors.primary).toBe("#533afd");
  });

  it("rejects a non-neutral button that collides with the background (sentry case)", () => {
    // sentry's #150f23 button is non-neutral but ~equal to the near-black page,
    // so it's invisible as an accent. The contrast guard rejects it and the real
    // saturated signal (a violet link) wins instead.
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(20, 15, 35)": 1_000_000 }, // #140f23 dark page
        buttons: [button({ bg: "rgb(21, 15, 35)" })], // #150f23 — near-bg
        links: [{ color: "rgb(126, 87, 194)" }], // #7e57c2 sentry violet
      }),
    );
    expect(profile.colors.primary).not.toBe("#150f23");
    expect(profile.colors.primary).toBe("#7e57c2");
  });

  it("keeps a visible colored button on a dark page (guard only rejects near-bg)", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(18, 18, 18)": 1_000_000 }, // near-black page
        buttons: [button({ bg: "rgb(126, 87, 194)" })], // visible violet CTA
      }),
    );
    expect(profile.colors.primary).toBe("#7e57c2");
  });
});

describe("normalize – declared primary (:root custom properties)", () => {
  const whitePage = { "rgb(255, 255, 255)": 500_000 };

  it("trusts a declared + painted custom property over the button vote", () => {
    // The site *declares* its primary and paints it (a link); the red button
    // is a secondary CTA.
    const profile = normalize(
      "u",
      raw({
        bgArea: whitePage,
        colorCount: { "rgb(83, 58, 253)": 12 },
        buttons: [button({ bg: "rgb(220, 20, 60)" })],
        customProps: { "--color-primary": "rgb(83, 58, 253)" },
      }),
    );
    expect(profile.colors.primary).toBe("#533afd");
  });

  it("requires the declared color to be painted on the page", () => {
    // A stylesheet-only variable (unused theme, namespace leftovers) must not
    // beat what the visitor actually sees.
    const profile = normalize(
      "u",
      raw({
        bgArea: whitePage,
        buttons: [button({ bg: "rgb(220, 20, 60)" })],
        customProps: { "--color-primary": "rgb(83, 58, 253)" },
      }),
    );
    expect(profile.colors.primary).toBe("#dc143c");
  });

  it("never accepts a declared neutral (GitHub's --brand-* namespace)", () => {
    // GitHub prefixes its whole marketing design system --brand-*, including
    // plain white — on its dark homepage that's a high-contrast "ink" that
    // would win without the neutral gate. Monochrome brands are served by the
    // mono-button heuristic instead.
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(13, 17, 23)": 500_000 },
        colorCount: { "rgb(255, 255, 255)": 300 },
        customProps: { "--brand-color-canvas-default": "rgb(255, 255, 255)" },
      }),
    );
    expect(profile.colors.primary).toBeNull();
  });

  it("never picks foreground/state variants of the primary", () => {
    // shadcn convention: --primary-foreground is the text ON the primary.
    const profile = normalize(
      "u",
      raw({
        bgArea: whitePage,
        customProps: {
          "--primary-foreground": "rgb(220, 20, 60)",
          "--color-primary-hover": "rgb(200, 0, 40)",
          "--brand-gradient": "rgb(255, 0, 255)",
        },
      }),
    );
    expect(profile.colors.primary).toBeNull();
  });

  it("never picks linear-style fg/overlay/link variants (dark page)", () => {
    // linear.app declares all of these alongside its real --color-brand-bg;
    // the near-white fg reads as high-contrast "ink" on the dark page and
    // would win without the name exclusion.
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(8, 9, 10)": 500_000 },
        customProps: {
          "--color-fg-primary": "rgb(247, 248, 248)",
          "--color-overlay-primary": "rgba(0, 0, 0, 0.85)",
          "--color-link-primary": "rgb(130, 143, 255)",
        },
      }),
    );
    expect(profile.colors.primary).toBeNull();
  });

  it("picks the brand fill out of linear's full token set", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(8, 9, 10)": 500_000 },
        colorCount: { "rgb(94, 106, 210)": 25 }, // brand fill, painted
        customProps: {
          "--color-fg-primary": "rgb(247, 248, 248)",
          "--color-bg-primary": "rgb(8, 9, 10)", // the page itself — self-rejects
          "--color-border-primary": "rgb(35, 37, 42)",
          "--color-brand-bg": "rgb(94, 106, 210)",
          "--color-brand-text": "rgb(255, 255, 255)",
        },
      }),
    );
    expect(profile.colors.primary).toBe("#5e6ad2");
  });

  it("ignores palette-scale names like --color-blue-500 (tailwind)", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: whitePage,
        customProps: { "--color-blue-500": "rgb(59, 130, 246)" },
      }),
    );
    expect(profile.colors.primary).toBeNull();
  });

  it("rejects an invisible declared primary and falls back to the heuristics", () => {
    // A variable from another theme that ~equals the page background must not
    // smuggle in an invisible primary; the real button wins instead.
    const profile = normalize(
      "u",
      raw({
        bgArea: whitePage,
        buttons: [button({ bg: "rgb(220, 20, 60)" })],
        customProps: { "--primary": "rgb(254, 254, 254)" },
      }),
    );
    expect(profile.colors.primary).toBe("#dc143c");
  });

  it("rejects a translucent declared value (a wash, not the brand)", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: whitePage,
        customProps: { "--primary": "rgba(83, 58, 253, 0.4)" },
      }),
    );
    expect(profile.colors.primary).toBeNull();
  });

  it("reads a declared primary in modern syntax (shadcn's oklch)", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: whitePage,
        colorCount: { "rgb(110, 105, 243)": 8 }, // painted as computed rgb
        customProps: { "--primary": "oklch(0.6 0.2 280)" },
      }),
    );
    expect(profile.colors.primary).toBe("#6e69f3");
  });

  it("prefers the painted declared color over a stylesheet-only one", () => {
    // --brand has the shorter (more canonical) name, but --color-primary is
    // the one observed on the page (a button bg) — painted is a hard gate.
    const profile = normalize(
      "u",
      raw({
        bgArea: whitePage,
        buttons: [button({ bg: "rgb(83, 58, 253)" })],
        customProps: {
          "--brand": "rgb(0, 200, 96)",
          "--color-primary": "rgb(83, 58, 253)",
        },
      }),
    );
    expect(profile.colors.primary).toBe("#533afd");
  });

  it("skips palette-scale entries for the canonical declared token (stripe case)", () => {
    // Stripe ships a --hds-color-util-brand-* ramp (900/200/25…) plus the real
    // --hds-color-button-primary-bg. The ramp entries are scale steps, not the
    // brand; and "button" must not be excluded by an over-eager substring
    // match (butt**on-**primary broke this once).
    const profile = normalize(
      "u",
      raw({
        bgArea: whitePage,
        colorCount: {
          "rgb(127, 125, 252)": 30, // brand-400 ramp entry, painted
          "rgb(83, 58, 253)": 40, // the real primary, painted
        },
        customProps: {
          "--hds-color-util-brand-400": "rgb(127, 125, 252)",
          "--hds-color-button-primary-bg": "rgb(83, 58, 253)",
        },
      }),
    );
    expect(profile.colors.primary).toBe("#533afd");
  });

  it("excludes camelCase variant segments (GitHub's iconColor)", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: whitePage,
        // Painted once: enough for the painted gate, below the palette
        // fallback's count >= 2 bar — so a pick could only come from the
        // declared path, which must refuse this variant name.
        colorCount: { "rgb(220, 20, 60)": 1 },
        customProps: {
          "--button-primary-iconColor-disabled": "rgb(220, 20, 60)",
        },
      }),
    );
    expect(profile.colors.primary).toBeNull();
  });

  it("skips hue-named and gradient-endpoint vars (GitHub's --brand-* namespace)", () => {
    // GitHub namespaces decorative marketing tokens under --brand-*; a label
    // gradient stop that names its own hues is not the brand. The real green
    // button must win instead.
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(13, 17, 23)": 500_000 },
        colorCount: { "rgb(95, 237, 131)": 6 },
        buttons: [button({ bg: "rgb(8, 135, 43)" })],
        customProps: {
          "--brand-Label-color-green-blue-start": "rgb(95, 237, 131)",
          "--brand-Icon-color-coral": "rgb(250, 144, 114)",
          "--brand-color-accent-primary": "rgb(95, 237, 131)",
          "--brand-tiles-highlightColor": "rgb(95, 237, 131)",
        },
      }),
    );
    expect(profile.colors.primary).toBe("#08872b");
  });

  it("prefers the canonical brand-primary over a role-scoped button var (netlify)", () => {
    // Netlify declares BOTH --color-brand-primary (the brand blue) and
    // --ntl-button-primary-bg-color (the teal CTA). The canonical — shortest —
    // semantic name is the site's own statement of its primary.
    const profile = normalize(
      "u",
      raw({
        bgArea: whitePage,
        colorCount: {
          "rgb(46, 81, 237)": 20,
          "rgb(50, 230, 226)": 15,
        },
        customProps: {
          "--color-brand-primary": "rgb(46, 81, 237)",
          "--ntl-button-primary-bg-color": "rgb(50, 230, 226)",
          "--color-brand-secondary": "rgb(20, 216, 212)",
        },
      }),
    );
    expect(profile.colors.primary).toBe("#2e51ed");
  });

  it("skips the user-agent default link blue even when declared", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: whitePage,
        customProps: { "--primary": "rgb(0, 0, 238)" },
      }),
    );
    expect(profile.colors.primary).toBeNull();
  });
});

describe("normalize – semantic status colors (declared)", () => {
  const statusOf = (customProps: Record<string, string>) =>
    normalize("u", raw({ customProps })).colors.status;

  it("mines error/success/warning/info from semantically named vars", () => {
    const s = statusOf({
      "--color-error": "#d8351e",
      "--color-success": "#00b261",
      "--color-warning": "#f5a623",
      "--color-info": "#2563eb",
    });
    expect(s).toEqual({
      error: "#d8351e",
      success: "#00b261",
      warning: "#f5a623",
      info: "#2563eb",
    });
  });

  it("maps danger/positive/caution/informational aliases to roles", () => {
    const s = statusOf({
      "--danger": "#da3633",
      "--positive": "#2ea043",
      "--caution": "#e8a317",
      "--informational": "#2563eb",
    });
    expect(s?.error).toBe("#da3633");
    expect(s?.success).toBe("#2ea043");
    expect(s?.warning).toBe("#e8a317");
    expect(s?.info).toBe("#2563eb");
  });

  it("prefers a 'default'/'emphasis' marked token over an un-leveled alias", () => {
    // destructive-default carries the canonical marker, so it outranks the
    // plain --danger even though --danger is the shorter name.
    const s = statusOf({
      "--danger": "#da3633",
      "--destructive-default": "#e5484d",
    });
    expect(s?.error).toBe("#e5484d");
  });

  it("prefers a 'default' marker over a numeric 500 on a light-centered ramp", () => {
    // The supabase trap: --destructive-500 is a light salmon, --destructive-
    // default is the strong red. A naive "500 is canonical" rule picks the
    // tint; the marker tier must win.
    const s = statusOf({
      "--destructive-500": "#f3b0a2",
      "--destructive-default": "#e54d2e",
    });
    expect(s?.error).toBe("#e54d2e");
  });

  it("picks the canonical ~500 ramp step over tints and inks", () => {
    // Stripe HDS shape: numeric ramp, 500 is the strong mid-tone.
    const s = statusOf({
      "--hds-color-core-error-100": "#feb9ac",
      "--hds-color-core-error-500": "#d8351e",
      "--hds-color-core-error-600": "#a01400",
    });
    expect(s?.error).toBe("#d8351e");
  });

  it("rejects wash/state variants (muted, subtle, hover, disabled)", () => {
    const s = statusOf({
      "--color-success-muted": "#0d3024",
      "--color-success-subtle": "#b6f2c7",
      "--button-danger-bgColor-hover": "#ffffff33",
    });
    expect(s).toBeUndefined();
  });

  it("rejects a mislabeled var whose hue is wrong for the role", () => {
    // A "success" that is actually red is a mis-mined token — the hue gate
    // (the painted-corroboration stand-in) drops it.
    const s = statusOf({ "--color-success": "#d8351e" });
    expect(s).toBeUndefined();
  });

  it("coerces bare HSL channel fragments (supabase's --destructive-default)", () => {
    const s = statusOf({
      "--destructive-default": "10.2deg 77.9% 53.9%",
      "--warning-default": "30.3deg 80.3% 47.8%",
    });
    expect(s?.error).toBe("#e54d2e"); // hsl(10.2 77.9% 53.9%)
    expect(s?.warning).toBe("#dc7b18"); // hsl(30.3 80.3% 47.8%)
  });

  it("is absent when the site declares no status tokens", () => {
    expect(statusOf({ "--color-primary": "#533afd" })).toBeUndefined();
    expect(normalize("u", raw()).colors.status).toBeUndefined();
  });
});

describe("normalize – surfaces (border & muted-surface)", () => {
  it("splits subtle near-background fills into a hairline border + muted fill", () => {
    const p = normalize(
      "u",
      raw({
        bgArea: {
          "rgb(255, 255, 255)": 1_000_000, // background
          "rgb(229, 237, 245)": 300_000, // #e5edf5 — more visible -> border
          "rgb(248, 250, 253)": 250_000, // #f8fafd — subtler -> muted fill
          "rgb(13, 23, 56)": 200_000, // dark block — not a subtle surface
        },
      }),
    );
    expect(p.colors.background).toBe("#ffffff");
    expect(p.colors.border).toBe("#e5edf5");
    expect(p.colors.mutedSurface).toBe("#f8fafd");
  });

  it("prefers a real captured border color over the fill fallback", () => {
    const p = normalize(
      "u",
      raw({
        bgArea: {
          "rgb(255, 255, 255)": 1_000_000,
          "rgb(245, 245, 245)": 300_000, // #f5f5f5 subtle fill -> muted
        },
        borderColors: { "rgb(208, 215, 222)": 40 }, // #d0d7de real border
      }),
    );
    expect(p.colors.border).toBe("#d0d7de");
    expect(p.colors.mutedSurface).toBe("#f5f5f5");
  });

  it("rejects a muted surface lighter than an off-white background (supabase case)", () => {
    // #ffffff sitting on a #fafafa page is the document base showing through,
    // not a recessed surface — emitting it as a muted/border token would be a
    // near-invisible color. Both subtle roles stay null instead.
    const p = normalize(
      "u",
      raw({
        bgArea: {
          "rgb(250, 250, 250)": 1_000_000, // #fafafa background
          "rgb(255, 255, 255)": 300_000, // #ffffff — lighter, not recessed
        },
      }),
    );
    expect(p.colors.background).toBe("#fafafa");
    expect(p.colors.mutedSurface).toBeNull();
    expect(p.colors.border).toBeNull();
  });

  it("keeps a recessed (darker) fill on an off-white page", () => {
    // A genuinely darker tint than the off-white page is a real hairline/surface.
    const p = normalize(
      "u",
      raw({
        bgArea: {
          "rgb(250, 250, 250)": 1_000_000, // #fafafa background
          "rgb(229, 229, 229)": 300_000, // #e5e5e5 — darker -> recessed
        },
      }),
    );
    expect(p.colors.border).toBe("#e5e5e5");
  });

  it("emits no surfaces when the page has only the background and a dark block", () => {
    const p = normalize(
      "u",
      raw({
        bgArea: {
          "rgb(255, 255, 255)": 1_000_000,
          "rgb(13, 23, 56)": 300_000, // high-contrast block, not subtle
        },
      }),
    );
    expect(p.colors.border).toBeNull();
    expect(p.colors.mutedSurface).toBeNull();
  });

  it("keeps only a border when a single subtle color fills both roles", () => {
    const p = normalize(
      "u",
      raw({
        bgArea: {
          "rgb(255, 255, 255)": 1_000_000,
          "rgb(229, 237, 245)": 300_000, // the only subtle fill
        },
      }),
    );
    expect(p.colors.border).toBe("#e5edf5");
    expect(p.colors.mutedSurface).toBeNull();
  });

  it("rejects a saturated decorative border in favour of a neutral hairline", () => {
    // Dogfood: tailwind/apple handed a saturated link-blue (#2997ff) as the
    // "border". The chroma cap drops it for the subtle grey hairline.
    const p = normalize(
      "u",
      raw({
        bgArea: {
          "rgb(255, 255, 255)": 1_000_000,
          "rgb(234, 234, 234)": 200_000, // #eaeaea neutral hairline
        },
        borderColors: {
          "rgb(41, 151, 255)": 80, // #2997ff saturated — must be skipped
          "rgb(226, 226, 226)": 30, // #e2e2e2 neutral — acceptable
        },
      }),
    );
    expect(p.colors.border).not.toBe("#2997ff");
    expect(p.colors.border).toBe("#e2e2e2");
  });

  it("keeps a subtly-tinted grey border (not every tint is decorative)", () => {
    // #e5edf5 is a real blue-grey hairline (chroma ~0.06) and must survive the
    // cap — it sits well below the saturated-accent threshold.
    const p = normalize(
      "u",
      raw({
        bgArea: { "rgb(255, 255, 255)": 1_000_000 },
        borderColors: { "rgb(229, 237, 245)": 50 },
      }),
    );
    expect(p.colors.border).toBe("#e5edf5");
  });
});

describe("normalize – profileWarnings", () => {
  it("flags a bot-protection interstitial by title", () => {
    const p = normalize("u", raw({ title: "Just a moment..." }));
    const w = profileWarnings(p);
    expect(w.some((m) => /interstitial|bot-protection/i.test(m))).toBe(true);
  });

  it("flags a near-empty extraction with no usable signals", () => {
    // Empty observations -> no colors, no sizes.
    const p = normalize("u", raw());
    expect(profileWarnings(p).some((m) => /few design signals/i.test(m))).toBe(
      true,
    );
  });

  it("stays silent for a healthy profile", () => {
    const p = normalize(
      "u",
      raw({
        title: "Acme — Real Site",
        colorCount: {
          "rgb(255,255,255)": 50,
          "rgb(20,20,20)": 40,
          "rgb(83,58,253)": 20,
          "rgb(100,116,141)": 15,
        },
        bgArea: { "rgb(255, 255, 255)": 1_000_000 },
        fontSizes: { "16px": 100, "32px": 20, "14px": 80 },
        buttons: [button({ bg: "rgb(83, 58, 253)" })],
      }),
    );
    expect(profileWarnings(p)).toEqual([]);
  });
});

describe("normalize – typography", () => {
  it("keeps only the first family from a stack and strips quotes", () => {
    const profile = normalize(
      "u",
      raw({
        fontFamilies: {
          '"Inter", Arial, sans-serif': 10,
          "Georgia, serif": 4,
        },
      }),
    );
    expect(profile.typography.families).toEqual(["Inter", "Georgia"]);
  });

  it("preserves the dominant family's declared stack as a paste-ready fontStack", () => {
    const profile = normalize(
      "u",
      raw({
        fontFamilies: {
          '"Inter", Arial, sans-serif': 10,
          "Georgia, serif": 4,
        },
      }),
    );
    // Dominant declaration kept (single-word names unquoted, generic kept).
    expect(profile.typography.fontStack).toBe("Inter, Arial, sans-serif");
  });

  it("drops emoji/symbol fonts and guarantees a trailing generic in fontStack", () => {
    const profile = normalize(
      "u",
      raw({
        fontFamilies: {
          'Geist, Arial, "Apple Color Emoji", "Segoe UI Symbol"': 9,
        },
      }),
    );
    // emoji/symbol noise removed; no declared generic, so sans-serif appended.
    expect(profile.typography.fontStack).toBe("Geist, Arial, sans-serif");
  });

  it("limits families to the top 5 by frequency", () => {
    const fontFamilies: Record<string, number> = {};
    for (let i = 0; i < 8; i++) fontFamilies[`Font${i}`] = i;
    const profile = normalize("u", raw({ fontFamilies }));
    expect(profile.typography.families).toHaveLength(5);
    expect(profile.typography.families[0]).toBe("Font7"); // highest count first
  });

  it("builds an ascending size scale, dropping values seen only once", () => {
    const profile = normalize(
      "u",
      raw({
        fontSizes: {
          "16px": 5,
          "14px": 3,
          "99px": 1, // minCount is 2 -> dropped
        },
      }),
    );
    expect(profile.typography.sizeScalePx).toEqual([14, 16]);
  });

  it("dedupes and sorts numeric font weights", () => {
    const profile = normalize(
      "u",
      raw({ fontWeights: { "700": 2, "400": 5, bold: 1 } }),
    );
    expect(profile.typography.weights).toEqual([400, 700]);
  });
});

describe("normalize – spacing, radius, shadows", () => {
  it("snaps spacing to a 4px grid and keeps the most common steps", () => {
    const profile = normalize(
      "u",
      raw({
        spacings: {
          "8px": 5,
          "16px": 3,
          "13px": 2, // snaps to the nearest 4px step (12)
        },
      }),
    );
    expect(profile.spacingScalePx).toEqual([8, 12, 16]);
  });

  it("skips non-positive and non-px values in numeric scales", () => {
    const profile = normalize(
      "u",
      raw({
        radii: {
          "0px": 9, // non-positive -> skipped
          "4px": 2,
          "50%": 9, // not px -> skipped
        },
      }),
    );
    expect(profile.radiusScalePx).toEqual([4]);
  });

  it("returns the 4 most common shadows", () => {
    const profile = normalize(
      "u",
      raw({
        shadows: {
          a: 5,
          b: 4,
          c: 3,
          d: 2,
          e: 1,
        },
      }),
    );
    expect(profile.shadows).toEqual(["a", "b", "c", "d"]);
  });

  it("folds a noisy spacing scale onto the 4px grid by frequency", () => {
    const profile = normalize(
      "u",
      raw({
        spacings: {
          "2px": 5,
          "4px": 5,
          "5.5px": 5,
          "6px": 5,
          "7px": 5,
          "8px": 5,
          "9px": 5,
        },
      }),
    );
    // 2, 4, 5.5 snap to 4; 6, 7, 8, 9 snap to 8.
    expect(profile.spacingScalePx).toEqual([4, 8]);
  });
});

describe("normalize – per-role typography", () => {
  it("takes the modal heading/body line-height ratios", () => {
    const profile = normalize(
      "u",
      raw({
        lhHeading: { "1.20": 3, "1.10": 1 },
        lhBody: { "1.50": 5, "1.40": 2 },
      }),
    );
    expect(profile.typography.lineHeightHeading).toBe(1.2);
    expect(profile.typography.lineHeightBody).toBe(1.5);
  });

  it("takes the modal heading/body font-weights", () => {
    const profile = normalize(
      "u",
      raw({
        weightHeading: { "700": 4, "600": 1 },
        weightBody: { "400": 9, "500": 2 },
      }),
    );
    expect(profile.typography.weightHeading).toBe(700);
    expect(profile.typography.weightBody).toBe(400);
  });

  it("takes the modal heading letter-spacing in em (3 dp)", () => {
    const profile = normalize(
      "u",
      raw({ lsHeading: { "-0.020": 3, "0.000": 1 } }),
    );
    expect(profile.typography.letterSpacingHeadingEm).toBe(-0.02);
  });

  it("leaves per-role fields undefined when no data was collected", () => {
    const profile = normalize("u", raw());
    expect(profile.typography.lineHeightHeading).toBeUndefined();
    expect(profile.typography.weightBody).toBeUndefined();
    expect(profile.typography.letterSpacingHeadingEm).toBeUndefined();
  });
});

describe("normalize – primaryHover", () => {
  // A white page with one crimson CTA: pickPrimary resolves #dc143c.
  const base = () =>
    raw({
      bgArea: { "rgb(255, 255, 255)": 50000 },
      buttons: [button({ bg: "rgb(220, 20, 60)" })],
    });

  it("surfaces the hover shift observed on the primary button", () => {
    const profile = normalize(
      "u",
      raw({
        ...base(),
        buttonHovers: [
          {
            restBg: "rgb(220, 20, 60)",
            restColor: "rgb(255, 255, 255)",
            bg: "rgb(180, 10, 40)",
            color: "rgb(255, 255, 255)",
          },
        ],
      }),
    );
    expect(profile.colors.primary).toBe("#dc143c");
    expect(profile.colors.primaryHover).toBe("#b40a28");
  });

  it("ignores hover shifts on buttons that are not the primary", () => {
    // A ghost/nav button hover-shifting must not be mislabelled as the CTA
    // hover: its resting bg isn't the resolved primary.
    const profile = normalize(
      "u",
      raw({
        ...base(),
        buttonHovers: [
          {
            restBg: "rgb(240, 240, 240)",
            restColor: "rgb(0, 0, 0)",
            bg: "rgb(220, 220, 220)",
            color: "rgb(0, 0, 0)",
          },
        ],
      }),
    );
    expect(profile.colors.primaryHover).toBeNull();
  });

  it("rejects a translucent hover value (overlay tints, not a color)", () => {
    const profile = normalize(
      "u",
      raw({
        ...base(),
        buttonHovers: [
          {
            restBg: "rgb(220, 20, 60)",
            restColor: "rgb(255, 255, 255)",
            bg: "rgba(0, 0, 0, 0.2)",
            color: "rgb(255, 255, 255)",
          },
        ],
      }),
    );
    expect(profile.colors.primaryHover).toBeNull();
  });

  it("is null when no hover samples were captured", () => {
    expect(normalize("u", base()).colors.primaryHover).toBeNull();
  });
});

describe("normalize – declared scale tokens (radius / spacing / fonts)", () => {
  it("mines declared radius and spacing names for painted values only", () => {
    const profile = normalize(
      "u",
      raw({
        radii: { "8px": 12, "16px": 3 },
        spacings: { "16px": 30, "24px": 9 },
        customProps: {
          "--radius-md": "8px",
          "--radius-xl": "32px", // never painted -> stale theme var, rejected
          "--space-4": "16px",
          "--gap-lg": "24px",
          "--spacing-huge": "400px", // out of range
        },
      }),
    );
    expect(profile.declared?.radius).toEqual({ "--radius-md": 8 });
    expect(profile.declared?.spacing).toEqual({
      "--space-4": 16,
      "--gap-lg": 24,
    });
  });

  it("converts rem values with the page's real root font-size (62.5% trick)", () => {
    const profile = normalize(
      "u",
      raw({
        rootFontSizePx: 10, // html { font-size: 62.5% }
        radii: { "8px": 5 },
        customProps: { "--radius-md": "0.8rem" }, // 0.8 * 10 = 8px
      }),
    );
    expect(profile.declared?.radius).toEqual({ "--radius-md": 8 });
  });

  it("keeps typography vars out of the box-spacing group", () => {
    const profile = normalize(
      "u",
      raw({
        spacings: { "2px": 4 },
        customProps: { "--letter-spacing-tight": "2px" },
      }),
    );
    expect(profile.declared).toBeUndefined();
  });

  it("mines declared font families only when the page renders that face", () => {
    const profile = normalize(
      "u",
      raw({
        fontFamilies: { '"Mona Sans", system-ui, sans-serif': 80 },
        customProps: {
          "--font-sans": '"Mona Sans", system-ui, sans-serif',
          "--font-display": "Phantom Face, serif", // never rendered
          "--font-size-base": "16px", // a metric, not a family
        },
      }),
    );
    expect(profile.declared?.fontFamilies).toEqual({
      "--font-sans": '"Mona Sans", system-ui, sans-serif',
    });
  });

  it("emits no declared block at all when nothing qualifies", () => {
    const profile = normalize("u", raw({ customProps: { "--x": "1px" } }));
    expect(profile.declared).toBeUndefined();
    expect("declared" in profile).toBe(false);
  });

  it("orders dimension tokens smallest-first as a readable scale", () => {
    const profile = normalize(
      "u",
      raw({
        radii: { "4px": 5, "8px": 5, "12px": 5 },
        customProps: {
          "--radius-lg": "12px",
          "--radius-sm": "4px",
          "--radius-md": "8px",
        },
      }),
    );
    expect(Object.values(profile.declared?.radius ?? {})).toEqual([4, 8, 12]);
  });
});

describe("normalize – declared scale gates (live-sweep lessons)", () => {
  it("keeps border/shadow/focus widths out of a spacing namespace", () => {
    // Stripe rides border and focus-ring widths on its --hds-space-* namespace;
    // without the gate the 1-2px noise crowds the real scale out of the cap.
    const profile = normalize(
      "u",
      raw({
        spacings: { "1px": 9, "2px": 9, "8px": 20 },
        customProps: {
          "--hds-space-button-border": "1px",
          "--hds-space-input-focus-shadowSingle": "2px",
          "--hds-space-core-100": "8px",
        },
      }),
    );
    expect(profile.declared?.spacing).toEqual({ "--hds-space-core-100": 8 });
  });

  it("keeps one canonical (shortest) name per value", () => {
    // GitHub aliases the same 8px gap under many --*-gap-* names; a scale
    // wants one name per step, and the shortest is the canonical alias.
    const profile = normalize(
      "u",
      raw({
        spacings: { "8px": 20 },
        customProps: {
          "--controlStack-medium-gap-condensed": "8px",
          "--stack-gap-condensed": "8px",
          "--control-large-gap": "8px",
        },
      }),
    );
    expect(profile.declared?.spacing).toEqual({ "--control-large-gap": 8 });
  });

  it("dedupes font vars pointing at the same stack", () => {
    const profile = normalize(
      "u",
      raw({
        fontFamilies: { "Inter, sans-serif": 50 },
        customProps: {
          "--fontStack-sansSerif": "Inter, sans-serif",
          "--font-sans": "Inter, sans-serif",
        },
      }),
    );
    expect(profile.declared?.fontFamilies).toEqual({
      "--font-sans": "Inter, sans-serif",
    });
  });
});

describe("normalize – hover mechanisms beyond a bg swap", () => {
  // White page, crimson primary CTA (#dc143c).
  const base = () =>
    raw({
      bgArea: { "rgb(255, 255, 255)": 50000 },
      buttons: [button({ bg: "rgb(220, 20, 60)" })],
    });
  const sample = (over: Partial<import("./types.js").HoverSample>) => ({
    restBg: "rgb(220, 20, 60)",
    restColor: "rgb(255, 255, 255)",
    bg: "rgb(220, 20, 60)",
    color: "rgb(255, 255, 255)",
    ...over,
  });

  it("composites an opacity-fade hover into the visible hex", () => {
    // opacity .5 over white: .5*220+127.5=238, .5*20+127.5=138, .5*60+127.5=158
    const profile = normalize(
      "u",
      raw({
        ...base(),
        buttonHovers: [sample({ restOpacity: 1, opacity: 0.5 })],
      }),
    );
    expect(profile.colors.primary).toBe("#dc143c");
    expect(profile.colors.primaryHover).toBe("#ee8a9e");
  });

  it("ignores an opacity fade when the page background is unknown", () => {
    const profile = normalize(
      "u",
      raw({
        buttons: [button({ bg: "rgb(220, 20, 60)" })],
        buttonHovers: [sample({ restOpacity: 1, opacity: 0.5 })],
      }),
    );
    expect(profile.colors.primaryHover).toBeNull();
  });

  it("applies a plain brightness() filter to the channels", () => {
    // brightness(.5) on rgb(220,20,60) -> rgb(110,10,30)
    const profile = normalize(
      "u",
      raw({
        ...base(),
        buttonHovers: [
          sample({ restFilter: "none", filter: "brightness(0.5)" }),
        ],
      }),
    );
    expect(profile.colors.primaryHover).toBe("#6e0a1e");
  });

  it("won't reason about a compound filter", () => {
    const profile = normalize(
      "u",
      raw({
        ...base(),
        buttonHovers: [
          sample({ restFilter: "none", filter: "brightness(0.5) blur(2px)" }),
        ],
      }),
    );
    expect(profile.colors.primaryHover).toBeNull();
  });

  it("records a hover shadow + lift as the micro-interaction block", () => {
    const profile = normalize(
      "u",
      raw({
        ...base(),
        buttonHovers: [
          sample({
            restShadow: "none",
            shadow: "rgba(0, 0, 0, 0.2) 0px 4px 12px 0px",
            restTransform: "none",
            transform: "matrix(1, 0, 0, 1, 0, -2)",
          }),
        ],
      }),
    );
    expect(profile.colors.primaryHover).toBeNull(); // no color change at all
    expect(profile.primaryButtonHover).toEqual({
      shadow: "rgba(0, 0, 0, 0.2) 0px 4px 12px 0px",
      transform: "translateY(-2px)",
    });
  });

  it("decomposes a uniform scale matrix into scale()", () => {
    const profile = normalize(
      "u",
      raw({
        ...base(),
        buttonHovers: [
          sample({
            restTransform: "none",
            transform: "matrix(1.05, 0, 0, 1.05, 0, 0)",
          }),
        ],
      }),
    );
    expect(profile.primaryButtonHover?.transform).toBe("scale(1.05)");
  });

  it("emits no micro-interaction block when nothing beyond color changed", () => {
    const profile = normalize(
      "u",
      raw({
        ...base(),
        buttonHovers: [sample({ bg: "rgb(180, 10, 40)" })],
      }),
    );
    expect(profile.colors.primaryHover).toBe("#b40a28");
    expect(profile.primaryButtonHover).toBeUndefined();
  });
});

describe("normalize – control geometry (controls)", () => {
  // A saturated red button vote so pickPrimary resolves #e60012 — control
  // metrics must then come from THOSE buttons only.
  const PRIMARY = "rgb(230, 0, 18)";

  it("takes the modal font-size/height of the primary-colored buttons only", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(255, 255, 255)": 1_000_000 },
        buttons: [
          button({ bg: PRIMARY, fontSize: "14px", height: "40px" }),
          button({ bg: PRIMARY, fontSize: "14px", height: "40px" }),
          // Hero CTA outlier on the same primary — outvoted, not averaged.
          button({ bg: PRIMARY, fontSize: "18px", height: "64px" }),
          // Ghost/nav button in another color must not vote at all.
          button({ bg: "rgb(0, 0, 0)", fontSize: "11px", height: "24px" }),
          button({ bg: "rgb(0, 0, 0)", fontSize: "11px", height: "24px" }),
          button({ bg: "rgb(0, 0, 0)", fontSize: "11px", height: "24px" }),
        ],
      }),
    );
    expect(profile.colors.primary).toBe("#e60012");
    expect(profile.controls?.button).toEqual({ fontSizePx: 14, heightPx: 40 });
  });

  it("rejects implausible control heights but keeps the font-size", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(255, 255, 255)": 1_000_000 },
        buttons: [
          // A full-bleed "button" banner: height is noise, font-size is real.
          button({ bg: PRIMARY, fontSize: "14px", height: "320px" }),
        ],
      }),
    );
    expect(profile.controls?.button).toEqual({ fontSizePx: 14 });
  });

  it("derives input geometry from the sampled text inputs", () => {
    const profile = normalize(
      "u",
      raw({
        inputs: [
          { height: "36px", fontSize: "14px", radius: "6px" },
          { height: "36px", fontSize: "14px", radius: "6px" },
          { height: "48px", fontSize: "16px", radius: "6px" },
        ],
      }),
    );
    expect(profile.controls?.input).toEqual({ fontSizePx: 14, heightPx: 36 });
  });

  it("omits controls entirely when nothing was observed (old fixtures)", () => {
    const profile = normalize("u", raw());
    expect(profile.controls).toBeUndefined();
  });

  it("survives height-less button samples from pre-1.5 captures", () => {
    const profile = normalize(
      "u",
      raw({
        bgArea: { "rgb(255, 255, 255)": 1_000_000 },
        buttons: [button({ bg: PRIMARY, fontSize: "14px" })],
      }),
    );
    expect(profile.controls?.button).toEqual({ fontSizePx: 14 });
  });
});

describe("normalize – pressed (:active) state", () => {
  const base = () =>
    raw({
      bgArea: { "rgb(255, 255, 255)": 50000 },
      buttons: [button({ bg: "rgb(220, 20, 60)" })],
    });
  const sample = (over: Partial<import("./types.js").HoverSample>) => ({
    restBg: "rgb(220, 20, 60)",
    restColor: "rgb(255, 255, 255)",
    bg: "rgb(220, 20, 60)",
    color: "rgb(255, 255, 255)",
    ...over,
  });

  it("resolves primaryActive from a pressed bg swap on the primary button", () => {
    const profile = normalize(
      "u",
      raw({
        ...base(),
        buttonActives: [sample({ bg: "rgb(180, 10, 40)" })],
      }),
    );
    expect(profile.colors.primaryActive).toBe("#b40a28");
    expect(profile.primaryButtonActive).toBeUndefined();
  });

  it("captures the press micro-interaction (posthog's 3D collapse)", () => {
    const profile = normalize(
      "u",
      raw({
        ...base(),
        buttonActives: [
          sample({
            restShadow: "rgba(0, 0, 0, 0.4) 0px 4px 0px 0px",
            shadow: "none",
            restTransform: "none",
            transform: "matrix(1, 0, 0, 1, 0, 4)",
          }),
        ],
      }),
    );
    // No color change -> no primaryActive token, but the fx pair survives —
    // including the shadow COLLAPSE (rest had one, pressed has none).
    expect(profile.colors.primaryActive).toBeNull();
    expect(profile.primaryButtonActive?.transform).toBe("translateY(4px)");
    expect(profile.primaryButtonActive?.shadow).toBe("none");
  });

  it("ignores presses observed on non-primary buttons", () => {
    const profile = normalize(
      "u",
      raw({
        ...base(),
        buttonActives: [
          sample({ restBg: "rgb(0, 0, 0)", bg: "rgb(40, 40, 40)" }),
        ],
      }),
    );
    expect(profile.colors.primaryActive).toBeNull();
  });

  it("passes the dark-unlock mechanism through to the profile", () => {
    const profile = normalize(
      "u",
      raw({ colorScheme: "dark", darkMechanism: "class-dark" }),
    );
    expect(profile.darkMechanism).toBe("class-dark");
    expect(normalize("u", raw()).darkMechanism).toBeUndefined();
  });
});

describe("normalize – layout (breakpoints + container)", () => {
  it("merges ±2px breakpoint families and presents them ascending", () => {
    const profile = normalize(
      "u",
      raw({
        mediaBreakpoints: { "640": 2, "767": 1, "768": 5, "1024": 3 },
      }),
    );
    expect(profile.layout?.breakpointsPx).toEqual([640, 768, 1024]);
  });

  it("drops sub-320px and over-1920px noise", () => {
    const profile = normalize(
      "u",
      raw({ mediaBreakpoints: { "200": 4, "768": 1, "2560": 3 } }),
    );
    expect(profile.layout?.breakpointsPx).toEqual([768]);
  });

  it("caps the grid at the 6 most-gated-on boundaries", () => {
    const profile = normalize(
      "u",
      raw({
        mediaBreakpoints: {
          "480": 9,
          "640": 8,
          "768": 7,
          "1024": 6,
          "1280": 5,
          "1536": 4,
          "1700": 1, // least-used — the one that falls off
        },
      }),
    );
    expect(profile.layout?.breakpointsPx).toEqual([
      480, 640, 768, 1024, 1280, 1536,
    ]);
  });

  it("picks the height-weighted container, ties to the larger (outer) value", () => {
    const profile = normalize(
      "u",
      raw({ containerWidths: { "640": 800, "1200": 5000 } }),
    );
    expect(profile.layout?.containerMaxWidthPx).toBe(1200);

    const tie = normalize(
      "u",
      raw({ containerWidths: { "1200": 100, "1280": 100 } }),
    );
    expect(tie.layout?.containerMaxWidthPx).toBe(1280);
  });

  it("gates the container to plausible page-column widths", () => {
    const profile = normalize("u", raw({ containerWidths: { "560": 9999 } }));
    expect(profile.layout).toBeUndefined();
  });

  it("omits layout entirely when nothing was observed (tidy JSON)", () => {
    const profile = normalize("u", raw());
    expect("layout" in profile).toBe(false);
  });
});

describe("normalize – declared breakpoints (:root custom properties)", () => {
  it("mines --breakpoint-*/--screen-* names corroborated by the @media rules", () => {
    const profile = normalize(
      "u",
      raw({
        customProps: {
          "--breakpoint-md": "48rem",
          "--screen-lg": "1024px",
          // Declared but never gated on — a framework dump entry, dropped.
          "--breakpoint-2xl": "1536px",
        },
        mediaBreakpoints: { "768": 3, "1024": 2 },
      }),
    );
    expect(profile.declared?.breakpoints).toEqual({
      "--breakpoint-md": 768,
      "--screen-lg": 1024,
    });
  });

  it("resolves rem against the 16px media basis even on a 62.5% page", () => {
    // Inside @media, rem is the INITIAL font size — html { font-size: 62.5% }
    // must not shrink 48rem to 480px.
    const profile = normalize(
      "u",
      raw({
        rootFontSizePx: 10,
        customProps: { "--breakpoint-md": "48rem" },
        mediaBreakpoints: { "768": 1 },
      }),
    );
    expect(profile.declared?.breakpoints).toEqual({ "--breakpoint-md": 768 });
  });

  it("keeps one canonical (shortest) name per boundary", () => {
    const profile = normalize(
      "u",
      raw({
        customProps: {
          "--breakpoint-medium-screens": "768px",
          "--screen-md": "768px",
        },
        mediaBreakpoints: { "768": 2 },
      }),
    );
    expect(profile.declared?.breakpoints).toEqual({ "--screen-md": 768 });
  });
});

describe("normalize – secondary button (second filled style)", () => {
  const whitePage = { "rgb(255, 255, 255)": 100000 };
  const purple = (color = "rgb(255, 255, 255)") =>
    button({ bg: "rgb(83, 58, 253)", color });
  const grey = (color = "rgb(20, 20, 20)") =>
    button({ bg: "rgb(238, 238, 238)", color });

  it("detects the most common non-primary opaque button fill", () => {
    const p = normalize(
      "u",
      raw({ bgArea: whitePage, buttons: [purple(), purple(), grey(), grey()] }),
    );
    expect(p.colors.primary).toBe("#533afd");
    expect(p.colors.secondary).toBe("#eeeeee");
    expect(p.colors.onSecondary).toBe("#141414"); // observed dark text, legible
  });

  it("needs >= 2 occurrences — a one-off non-primary button doesn't qualify", () => {
    const p = normalize(
      "u",
      raw({ bgArea: whitePage, buttons: [purple(), purple(), grey()] }),
    );
    expect(p.colors.secondary).toBeUndefined();
  });

  it("skips a button whose fill is ~the page background (ghost/transparent)", () => {
    const ghost = button({
      bg: "rgb(255, 255, 255)",
      color: "rgb(83, 58, 253)",
    });
    const p = normalize(
      "u",
      raw({ bgArea: whitePage, buttons: [purple(), purple(), ghost, ghost] }),
    );
    expect(p.colors.secondary).toBeUndefined();
  });

  it("falls back to a contrast-picked foreground when the observed text is illegible", () => {
    // White text on a light-grey fill is unreadable → onColor picks dark.
    const p = normalize(
      "u",
      raw({
        bgArea: whitePage,
        buttons: [
          purple(),
          purple(),
          grey("rgb(255, 255, 255)"),
          grey("rgb(255, 255, 255)"),
        ],
      }),
    );
    expect(p.colors.secondary).toBe("#eeeeee");
    expect(p.colors.onSecondary).toBe("#111111");
  });

  it("is absent when there is no second button style", () => {
    const p = normalize(
      "u",
      raw({ bgArea: whitePage, buttons: [purple(), purple()] }),
    );
    expect(p.colors.secondary).toBeUndefined();
  });
});
