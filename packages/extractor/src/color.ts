// Color utilities. Computed styles arrive as rgb()/rgba() strings, occasionally
// hex, and increasingly in modern/wide-gamut formats (oklch, oklab, lab, lch,
// hsl, hwb, color(), color-mix()). We parse all of these and convert to sRGB so
// nothing is silently dropped from a site's palette.

export interface RGBA {
  r: number; // 0..255
  g: number;
  b: number;
  a: number; // 0..1
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const to255 = (x: number) => Math.round(clamp01(x) * 255);

// sRGB transfer functions (linear <-> gamma-encoded).
const gammaEncode = (x: number) =>
  x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
const gammaDecode = (x: number) =>
  x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;

type RGB = { r: number; g: number; b: number }; // linear or 0..1 helpers
const linearToRgb = (r: number, g: number, b: number): RGB => ({
  r: to255(gammaEncode(r)),
  g: to255(gammaEncode(g)),
  b: to255(gammaEncode(b)),
});

// ---- parsing helpers -------------------------------------------------------

// Split on top-level commas only (so nested fn(a, b) stays intact).
function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === sep && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

// Pull "fn(...)" content and split off a "/ alpha" tail (modern syntax).
function fnArgs(
  s: string,
  name: string,
): { parts: string[]; alpha: number } | null {
  const m = s.match(new RegExp(`^${name}\\(([\\s\\S]*)\\)$`));
  if (!m) return null;
  const inner = m[1].trim();
  const slash = splitTopLevel(inner, "/");
  const main = slash[0].trim();
  let alpha = slash.length > 1 ? parseAlpha(slash[1].trim()) : 1;
  const commas = splitTopLevel(main, ",")
    .map((p) => p.trim())
    .filter(Boolean);
  let parts: string[];
  if (commas.length > 1) {
    // legacy comma form: "a, b, c[, alpha]" — only here can a 4th value be alpha.
    parts = commas;
    if (slash.length === 1 && parts.length === 4)
      alpha = parseAlpha(parts.pop()!);
  } else {
    parts = main.split(/\s+/).filter(Boolean);
  }
  return { parts, alpha: Number.isNaN(alpha) ? 1 : alpha };
}

const parseAlpha = (t: string): number =>
  t.endsWith("%") ? parseFloat(t) / 100 : parseFloat(t);

// number or percentage; percentages are divided by `pctScale` (default 100).
const numPct = (t: string, pctScale = 100): number =>
  t.endsWith("%") ? parseFloat(t) / pctScale : parseFloat(t);

// hue in deg/turn/rad/grad -> degrees
function parseHue(t: string): number {
  const v = parseFloat(t);
  if (t.endsWith("turn")) return v * 360;
  if (t.endsWith("rad")) return (v * 180) / Math.PI;
  if (t.endsWith("grad")) return v * 0.9;
  return v; // deg or bare
}

// ---- color-space conversions ----------------------------------------------

function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: to255(r + m), g: to255(g + m), b: to255(b + m) };
}

function hwbToRgb(h: number, w: number, bl: number): RGB {
  if (w + bl >= 1) {
    const g = to255(w / (w + bl));
    return { r: g, g, b: g };
  }
  const base = hslToRgb(h, 1, 0.5);
  const f = (v: number) => to255((v / 255) * (1 - w - bl) + w);
  return { r: f(base.r), g: f(base.g), b: f(base.b) };
}

function oklabToRgb(L: number, a: number, b: number): RGB {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3,
    m = m_ ** 3,
    s = s_ ** 3;
  return linearToRgb(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  );
}

// CIE Lab (D50) -> linear sRGB (D65, Bradford-adapted) -> sRGB.
function labToRgb(L: number, a: number, b: number): RGB {
  const fy = (L + 16) / 116,
    fx = fy + a / 500,
    fz = fy - b / 200;
  const d = 6 / 29;
  const f3 = (t: number) => (t > d ? t ** 3 : 3 * d * d * (t - 4 / 29));
  const X = 0.9642956764 * f3(fx);
  const Y = 1.0 * f3(fy);
  const Z = 0.8251046025 * f3(fz);
  return linearToRgb(
    3.1338561 * X - 1.6168667 * Y - 0.4906146 * Z,
    -0.9787684 * X + 1.9161415 * Y + 0.033454 * Z,
    0.0719453 * X - 0.2289914 * Y + 1.4052427 * Z,
  );
}

// color() function: srgb, srgb-linear, display-p3.
function colorFn(space: string, c: number[]): RGB | null {
  const [r, g, b] = c;
  if (space === "srgb") return { r: to255(r), g: to255(g), b: to255(b) };
  if (space === "srgb-linear") return linearToRgb(r, g, b);
  if (space === "display-p3") {
    const lr = gammaDecode(r),
      lg = gammaDecode(g),
      lb = gammaDecode(b);
    return linearToRgb(
      1.2249401762 * lr - 0.2249404696 * lg + 0.0 * lb,
      -0.0420569547 * lr + 1.0420571718 * lg + 0.0 * lb,
      -0.0196375546 * lr - 0.0786360454 * lg + 1.0982736 * lb,
    );
  }
  return null; // unsupported color() space
}

