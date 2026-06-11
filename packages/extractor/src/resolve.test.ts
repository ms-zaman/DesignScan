import { describe, expect, it } from "vitest";
import { resolveColorRoles, shadowTokens } from "./resolve.js";
import type { DesignProfile } from "./types.js";

// shadowTokens only reads profile.shadows.
const withShadows = (...shadows: string[]): DesignProfile =>
  ({ shadows }) as DesignProfile;

// resolveColorRoles only reads profile.colors, so build a minimal profile with
// just the colors block and assert on role assignment.
const withColors = (colors: Partial<DesignProfile["colors"]>): DesignProfile =>
  ({
    colors: {
      background: null,
      text: null,
      primary: null,
      palette: [],
      ...colors,
    },
  }) as DesignProfile;

const pal = (...hexes: string[]) =>
  hexes.map((hex, i) => ({ hex, count: 100 - i }));

describe("resolveColorRoles – accent contrast guard", () => {
  it("skips a link accent that's invisible against the background", () => {
    // GitHub bug: the most frequent palette color is pure black, but on a dark
    // page a black link is invisible. The guard skips it for a visible one.
    const roles = resolveColorRoles(
      withColors({
        background: "#0d1117",
        text: "#ffffff",
        primary: "#08872b",
        palette: pal("#000000", "#9198a1", "#58a6ff"),
      }),
    );
    expect(roles.accent1).not.toBe("#000000");
    expect(roles.accent1).toBe("#9198a1");
  });

  it("skips a badge accent that's indistinguishable from the surface", () => {
    // Vercel bug (caught in the HTML preview): accent-2 resolved to #ffffff, an
    // invisible white badge on a near-white page. The guard picks a visible one.
    const roles = resolveColorRoles(
      withColors({
        background: "#fafafa",
        text: "#4d4d4d",
        primary: "#171717",
        palette: pal("#666666", "#ffffff", "#8f8f8f"),
      }),
    );
    expect(roles.accent2).not.toBe("#ffffff");
    expect(roles.accent2).toBe("#8f8f8f");
  });

  it("keeps the two accents distinct (badge never reuses the link color)", () => {
    const roles = resolveColorRoles(
      withColors({
        background: "#ffffff",
        text: "#333333",
        primary: "#0066cc",
        palette: pal("#50617a", "#061b31"),
      }),
    );
    expect(roles.accent1).toBe("#50617a");
    expect(roles.accent2).toBe("#061b31");
    expect(roles.accent2).not.toBe(roles.accent1);
  });

  it("falls back to raw palette order when there's no background to test", () => {
    const roles = resolveColorRoles(
      withColors({
        background: null,
        text: "#222222",
        primary: "#0066cc",
        palette: pal("#000000", "#9198a1"),
      }),
    );
    // No contrast reference -> first two palette extras, unchanged behavior.
    expect(roles.accent1).toBe("#000000");
    expect(roles.accent2).toBe("#9198a1");
  });
});

describe("shadowTokens – cleaning, naming, ordering", () => {
  it("strips fully-transparent and zero-geometry layers (Tailwind ring resets)", () => {
    // tailwindcss.com: real inset ring buried in rgba(0,0,0,0) placeholder layers.
    const tokens = shadowTokens(
      withShadows(
        "rgba(0, 0, 0, 0) 0px 0px 0px 0px, oklab(0.129999 -0.00404751 -0.027702 / 0.1) 0px 0px 0px 1px inset, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px",
      ),
    );
    expect(tokens).toHaveLength(1);
    expect(tokens[0].value).toBe(
      "oklab(0.129999 -0.00404751 -0.027702 / 0.1) 0px 0px 0px 1px inset",
    );
    expect(tokens[0].layers).toEqual([
      {
        color: "oklab(0.129999 -0.00404751 -0.027702 / 0.1)",
        offsetX: 0,
        offsetY: 0,
        blur: 0,
        spread: 1,
        inset: true,
      },
    ]);
  });

  it("drops a shadow whose every layer is a no-op (supabase placeholder stack)", () => {
    const noop = Array(5).fill("rgba(0, 0, 0, 0) 0px 0px 0px 0px").join(", ");
    expect(shadowTokens(withShadows(noop))).toHaveLength(0);
  });

  it("drops a transparent-color shadow even with non-zero geometry (github inset)", () => {
    const tokens = shadowTokens(
      withShadows(
        "rgba(209, 217, 224, 0.25) 0px 0px 0px 1px, rgba(37, 41, 46, 0.12) 0px 6px 18px 0px",
        "rgba(255, 255, 255, 0) 0px 0px 0px 1px inset",
      ),
    );
    expect(tokens).toHaveLength(1);
    expect(tokens[0].name).toBe("sm");
  });

  it("orders by visual footprint and names sm→xl (frequency order discarded)", () => {
    // stripe-like: frequency-ranked input arrives big-first; the scale must
    // come out smallest-first regardless.
    const tokens = shadowTokens(
      withShadows(
        "rgba(50, 50, 93, 0.25) 0px 30px 60px -10px",
        "rgba(23, 23, 23, 0.06) 0px 3px 6px 0px",
        "rgba(23, 23, 23, 0.08) 0px 15px 35px 0px",
      ),
    );
    expect(tokens.map((t) => t.name)).toEqual(["sm", "md", "lg"]);
    expect(tokens[0].value).toBe("rgba(23, 23, 23, 0.06) 0px 3px 6px 0px");
    expect(tokens[2].value).toBe("rgba(50, 50, 93, 0.25) 0px 30px 60px -10px");
  });

  it("dedupes shadows that clean to the same value", () => {
    const real = "rgba(0, 0, 0, 0.12) 0px 1px 2px 0px";
    const tokens = shadowTokens(
      withShadows(real, `rgba(0, 0, 0, 0) 0px 0px 0px 0px, ${real}`),
    );
    expect(tokens).toHaveLength(1);
  });

  it("parses exotic color spaces without dropping real layers", () => {
    // netlify: color(srgb …) layers are visible shadows, not noise.
    const tokens = shadowTokens(
      withShadows(
        "color(srgb 0 0 0 / 0.07) 0px 16px 24px 0px, color(srgb 0 0 0 / 0) 0px 6px 30px 0px",
      ),
    );
    expect(tokens).toHaveLength(1);
    expect(tokens[0].layers).toHaveLength(1);
    expect(tokens[0].layers[0].blur).toBe(24);
  });

  it("returns an empty scale for a shadowless page", () => {
    expect(shadowTokens(withShadows())).toEqual([]);
  });
});
