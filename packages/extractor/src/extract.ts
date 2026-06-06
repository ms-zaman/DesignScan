import { chromium } from "playwright";
import type { RawObservations } from "./types.js";

export interface ExtractOptions {
  headful?: boolean;
  // Hydration waits, mirroring how dembrandt handles SPAs.
  settleMs?: number;
  maxElements?: number;
  // Emulates `prefers-color-scheme`. Sites that honour the media query render
  // their dark palette under "dark"; ones that gate theme on a class/localStorage
  // toggle won't switch from this alone (a known limitation).
  colorScheme?: "light" | "dark";
}

export async function extract(
  url: string,
  opts: ExtractOptions = {},
): Promise<RawObservations> {
  const {
    headful = false,
    settleMs = 3500,
    maxElements = 5000,
    colorScheme = "light",
  } = opts;

  const browser = await chromium.launch({ headless: !headful });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    });
    // tsx/esbuild compiles page.evaluate bodies with a `__name(...)` helper that
    // doesn't exist in the browser. Defining it as a no-op (via a raw string so
    // esbuild leaves it alone) keeps the serialized functions from throwing.
    await context.addInitScript(
      "globalThis.__name = globalThis.__name || ((fn) => fn);",
    );
    const page = await context.newPage();

    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(
      // networkidle can hang on chatty sites; fall back to domcontentloaded.
      () => page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }),
    );
    await page.waitForTimeout(settleMs); // let SPAs hydrate / fonts settle

    const raw = await page.evaluate((limit: number) => {
      const colorCount: Record<string, number> = {};
      const bgArea: Record<string, number> = {};
      const fontFamilies: Record<string, number> = {};
      const fontSizes: Record<string, number> = {};
      const fontWeights: Record<string, number> = {};
      const lineHeights: Record<string, number> = {};
      const letterSpacings: Record<string, number> = {};
      const radii: Record<string, number> = {};
      const borderWidths: Record<string, number> = {};
      const shadows: Record<string, number> = {};
      const spacings: Record<string, number> = {};
      const buttons: any[] = [];
      const links: { color: string }[] = [];
      const lhHeading: Record<string, number> = {};
      const lhBody: Record<string, number> = {};
      const weightHeading: Record<string, number> = {};
      const weightBody: Record<string, number> = {};
      const lsHeading: Record<string, number> = {};
      const lsBody: Record<string, number> = {};

      const bump = (o: Record<string, number>, k: string, n = 1) => {
        if (!k || k === "normal" || k === "none" || k === "auto") return;
        o[k] = (o[k] || 0) + n;
      };

      const all = Array.from(document.querySelectorAll("*")).slice(0, limit);
      for (const el of all) {
        const cs = getComputedStyle(el);
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const area = rect.width * rect.height;

        bump(colorCount, cs.color);
        const bg = cs.backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
          bump(colorCount, bg);
          bgArea[bg] = (bgArea[bg] || 0) + area;
        }

        bump(fontFamilies, cs.fontFamily);
        bump(fontSizes, cs.fontSize);
        bump(fontWeights, cs.fontWeight);
        bump(lineHeights, cs.lineHeight);
        bump(letterSpacings, cs.letterSpacing);

        // Per-role aggregates. We have size + line-height + spacing paired here
        // (the pairing is lost once flattened), so capture ratios now.
        const fpx = parseFloat(cs.fontSize) || 0;
        if (fpx > 0) {
          const isHeading = fpx >= 18;
          const lhTarget = isHeading ? lhHeading : lhBody;
          const wTarget = isHeading ? weightHeading : weightBody;
          const lsTarget = isHeading ? lsHeading : lsBody;

          const lh = cs.lineHeight;
          let ratio: number | null = null;
          if (lh && lh !== "normal") {
            ratio = lh.endsWith("px") ? parseFloat(lh) / fpx : parseFloat(lh);
          }
          // Body copy is virtually never set to a ~1.0 ratio; those are
          // single-line UI chrome (nav, buttons, labels) and would skew the
          // mode. Floor body higher so we capture real prose leading or fall
          // back cleanly. Headings legitimately run tighter.
          const lhFloor = isHeading ? 0.9 : 1.15;
          if (ratio !== null && ratio >= lhFloor && ratio <= 3) {
            bump(lhTarget, ratio.toFixed(2));
          }

          const w = parseInt(cs.fontWeight, 10);
          if (!Number.isNaN(w)) bump(wTarget, String(w));

          const ls = cs.letterSpacing;
          let em: number | null = null;
          if (ls === "normal") em = 0;
          else if (ls?.endsWith("px")) em = parseFloat(ls) / fpx;
          if (em !== null && em >= -0.2 && em <= 0.5) {
            bump(lsTarget, em.toFixed(3));
          }
        }

        if (cs.borderTopLeftRadius && cs.borderTopLeftRadius !== "0px") {
          bump(radii, cs.borderTopLeftRadius);
        }
        if (cs.borderTopWidth && cs.borderTopWidth !== "0px") {
          bump(borderWidths, cs.borderTopWidth);
        }
        if (cs.boxShadow && cs.boxShadow !== "none")
          bump(shadows, cs.boxShadow);

        for (const p of [cs.paddingTop, cs.paddingLeft, cs.marginTop, cs.gap]) {
          if (p && p !== "0px") bump(spacings, p);
        }

        const tag = el.tagName.toLowerCase();
        const roleAttr = el.getAttribute("role");
        const cls = typeof el.className === "string" ? el.className : "";
        const looksButton =
          tag === "button" ||
          roleAttr === "button" ||
          (tag === "a" && /btn|button|cta/i.test(cls));

        if (looksButton && buttons.length < 50) {
          buttons.push({
            bg,
            color: cs.color,
            radius: cs.borderTopLeftRadius,
            fontSize: cs.fontSize,
            weight: cs.fontWeight,
            padding: cs.padding,
          });
        } else if (tag === "a" && links.length < 50) {
          links.push({ color: cs.color });
        }
      }

      return {
        title: document.title,
        colorCount,
        bgArea,
        fontFamilies,
        fontSizes,
        fontWeights,
        lineHeights,
        letterSpacings,
        radii,
        borderWidths,
        shadows,
        spacings,
        buttons,
        links,
        lhHeading,
        lhBody,
        weightHeading,
        weightBody,
        lsHeading,
        lsBody,
      } as RawObservations;
    }, maxElements);

    return raw;
  } finally {
    await browser.close();
  }
}