// ---- main parser -----------------------------------------------------------

export function parseColor(input: string | undefined | null): RGBA | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  const hex = s.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  const rgbArgs = fnArgs(s, "rgba?");
  if (rgbArgs) {
    if (rgbArgs.parts.length < 3) return null;
    const [r, g, b] = rgbArgs.parts.map((p) =>
      Math.round(p.endsWith("%") ? (parseFloat(p) / 100) * 255 : parseFloat(p)),
    );
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b, a: rgbArgs.alpha };
  }

  const hsl = fnArgs(s, "hsla?");
  if (hsl && hsl.parts.length >= 3) {
    const { r, g, b } = hslToRgb(
      parseHue(hsl.parts[0]),
      numPct(hsl.parts[1]),
      numPct(hsl.parts[2]),
    );
    return { r, g, b, a: hsl.alpha };
  }

  const hwb = fnArgs(s, "hwb");
  if (hwb && hwb.parts.length >= 3) {
    const { r, g, b } = hwbToRgb(
      parseHue(hwb.parts[0]),
      numPct(hwb.parts[1]),
      numPct(hwb.parts[2]),
    );
    return { r, g, b, a: hwb.alpha };
  }

  // oklab(L a b) — L: 0..1 (or %), a/b: number or % of 0.4
  const oklab = fnArgs(s, "oklab");
  if (oklab && oklab.parts.length >= 3) {
    const { r, g, b } = oklabToRgb(
      numPct(oklab.parts[0]),
      numPct(oklab.parts[1], 250),
      numPct(oklab.parts[2], 250),
    );
    return { r, g, b, a: oklab.alpha };
  }

  // oklch(L C H) — C: number or % of 0.4
  const oklch = fnArgs(s, "oklch");
  if (oklch && oklch.parts.length >= 3) {
    const L = numPct(oklch.parts[0]);
    const C = oklch.parts[1].endsWith("%")
      ? (parseFloat(oklch.parts[1]) / 100) * 0.4
      : parseFloat(oklch.parts[1]);
    const h = (parseHue(oklch.parts[2]) * Math.PI) / 180;
    const { r, g, b } = oklabToRgb(L, C * Math.cos(h), C * Math.sin(h));
    return { r, g, b, a: oklch.alpha };
  }

  // lab(L a b) — L: 0..100 (or %), a/b: number or % of 125
  const lab = fnArgs(s, "lab");
  if (lab && lab.parts.length >= 3) {
    const { r, g, b } = labToRgb(
      numPct(lab.parts[0], 1),
      numPct(lab.parts[1], 0.8),
      numPct(lab.parts[2], 0.8),
    );
    return { r, g, b, a: lab.alpha };
  }

  // lch(L C H) — C: number or % of 150
  const lch = fnArgs(s, "lch");
  if (lch && lch.parts.length >= 3) {
    const L = numPct(lch.parts[0], 1);
    const C = lch.parts[1].endsWith("%")
      ? (parseFloat(lch.parts[1]) / 100) * 150
      : parseFloat(lch.parts[1]);
    const h = (parseHue(lch.parts[2]) * Math.PI) / 180;
    const { r, g, b } = labToRgb(L, C * Math.cos(h), C * Math.sin(h));
    return { r, g, b, a: lch.alpha };
  }

  const color = fnArgs(s, "color");
  if (color && color.parts.length >= 4) {
    const space = color.parts[0];
    const channels = color.parts
      .slice(1)
      .map((p) => (p.endsWith("%") ? parseFloat(p) / 100 : parseFloat(p)));
    const rgb = colorFn(space, channels);
    return rgb ? { ...rgb, a: color.alpha } : null;
  }

  if (s.startsWith("color-mix(")) return parseColorMix(s);

  return null; // genuinely unsupported
}

