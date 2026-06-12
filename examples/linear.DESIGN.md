---
version: alpha
name: "Linear – The system for product development"
description: "Auto-extracted from https://linear.app by DesignScan."
colors:
  primary: "#5e6ad2"
  on-primary: "#ffffff"
  background: "#08090a"
  text: "#d0d6e0"
  accent-1: "#62666d"
  accent-2: "#8a8f98"
  on-accent-2: "#111111"
  border: "#23252a"
  muted-surface: "#0f1011"
typography:
  display:
    fontFamily: "\"Inter Variable\", \"SF Pro Display\", -apple-system, system-ui, \"Segoe UI\", Roboto, Oxygen, Ubuntu, Cantarell, \"Open Sans\", \"Helvetica Neue\", sans-serif"
    fontSize: 64px
    fontWeight: "510"
    lineHeight: 1
    letterSpacing: "-0.022em"
  display-48:
    fontFamily: "\"Inter Variable\", \"SF Pro Display\", -apple-system, system-ui, \"Segoe UI\", Roboto, Oxygen, Ubuntu, Cantarell, \"Open Sans\", \"Helvetica Neue\", sans-serif"
    fontSize: 48px
    fontWeight: "510"
    lineHeight: 1
    letterSpacing: "-0.022em"
  headline-lg:
    fontFamily: "\"Inter Variable\", \"SF Pro Display\", -apple-system, system-ui, \"Segoe UI\", Roboto, Oxygen, Ubuntu, Cantarell, \"Open Sans\", \"Helvetica Neue\", sans-serif"
    fontSize: 32px
    fontWeight: "510"
    lineHeight: 1
    letterSpacing: "-0.022em"
  headline-sm:
    fontFamily: "\"Inter Variable\", \"SF Pro Display\", -apple-system, system-ui, \"Segoe UI\", Roboto, Oxygen, Ubuntu, Cantarell, \"Open Sans\", \"Helvetica Neue\", sans-serif"
    fontSize: 24px
    fontWeight: "510"
    lineHeight: 1
    letterSpacing: "-0.022em"
  title:
    fontFamily: "\"Inter Variable\", \"SF Pro Display\", -apple-system, system-ui, \"Segoe UI\", Roboto, Oxygen, Ubuntu, Cantarell, \"Open Sans\", \"Helvetica Neue\", sans-serif"
    fontSize: 18px
    fontWeight: "510"
    lineHeight: 1
    letterSpacing: "-0.022em"
  body-lg:
    fontFamily: "\"Inter Variable\", \"SF Pro Display\", -apple-system, system-ui, \"Segoe UI\", Roboto, Oxygen, Ubuntu, Cantarell, \"Open Sans\", \"Helvetica Neue\", sans-serif"
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.5
  label:
    fontFamily: "\"Inter Variable\", \"SF Pro Display\", -apple-system, system-ui, \"Segoe UI\", Roboto, Oxygen, Ubuntu, Cantarell, \"Open Sans\", \"Helvetica Neue\", sans-serif"
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 1.5
rounded:
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  2xl: 16px
  3xl: 22px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  3xl: 28px
shadows:
  sm: "rgb(35, 37, 42) 0px 0px 0px 1px inset"
  md: "rgba(0, 0, 0, 0.03) 0px 1.2px 0px 0px"
  lg: "rgba(0, 0, 0, 0.4) 0px 2px 4px 0px"
  xl: "rgba(0, 0, 0, 0.2) 0px 0px 12px 0px inset"
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
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
    height: 64px
  body-text:
    textColor: "{colors.text}"
    typography: "{typography.title}"
  link:
    textColor: "{colors.accent-1}"
    typography: "{typography.title}"
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

Auto-extracted from https://linear.app by DesignScan on 2026-06-11. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

- **primary (#5e6ad2):** the dominant brand/accent color, used for primary actions.
- **on-primary (#ffffff):** the readable foreground used on primary surfaces.
- **background (#08090a):** the base surface color behind most content.
- **text (#d0d6e0):** the primary foreground / body-text color.
- **accent-1 (#62666d):** a supporting accent (used for links).
- **accent-2 (#8a8f98):** a secondary accent (used for badges/tags).
- **on-accent-2 (#111111):** the readable foreground on the secondary accent.
- **border (#23252a):** the hairline color for dividers, card edges, and input borders.
- **muted-surface (#0f1011):** a subtle secondary surface fill for panels and sections.

## Typography

Primary typeface: **Inter Variable**, with Berkeley Mono. Sizes range 13px–64px across 7 level(s); weights observed: 300, 400, 510, 590.

## Layout

Spacing follows an observed scale of 4px, 8px, 12px, 16px, 20px, 24px, 28px — usable for padding, gaps, and margins.

## Elevation & Depth

Depth is conveyed with 4 shadow level(s) observed on the page, smallest to largest (see the `shadows` tokens in the front matter):

- **sm:** `rgb(35, 37, 42) 0px 0px 0px 1px inset`
- **md:** `rgba(0, 0, 0, 0.03) 0px 1.2px 0px 0px`
- **lg:** `rgba(0, 0, 0, 0.4) 0px 2px 4px 0px`
- **xl:** `rgba(0, 0, 0, 0.2) 0px 0px 12px 0px inset`

_Apply these as `box-shadow` — the smaller levels on resting cards and inputs, the larger on overlays (dropdowns, modals). Don't invent intermediate shadows; this is the page's whole elevation vocabulary._

## Shapes

Corner radii observed: 2px, 4px, 6px, 8px, 12px, 16px, 22px. Use the smaller values for inputs and chips, larger for cards and surfaces.

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

- **Fonts:** the brand face `Inter Variable` likely isn't installed locally. Use the full stack `"Inter Variable", "SF Pro Display", -apple-system, system-ui, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif` verbatim — it falls back to `sans-serif`, so expect slightly different metrics; keep the declared weights and letterSpacing to stay on-brand.
- **Primary actions:** `primary` (#5e6ad2) with `on-primary` (#ffffff) text is 4.7:1 (passes AA). Reserve `primary` for the single most important action per view.
- **Links:** use `accent-1` (#62666d) for inline links, distinct from the `primary` button color.
- **Shape:** stay on the `rounded` scale — small values for inputs/buttons, larger for cards, `full` only for pills and avatars. Don't introduce radii outside it.
- **Spacing:** compose padding, gaps, and margins from the `spacing` scale (a 4px-based rhythm) rather than arbitrary pixel values.
- **Declared tokens:** the site publishes its design scale as CSS custom properties — radii (`--radius-4: 4px`, `--radius-6: 6px`, `--radius-8: 8px`, `--radius-12: 12px`); spacing (`--editor-last-invisible-paragraph-spacing: 10px`, `--editor-block-spacing: 16px`); fonts (`--font-regular`, `--font-monospace`) — and the page really uses these exact values. Treat them as the canonical scale and reuse the site's own variable names when you create tokens.
