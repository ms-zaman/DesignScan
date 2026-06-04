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

  it("returns null for unsupported formats like oklch", () => {
    expect(parseColor("oklch(0.7 0.1 200)")).toBeNull();
    expect(parseColor("hsl(200, 50%, 50%)")).toBeNull();
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
