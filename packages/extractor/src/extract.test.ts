import { describe, expect, it } from "vitest";
import { extract, navError } from "./extract.js";

// Integration test: drives the real Playwright/Chromium path in extract()
// against a fully-known static page served as a data: URL. No network, no
// fixture file (keeps it self-contained and biome-clean). settleMs is 0 so the
// browser launch is the only meaningful cost.
//
// Requires the Chromium browser binary (`pnpm exec playwright install
// chromium`). Each case gets a generous timeout to cover the cold launch.

const TEST_TIMEOUT = 30_000;

function dataUrl(html: string): string {
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Acme Design Sample</title>
    <style>
      body {
        margin: 0;
        font-family: "Inter", Arial, sans-serif;
        color: rgb(34, 34, 34);
        background-color: rgb(255, 255, 255);
        font-size: 16px;
        line-height: 1.5;
      }
      h1 {
        font-size: 40px;
        font-weight: 700;
        line-height: 1.2;
        color: rgb(17, 17, 17);
        margin: 24px;
      }
      p {
        font-size: 16px;
        line-height: 1.5;
        margin: 16px;
        padding: 8px;
        max-width: 600px;
      }
      .cta {
        display: inline-block;
        background-color: rgb(220, 20, 60);
        color: rgb(255, 255, 255);
        border: 1px solid rgb(220, 20, 60);
        border-radius: 8px;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        width: 200px;
        height: 48px;
      }
      a.link {
        color: rgb(0, 102, 204);
      }
      .hero {
        width: 400px;
        height: 200px;
        background-image: linear-gradient(
          90deg,
          rgb(29, 185, 84) 0%,
          rgb(0, 0, 0) 100%
        );
      }
    </style>
  </head>
  <body>
    <h1>Welcome to Acme</h1>
    <p>
      Body copy with enough text that the paragraph occupies real space on the
      page, giving the extractor a non-zero box to measure.
    </p>
    <div class="hero"></div>
    <button class="cta">Get started</button>
    <a class="link" href="#">A plain link</a>
  </body>
</html>`;

describe("navError – friendly, actionable load failures", () => {
  const url = "https://example.com";
  it("explains an unresolvable host", () => {
    const m = navError(url, new Error("net::ERR_NAME_NOT_RESOLVED at ..."));
    expect(m).toContain("Could not resolve");
    expect(m).not.toMatch(/net::|at /); // no raw chromium noise
  });
  it("explains a timeout and points to --timeout", () => {
    const m = navError(url, new Error("Timeout 45000ms exceeded."));
    expect(m).toContain("--timeout");
  });
  it("explains a refused/down connection", () => {
    const m = navError(url, new Error("net::ERR_CONNECTION_REFUSED"));
    expect(m).toMatch(/down or refusing/);
  });
  it("falls back to the raw message for anything unrecognised", () => {
    const m = navError(url, new Error("something weird happened"));
    expect(m).toContain("something weird happened");
  });
});

describe("extract (integration)", () => {
  it(
    "collects design observations from a rendered page",
    async () => {
      const raw = await extract(dataUrl(PAGE), { settleMs: 0 });

      // Document metadata.
      expect(raw.title).toBe("Acme Design Sample");

      // The styled <button> is detected and its tokens captured verbatim.
      const cta = raw.buttons.find((b) => b.bg === "rgb(220, 20, 60)");
      expect(cta).toBeDefined();
      expect(cta?.radius).toBe("8px");
      expect(cta?.fontSize).toBe("14px");
      expect(cta?.weight).toBe("600");

      // The plain <a> is bucketed as a link, not a button.
      expect(raw.links.some((l) => l.color === "rgb(0, 102, 204)")).toBe(true);
      expect(raw.buttons.some((b) => b.bg === "rgb(0, 102, 204)")).toBe(false);

      // Colors: body text foreground and the page background by area.
      expect(raw.colorCount).toHaveProperty("rgb(34, 34, 34)");
      expect(raw.bgArea).toHaveProperty("rgb(255, 255, 255)");
      expect(raw.bgArea["rgb(255, 255, 255)"]).toBeGreaterThan(0);

      // Typography: family stack, sizes, and a heading weight.
      expect(
        Object.keys(raw.fontFamilies).some((f) => f.includes("Inter")),
      ).toBe(true);
      expect(raw.fontSizes).toHaveProperty("40px");
      expect(raw.fontSizes).toHaveProperty("14px");
      expect(raw.fontWeights).toHaveProperty("700");

      // Shape tokens: radius and shadow surfaced from the CTA.
      expect(raw.radii).toHaveProperty("8px");
      expect(Object.keys(raw.shadows).length).toBeGreaterThan(0);

      // The CTA's 1px border contributes its color to the border-color map.
      expect(raw.borderColors).toBeDefined();
      expect(raw.borderColors).toHaveProperty("rgb(220, 20, 60)");

      // Transparent backgrounds are excluded from the area map.
      expect(raw.bgArea).not.toHaveProperty("rgba(0, 0, 0, 0)");

      // The .hero element's gradient is captured (area-weighted) so its brand
      // stop colors are available to the primary heuristic.
      const gradients = Object.keys(raw.gradientImages ?? {});
      expect(gradients.some((g) => g.includes("gradient("))).toBe(true);
      expect(gradients.some((g) => g.includes("rgb(29, 185, 84)"))).toBe(true);
    },
    TEST_TIMEOUT,
  );

  it(
    "captures :root/body custom properties with var() chains resolved",
    async () => {
      const page = `<!doctype html><html><head><title>Vars</title><style>
        :root {
          --color-primary: #6633ee;
          --radius-md: 8px;
          --font-sans: Inter, sans-serif;
          --alias-primary: var(--color-primary);
        }
        body { --scoped-surface: rgb(245, 245, 245); }
      </style></head><body><p>hello</p></body></html>`;
      const raw = await extract(dataUrl(page), { settleMs: 0 });

      expect(raw.customProps).toBeDefined();
      const props = raw.customProps ?? {};
      expect(props["--color-primary"]).toBe("#6633ee");
      expect(props["--radius-md"]).toBe("8px");
      expect(props["--font-sans"]).toContain("Inter");
      // The browser substitutes var() chains at computed-value time, so the
      // alias arrives already resolved — free indirection-following.
      expect(props["--alias-primary"]).toBe("#6633ee");
      // body-scoped declarations are visible too (custom properties inherit,
      // and we read body's computed style on top of :root's).
      expect(props["--scoped-surface"]).toBe("rgb(245, 245, 245)");
    },
    TEST_TIMEOUT,
  );

  it(
    "honours the colorScheme option for prefers-color-scheme pages",
    async () => {
      const themed = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Themed</title>
    <style>
      body {
        margin: 0;
        min-height: 400px;
        background-color: rgb(255, 255, 255);
        color: rgb(17, 17, 17);
      }
      @media (prefers-color-scheme: dark) {
        body {
          background-color: rgb(18, 18, 18);
          color: rgb(240, 240, 240);
        }
      }
    </style>
  </head>
  <body>
    <p>Theme-aware page.</p>
  </body>
</html>`;

      const light = await extract(dataUrl(themed), {
        settleMs: 0,
        colorScheme: "light",
      });
      const dark = await extract(dataUrl(themed), {
        settleMs: 0,
        colorScheme: "dark",
      });

      expect(light.bgArea).toHaveProperty("rgb(255, 255, 255)");
      expect(light.bgArea).not.toHaveProperty("rgb(18, 18, 18)");

      expect(dark.bgArea).toHaveProperty("rgb(18, 18, 18)");
      expect(dark.bgArea).not.toHaveProperty("rgb(255, 255, 255)");
    },
    TEST_TIMEOUT,
  );

  it(
    "counts text colors only on text-painting elements, weighted by area",
    async () => {
      // A wrapper div carries a color but paints no text; a large heading and a
      // tiny caption each paint text in their own colors.
      const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Text gating</title></head>
  <body style="margin: 0">
    <div style="color: rgb(9, 9, 9)">
      <h1 style="color: rgb(20, 20, 20); font-size: 48px; width: 900px; height: 300px; margin: 0">
        Big heading covering lots of area
      </h1>
      <span style="color: rgb(120, 120, 120); font-size: 10px">x</span>
    </div>
  </body>
</html>`;
      const raw = await extract(dataUrl(page), { settleMs: 0 });

      // The wrapper paints no direct text -> its color is never counted.
      expect(raw.colorCount).not.toHaveProperty("rgb(9, 9, 9)");
      // Both text-painting elements are counted.
      expect(raw.colorCount).toHaveProperty("rgb(20, 20, 20)");
      expect(raw.colorCount).toHaveProperty("rgb(120, 120, 120)");

      // Area-weighting: the big heading outweighs the tiny caption, even though
      // each is a single element (raw counts would tie at 1).
      expect(raw.textColorArea?.["rgb(20, 20, 20)"]).toBeGreaterThan(
        raw.textColorArea?.["rgb(120, 120, 120)"] ?? 0,
      );
      expect(raw.textColorArea).not.toHaveProperty("rgb(9, 9, 9)");
    },
    TEST_TIMEOUT,
  );

  it(
    "ignores links inside code samples (syntax colors aren't the brand)",
    async () => {
      // A real brand link plus a syntax-highlighted <a> inside <pre><code>. Only
      // the brand link should be bucketed; the code-block token must be skipped.
      const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Code links</title></head>
  <body style="margin: 0">
    <a href="#" style="color: rgb(255, 56, 92)">Brand link</a>
    <pre><code><a href="#" style="color: rgb(97, 218, 251)">React</a></code></pre>
  </body>
</html>`;
      const raw = await extract(dataUrl(page), { settleMs: 0 });

      expect(raw.links.some((l) => l.color === "rgb(255, 56, 92)")).toBe(true);
      // The #61dafb React-cyan link lives inside <pre><code> -> not collected.
      expect(raw.links.some((l) => l.color === "rgb(97, 218, 251)")).toBe(
        false,
      );
    },
    TEST_TIMEOUT,
  );

  it(
    "size-weights the heading line-height so the display value wins over abundant medium text",
    async () => {
      // One large display heading at a tight 1.1 line-height (1x) vs two smaller
      // heading-bucket lines at a loose 1.5 (2x). A plain count would pick 1.50;
      // size-weighting by px lets the 60px display set the heading leading.
      const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Heading lh</title></head>
  <body style="margin: 0">
    <h1 style="font-size: 60px; line-height: 1.1; margin: 0; width: 900px; height: 120px">Big display heading</h1>
    <h2 style="font-size: 20px; line-height: 1.5; margin: 0">Looser subheading one</h2>
    <h2 style="font-size: 20px; line-height: 1.5; margin: 0">Looser subheading two</h2>
  </body>
</html>`;
      const raw = await extract(dataUrl(page), { settleMs: 0 });

      // 1.10 carries 60 (one 60px line); 1.50 carries 2x20=40 -> 1.10 wins.
      const lh110 = raw.lhHeading?.["1.10"] ?? 0;
      const lh150 = raw.lhHeading?.["1.50"] ?? 0;
      expect(lh110).toBeGreaterThan(lh150);
    },
    TEST_TIMEOUT,
  );

  it(
    "detects submit inputs and cursor-pointer div CTAs as buttons, but not wrapper divs",
    async () => {
      const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Button shapes</title></head>
  <body style="margin: 0">
    <form>
      <input type="text" style="background: rgb(250, 250, 250)" />
      <input type="submit" value="Subscribe"
        style="background: rgb(10, 120, 60); color: rgb(255, 255, 255); border-radius: 6px; font-size: 15px; font-weight: 600; width: 140px; height: 44px" />
    </form>
    <div class="button-group" style="background: rgb(99, 99, 99); width: 600px; height: 80px">
      <div class="btn" style="cursor: pointer; background: rgb(200, 30, 120); color: rgb(255, 255, 255); border-radius: 4px; width: 120px; height: 40px">Click me</div>
    </div>
  </body>
</html>`;
      const raw = await extract(dataUrl(page), { settleMs: 0 });

      // input[type=submit] is a button; input[type=text] is not.
      expect(raw.buttons.some((b) => b.bg === "rgb(10, 120, 60)")).toBe(true);
      expect(raw.buttons.some((b) => b.bg === "rgb(250, 250, 250)")).toBe(
        false,
      );

      // The cursor:pointer .btn div is a button; the .button-group wrapper
      // (no cursor) is not, despite its matching class substring.
      expect(raw.buttons.some((b) => b.bg === "rgb(200, 30, 120)")).toBe(true);
      expect(raw.buttons.some((b) => b.bg === "rgb(99, 99, 99)")).toBe(false);
    },
    TEST_TIMEOUT,
  );

  it(
    "captures a button's :active shift by really pressing it (no click fires)",
    async () => {
      // The press lives on :active only — hover changes nothing — and the
      // button is a link that would navigate on click: the press pass must
      // read the pressed style without ever assembling a click.
      const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Press</title>
  <style>
    .btn { display: inline-block; background: rgb(10, 120, 60); color: rgb(255, 255, 255);
           padding: 10px 20px; box-shadow: rgba(0, 0, 0, 0.4) 0px 4px 0px 0px; }
    .btn:active { background: rgb(7, 90, 45); transform: translateY(4px); box-shadow: none; }
  </style></head>
  <body style="margin: 0">
    <a class="btn" href="https://example.com/never-go-here">Press me</a>
    <h1 style="font-size: 40px">Still here</h1>
  </body>
</html>`;
      const raw = await extract(dataUrl(page), { settleMs: 0 });

      expect(raw.buttonActives).toHaveLength(1);
      const s = raw.buttonActives?.[0];
      expect(s?.restBg).toBe("rgb(10, 120, 60)");
      expect(s?.bg).toBe("rgb(7, 90, 45)");
      expect(s?.transform).toBe("matrix(1, 0, 0, 1, 0, 4)");
      expect(s?.shadow).toBe("none");
      // No hover sample — nothing changes on hover alone.
      expect(raw.buttonHovers).toHaveLength(0);
      // And the page never navigated away: the main-pass title stands.
      expect(raw.title).toBe("Press");
    },
    TEST_TIMEOUT,
  );

  it(
    "unlocks class-gated dark mode when the media query alone leaves the page light",
    async () => {
      const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Gated dark</title>
  <style>
    body { background: rgb(255, 255, 255); color: rgb(17, 17, 17); }
    html.dark body { background: rgb(13, 17, 23); color: rgb(230, 237, 243); }
  </style></head>
  <body><p style="padding: 20px">Hello</p></body>
</html>`;
      const raw = await extract(dataUrl(page), {
        settleMs: 0,
        colorScheme: "dark",
      });
      expect(raw.darkMechanism).toBe("class-dark");
      // The walk observed the dark palette, not the light one.
      expect(Object.keys(raw.bgArea)).toContain("rgb(13, 17, 23)");
    },
    TEST_TIMEOUT,
  );

  it(
    "records prefers-color-scheme as the mechanism when the media query works",
    async () => {
      const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Media dark</title>
  <style>
    body { background: rgb(255, 255, 255); }
    @media (prefers-color-scheme: dark) { body { background: rgb(10, 10, 12); } }
  </style></head>
  <body><p style="padding: 20px">Hello</p></body>
</html>`;
      const raw = await extract(dataUrl(page), {
        settleMs: 0,
        colorScheme: "dark",
      });
      expect(raw.darkMechanism).toBe("prefers-color-scheme");
    },
    TEST_TIMEOUT,
  );

  it(
    "measures button heights and samples text inputs (control geometry)",
    async () => {
      const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Controls</title></head>
  <body style="margin: 0">
    <button style="background: rgb(10, 120, 60); color: rgb(255, 255, 255); font-size: 14px; height: 40px; border: 0">Buy</button>
    <form>
      <input type="email" placeholder="you@example.com"
        style="height: 36px; font-size: 14px; border-radius: 6px; box-sizing: border-box" />
      <input type="checkbox" />
      <input type="hidden" value="x" />
    </form>
  </body>
</html>`;
      const raw = await extract(dataUrl(page), { settleMs: 0 });

      // The button records its rendered height.
      const btn = raw.buttons.find((b) => b.bg === "rgb(10, 120, 60)");
      expect(btn?.height).toBe("40px");

      // The email input is sampled with its geometry; checkbox/hidden are
      // widget-y or unrendered and never qualify.
      expect(raw.inputs).toHaveLength(1);
      expect(raw.inputs?.[0]).toMatchObject({
        height: "36px",
        fontSize: "14px",
        radius: "6px",
      });
    },
    TEST_TIMEOUT,
  );

  it(
    "pierces open shadow roots to observe web-component UI",
    async () => {
      // The brand button and its colors live entirely inside an open shadow
      // root — invisible to document.querySelectorAll, reachable only via the
      // shadow-piercing walk.
      const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Shadow</title></head>
  <body style="margin: 0">
    <p>Light DOM text</p>
    <x-card></x-card>
    <script>
      const host = document.querySelector("x-card");
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML =
        '<button style="background: rgb(80, 40, 200); color: rgb(255, 255, 255);' +
        ' border-radius: 10px; font-size: 14px; font-weight: 700; width: 160px; height: 48px">' +
        "Shadow CTA</button>" +
        '<p style="color: rgb(60, 60, 60); font-size: 17px">Shadow body copy</p>';
    </script>
  </body>
</html>`;
      const raw = await extract(dataUrl(page), { settleMs: 0 });

      const shadowBtn = raw.buttons.find((b) => b.bg === "rgb(80, 40, 200)");
      expect(shadowBtn).toBeDefined();
      expect(shadowBtn?.radius).toBe("10px");
      expect(raw.colorCount).toHaveProperty("rgb(60, 60, 60)");
      expect(raw.fontSizes).toHaveProperty("17px");
    },
    TEST_TIMEOUT,
  );

  it(
    "captures a button's :hover shift by really hovering it (transitions frozen)",
    async () => {
      // The 10s transition is the trap: reading mid-animation would observe an
      // interpolated color, not rgb(20, 90, 200). The transition-killing style
      // injected before the hover pass is what makes this deterministic.
      const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Hover</title><style>
    .cta {
      background: rgb(30, 120, 255);
      color: rgb(255, 255, 255);
      border: 0;
      width: 160px;
      height: 48px;
      transition: background 10s linear;
    }
    .cta:hover { background: rgb(20, 90, 200); }
    .static { background: rgb(200, 200, 200); border: 0; width: 120px; height: 40px; }
  </style></head>
  <body style="margin: 0">
    <button class="cta">Hover me</button>
    <button class="static">No hover style</button>
  </body>
</html>`;
      const raw = await extract(dataUrl(page), { settleMs: 0 });

      expect(raw.buttonHovers).toBeDefined();
      const shift = raw.buttonHovers?.find(
        (s) => s.restBg === "rgb(30, 120, 255)",
      );
      expect(shift).toBeDefined();
      expect(shift?.bg).toBe("rgb(20, 90, 200)");
      // The unchanged button produces no sample — only deltas are recorded.
      expect(
        raw.buttonHovers?.some((s) => s.restBg === "rgb(200, 200, 200)"),
      ).toBe(false);
    },
    TEST_TIMEOUT,
  );

  it(
    "hovers cursor-pointer div CTAs too (the hover pass mirrors looksButton)",
    async () => {
      // PostHog-style: the CTA is a styled div, not a <button>/<a>. The hover
      // pass must sample it, or sites built this way never get hover tokens.
      const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Div hover</title><style>
    .btn { cursor: pointer; background: rgb(235, 157, 42); width: 150px; height: 44px; }
    .btn:hover { background: rgb(205, 132, 7); }
  </style></head>
  <body style="margin: 0"><div class="btn">Get started</div></body>
</html>`;
      const raw = await extract(dataUrl(page), { settleMs: 0 });
      const s = raw.buttonHovers?.find((x) => x.restBg === "rgb(235, 157, 42)");
      expect(s).toBeDefined();
      expect(s?.bg).toBe("rgb(205, 132, 7)");
    },
    TEST_TIMEOUT,
  );

  it(
    "captures opacity / shadow / transform hover mechanisms, not just bg swaps",
    async () => {
      const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Hover fx</title><style>
    .fade {
      background: rgb(30, 120, 255); color: rgb(255, 255, 255); border: 0;
      width: 160px; height: 48px; transition: all 8s linear;
    }
    .fade:hover { opacity: 0.8; box-shadow: rgba(0, 0, 0, 0.25) 0px 6px 16px 0px; transform: translateY(-2px); }
  </style></head>
  <body style="margin: 0">
    <button class="fade">Fade on hover</button>
  </body>
</html>`;
      const raw = await extract(dataUrl(page), { settleMs: 0 });

      const s = raw.buttonHovers?.find((x) => x.restBg === "rgb(30, 120, 255)");
      expect(s).toBeDefined();
      expect(s?.bg).toBe(s?.restBg); // the bg itself never swaps
      expect(s?.restOpacity).toBe(1);
      expect(s?.opacity).toBeCloseTo(0.8, 5);
      expect(s?.shadow).toContain("rgba(0, 0, 0, 0.25)");
      expect(s?.transform).toBe("matrix(1, 0, 0, 1, 0, -2)");
    },
    TEST_TIMEOUT,
  );

  it(
    "size-weights the heading weight so the largest text wins over abundant medium text",
    async () => {
      // One large bold display (1x) vs two smaller heading-bucket elements at the
      // body weight (2x). A plain count would pick 400 (the mode); size-weighting
      // by px lets the 60px/800 display win — the real heading-weight intent.
      const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Heading weight</title></head>
  <body style="margin: 0">
    <h1 style="font-size: 60px; font-weight: 800; margin: 0; width: 900px; height: 120px">Big bold display</h1>
    <h2 style="font-size: 20px; font-weight: 400; margin: 0">Lighter subheading one</h2>
    <h2 style="font-size: 20px; font-weight: 400; margin: 0">Lighter subheading two</h2>
  </body>
</html>`;
      const raw = await extract(dataUrl(page), { settleMs: 0 });

      // Plain element counts: 400 appears twice, 800 once -> 400 would be the
      // mode. Size-weighting flips it: 800 carries 60, 400 carries 2x20=40.
      const w800 = raw.weightHeading?.["800"] ?? 0;
      const w400 = raw.weightHeading?.["400"] ?? 0;
      expect(w800).toBeGreaterThan(w400);
    },
    TEST_TIMEOUT,
  );
});
