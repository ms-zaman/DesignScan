import { describe, expect, it } from "vitest";
import { resolveColorRoles } from "./resolve.js";
import type { DesignProfile } from "./types.js";

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
