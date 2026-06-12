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

// --- media breakpoints -------------------------------------------------------
// The page's @media conditions reach us two ways: conditionText strings from
// the in-page CSSOM walk (readable sheets), and raw CSS text fetched from the
// Node side for sheets the browser refuses to expose (cross-origin without
// CORS headers — page.request has no such restriction). Both funnel into the
// parsers below, which therefore live OUTSIDE page.evaluate and stay
// unit-testable.

// Every @media prelude in a stylesheet's text. Only the condition matters, so
// nested blocks need no brace matching — preludes end at the first `{`.
export function mediaConditionsFromCss(css: string): string[] {
  const out: string[] = [];
  const re = /@media\s+([^{;]+)\{/g;
  let m = re.exec(css);
  while (m !== null) {
    out.push(m[1].trim());
    m = re.exec(css);
  }
  return out;
}

// Media-query lengths resolve against the *initial* font size (16px), never
// the page's root font-size — the 62.5% trick does not apply inside @media.
const MEDIA_EM_PX = 16;

// Width boundaries gated on by a set of @media conditions, as integer px ->
// number of conditions naming that boundary. Both the classic and the range
// syntax are read, and desktop-first conditions are folded onto the
// mobile-first boundary they imply: `max-width: 767px` (and Bootstrap's
// `max-width: 767.98px`) both mean "the 768 breakpoint", so integer
// max-widths get +1 and fractional ones round up. A strict `width < 768px`
// already names the boundary itself.
export function breakpointsFromConditions(
  conditions: string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  const bump = (bp: number) => {
    const r = Math.round(bp);
    if (r > 0) out[String(r)] = (out[String(r)] || 0) + 1;
  };
  const px = (v: string, unit: string) =>
    unit === "px" ? parseFloat(v) : parseFloat(v) * MEDIA_EM_PX;
  const maxBoundary = (v: number) =>
    Number.isInteger(v) ? v + 1 : Math.ceil(v);

  const classic = /\(\s*(min|max)-width\s*:\s*([\d.]+)(px|em|rem)\s*\)/gi;
  // Range syntax, both spellings: `(width >= 48em)` and `(48em <= width)`.
  const range =
    /\(\s*(?:width\s*(<=|>=|<|>)\s*([\d.]+)(px|em|rem)|([\d.]+)(px|em|rem)\s*(<=|>=|<|>)\s*width)\s*\)/gi;

  for (const cond of conditions) {
    classic.lastIndex = 0;
    range.lastIndex = 0;
    let m = classic.exec(cond);
    while (m !== null) {
      const v = px(m[2], m[3]);
      bump(m[1].toLowerCase() === "min" ? v : maxBoundary(v));
      m = classic.exec(cond);
    }
    m = range.exec(cond);
    while (m !== null) {
      // Normalize the reversed spelling (`768px >= width` means `width <= 768px`).
      const flip: Record<string, string> = {
        "<=": ">=",
        ">=": "<=",
        "<": ">",
        ">": "<",
      };
      const op = m[1] ?? flip[m[6]];
      const v = px(m[2] ?? m[4], m[3] ?? m[5]);
      if (op === ">=" || op === ">") bump(v);
      else if (op === "<")
        bump(v); // strict: the boundary itself
      else bump(maxBoundary(v)); // <=
      m = range.exec(cond);
    }
  }
  return out;
}

// CSSOM walk + cross-origin fallback. Best-effort by design: stylesheet
// access is an enrichment, never a requirement.
async function collectMediaBreakpoints(
  page: import("playwright").Page,
): Promise<Record<string, number>> {
  try {
    const { conditions, unreadable } = await page.evaluate(() => {
      const conditions: string[] = [];
      const unreadable: string[] = [];
      // Any grouping rule (@media/@supports/@layer) exposes cssRules; @media
      // and @import additionally expose a MediaList. Reading cssRules of a
      // cross-origin imported sheet throws — record its href for the Node
      // side to fetch instead.
      const walk = (rules: CSSRuleList) => {
        for (const rule of rules) {
          if (conditions.length >= 800) return;
          const mediaText = (rule as CSSMediaRule).media?.mediaText;
          if (mediaText) conditions.push(mediaText);
          try {
            const inner =
              (rule as CSSGroupingRule).cssRules ??
              (rule as CSSImportRule).styleSheet?.cssRules;
            if (inner) walk(inner);
          } catch {
            const href = (rule as CSSImportRule).href;
            if (href) unreadable.push(href);
          }
        }
      };
      for (const sheet of document.styleSheets) {
        try {
          walk(sheet.cssRules);
        } catch {
          if (sheet.href) unreadable.push(sheet.href);
        }
      }
      // Resolve relative @import hrefs against the page; dedupe; keep sane.
      const abs = unreadable
        .map((h) => {
          try {
            return new URL(h, document.baseURI).href;
          } catch {
            return null;
          }
        })
        .filter((h): h is string => h !== null);
      return { conditions, unreadable: [...new Set(abs)].slice(0, 12) };
    });
    for (const href of unreadable) {
      try {
        const resp = await page.request.get(href, { timeout: 8000 });
        if (resp.ok())
          conditions.push(...mediaConditionsFromCss(await resp.text()));
      } catch {
        // Sheet unreachable from Node too — skip it.
      }
    }
    return breakpointsFromConditions(conditions);
  } catch {
    return {};
  }
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

    // Dark captures: prefers-color-scheme emulation only works on sites that
    // honour the media query. Many gate dark mode on a class/attribute on
    // <html> instead (tailwind's `.dark`, github's data-color-mode) and stay
    // light under emulation alone. If the page still paints light, try the
    // common gates in order and KEEP the first one that visibly changes the
    // page; revert the ones that do nothing. The applied gate is recorded so
    // the emitters can tell agents which mechanism the site really uses.
    let darkMechanism: RawObservations["darkMechanism"];
    if (colorScheme === "dark") {
      darkMechanism = await page.evaluate(() => {
        // Canvas-canonicalized luminance: computed colors arrive in whatever
        // space they were authored (tailwind v4 backgrounds are oklch(), not
        // rgb()), and a regex parser would mis-read the page as unpainted.
        // Painting the color onto a 1×1 canvas lets the browser do the
        // conversion for every format it understands.
        const cv = document.createElement("canvas");
        cv.width = 1;
        cv.height = 1;
        const ctx = cv.getContext("2d", { willReadFrequently: true });
        const lum = (s: string): number | null => {
          if (!ctx || !s) return null;
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = s;
          ctx.fillRect(0, 0, 1, 1);
          const d = ctx.getImageData(0, 0, 1, 1).data;
          if (d[3] < 128) return null; // transparent — no signal
          return (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255;
        };
        // The page's painted background: body/html when they paint, else the
        // nearest painted ancestor at the viewport centre — tailwind-style
        // sites leave body transparent and theme a wrapper div instead.
        const paintedBg = (): string => {
          for (const el of [document.body, document.documentElement]) {
            const bg = getComputedStyle(el).backgroundColor;
            if (lum(bg) !== null) return bg;
          }
          let el: Element | null = document.elementFromPoint(
            window.innerWidth / 2,
            Math.min(window.innerHeight / 2, 400),
          );
          while (el) {
            const bg = getComputedStyle(el).backgroundColor;
            if (lum(bg) !== null) return bg;
            el = el.parentElement;
          }
          return "rgb(255, 255, 255)"; // nothing painted = the document base
        };
        const pageLum = () => lum(paintedBg()) ?? 1;
        if (pageLum() < 0.5) return "prefers-color-scheme";

        const html = document.documentElement;
        const snapshot = () =>
          `${paintedBg()}|${getComputedStyle(document.body).color}|${
            getComputedStyle(html).backgroundColor
          }`;
        const before = snapshot();
        const attempts: [
          "class-dark" | "data-theme-dark" | "data-color-mode-dark",
          () => void,
          () => void,
        ][] = [
          [
            "class-dark",
            () => html.classList.add("dark"),
            () => html.classList.remove("dark"),
          ],
          [
            "data-theme-dark",
            () => html.setAttribute("data-theme", "dark"),
            (
              (prev) => () =>
                prev === null
                  ? html.removeAttribute("data-theme")
                  : html.setAttribute("data-theme", prev)
            )(html.getAttribute("data-theme")),
          ],
          [
            "data-color-mode-dark",
            () => html.setAttribute("data-color-mode", "dark"),
            (
              (prev) => () =>
                prev === null
                  ? html.removeAttribute("data-color-mode")
                  : html.setAttribute("data-color-mode", prev)
            )(html.getAttribute("data-color-mode")),
          ],
        ];
        for (const [name, apply, revert] of attempts) {
          apply();
          if (snapshot() !== before) return name;
          revert();
        }
        return undefined;
      });
      // A class/attribute gate swaps CSS custom properties — give var-driven
      // repaints and lazy theme assets a beat before observing.
      if (darkMechanism && darkMechanism !== "prefers-color-scheme") {
        await page.waitForTimeout(250);
      }
    }

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
      const containerWidths: Record<string, number> = {};
      const buttons: any[] = [];
      const inputs: any[] = [];
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

        // Centered content wrappers: an authored max-width plus symmetric
        // side gutters is the page saying "this is the content column".
        // Weighted by element height so the page-long main container outvotes
        // a centered hero band; the width floor keeps centered widgets
        // (modals, toasts) out. Gaps are measured against clientWidth (the
        // area centering really happens in — innerWidth includes the
        // scrollbar and would skew the symmetry test).
        const mwRaw = cs.maxWidth;
        if (mwRaw?.endsWith("px")) {
          const mw = parseFloat(mwRaw);
          const vw = document.documentElement.clientWidth;
          const gapL = rect.left;
          const gapR = vw - rect.right;
          if (
            mw >= 600 &&
            mw <= 1920 &&
            rect.width >= 400 &&
            gapL > 8 &&
            Math.abs(gapL - gapR) <= 2
          ) {
            bump(
              containerWidths,
              String(Math.round(mw)),
              Math.max(1, Math.round(rect.height)),
            );
          }
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
            // Rendered height (rect, not cs.height — which can be "auto").
            height: `${Math.round(rect.height)}px`,
          });
        } else if (
          // Text-entry controls: their height/font-size define the `input`
          // component's real geometry. Submit/button inputs were claimed by
          // looksButton above; widget-y types have no text-box geometry.
          tag === "input" &&
          !/^(checkbox|radio|range|hidden|file|color|image|reset)$/.test(
            typeAttr ?? "",
          ) &&
          inputs.length < 20
        ) {
          inputs.push({
            height: `${Math.round(rect.height)}px`,
            fontSize: cs.fontSize,
            radius: cs.borderTopLeftRadius,
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
        containerWidths,
        buttons,
        inputs,
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
    if (darkMechanism) raw.darkMechanism = darkMechanism;
    const breakpoints = await collectMediaBreakpoints(page);
    if (Object.keys(breakpoints).length) raw.mediaBreakpoints = breakpoints;
    const fx = await sampleInteractions(page);
    raw.buttonHovers = fx.hovers;
    raw.buttonActives = fx.actives;
    return raw;
  } finally {
    await browser.close();
  }
}

// Physically hover — and then press — a handful of button-like elements and
// record any computed-style change: the only way to see :hover/:active
// styles, since getComputedStyle can't evaluate pseudo-class states that
// aren't live. Runs after the main observation pass so side effects (menus
// opening, hover scrolling the element into view) can't pollute the
// frequency maps. Best-effort by design: any failure returns what was
// collected so far and never sinks the extraction.
async function sampleInteractions(
  page: import("playwright").Page,
): Promise<{ hovers: HoverSample[]; actives: HoverSample[] }> {
  const samples: HoverSample[] = [];
  const actives: HoverSample[] = [];
  const seen = new Set<string>();
  const seenActive = new Set<string>();
  try {
    // Freeze transitions/animations first, otherwise the post-hover read sees
    // a mid-interpolation value (e.g. a 200ms ease still in flight), not the
    // final hover color.
    await page.addStyleTag({
      content:
        "*, *::before, *::after { transition: none !important; animation: none !important; }",
    });
    // The press pass releases the pointer OFF the element so no click should
    // assemble at all — this capture-phase blocker is the seatbelt in case a
    // site's own listeners fire on mousedown (nav drawers, SPA routers).
    await page.evaluate(() => {
      window.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
        },
        true,
      );
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

      // Press while still hovering: :active computed values, read with the
      // button held down. The pointer is then dragged off before release so
      // down+up never assemble into a click (navigation/SPA routing).
      let act: typeof hov | null = null;
      try {
        await page.mouse.down();
        act = await h.evaluate((el: Element) => {
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
      } catch {
        // Press read failed (element detached mid-press) — hover data stands.
      } finally {
        try {
          await page.mouse.move(2, 2);
          await page.mouse.up();
        } catch {}
      }

      const changed =
        hov.bg !== rest.bg ||
        hov.color !== rest.color ||
        Math.abs(hov.opacity - rest.opacity) > 0.001 ||
        hov.shadow !== rest.shadow ||
        hov.transform !== rest.transform ||
        hov.filter !== rest.filter;
      if (changed) {
        const key = JSON.stringify([rest, hov]);
        if (!seen.has(key)) {
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
      }

      // A press sample only counts when it adds something BEYOND hover —
      // while pressed the pointer still hovers, so most sites' computed
      // pressed state equals their hover state; recording those would just
      // duplicate the hover token under an :active name.
      const pressChanged =
        act !== null &&
        (act.bg !== hov.bg ||
          act.color !== hov.color ||
          Math.abs(act.opacity - hov.opacity) > 0.001 ||
          act.shadow !== hov.shadow ||
          act.transform !== hov.transform ||
          act.filter !== hov.filter);
      if (pressChanged && act && actives.length < 8) {
        const key = JSON.stringify([rest, act]);
        if (!seenActive.has(key)) {
          seenActive.add(key);
          actives.push({
            restBg: rest.bg,
            restColor: rest.color,
            bg: act.bg,
            color: act.color,
            restOpacity: rest.opacity,
            opacity: act.opacity,
            restShadow: rest.shadow,
            shadow: act.shadow,
            restTransform: rest.transform,
            transform: act.transform,
            restFilter: rest.filter,
            filter: act.filter,
          });
        }
      }
    }
  } catch {
    // Hover/press sampling is an enrichment, never a requirement.
  }
  return { hovers: samples, actives };
}
