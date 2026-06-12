import { describe, expect, it } from "vitest";
import { agentNotes } from "./agentNotes.js";
import { typographyLevels } from "./resolve.js";
import type { DesignProfile } from "./types.js";

function profile(overrides: Partial<DesignProfile> = {}): DesignProfile {
  return {
    schemaVersion: "1.3",
    url: "https://example.com",
    title: "Example",
    fetchedAt: "2026-06-04T12:00:00.000Z",
    theme: "light",
    colors: {
      background: "#ffffff",
      text: "#222222",
      primary: "#1a73e8",
      palette: [
        { hex: "#1a73e8", count: 9 },
        { hex: "#ff5722", count: 4 },
      ],
    },
    typography: {
      families: ["Inter", "Georgia"],
      fontStack: 'Inter, "Helvetica Neue", sans-serif',
      sizeScalePx: [12, 14, 16, 24, 40],
      weights: [400, 600, 700],
    },
    spacingScalePx: [4, 8, 16, 32],
    radiusScalePx: [4, 8],
    shadows: ["0 1px 2px rgba(0,0,0,0.1)"],
    ...overrides,
  };
}

const notesFor = (p: DesignProfile) => agentNotes(p, typographyLevels(p));
const find = (lines: string[], label: string) =>
  lines.find((l) => l.startsWith(`- **${label}`));

