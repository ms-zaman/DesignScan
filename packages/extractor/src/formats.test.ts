import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cssVars, w3cTokens } from "./formats.js";
import { normalize } from "./normalize.js";
import { resolveColorRoles, typographyLevels } from "./resolve.js";
import type { RawObservations } from "./types.js";

// The contract that matters for every emitter: it resolves the SAME roles,
// levels, and scales as generate.ts/preview.ts (via resolve.ts), so no output
// format can disagree with another about what the tokens are.

const fxDir = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const load = (name: string) =>
  JSON.parse(
    readFileSync(join(fxDir, `${name}.raw.json`), "utf8"),
  ) as RawObservations;
const profileFor = (name: string) =>
  normalize("https://example.com", load(name));

describe("w3cTokens – W3C Design Tokens JSON", () => {
  it("is valid JSON with $type'd groups and the resolved color roles", () => {
    const p = profileFor("stripe");
    const roles = resolveColorRoles(p);
    const doc = JSON.parse(w3cTokens(p));
    expect(doc.color.$type).toBe("color");
    expect(doc.color.primary.$value).toBe(roles.primary);
    expect(doc.color["on-primary"].$value).toBe(roles.onPrimary);
    if (roles.background)
      expect(doc.color.background.$value).toBe(roles.background);
    expect(doc.space.$type).toBe("dimension");
    expect(doc.radius.$type).toBe("dimension");
    expect(doc.space.xs.$value).toMatch(/^\d+px$/);
  });

  it("emits composite typography levels aliasing the shared font stack", () => {
    const p = profileFor("stripe");
    const levels = typographyLevels(p);
    const doc = JSON.parse(w3cTokens(p));
    expect(doc.font.sans.$value).toContain("sohne-var");
    expect(doc.typography.$type).toBe("typography");
    const display = doc.typography[levels[0].name].$value;
    expect(display.fontFamily).toBe("{font.sans}");
    expect(display.fontSize).toBe(`${levels[0].size}px`);
    expect(display.fontWeight).toBe(levels[0].weight);
  });

  it("skips roles the profile couldn't fill instead of emitting nulls", () => {
    const doc = JSON.parse(w3cTokens(profileFor("stripe")));
    for (const token of Object.values(doc.color)) {
      if (typeof token === "object" && token !== null && "$value" in token) {
        expect(token.$value).not.toBeNull();
      }
    }
  });

  it("adds a dark color group only for a genuinely distinct dark pass", () => {
    const light = profileFor("vercel-light");
    const dark = profileFor("vercel-dark");
    const withDark = JSON.parse(w3cTokens(light, dark));
    expect(withDark.dark.color.$type).toBe("color");
    expect(withDark.dark.color.background.$value).toBe(
      resolveColorRoles(dark).background,
    );
    // Same profile twice = no real dark theme -> no dark group.
    const noDark = JSON.parse(w3cTokens(light, light));
    expect(noDark.dark).toBeUndefined();
  });
});

describe("cssVars – CSS custom properties", () => {
  it("emits the resolved color roles and px scales under :root", () => {
    const p = profileFor("stripe");
    const roles = resolveColorRoles(p);
    const css = cssVars(p);
    expect(css).toContain(":root {");
    expect(css).toContain(`--color-primary: ${roles.primary};`);
    expect(css).toContain(`--color-on-primary: ${roles.onPrimary};`);
    expect(css).toMatch(/--space-xs: \d+px;/);
    expect(css).toMatch(/--radius-\w+: \d+px;/);
  });

  it("emits one font shorthand per type level, usable as font: var(...)", () => {
    const p = profileFor("stripe");
    const l = typographyLevels(p)[0];
    const css = cssVars(p);
    expect(css).toContain("--font-sans: ");
    expect(css).toContain(
      `--text-${l.name}: ${l.weight} ${l.size}px/${l.lineHeight} var(--font-sans);`,
    );
  });

  it("adds a prefers-color-scheme block only for a distinct dark pass", () => {
    const light = profileFor("vercel-light");
    const dark = profileFor("vercel-dark");
    const withDark = cssVars(light, dark);
    expect(withDark).toContain("@media (prefers-color-scheme: dark)");
    expect(withDark).toContain(resolveColorRoles(dark).background ?? "");
    const noDark = cssVars(light, light);
    expect(noDark).not.toContain("@media");
  });

  it("balances braces (parseable stylesheet)", () => {
    const light = profileFor("vercel-light");
    const css = cssVars(light, profileFor("vercel-dark"));
    const open = (css.match(/{/g) ?? []).length;
    const close = (css.match(/}/g) ?? []).length;
    expect(open).toBe(close);
  });
});
