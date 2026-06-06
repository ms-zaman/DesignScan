import { describe, expect, it } from "vitest";
import {
  isNeutral,
  luminance,
  parseColor,
  saturation,
  toHex,
  type RGBA,
} from "./color.js";

describe("parseColor", () => {
  it("returns null for empty / nullish input", () => {
    expect(parseColor(undefined)).toBeNull();
    expect(parseColor(null)).toBeNull();
    expect(parseColor("")).toBeNull();
  });

  it("treats the keyword transparent as fully transparent black", () => {
    expect(parseColor("transparent")).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("parses rgb() with an implicit alpha of 1", () => {
    expect(parseColor("rgb(255, 128, 0)")).toEqual({ r: 255, g: 128, b: 0, a: 1 });
  });

  it("parses rgba() with an explicit alpha", () => {
    expect(parseColor("rgba(10, 20, 30, 0.5)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
  });

  it("parses the modern space/slash rgb() syntax", () => {
    expect(parseColor("rgb(10 20 30 / 0.4)")).toEqual({ r: 10, g: 20, b: 30, a: 0.4 });
  });

  it("rounds fractional channel values", () => {
    expect(parseColor("rgb(0.6, 1.4, 2.5)")).toEqual({ r: 1, g: 1, b: 3, a: 1 });
  });

  it("is case-insensitive and trims surrounding whitespace", () => {
    expect(parseColor("  RGB(1,2,3)  ")).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  });

  it("returns null when fewer than three channels are given", () => {
    expect(parseColor("rgb(1, 2)")).toBeNull();
  });

  it("returns null when a channel is not a number", () => {
    expect(parseColor("rgb(red, 2, 3)")).toBeNull();
  });

  it("falls back to alpha 1 when alpha is unparseable", () => {
    expect(parseColor("rgba(1, 2, 3, abc)")).toEqual({ r: 1, g: 2, b: 3, a: 1 });
  });

  it("expands a 3-digit hex", () => {
    expect(parseColor("#abc")).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc, a: 1 });
  });

  it("expands a 4-digit hex including alpha", () => {
    expect(parseColor("#abcf")).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc, a: 1 });
  });

  it("parses a 6-digit hex", () => {
    expect(parseColor("#ff8800")).toEqual({ r: 255, g: 136, b: 0, a: 1 });
  });

  it("parses an 8-digit hex with alpha", () => {
    const c = parseColor("#ff880080")!;
    expect(c.r).toBe(255);
    expect(c.g).toBe(136);
    expect(c.b).toBe(0);
    expect(c.a).toBeCloseTo(128 / 255, 5);
  });

  it("returns null only for genuinely unparseable input", () => {
    expect(parseColor("not-a-color")).toBeNull();
    expect(parseColor("rebeccapurple")).toBeNull(); // named colors (besides transparent) unsupported
    expect(parseColor("color(rec2020 0.5 0.5 0.5)")).toBeNull(); // unknown color() space
  });
});

