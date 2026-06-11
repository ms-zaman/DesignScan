import { chromium } from "playwright";
import type { HoverSample, RawObservations } from "./types.js";

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
      const gradientImages: Record<string, number> = {};
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

      // Custom properties declared on :root/body — many sites publish their
      // design system here with semantic names (--color-primary, --radius-md),
      // and the computed value arrives with var() chains already resolved.
      // Custom properties inherit, so body's computed style sees the :root set
      // too; reading both lets a body-level override win. Caps keep a
      // palette-generator page (tailwind ships hundreds of --color-* entries)
      // from bloating the profile: skip giant values, stop at 1000 names.
      const customProps: Record<string, string> = {};
      for (const el of [document.documentElement, document.body]) {
        if (!el) continue;
        const cs = getComputedStyle(el);
        for (let i = 0; i < cs.length; i++) {
          const name = cs.item(i);
          if (!name.startsWith("--")) continue;
          if (
            Object.keys(customProps).length >= 1000 &&
            customProps[name] === undefined
          )
            break;
          const value = cs.getPropertyValue(name).trim();
          if (value && value.length <= 300) customProps[name] = value;
        }
      }

      // Depth-first walk that pierces open shadow roots: web-component sites
      // (Lit, Stencil, many design systems) paint their real UI inside shadow
      // DOM, which document.querySelectorAll("*") never reaches. Closed roots
      // stay invisible (no handle exists) — a known limitation.
      const all: Element[] = [];
      const collect = (root: ParentNode) => {
        for (const el of root.querySelectorAll("*")) {
          if (all.length >= limit) return;
          all.push(el);
          if (el.shadowRoot) collect(el.shadowRoot);
        }
      };
      collect(document);
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

        // Gradient fills (linear/radial/conic) carry brand colors that never
        // appear as a flat background-color, so capture the raw value
        // area-weighted for the primary heuristic to mine. Keep tractable: skip
        // huge declarations and cap the distinct-value count, while still
        // accumulating area onto values already seen.
        const bgImage = cs.backgroundImage;
        if (bgImage?.includes("gradient(") && bgImage.length < 1000) {
          if (gradientImages[bgImage] !== undefined)
            gradientImages[bgImage] += area;
          else if (Object.keys(gradientImages).length < 200)
            gradientImages[bgImage] = area;
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
          // Size-weight the heading line-height vote (like the weight vote
          // below): a page has far more ~18px heading-bucket text (feature copy,
          // nav) at the body leading than true display/H1 lines, so a plain
          // count makes headings inherit a loose body line-height. Weighting by
          // px lets the largest, most heading-like text set the leading. Body
          // stays a plain count.
          if (ratio !== null && ratio >= lhFloor && ratio <= 3) {
            bump(lhTarget, ratio.toFixed(2), isHeading ? fpx : 1);
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
          // Size-weight the heading letter-spacing vote for the same reason as
          // line-height: display headings often set a tight tracking the
          // abundant medium text doesn't, and a plain count would bury it.
          if (em !== null && em >= -0.2 && em <= 0.5) {
            bump(lsTarget, em.toFixed(3), isHeading ? fpx : 1);
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
        const typeAttr = el.getAttribute("type");
        const btnClass = /btn|button|cta/i.test(cls);
        const looksButton =
          tag === "button" ||
          roleAttr === "button" ||
          (tag === "input" &&
            (typeAttr === "submit" || typeAttr === "button")) ||
          (tag === "a" && btnClass) ||
          // Styled-div CTAs (common in older marketing pages and click-handler
          // frameworks). The class alone would sweep in wrappers like
          // .button-group, so require cursor:pointer — real CTAs set it,
          // layout containers don't.
          ((tag === "div" || tag === "span") &&
            btnClass &&
            cs.cursor === "pointer");

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
          // Skip links inside code samples: syntax highlighting paints tokens in
          // language colors (e.g. React-cyan #61dafb in astro's docs) that the
          // link heuristic would otherwise mistake for the brand accent.
          if (!el.closest("pre, code")) links.push({ color: cs.color });
        }
      }

      return {
        title: document.title,
        rootFontSizePx:
          parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
        colorCount,
        textColorArea,
        bgArea,
        gradientImages,
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
        customProps,
      } as RawObservations;
    }, maxElements);

    raw.colorScheme = colorScheme;
    raw.buttonHovers = await sampleHovers(page);
    return raw;
  } finally {
    await browser.close();
  }
}

