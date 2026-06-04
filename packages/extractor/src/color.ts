// Small color utilities. Computed styles come back as rgb()/rgba() strings,
// occasionally hex. We parse what we can and skip exotic formats (oklch, etc.)
// gracefully — good enough for an MVP token pass.

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(input: string | undefined | null): RGBA | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  const rgb = s.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[,\/\s]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const r = Math.round(parseFloat(parts[0]));
    const g = Math.round(parseFloat(parts[1]));
    const b = Math.round(parseFloat(parts[2]));
    const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b, a: Number.isNaN(a) ? 1 : a };
  }

  const hex = s.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (h.length === 4) h = h.split("").map((c) => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  return null; // unsupported format
}

export function toHex({ r, g, b }: RGBA): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Relative luminance (0 = black, 1 = white). Used to tell dark text from light bg.
export function luminance({ r, g, b }: RGBA): number {
  const f = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// HSL saturation, 0..1. High saturation => likely a brand/accent color.
export function saturation({ r, g, b }: RGBA): number {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  if (max === min) return 0;
  const l = (max + min) / 2;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

export function isNeutral(c: RGBA): boolean {
  return saturation(c) < 0.12;
}