describe("agentNotes", () => {
  it("promotes a darker color for headings when text reads muted at large sizes", () => {
    // A muted grey body text + a near-black accent that's much stronger.
    const p = profile({
      colors: {
        background: "#ffffff",
        text: "#707070", // ~4.x:1 — fine for body, weak for display
        primary: "#1a73e8",
        palette: [
          { hex: "#1a73e8", count: 9 },
          { hex: "#888888", count: 7 }, // accent-1 (links)
          { hex: "#000000", count: 6 }, // accent-2 (near-black) — heading pick
        ],
      },
    });
    const heading = find(notesFor(p), "Headings");
    expect(heading).toBeTruthy();
    expect(heading).toContain("#707070");
    expect(heading).toContain("accent-2");
    // cites a concrete, stronger contrast ratio for the recommended color
    expect(heading).toMatch(/#000000, \d+\.\d+:1/);
  });

  it("does not promote a heading color when body text is already strong", () => {
    // #222 on #fff is ~16:1 — no darker color buys meaningful hierarchy.
    expect(find(notesFor(profile()), "Headings")).toBeUndefined();
  });

  it("never recommends a darker heading color on a dark theme", () => {
    // On a dark surface you'd want a *lighter* heading; a dark accent is wrong,
    // so the rule must stay silent rather than emit bad advice.
    const dark = profile({
      theme: "dark",
      colors: {
        background: "#0a0a0a",
        text: "#a0a0a0",
        primary: "#3b82f6",
        palette: [
          { hex: "#3b82f6", count: 9 },
          { hex: "#111111", count: 5 },
        ],
      },
    });
    expect(find(notesFor(dark), "Headings")).toBeUndefined();
  });

  it("flags body text below WCAG AA and cites the computed ratio", () => {
    const p = profile({
      colors: {
        background: "#ffffff",
        text: "#9aa0a6", // ~2.6:1 — below AA
        primary: "#1a73e8",
        palette: [{ hex: "#1a73e8", count: 9 }],
      },
    });
    const body = find(notesFor(p), "Body contrast");
    expect(body).toBeTruthy();
    expect(body).toContain("4.5:1");
  });

  it("stays silent on body contrast when text passes AA", () => {
    expect(find(notesFor(profile()), "Body contrast")).toBeUndefined();
  });

  it("names the brand font and its fallback generic", () => {
    const fonts = find(notesFor(profile()), "Fonts");
    expect(fonts).toContain("Inter");
    expect(fonts).toContain('Inter, "Helvetica Neue", sans-serif');
    expect(fonts).toContain("`sans-serif`");
  });

  it("confirms the primary/on-primary contract with a computed ratio", () => {
    const primary = find(notesFor(profile()), "Primary actions");
    expect(primary).toMatch(/\d+\.\d+:1/);
    expect(primary).toContain("passes AA");
  });

  it("emits shape and spacing rhythm guidance from the scales", () => {
    const lines = notesFor(profile());
    expect(find(lines, "Shape")).toBeTruthy();
    expect(find(lines, "Spacing")).toContain("4px-based");
  });

  it("falls back to just the primary-action note when the profile is sparse", () => {
    // primary always resolves (the spec requires it), so that one note is the
    // floor; everything else (headings, body, fonts, shape, spacing) stays
    // silent without the data to back it.
    const bare = profile({
      colors: { background: null, text: null, primary: "#1a73e8", palette: [] },
      typography: { families: [], sizeScalePx: [], weights: [] },
      spacingScalePx: [],
      radiusScalePx: [],
    });
    const lines = notesFor(bare);
    expect(lines).toHaveLength(1);
    expect(find(lines, "Primary actions")).toBeTruthy();
  });
});

describe("agentNotes – declared-token provenance", () => {
  it("tells the agent the scale is the site's own declared system", () => {
    const p = profile({
      declared: {
        radius: { "--radius-sm": 4, "--radius-md": 8 },
        spacing: { "--space-4": 16 },
        fontFamilies: { "--font-sans": "Inter, sans-serif" },
      },
    });
    const notes = agentNotes(p, typographyLevels(p)).join("\n");
    expect(notes).toContain("**Declared tokens:**");
    expect(notes).toContain("`--radius-md: 8px`");
    expect(notes).toContain("`--space-4: 16px`");
    expect(notes).toContain("`--font-sans`");
    expect(notes).toContain("canonical");
  });

  it("stays silent when nothing was declared", () => {
    const p = profile();
    expect(agentNotes(p, typographyLevels(p)).join("\n")).not.toContain(
      "Declared tokens",
    );
  });
});

describe("agentNotes – hover micro-interaction", () => {
  it("describes the observed shadow + lift so the agent reproduces it", () => {
    const p = profile({
      primaryButtonHover: {
        shadow: "rgba(0, 0, 0, 0.2) 0px 4px 12px 0px",
        transform: "translateY(-2px)",
      },
    });
    const notes = agentNotes(p, typographyLevels(p)).join("\n");
    expect(notes).toContain("**Primary button hover:**");
    expect(notes).toContain("`transform: translateY(-2px)`");
    expect(notes).toContain(
      "`box-shadow: rgba(0, 0, 0, 0.2) 0px 4px 12px 0px`",
    );
    // No color shift on this profile -> the note says so explicitly.
    expect(notes).toContain("background color does not change");
  });

  it("emits nothing without an observed micro-interaction", () => {
    const p = profile();
    expect(agentNotes(p, typographyLevels(p)).join("\n")).not.toContain(
      "Primary button hover",
    );
  });

  it("cites the observed container cap and breakpoints in a layout note", () => {
    const p = profile({
      layout: { containerMaxWidthPx: 1200, breakpointsPx: [640, 1024] },
    });
    const note = find(notesFor(p), "Layout");
    expect(note).toBeDefined();
    expect(note).toContain("`1200px`");
    expect(note).toContain("640px, 1024px");
    expect(note).toContain("@media (min-width: …)");
  });

  it("emits no layout note without observations", () => {
    expect(find(notesFor(profile()), "Layout")).toBeUndefined();
  });

  it("lists declared breakpoints in the declared-tokens note", () => {
    const p = profile({
      layout: { breakpointsPx: [768] },
      declared: { breakpoints: { "--breakpoint-md": 768 } },
    });
    const note = find(notesFor(p), "Declared tokens");
    expect(note).toContain("breakpoints (`--breakpoint-md: 768px`)");
  });
});
