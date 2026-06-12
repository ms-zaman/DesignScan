---
version: alpha
name: "Railway | The all-in-one intelligent cloud provider"
description: "Auto-extracted from https://railway.app by DesignScan."
colors:
  primary: "#180d43"
  on-primary: "#ffffff"
  background: "#13111c"
  text: "#f7f7f8"
  accent-1: "#ffffff"
  accent-2: "#33323e"
  on-accent-2: "#ffffff"
  border: "#33323e"
  muted-surface: "#1b2132"
typography:
  display:
    fontFamily: "Inter, -apple-system, system-ui, \"Segoe UI\", sans-serif, Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\""
    fontSize: 40px
    fontWeight: "400"
    lineHeight: 1.5
  headline-lg:
    fontFamily: "Inter, -apple-system, system-ui, \"Segoe UI\", sans-serif, Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\""
    fontSize: 36px
    fontWeight: "400"
    lineHeight: 1.5
  headline-sm:
    fontFamily: "Inter, -apple-system, system-ui, \"Segoe UI\", sans-serif, Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\""
    fontSize: 24px
    fontWeight: "400"
    lineHeight: 1.5
  title:
    fontFamily: "Inter, -apple-system, system-ui, \"Segoe UI\", sans-serif, Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\""
    fontSize: 20px
    fontWeight: "400"
    lineHeight: 1.5
  title-18:
    fontFamily: "Inter, -apple-system, system-ui, \"Segoe UI\", sans-serif, Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\""
    fontSize: 18px
    fontWeight: "400"
    lineHeight: 1.5
  body-lg:
    fontFamily: "Inter, -apple-system, system-ui, \"Segoe UI\", sans-serif, Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\""
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.63
  body:
    fontFamily: "Inter, -apple-system, system-ui, \"Segoe UI\", sans-serif, Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\""
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.63
  label:
    fontFamily: "Inter, -apple-system, system-ui, \"Segoe UI\", sans-serif, Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\""
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 1.63
rounded:
  xs: 6px
  sm: 8px
  md: 10px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 40px
shadows:
  sm: "rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset"
  md: "rgba(255, 255, 255, 0.2) 0px 0px 0px 1.5px inset"
  lg: "rgb(204, 204, 204) 0px 0px 2px 2px"
  xl: "rgba(65, 78, 166, 0.1) 0px -12px 127px 0px, rgba(65, 78, 166, 0.07) 0px -4.38px 46.357px 0px, rgba(65, 78, 166, 0.06) 0px -2.127px 22.506px 0px, rgba(65, 78, 166, 0.04) 0px -1.042px 11.033px 0px, rgba(65, 78, 166, 0.03) 0px -0.412px 4.362px 0px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  surface:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
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
  surface-muted:
    backgroundColor: "{colors.muted-surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
---

## Overview

Auto-extracted from https://railway.app by DesignScan on 2026-06-11. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

- **primary (#180d43):** the dominant brand/accent color, used for primary actions.
- **on-primary (#ffffff):** the readable foreground used on primary surfaces.
- **background (#13111c):** the base surface color behind most content.
- **text (#f7f7f8):** the primary foreground / body-text color.
- **accent-1 (#ffffff):** a supporting accent (used for links).
- **accent-2 (#33323e):** a secondary accent (used for badges/tags).
- **on-accent-2 (#ffffff):** the readable foreground on the secondary accent.
- **border (#33323e):** the hairline color for dividers, card edges, and input borders.
- **muted-surface (#1b2132):** a subtle secondary surface fill for panels and sections.

## Typography

Primary typeface: **Inter**, with JetBrains Mono, Helvetica. Sizes range 12px–40px across 8 level(s); weights observed: 400, 500, 600, 700, 800.

## Layout

Spacing follows an observed scale of 4px, 8px, 12px, 16px, 24px, 32px, 40px — usable for padding, gaps, and margins.

## Elevation & Depth

Depth is conveyed with 4 shadow level(s) observed on the page, smallest to largest (see the `shadows` tokens in the front matter):

- **sm:** `rgba(255, 255, 255, 0.1) 0px 0px 0px 1px inset`
- **md:** `rgba(255, 255, 255, 0.2) 0px 0px 0px 1.5px inset`
- **lg:** `rgb(204, 204, 204) 0px 0px 2px 2px`
- **xl:** `rgba(65, 78, 166, 0.1) 0px -12px 127px 0px, rgba(65, 78, 166, 0.07) 0px -4.38px 46.357px 0px, rgba(65, 78, 166, 0.06) 0px -2.127px 22.506px 0px, rgba(65, 78, 166, 0.04) 0px -1.042px 11.033px 0px, rgba(65, 78, 166, 0.03) 0px -0.412px 4.362px 0px`

_Apply these as `box-shadow` — the smaller levels on resting cards and inputs, the larger on overlays (dropdowns, modals). Don't invent intermediate shadows; this is the page's whole elevation vocabulary._

## Shapes

Corner radii observed: 6px, 8px, 10px, 16px. Use the smaller values for inputs and chips, larger for cards and surfaces.

## Components

- **Primary button:** filled with the primary color (`{colors.primary}`) and `{colors.on-primary}` text, rounded to `{rounded.md}`.
- **Surface / card & input:** `{colors.background}` with `{colors.text}` foreground.
- **Link:** `{colors.accent-1}` text for inline links.
- **Badge / tag:** `{colors.accent-2}` background with `{colors.on-accent-2}` text.
- **Divider:** a 1px rule in `{colors.border}` — also the hairline for card edges and input borders.
- **Muted surface:** `{colors.muted-surface}` for subtle secondary panels and sections.

## Do's and Don'ts

- **Do** reserve `primary` for the most important actions.
- **Don't** treat these auto-extracted values as final — verify contrast and intent before production.

## Notes for your coding agent

Computed from this extraction — act on these before treating the tokens as final:

- **Fonts:** the brand face `Inter` likely isn't installed locally. Use the full stack `Inter, -apple-system, system-ui, "Segoe UI", sans-serif, Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue"` verbatim — it falls back to a system font, so expect slightly different metrics; keep the declared weights and letterSpacing to stay on-brand.
- **Primary actions:** `primary` (#180d43) with `on-primary` (#ffffff) text is 17.8:1 (passes AA). Reserve `primary` for the single most important action per view.
- **Links:** use `accent-1` (#ffffff) for inline links, distinct from the `primary` button color.
- **Shape:** stay on the `rounded` scale — small values for inputs/buttons, larger for cards, `full` only for pills and avatars. Don't introduce radii outside it.
- **Spacing:** compose padding, gaps, and margins from the `spacing` scale (a 4px-based rhythm) rather than arbitrary pixel values.
- **Declared tokens:** the site publishes its design scale as CSS custom properties — fonts (`--font-inter`, `--font-ibm-plex-serif`, `--font-jetbrains-mono`) — and the page really uses these exact values. Treat them as the canonical scale and reuse the site's own variable names when you create tokens.
