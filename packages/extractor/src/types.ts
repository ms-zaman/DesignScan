// Raw, unprocessed observations collected inside the page (frequency maps).
export interface RawObservations {
  title: string;
  colorCount: Record<string, number>;
  bgArea: Record<string, number>; // backgroundColor -> total px^2 area
  fontFamilies: Record<string, number>;
  fontSizes: Record<string, number>;
  fontWeights: Record<string, number>;
  lineHeights: Record<string, number>;
  letterSpacings: Record<string, number>;
  radii: Record<string, number>;
  borderWidths: Record<string, number>;
  shadows: Record<string, number>;
  spacings: Record<string, number>;
  buttons: ButtonSample[];
  links: { color: string }[];
  // Per-role aggregates so line-height / weight / letter-spacing can be assigned
  // per heading vs body instead of guessed. Optional: older callers may omit.
  lhHeading?: Record<string, number>; // line-height ratio -> count
  lhBody?: Record<string, number>;
  weightHeading?: Record<string, number>; // font-weight -> count
  weightBody?: Record<string, number>;
  lsHeading?: Record<string, number>; // letter-spacing in em -> count
  lsBody?: Record<string, number>;
  // Which prefers-color-scheme this page was captured under.
  colorScheme?: "light" | "dark";
}

export interface ButtonSample {
  bg: string;
  color: string;
  radius: string;
  fontSize: string;
  weight: string;
  padding: string;
}

// Bump when the DesignProfile shape changes in a way downstream consumers
// (generator, persisted JSON, public files) must notice. Semver-ish: major for
// breaking, minor for additive. Keep in sync with the README.
export const PROFILE_SCHEMA_VERSION = "1.1";

// Cleaned-up design profile — the structured token output.
export interface DesignProfile {
  // Version of this JSON shape; see PROFILE_SCHEMA_VERSION.
  schemaVersion: string;
  url: string;
  title: string;
  fetchedAt: string;
  // The color scheme this profile represents (matters once light+dark are
  // bundled together).
  theme: "light" | "dark";
  colors: {
    background: string | null;
    text: string | null;
    primary: string | null;
    palette: { hex: string; count: number }[];
  };
  typography: {
    families: string[];
    sizeScalePx: number[];
    weights: number[];
    lineHeightHeading?: number;
    lineHeightBody?: number;
    weightHeading?: number;
    weightBody?: number;
    letterSpacingHeadingEm?: number;
    letterSpacingBodyEm?: number;
  };
  spacingScalePx: number[];
  radiusScalePx: number[];
  shadows: string[];
}
