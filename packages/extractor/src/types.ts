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
  // Text-entry controls observed on the page (text-like <input> elements).
  // Optional: profiles captured before schema 1.5 simply skip it.
  inputs?: InputSample[];
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
  // The page's real root font-size in px (html element). Needed to convert
  // rem/em-declared custom-property values — the 62.5% trick (1rem = 10px)
  // would otherwise corrupt every declared dimension. Optional: older
  // profiles default to 16.
  rootFontSizePx?: number;
  // Hover deltas observed by actually hovering a handful of button-like
  // elements (with transitions disabled so computed values are final, not
  // mid-animation). Only elements whose bg/text color changed are recorded.
  // Optional: profiles captured before this field simply skip it.
  buttonHovers?: HoverSample[];
  // Pressed (:active) deltas observed by really holding the pointer down on
  // the same button-like elements (released off-element so no click fires).
  // Same shape as hovers — rest vs pressed. Optional (schema 1.5).
  buttonActives?: HoverSample[];
  // Width breakpoints mined from the page's @media rules (CSSOM + fetched
  // cross-origin sheets), as integer px -> number of rules gating on that
  // boundary. max-width conditions are folded onto their min-width boundary
  // (767.98px / 767px both mean "the 768 breakpoint"). Optional (schema 1.6).
  mediaBreakpoints?: Record<string, number>;
  // Authored max-widths of horizontally centered content wrappers, as integer
  // px -> summed element height (the page-long main column outweighs a
  // centered hero strip). Optional (schema 1.6).
  containerWidths?: Record<string, number>;
  // How the dark palette was actually unlocked when this was a dark-scheme
  // capture: the prefers-color-scheme emulation, or a class/attribute gate we
  // applied because the media query alone left the page light. Absent when
  // the page never darkened (or for light captures). Optional (schema 1.5).
  darkMechanism?:
    | "prefers-color-scheme"
    | "class-dark"
    | "data-theme-dark"
    | "data-color-mode-dark";
}

// A before/after pair from physically hovering one button-like element.
// Beyond the bg/text colors, the mechanism fields capture the OTHER ways a
// hover paints: a whole-element opacity fade, a brightness() filter (both
// compositable to the visible hex), and shadow/transform micro-interactions.
// All optional: profiles captured before they existed simply lack them.
export interface HoverSample {
  restBg: string;
  restColor: string;
  bg: string;
  color: string;
  restOpacity?: number;
  opacity?: number;
  restShadow?: string;
  shadow?: string;
  restTransform?: string;
  transform?: string;
  restFilter?: string;
  filter?: string;
}

export interface ButtonSample {
  bg: string;
  color: string;
  radius: string;
  fontSize: string;
  weight: string;
  padding: string;
  // Rendered box height as a px string. Optional: samples captured before
  // schema 1.5 lack it.
  height?: string;
}

// A text-entry control (text-like <input>) — the geometry source for the
// `input` component's height/typography. Optional in RawObservations:
// fixtures captured before schema 1.5 lack the array entirely.
export interface InputSample {
  height: string;
  fontSize: string;
  radius: string;
}

// Bump when the DesignProfile shape changes in a way downstream consumers
// (generator, persisted JSON, public files) must notice. Semver-ish: major for
// breaking, minor for additive. Keep in sync with the README.
export const PROFILE_SCHEMA_VERSION = "1.8";

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
    // The second, distinct *filled* button style observed on the page — the
    // secondary action (a neutral/tonal or alternate-brand button), with the
    // text color seen on it. The page's most common opaque button fill that
    // isn't the primary and reads as a real button. Absent when the only other
    // buttons are ghost/outline (transparent — not expressible as a fill token)
    // or none stand out. Optional (schema 1.8).
    secondary?: string;
    onSecondary?: string;
    // What the primary button's background becomes on hover, observed by
    // really hovering it (null when no button hover-shifts from the primary).
    // Optional for back-compat with profiles captured before schema 1.4.
    primaryHover?: string | null;
    // Same for :active — observed by really pressing the button (schema 1.5).
    primaryActive?: string | null;
    // Semantic feedback colors mined from the site's declared design system
    // (--color-error, --hds-color-core-success-500, supabase's --destructive-*)
    // and sanity-checked by hue. Unlike every other role these are trusted
    // straight from the declaration even when the captured page never painted
    // them — a homepage rarely shows an error/validation state, yet the token
    // is still real design-system provenance. Each field is absent when the
    // site declares no matching token. Optional (schema 1.7).
    status?: {
      error?: string;
      success?: string;
      warning?: string;
      info?: string;
    };
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
  // Hover micro-interaction observed on the primary button beyond any color
  // shift: the box-shadow it carries and/or how it moves (a friendly
  // translateY/scale where the matrix decomposes, else the raw transform).
  // These aren't colors and the DESIGN.md spec has no hover-state component
  // properties, so they surface as agentNotes prose + the preview's real
  // hover instead of tokens. Optional for back-compat (schema 1.4).
  primaryButtonHover?: { shadow?: string; transform?: string };
  // Same micro-interaction pair for :active — posthog's 3D press (shadow
  // collapse + translateY) lives here, not on hover. Optional (schema 1.5).
  primaryButtonActive?: { shadow?: string; transform?: string };
  // How the dark palette was unlocked for a dark capture (see
  // RawObservations.darkMechanism). Lets the prose tell agents to replicate
  // the site's real gating (class vs media query). Optional (schema 1.5).
  darkMechanism?: RawObservations["darkMechanism"];
  // The site's own declared scale tokens, mined from :root/body custom
  // properties and corroborated against what the page actually painted (a
  // declared-but-unused theme var never qualifies). Provenance, not a
  // replacement: the voted scales above stay authoritative; these carry the
  // site's *names* for the values (e.g. "--radius-md": 8). Optional for
  // back-compat with profiles captured before schema 1.4.
  declared?: {
    radius?: Record<string, number>; // var name -> px
    spacing?: Record<string, number>; // var name -> px
    fontFamilies?: Record<string, string>; // var name -> family stack
    // The site's own names for its responsive breakpoints (tailwind v4's
    // --breakpoint-md and friends), corroborated against the boundaries its
    // @media rules actually gate on. Optional (schema 1.6).
    breakpoints?: Record<string, number>; // var name -> px
  };
  // Observed control geometry — the modal font-size/height of the buttons that
  // wear the resolved primary color, and of the page's text inputs. Lets the
  // emitters cross-reference a real typography level and a real height on
  // button-primary/input instead of leaving agents to guess. Fields appear
  // only when observed (heights need schema-1.5 captures; font sizes also
  // resolve from older samples). Optional for back-compat (schema 1.5).
  controls?: {
    button?: { fontSizePx?: number; heightPx?: number };
    input?: { fontSizePx?: number; heightPx?: number };
  };
  // Page-level layout facts: the centered content container's authored
  // max-width, and the width boundaries the page's own @media rules reshape
  // at (ascending). Both observed, never guessed — either field appears only
  // when the page really declares it. Optional (schema 1.6).
  layout?: {
    containerMaxWidthPx?: number;
    breakpointsPx?: number[];
  };
}
