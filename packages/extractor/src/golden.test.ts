import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generate } from "./generate.js";
import { normalize } from "./normalize.js";
import type { RawObservations } from "./types.js";

// Golden tests: real RawObservations captured from live sites (see
// __fixtures__/capture.ts) drive the normalize/generate heuristics, so the
// quality wins on real brands can't silently regress. No browser or network —
// the recorded fixtures are the deterministic input.
//
// If a site redesigns, re-run the capture script and update the expectations
// below to the new (reviewed) baseline.

const fxDir = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const load = (name: string) =>
  JSON.parse(
    readFileSync(join(fxDir, `${name}.raw.json`), "utf8"),
  ) as RawObservations;

const profileFor = (name: string) =>
  normalize("https://example.com", load(name));

describe("golden – normalize on real captured observations", () => {
  it("stripe.com: slate body text, brand-purple primary, clean 4px scales", () => {
    const p = profileFor("stripe");
    expect(p.colors.background).toBe("#ffffff");
    expect(p.colors.primary).toBe("#533afd"); // non-neutral CTA button
    expect(p.colors.text).toBe("#64748d"); // area-weighted slate, not #000000
    expect(p.colors.text).not.toBe("#000000");
    expect(p.spacingScalePx).toEqual([4, 8, 12, 16, 20, 24, 32, 64]);
    expect(p.radiusScalePx).toEqual([2, 4, 6, 8, 16]);
    expect(p.typography.sizeScalePx).toEqual([
      8, 10, 12, 14, 16, 22, 26, 32, 48,
    ]);
    // The declared stack is preserved paste-ready (not collapsed to "sohne-var").
    expect(p.typography.fontStack).toBe(
      'sohne-var, "SF Pro Display", sans-serif',
    );
    // Subtle near-white surfaces: a visible hairline + a subtler section fill.
    expect(p.colors.border).toBe("#e5edf5");
    expect(p.colors.mutedSurface).toBe("#f8fafd");
  });

  it("vercel.com (light): monochrome black primary via the contrast guard", () => {
    const p = profileFor("vercel-light");
    expect(p.colors.background).toBe("#fafafa");
    expect(p.colors.primary).toBe("#171717"); // neutral, but the filled CTA
    expect(p.spacingScalePx).toEqual([4, 8, 12, 16, 24, 32, 40, 48]);
    expect(p.radiusScalePx).toEqual([2, 4, 6]);
  });

  it("vercel.com (dark): an inverted, genuinely dark palette", () => {
    const p = profileFor("vercel-dark");
    expect(p.colors.background).toBe("#000000");
    expect(p.colors.primary).toBe("#ededed"); // light CTA on dark
    expect(p.colors.text).toBe("#a1a1a1");
  });

  it("every scale is denoised: integers, sorted, on-grid, no junk", () => {
    for (const name of ["stripe", "vercel-light", "vercel-dark"]) {
      const p = profileFor(name);
      const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
      // spacing snaps to a 4px grid
      expect(p.spacingScalePx.every((n) => n % 4 === 0)).toBe(true);
      // everything is whole pixels (no 13.3333 / 19.2031 noise) and ordered
      for (const scale of [
        p.spacingScalePx,
        p.radiusScalePx,
        p.typography.sizeScalePx,
      ]) {
        expect(scale.every(Number.isInteger)).toBe(true);
        expect(scale).toEqual(sorted(scale));
      }
      // radii drop sub-2px hairlines and >=64px pills
      expect(p.radiusScalePx.every((n) => n >= 2 && n < 64)).toBe(true);
    }
  });
});

describe("golden – dual merge on real captured observations", () => {
  it("merges Vercel's real light + dark into one file with -dark tokens", () => {
    const md = generate(profileFor("vercel-light"), profileFor("vercel-dark"));
    expect(md).toContain("(light + dark themes)");
    expect(md).toMatch(/^\s{2}background-dark: "#000000"$/m);
    expect(md).toMatch(/^\s{2}primary-dark: "#ededed"$/m);
    expect(md).toContain("button-primary-dark:");
    // still a single Colors section (spec forbids duplicates)
    expect(md.match(/## Colors/g)?.length).toBe(1);
  });

  it("omits the dark block when the dark pass equals light (no real dark)", () => {
    // Passing the same profile as both themes mimics a site that ignores
    // prefers-color-scheme (e.g. stripe.com).
    const light = profileFor("stripe");
    const md = generate(light, light);
    expect(md).not.toContain("-dark:");
    expect(md).toContain("No distinct dark theme");
  });
});
