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
