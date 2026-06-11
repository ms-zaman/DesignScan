---
version: alpha
name: "GitHub · Change is constant. GitHub keeps you ahead. · GitHub"
description: "Auto-extracted from https://github.com by DesignScan."
colors:
  primary: "#08872b"
  on-primary: "#ffffff"
  primary-hover: "#077124"
  background: "#0d1117"
  text: "#ffffff"
  accent-1: "#9198a1"
  accent-2: "#a4aea6"
  on-accent-2: "#111111"
  border: "#484f58"
typography:
  display:
    fontFamily: "\"Mona Sans\", MonaSansFallback, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 48px
    fontWeight: "400"
    lineHeight: 1.5
  display-40:
    fontFamily: "\"Mona Sans\", MonaSansFallback, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 40px
    fontWeight: "400"
    lineHeight: 1.5
  headline-sm:
    fontFamily: "\"Mona Sans\", MonaSansFallback, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 24px
    fontWeight: "400"
    lineHeight: 1.5
  headline-sm-22:
    fontFamily: "\"Mona Sans\", MonaSansFallback, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 22px
    fontWeight: "400"
    lineHeight: 1.5
  title:
    fontFamily: "\"Mona Sans\", MonaSansFallback, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 18px
    fontWeight: "400"
    lineHeight: 1.5
  body-lg:
    fontFamily: "\"Mona Sans\", MonaSansFallback, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.5
  body:
    fontFamily: "\"Mona Sans\", MonaSansFallback, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.5
  label:
    fontFamily: "\"Mona Sans\", MonaSansFallback, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 1.5
rounded:
  xs: 6px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 60px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  3xl: 32px
shadows:
  sm: "rgba(209, 217, 224, 0.25) 0px 0px 0px 1px, rgba(37, 41, 46, 0.04) 0px 6px 12px -3px, rgba(37, 41, 46, 0.12) 0px 6px 18px 0px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: 48px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: 48px
  surface:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
    height: 41px
  body-text:
    textColor: "{colors.text}"
    typography: "{typography.body}"
  link:
    textColor: "{colors.accent-1}"
    typography: "{typography.body}"
  badge:
    backgroundColor: "{colors.accent-2}"
    textColor: "{colors.on-accent-2}"
    rounded: "{rounded.full}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
---

## Overview

Auto-extracted from https://github.com by DesignScan on 2026-06-11. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

- **primary (#08872b):** the dominant brand/accent color, used for primary actions.
- **on-primary (#ffffff):** the readable foreground used on primary surfaces.
- **primary-hover (#077124):** the primary button background as observed on hover.
- **background (#0d1117):** the base surface color behind most content.
- **text (#ffffff):** the primary foreground / body-text color.
- **accent-1 (#9198a1):** a supporting accent (used for links).
- **accent-2 (#a4aea6):** a secondary accent (used for badges/tags).
- **on-accent-2 (#111111):** the readable foreground on the secondary accent.
- **border (#484f58):** the hairline color for dividers, card edges, and input borders.

## Typography

Primary typeface: **Mona Sans**, with Mona Sans VF, Mona Sans Mono. Sizes range 12px–48px across 8 level(s); weights observed: 400, 425, 440, 460, 480, 500, 600, 700, 800.

## Layout

Spacing follows an observed scale of 4px, 8px, 12px, 16px, 20px, 24px, 32px — usable for padding, gaps, and margins.

## Elevation & Depth

Depth is conveyed with 1 shadow level(s) observed on the page, smallest to largest (see the `shadows` tokens in the front matter):

- **sm:** `rgba(209, 217, 224, 0.25) 0px 0px 0px 1px, rgba(37, 41, 46, 0.04) 0px 6px 12px -3px, rgba(37, 41, 46, 0.12) 0px 6px 18px 0px`

_Apply these as `box-shadow` — the smaller levels on resting cards and inputs, the larger on overlays (dropdowns, modals). Don't invent intermediate shadows; this is the page's whole elevation vocabulary._

## Shapes

Corner radii observed: 6px, 8px, 12px, 16px, 24px, 60px. Use the smaller values for inputs and chips, larger for cards and surfaces.

## Components

- **Primary button:** filled with the primary color (`{colors.primary}`) and `{colors.on-primary}` text, rounded to `{rounded.md}`, set in `{typography.body-lg}`, 48px tall as observed.
- **Primary button (hover):** background shifts to `{colors.primary-hover}` — observed on the live site, use it for `:hover` instead of a computed darken.
- **Surface / card & input:** `{colors.background}` with `{colors.text}` foreground.
- **Link:** `{colors.accent-1}` text for inline links.
- **Badge / tag:** `{colors.accent-2}` background with `{colors.on-accent-2}` text.
- **Divider:** a 1px rule in `{colors.border}` — also the hairline for card edges and input borders.

## Do's and Don'ts

- **Do** reserve `primary` for the most important actions.
- **Don't** treat these auto-extracted values as final — verify contrast and intent before production.

## Notes for your coding agent

Computed from this extraction — act on these before treating the tokens as final:

- **Fonts:** the brand face `Mona Sans` likely isn't installed locally. Use the full stack `"Mona Sans", MonaSansFallback, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif` verbatim — it falls back to `sans-serif`, so expect slightly different metrics; keep the declared weights and letterSpacing to stay on-brand.
- **Primary actions:** `primary` (#08872b) with `on-primary` (#ffffff) text is 4.7:1 (passes AA). Reserve `primary` for the single most important action per view.
- **Links:** use `accent-1` (#9198a1) for inline links, distinct from the `primary` button color.
- **Shape:** stay on the `rounded` scale — small values for inputs/buttons, larger for cards, `full` only for pills and avatars. Don't introduce radii outside it.
- **Spacing:** compose padding, gaps, and margins from the `spacing` scale (a 4px-based rhythm) rather than arbitrary pixel values.
- **Declared tokens:** the site publishes its design scale as CSS custom properties — radii (`--borderRadius-medium: 6px`, `--brand-Bento-item-borderRadius-large: 24px`); spacing (`--control-small-gap: 4px`, `--control-large-gap: 8px`, `--controlStack-large-gap-spacious: 12px`, `--Layout-row-gap: 16px`); fonts (`--fontStack-system`, `--brand-body-fontFamily`, `--brand-fontStack-monospace`) — and the page paints these exact values. Treat them as the canonical scale and reuse the site's own variable names when you create tokens.