describe("parseColor – modern formats", () => {
  const near = (got: RGBA | null, r: number, g: number, b: number, tol = 3) => {
    expect(got).not.toBeNull();
    expect(Math.abs(got!.r - r)).toBeLessThanOrEqual(tol);
    expect(Math.abs(got!.g - g)).toBeLessThanOrEqual(tol);
    expect(Math.abs(got!.b - b)).toBeLessThanOrEqual(tol);
  };

  it("parses hsl() (comma and modern syntax) and hsla alpha", () => {
    near(parseColor("hsl(0, 100%, 50%)"), 255, 0, 0);
    near(parseColor("hsl(120 100% 50%)"), 0, 255, 0);
    expect(parseColor("hsla(0, 100%, 50%, 0.4)")!.a).toBeCloseTo(0.4, 5);
  });

  it("parses hwb()", () => {
    near(parseColor("hwb(0 0% 0%)"), 255, 0, 0);
    near(parseColor("hwb(0 100% 0%)"), 255, 255, 255);
  });

  it("parses oklch() — white, black, and a vivid hue", () => {
    near(parseColor("oklch(1 0 0)"), 255, 255, 255);
    near(parseColor("oklch(0 0 0)"), 0, 0, 0);
    // oklch(0.628 0.2577 29.23) ~= sRGB red
    near(parseColor("oklch(0.628 0.2577 29.23)"), 255, 0, 0, 6);
  });

  it("parses oklab() and a percentage lightness", () => {
    near(parseColor("oklab(1 0 0)"), 255, 255, 255);
    near(parseColor("oklab(100% 0 0)"), 255, 255, 255);
  });

  it("parses lab() and lch() neutrals", () => {
    near(parseColor("lab(100% 0 0)"), 255, 255, 255);
    near(parseColor("lab(0% 0 0)"), 0, 0, 0);
    near(parseColor("lch(100% 0 0)"), 255, 255, 255);
  });

  it("parses color(srgb ...) and color(display-p3 ...)", () => {
    near(parseColor("color(srgb 1 0 0)"), 255, 0, 0);
    near(parseColor("color(srgb 0 0 0 / 0.5)"), 0, 0, 0);
    expect(parseColor("color(srgb 0 0 0 / 0.5)")!.a).toBeCloseTo(0.5, 5);
    // p3 pure green maps to roughly sRGB green (clamped)
    near(parseColor("color(display-p3 0 1 0)"), 0, 255, 0, 12);
  });

  it("parses color-mix(in srgb, ...) at the default 50/50 and weighted", () => {
    near(parseColor("color-mix(in srgb, #ffffff, #000000)"), 128, 128, 128, 2);
    near(
      parseColor("color-mix(in srgb, rgb(255, 0, 0) 75%, rgb(0, 0, 255) 25%)"),
      191, 0, 64, 4,
    );
  });
});

describe("toHex", () => {
  it("formats channels as a 6-digit lowercase hex and ignores alpha", () => {
    expect(toHex({ r: 255, g: 136, b: 0, a: 0.3 })).toBe("#ff8800");
  });

  it("zero-pads single-digit channels", () => {
    expect(toHex({ r: 1, g: 2, b: 3, a: 1 })).toBe("#010203");
  });

  it("round-trips with parseColor", () => {
    const c = parseColor("rgb(18, 52, 86)")!;
    expect(toHex(c)).toBe("#123456");
  });
});

describe("luminance", () => {
  const black: RGBA = { r: 0, g: 0, b: 0, a: 1 };
  const white: RGBA = { r: 255, g: 255, b: 255, a: 1 };

  it("is 0 for black and 1 for white", () => {
    expect(luminance(black)).toBeCloseTo(0, 5);
    expect(luminance(white)).toBeCloseTo(1, 5);
  });

  it("ranks a darker color below a lighter one", () => {
    const dark = luminance({ r: 30, g: 30, b: 30, a: 1 });
    const light = luminance({ r: 200, g: 200, b: 200, a: 1 });
    expect(dark).toBeLessThan(light);
  });

  it("weights green more heavily than blue", () => {
    const green = luminance({ r: 0, g: 255, b: 0, a: 1 });
    const blue = luminance({ r: 0, g: 0, b: 255, a: 1 });
    expect(green).toBeGreaterThan(blue);
  });
});

describe("saturation", () => {
  it("is 0 for any gray (max === min)", () => {
    expect(saturation({ r: 128, g: 128, b: 128, a: 1 })).toBe(0);
    expect(saturation({ r: 0, g: 0, b: 0, a: 1 })).toBe(0);
  });

  it("is 1 for a fully saturated primary", () => {
    expect(saturation({ r: 255, g: 0, b: 0, a: 1 })).toBeCloseTo(1, 5);
  });

  it("returns a mid value for a muted color", () => {
    const s = saturation({ r: 150, g: 100, b: 100, a: 1 });
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
});

describe("isNeutral", () => {
  it("treats grays as neutral", () => {
    expect(isNeutral({ r: 120, g: 122, b: 121, a: 1 })).toBe(true);
  });

  it("treats a vivid brand color as non-neutral", () => {
    expect(isNeutral({ r: 230, g: 20, b: 20, a: 1 })).toBe(false);
  });

  it("uses 0.12 saturation as the boundary", () => {
    // Just under the threshold counts as neutral...
    expect(isNeutral({ r: 110, g: 100, b: 100, a: 1 })).toBe(true);
    // ...and a clearly saturated color does not.
    expect(isNeutral({ r: 200, g: 100, b: 100, a: 1 })).toBe(false);
  });
});
