import { describe, expect, it } from "vitest";
import { extract } from "./extract.js";

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
    </style>
  </head>
  <body>
    <h1>Welcome to Acme</h1>
    <p>
      Body copy with enough text that the paragraph occupies real space on the
      page, giving the extractor a non-zero box to measure.
    </p>
    <button class="cta">Get started</button>
    <a class="link" href="#">A plain link</a>
  </body>
</html>`;

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

      // Transparent backgrounds are excluded from the area map.
      expect(raw.bgArea).not.toHaveProperty("rgba(0, 0, 0, 0)");
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
});
