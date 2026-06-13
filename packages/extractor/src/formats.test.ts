import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cssVars, w3cTokens } from "./formats.js";
import { normalize } from "./normalize.js";
import {
  resolveColorRoles,
  shadowTokens,
  typographyLevels,
} from "./resolve.js";
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
    for (const [key, token] of Object.entries(doc.space)) {
      if (key === "$type") continue;
      expect((token as { $value: string }).$value).toMatch(/^\d+(\.\d+)?px$/);
    }
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

describe("shadow tokens in both emitters", () => {
  it("w3c: emits a $type shadow group with structured, hex-colored layers", () => {
    const p = profileFor("stripe");
    const scale = shadowTokens(p);
    expect(scale.length).toBeGreaterThan(0);
    const doc = JSON.parse(w3cTokens(p));
    expect(doc.shadow.$type).toBe("shadow");
    for (const s of scale) {
      const v = doc.shadow[s.name].$value;
      const first = Array.isArray(v) ? v[0] : v;
      // DTCG layers carry px dimensions and hex colors (alpha byte appended
      // for translucent computed rgba()).
      expect(first.offsetY).toBe(`${s.layers[0].offsetY}px`);
      expect(first.blur).toBe(`${s.layers[0].blur}px`);
      expect(first.color).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
    }
  });

  it("css: emits one --shadow-* var per level with the cleaned value", () => {
    const p = profileFor("stripe");
    const css = cssVars(p);
    for (const s of shadowTokens(p)) {
      expect(css).toContain(`--shadow-${s.name}: ${s.value};`);
    }
  });

  it("both emitters skip the group entirely on a shadowless profile", () => {
    const p = { ...profileFor("stripe"), shadows: [] };
    expect(JSON.parse(w3cTokens(p)).shadow).toBeUndefined();
    expect(cssVars(p)).not.toContain("--shadow-");
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

describe("declared names (the site's own variable vocabulary) in both emitters", () => {
  // The stripe fixture predates custom-prop mining, so declare a stripe-like
  // vocabulary onto it. Its voted scales: spacing [4,8,12,16,20,24,32],
  // radius [2,4,6,8,16].
  const declaredProfile = () => ({
    ...profileFor("stripe"),
    declared: {
      spacing: {
        "--hds-space-core-50": 4,
        "--hds-space-core-100": 8,
        "--hds-space-core-150": 12,
      },
      radius: { "--hds-radius-md": 6 },
    },
  });

  it("css: reuses the site's declared custom-property names for matched steps", () => {
    const css = cssVars(declaredProfile());
    expect(css).toContain("--hds-space-core-50: 4px;");
    expect(css).toContain("--hds-space-core-100: 8px;");
    expect(css).toContain("--hds-radius-md: 6px;");
    // A value the site named never doubles under a generic alias…
    expect(css).not.toContain("--space-xs:");
    // …while unnamed steps keep their positional names.
    expect(css).toContain("--space-lg: 16px;");
    expect(css).toContain("--radius-xs: 2px;");
  });

  it("w3c: group keys are the declared names with the -- prefix stripped", () => {
    const doc = JSON.parse(w3cTokens(declaredProfile()));
    expect(doc.space["hds-space-core-100"].$value).toBe("8px");
    expect(doc.radius["hds-radius-md"].$value).toBe("6px");
    const keys = Object.keys(doc.space).filter((k) => k !== "$type");
    expect(keys.every((k) => !k.startsWith("--"))).toBe(true);
    // Unnamed steps stay generic.
    expect(doc.space.lg.$value).toBe("16px");
  });

  it("prefers the shortest declared alias when a value carries several", () => {
    const p = {
      ...profileFor("stripe"),
      declared: {
        spacing: {
          "--controlStack-large-gap-spacious": 8,
          "--control-large-gap": 8,
        },
      },
    };
    const css = cssVars(p);
    expect(css).toContain("--control-large-gap: 8px;");
    expect(css).not.toContain("--controlStack-large-gap-spacious");
  });

  it("dodges a collision when the site's name equals a generic alias for another value", () => {
    const p = profileFor("stripe");
    const [first, second] = p.spacingScalePx;
    // Site declares OUR positional name for the second step: the unnamed
    // first step must not shadow it — it gets a value-suffixed name instead.
    const collided = {
      ...p,
      declared: { spacing: { "--space-xs": second } },
    };
    const css = cssVars(collided);
    expect(css).toContain(`--space-xs: ${second}px;`);
    expect(css).toContain(`--space-${first}px: ${first}px;`);
  });

  it("uses the site's own font variable name when one matches the stack", () => {
    const p = {
      ...profileFor("stripe"),
      declared: {
        fontFamilies: {
          "--font-body":
            profileFor("stripe").typography.fontStack ?? "sohne-var",
        },
      },
    };
    const css = cssVars(p);
    expect(css).toContain("--font-body: ");
    expect(css).toContain("var(--font-body)");
    expect(css).not.toContain("--font-sans");
    const doc = JSON.parse(w3cTokens(p));
    expect(doc.font["font-body"].$value).toContain("sohne-var");
    const levelKey = Object.keys(doc.typography).find((k) => k !== "$type");
    expect(doc.typography[levelKey as string].$value.fontFamily).toBe(
      "{font.font-body}",
    );
  });
});

describe("primary-hover (observed hover shift) in both emitters", () => {
  it("emits the token when the profile carries one, in w3c and css alike", () => {
    const p = profileFor("stripe");
    p.colors.primaryHover = "#b40a28";
    const doc = JSON.parse(w3cTokens(p));
    expect(doc.color["primary-hover"].$value).toBe("#b40a28");
    expect(cssVars(p)).toContain("--color-primary-hover: #b40a28;");
  });

  it("omits the token entirely when no hover was observed", () => {
    const p = profileFor("stripe");
    expect(p.colors.primaryHover ?? null).toBeNull();
    const doc = JSON.parse(w3cTokens(p));
    expect(doc.color["primary-hover"]).toBeUndefined();
    expect(cssVars(p)).not.toContain("primary-hover");
  });

  it("emits primary-active the same way when a press shift was observed", () => {
    const p = profileFor("stripe");
    p.colors.primaryActive = "#8a0820";
    const doc = JSON.parse(w3cTokens(p));
    expect(doc.color["primary-active"].$value).toBe("#8a0820");
    expect(cssVars(p)).toContain("--color-primary-active: #8a0820;");
    // And stays absent without an observation.
    const clean = profileFor("stripe");
    expect(cssVars(clean)).not.toContain("primary-active");
  });
});

describe("layout (container + breakpoints) in both emitters", () => {
  const withLayout = () => {
    const p = profileFor("stripe");
    p.layout = { containerMaxWidthPx: 1080, breakpointsPx: [600, 900, 1200] };
    p.declared = { ...p.declared, breakpoints: { "--screen-md": 900 } };
    return p;
  };

  it("css: container var + breakpoint vars under the site's names", () => {
    const css = cssVars(withLayout());
    expect(css).toContain("--container-max-width: 1080px;");
    expect(css).toContain("--breakpoint-sm: 600px;");
    expect(css).toContain("--screen-md: 900px;"); // site's own name, verbatim
    expect(css).toContain("--breakpoint-lg: 1200px;");
    expect(css).not.toContain("--breakpoint-md:"); // replaced by the declared name
  });

  it("w3c: a breakpoint dimension group + a container max-width token", () => {
    const doc = JSON.parse(w3cTokens(withLayout()));
    expect(doc.breakpoint.$type).toBe("dimension");
    expect(doc.breakpoint.sm.$value).toBe("600px");
    expect(doc.breakpoint["screen-md"].$value).toBe("900px"); // -- stripped
    expect(doc.container.$type).toBe("dimension");
    expect(doc.container["max-width"].$value).toBe("1080px");
  });

  it("emits neither without layout observations", () => {
    const p = profileFor("stripe");
    expect(cssVars(p)).not.toContain("--breakpoint-");
    expect(cssVars(p)).not.toContain("--container-max-width");
    const doc = JSON.parse(w3cTokens(p));
    expect(doc.breakpoint).toBeUndefined();
    expect(doc.container).toBeUndefined();
  });
});

describe("status colors in both emitters", () => {
  const profile = {
    schemaVersion: "1.7",
    url: "https://example.com",
    title: "Example",
    fetchedAt: "2026-06-13T00:00:00.000Z",
    theme: "light" as const,
    colors: {
      background: "#ffffff",
      text: "#222222",
      primary: "#1a73e8",
      status: { error: "#d8351e", success: "#00b261", info: "#2563eb" },
      palette: [{ hex: "#1a73e8", count: 9 }],
    },
    typography: { families: ["Inter"], sizeScalePx: [16], weights: [400] },
    spacingScalePx: [8],
    radiusScalePx: [4],
    shadows: [],
  };

  it("css emits --color-error/-success/-info", () => {
    const css = cssVars(profile);
    expect(css).toContain("--color-error: #d8351e;");
    expect(css).toContain("--color-success: #00b261;");
    expect(css).toContain("--color-info: #2563eb;");
    expect(css).not.toContain("--color-warning"); // not declared
  });

  it("w3c puts them in the color group as resolved roles", () => {
    const doc = JSON.parse(w3cTokens(profile));
    expect(doc.color.error.$value).toBe("#d8351e");
    expect(doc.color.success.$value).toBe("#00b261");
    expect(doc.color.info.$value).toBe("#2563eb");
    expect(doc.color.warning).toBeUndefined();
  });
});