// color-mix(in <space>, C1 [p%], C2 [p%]) — mixed in sRGB (a close approximation
// regardless of the named interpolation space; browsers usually pre-resolve this).
function parseColorMix(s: string): RGBA | null {
  const m = s.match(/^color-mix\(([\s\S]*)\)$/);
  if (!m) return null;
  const args = splitTopLevel(m[1], ",").map((p) => p.trim());
  if (args.length < 3) return null; // expect: "in <space>", c1, c2

  const read = (token: string): { color: RGBA; pct: number | null } | null => {
    const pm = token.match(/\s(\d*\.?\d+)%\s*$/);
    const pct = pm ? parseFloat(pm[1]) : null;
    const color = parseColor(pm ? token.slice(0, pm.index).trim() : token);
    return color ? { color, pct } : null;
  };
  const a = read(args[1]);
  const b = read(args[2]);
  if (!a || !b) return null;

  let pa = a.pct,
    pb = b.pct;
  if (pa == null && pb == null) {
    pa = 50;
    pb = 50;
  } else if (pa == null) pa = 100 - (pb as number);
  else if (pb == null) pb = 100 - pa;
  const sum = (pa as number) + (pb as number) || 100;
  const wa = (pa as number) / sum;
  const wb = (pb as number) / sum;
  return {
    r: Math.round(a.color.r * wa + b.color.r * wb),
    g: Math.round(a.color.g * wa + b.color.g * wb),
    b: Math.round(a.color.b * wa + b.color.b * wb),
    a: a.color.a * wa + b.color.a * wb,
  };
}

// ---- gradient stop extraction ---------------------------------------------

// The color at the start of a gradient stop chunk (the rest is position hints).
// A stop is "<color> [<pos>...]"; the leading token is either a color function
// (rgb/oklch/color-mix/…, captured to its matching paren) or a bare hex token.
// Non-color chunks (a direction like "to right", an angle "90deg", "circle at
// center") yield null. We validate with parseColor so only real colors pass.
function leadingColor(chunk: string): string | null {
  if (!chunk) return null;
  if (/^[a-z][a-z0-9-]*\(/i.test(chunk)) {
    let depth = 0;
    for (let i = 0; i < chunk.length; i++) {
      if (chunk[i] === "(") depth++;
      else if (chunk[i] === ")" && --depth === 0) {
        const cand = chunk.slice(0, i + 1);
        return parseColor(cand) ? cand : null;
      }
    }
    return null;
  }
  const tok = chunk.split(/\s+/)[0];
  return tok && parseColor(tok) ? tok : null;
}

// Pull the color stops out of any CSS gradient(s) in a background-image value.
// getComputedStyle serializes gradients with legacy rgb()/rgba() stops, but we
// stay format-agnostic (hex, oklch, color-mix, …) since parseColor handles them.
// Returns the raw color token strings in stop order; parse them with parseColor.
// Brand colors frequently live only in a hero/CTA gradient, invisible to the
// flat-computed-color heuristics, so this is how those get recovered.
export function gradientStops(image: string | undefined | null): string[] {
  if (!image || !/gradient\(/i.test(image)) return [];
  const stops: string[] = [];
  const re = /gradient\(/gi;
  let m: RegExpExecArray | null = re.exec(image);
  while (m !== null) {
    let depth = 0;
    let i = m.index + m[0].length - 1; // the opening "(" of this gradient
    const start = i + 1;
    for (; i < image.length; i++) {
      if (image[i] === "(") depth++;
      else if (image[i] === ")" && --depth === 0) break;
    }
    for (const chunk of splitTopLevel(image.slice(start, i), ",")) {
      const color = leadingColor(chunk.trim());
      if (color) stops.push(color);
    }
    re.lastIndex = i + 1; // skip past this gradient (don't re-match a nested one)
    m = re.exec(image);
  }
  return stops;
}

export function toHex({ r, g, b }: RGBA): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Relative luminance (0 = black, 1 = white). Used to tell dark text from light bg.
export function luminance({ r, g, b }: RGBA): number {
  const f = (c: number) => gammaDecode(c / 255);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// HSL saturation, 0..1. High saturation => likely a brand/accent color.
export function saturation({ r, g, b }: RGBA): number {
  const rr = r / 255,
    gg = g / 255,
    bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  if (max === min) return 0;
  const l = (max + min) / 2;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

// Raw colorfulness: the RGB spread, 0 (grey) to 1 (fully saturated primary).
// Unlike HSL saturation it doesn't blow up near white/black, so it cleanly
// separates a subtle tinted grey (e.g. #e5edf5 ~0.06) from a decorative accent
// (e.g. #2997ff ~0.84).
export function chroma(c: RGBA): number {
  return (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255;
}

// Hue angle in degrees [0,360): 0/360 red, 120 green, 240 blue. True greys
// have no hue, so they return 0 (callers gate on chroma/saturation first).
export function hue({ r, g, b }: RGBA): number {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === rr) h = ((gg - bb) / d) % 6;
  else if (max === gg) h = (bb - rr) / d + 2;
  else h = (rr - gg) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

export function isNeutral(c: RGBA): boolean {
  // HSL saturation blows up near white/black (its denominator -> 0), so an
  // almost-white cream like #faf9f5 reports a high "saturation" despite being
  // perceptually neutral. Guard with a raw chroma floor: tiny RGB spread is grey
  // regardless of what the HSL math says.
  return chroma(c) < 0.06 || saturation(c) < 0.12;
}
