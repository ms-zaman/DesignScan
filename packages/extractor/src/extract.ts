import { chromium } from "playwright";
import type { RawObservations } from "./types.js";

export interface ExtractOptions {
  headful?: boolean;
  // Hydration waits, mirroring how dembrandt handles SPAs.
  settleMs?: number;
  maxElements?: number;
  // Per-navigation timeout in ms (default 45000). Raise it for slow sites.
  timeoutMs?: number;
  // Emulates `prefers-color-scheme`. Sites that honour the media query render
  // their dark palette under "dark"; ones that gate theme on a class/localStorage
  // toggle won't switch from this alone (a known limitation).
  colorScheme?: "light" | "dark";
}

// Turn a raw Playwright/Chromium failure into a short, actionable message. Most
// failures here aren't bugs — they're sites that are down, slow, or actively
// refusing automated browsers — so we tell the user which and what to try.
export function navError(url: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND|getaddrinfo/i.test(msg))
    return `Could not resolve ${url} — check the address is correct and reachable.`;
  if (/timeout|timed out/i.test(msg))
    return `${url} took too long to load (it may be slow or blocking automated browsers). Try a higher --timeout.`;
  if (/ERR_CONNECTION|ECONNREFUSED|ERR_ABORTED|ERR_CERT|net::/i.test(msg))
    return `Could not connect to ${url} — the site may be down or refusing automated browsers.`;
  return `Failed to load ${url}: ${msg}`;
}

export async function extract(
  url: string,
  opts: ExtractOptions = {},
): Promise<RawObservations> {
  const {
    headful = false,
    settleMs = 3500,
    maxElements = 5000,
    timeoutMs = 45000,
    colorScheme = "light",
  } = opts;

  let browser: Awaited<ReturnType<typeof chromium.launch>>;
  try {
    browser = await chromium.launch({ headless: !headful });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/executable doesn'?t exist|Looks like Playwright|install/i.test(msg))
      throw new Error(
        "Chromium isn't installed. Run: npx playwright install chromium",
      );
    throw err;
  }
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

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs });
    } catch {
      // networkidle can hang on chatty sites; fall back to domcontentloaded.
      // If that also fails the site is genuinely unreachable — surface why.
      try {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs,
        });
      } catch (err) {
        throw new Error(navError(url, err));
      }
    }
    await page.waitForTimeout(settleMs); // let SPAs hydrate / fonts settle

    const raw = await page.evaluate((limit: number) => {
      const colorCount: Record<string, number> = {};
      const textColorArea: Record<string, number> = {};
      const bgArea: Record<string, number> = {};
      const fontFamilies: Record<string, number> = {};
      const fontSizes: Record<string, number> = {};
      const fontWeights: Record<string, number> = {};
      const lineHeights: Record<string, number> = {};
      const letterSpacings: Record<string, number> = {};
      const radii: Record<string, number> = {};
      const borderWidths: Record<string, number> = {};
      const borderColors: Record<string, number> = {};
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

      // True only when the element paints its own (non-whitespace) text. Counting
      // `color` on every element inflates the page default (usually black/inherited)
      // from wrappers, icons and SVG containers that render no text, which then
      // wins the "body text" vote. Gating on a direct text node fixes that.
      const paintsText = (el: Element) => {
        for (const node of el.childNodes) {
          if (node.nodeType === 3 && (node.textContent ?? "").trim())
            return true;
        }
        return false;
      };

      const all = Array.from(document.querySelectorAll("*")).slice(0, limit);
      for (const el of all) {
        const cs = getComputedStyle(el);
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const area = rect.width * rect.height;

        if (paintsText(el)) {
          bump(colorCount, cs.color);
          // Area-weighted tally: the primary text color is the one covering the
          // most painted text (headings + body), not the one on the most small
          // captions. Pure element counts favour muted secondary text.
          if (cs.color)
            textColorArea[cs.color] = (textColorArea[cs.color] || 0) + area;
        }
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

          // Size-weight the heading vote by font-size: a page often has lots of
          // ~18px text at the body weight (feature copy, nav) that would outvote
          // the few true display/H1 elements under a plain count, collapsing the
          // heading weight to 400. Weighting by px lets the largest — most
          // heading-like — text decide. Body stays a plain count (its weight is
          // already robust and size differences there are immaterial).
          const w = parseInt(cs.fontWeight, 10);
          if (!Number.isNaN(w)) bump(wTarget, String(w), isHeading ? fpx : 1);

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
        if (
          cs.borderTopWidth &&
          cs.borderTopWidth !== "0px" &&
          cs.borderTopStyle !== "none"
        ) {
          bump(borderWidths, cs.borderTopWidth);
          // The border color is the real signal for the `border` token. Skip
          // fully transparent borders (a width with no paint).
          if (cs.borderTopColor && !cs.borderTopColor.includes(", 0)"))
            bump(borderColors, cs.borderTopColor);
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
        textColorArea,
        bgArea,
        fontFamilies,
        fontSizes,
        fontWeights,
        lineHeights,
        letterSpacings,
        radii,
        borderWidths,
        borderColors,
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

    raw.colorScheme = colorScheme;
    return raw;
  } finally {
    await browser.close();
  }
}