// Physically hover a handful of button-like elements and record any bg/text
// color change — the only way to see :hover styles, since getComputedStyle
// can't evaluate pseudo-class states that aren't active. Runs after the main
// observation pass so side effects (menus opening, hover scrolling the
// element into view) can't pollute the frequency maps. Best-effort by design:
// any failure returns what was collected so far and never sinks the extraction.
async function sampleHovers(
  page: import("playwright").Page,
): Promise<HoverSample[]> {
  const samples: HoverSample[] = [];
  const seen = new Set<string>();
  try {
    // Freeze transitions/animations first, otherwise the post-hover read sees
    // a mid-interpolation value (e.g. a 200ms ease still in flight), not the
    // final hover color.
    await page.addStyleTag({
      content:
        "*, *::before, *::after { transition: none !important; animation: none !important; }",
    });
    // The same looksButton logic as the main pass (duplicated because
    // evaluate bodies are serialized — they can't share an outer helper), and
    // the same shadow-piercing walk, so the hover pass samples exactly the
    // buttons the profile counted. A CSS-selector approximation here missed
    // cursor-pointer div/span CTAs (PostHog's 3D button face) and every
    // shadow-DOM button.
    const arr = await page.evaluateHandle(() => {
      const out: Element[] = [];
      const collect = (root: ParentNode) => {
        for (const el of root.querySelectorAll("*")) {
          if (out.length >= 40) return;
          const tag = el.tagName.toLowerCase();
          const roleAttr = el.getAttribute("role");
          const cls = typeof el.className === "string" ? el.className : "";
          const typeAttr = el.getAttribute("type");
          const btnClass = /btn|button|cta/i.test(cls);
          const looks =
            tag === "button" ||
            roleAttr === "button" ||
            (tag === "input" &&
              (typeAttr === "submit" || typeAttr === "button")) ||
            (tag === "a" && btnClass) ||
            ((tag === "div" || tag === "span") &&
              btnClass &&
              getComputedStyle(el).cursor === "pointer");
          if (looks) out.push(el);
          if (el.shadowRoot) collect(el.shadowRoot);
        }
      };
      collect(document);
      return out;
    });
    const handles = [...(await arr.getProperties()).values()]
      .map((v) => v.asElement())
      .filter((h): h is NonNullable<typeof h> => h !== null);
    // One snapshot shape for both reads: the bg/text colors plus every other
    // mechanism a hover commonly paints through — whole-element opacity,
    // brightness() filters, shadows, transforms. Capturing the mechanism (not
    // just backgroundColor) is what lets normalize composite the *visible*
    // hover color for sites that never swap the bg at all. NB: evaluate bodies
    // are serialized into the page, so the property reads are spelled out in
    // each (a shared outer helper would be an unserializable closure).
    let tried = 0;
    for (const h of handles) {
      if (tried >= 12 || samples.length >= 8) break;
      const rest = await h.evaluate((el: Element) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          bg: cs.backgroundColor,
          color: cs.color,
          opacity: parseFloat(cs.opacity) || 1,
          shadow: cs.boxShadow,
          transform: cs.transform,
          filter: cs.filter,
          visible: r.width > 0 && r.height > 0,
        };
      });
      if (!rest.visible) continue;
      try {
        await h.hover({ timeout: 600 });
      } catch {
        continue; // covered/detached/off-screen — not worth fighting for
      }
      tried++;
      const hov = await h.evaluate((el: Element) => {
        const cs = getComputedStyle(el);
        return {
          bg: cs.backgroundColor,
          color: cs.color,
          opacity: parseFloat(cs.opacity) || 1,
          shadow: cs.boxShadow,
          transform: cs.transform,
          filter: cs.filter,
        };
      });
      const changed =
        hov.bg !== rest.bg ||
        hov.color !== rest.color ||
        Math.abs(hov.opacity - rest.opacity) > 0.001 ||
        hov.shadow !== rest.shadow ||
        hov.transform !== rest.transform ||
        hov.filter !== rest.filter;
      if (!changed) continue;
      const key = JSON.stringify([rest, hov]);
      if (seen.has(key)) continue; // same design hover-shifts identically
      seen.add(key);
      samples.push({
        restBg: rest.bg,
        restColor: rest.color,
        bg: hov.bg,
        color: hov.color,
        restOpacity: rest.opacity,
        opacity: hov.opacity,
        restShadow: rest.shadow,
        shadow: hov.shadow,
        restTransform: rest.transform,
        transform: hov.transform,
        restFilter: rest.filter,
        filter: hov.filter,
      });
    }
  } catch {
    // Hover sampling is an enrichment, never a requirement.
  }
  return samples;
}
