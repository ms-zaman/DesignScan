import { describe, expect, it } from "vitest";
import { normalize } from "./normalize.js";
import type { ButtonSample, RawObservations } from "./types.js";

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
    const profile = normalize("u", raw({ colorCount: { "rgb(128,128,128)": 9 } }));
    expect(profile.colors.primary).toBeNull();
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
      raw({ fontWeights: { "700": 2, "400": 5, "bold": 1 } }),
    );
    expect(profile.typography.weights).toEqual([400, 700]);
  });
});

describe("normalize – spacing, radius, shadows", () => {
  it("requires a value to appear at least 3 times to enter the spacing scale", () => {
    const profile = normalize(
      "u",
      raw({
        spacings: {
          "8px": 5,
          "16px": 3,
          "13px": 2, // below minCount 3 -> dropped
        },
      }),
    );
    expect(profile.spacingScalePx).toEqual([8, 16]);
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

  it("snaps a noisy spacing scale into a clean ramp", () => {
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
    // 5.5 rounds to 6; 6/7 and 9 collapse against the 2px minimum gap.
    expect(profile.spacingScalePx).toEqual([2, 4, 6, 8]);
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
