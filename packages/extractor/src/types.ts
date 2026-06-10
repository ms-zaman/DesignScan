// Raw, unprocessed observations collected inside the page (frequency maps).
export interface RawObservations {
  title: string;
  colorCount: Record<string, number>;
  // text color -> total painted px^2 area (area-weighted body-text vote).
  // Optional: older recorded fixtures may omit it (pickText falls back to count).
  textColorArea?: Record<string, number>;
  bgArea: Record<string, number>; // backgroundColor -> total px^2 area
  // Raw CSS background-image gradient values -> total px^2 area of the elements
  // painting them. Brand colors often live only in a hero/CTA gradient (never a
  // flat fill, link, or solid button); their stop colors feed the primary
  // heuristic. Optional: profiles captured before this field simply skip it.
  gradientImages?: Record<string, number>;
  fontFamilies: Record<string, number>;
  fontSizes: Record<string, number>;
  fontWeights: Record<string, number>;
  lineHeights: Record<string, number>;
  letterSpacings: Record<string, number>;
  radii: Record<string, number>;
  borderWidths: Record<string, number>;
  // Border colors of elements that paint a visible border -> element count. The
  // real signal for the `border` token. Optional: profiles captured before this
  // field fall back to a near-background neutral derived from bgArea.
  borderColors?: Record<string, number>;
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
  // CSS custom properties computed on :root/body (name -> computed value, with
  // var() references already substituted by the browser). Modern sites declare
  // their design system here outright — `--color-primary`, `--radius-md` —
  // with semantic names attached, which beats reconstructing the same values
  // by statistical vote. Optional: profiles captured before this field skip it.
  customProps?: Record<string, string>;
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
export const PROFILE_SCHEMA_VERSION = "1.3";

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
    // Subtle near-background neutrals: a hairline/divider color and a secondary
    // surface fill. Either may be null when the page shows no such color.
    // Optional for back-compat with profiles captured before schema 1.3.
    border?: string | null;
    mutedSurface?: string | null;
    palette: { hex: string; count: number }[];
  };
  typography: {
    families: string[];
    // The dominant text element's full declared font-family, cleaned into a
    // paste-ready CSS stack (primary + the site's own fallbacks + a generic),
    // e.g. `sohne-var, "SF Pro Display", sans-serif`. Lets consumers drop the
    // value straight into CSS even when the brand font isn't installed. Optional
    // for back-compat with profiles captured before schema 1.2.
    fontStack?: string;
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
