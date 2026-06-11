---
version: alpha
name: "Push your ideas to the web | Netlify"
description: "Auto-extracted from https://netlify.com by DesignScan."
colors:
  primary: "#2e51ed"
  on-primary: "#ffffff"
  background: "#ffffff"
  text: "#353a3e"
  accent-1: "#181a1c"
  accent-2: "#89ddff"
  on-accent-2: "#111111"
  border: "#e9ebed"
  muted-surface: "#f6f6f7"
typography:
  display:
    fontFamily: "\"Instrument Sans\", system-ui, Helvetica, sans-serif"
    fontSize: 64px
    fontWeight: "800"
    lineHeight: 1.1
  display-48:
    fontFamily: "\"Instrument Sans\", system-ui, Helvetica, sans-serif"
    fontSize: 48px
    fontWeight: "800"
    lineHeight: 1.1
  headline-lg:
    fontFamily: "\"Instrument Sans\", system-ui, Helvetica, sans-serif"
    fontSize: 37px
    fontWeight: "800"
    lineHeight: 1.1
  headline-lg-32:
    fontFamily: "\"Instrument Sans\", system-ui, Helvetica, sans-serif"
    fontSize: 32px
    fontWeight: "800"
    lineHeight: 1.1
  headline-sm:
    fontFamily: "\"Instrument Sans\", system-ui, Helvetica, sans-serif"
    fontSize: 24px
    fontWeight: "800"
    lineHeight: 1.1
  title:
    fontFamily: "\"Instrument Sans\", system-ui, Helvetica, sans-serif"
    fontSize: 18px
    fontWeight: "800"
    lineHeight: 1.1
  body-lg:
    fontFamily: "\"Instrument Sans\", system-ui, Helvetica, sans-serif"
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.5
  body:
    fontFamily: "\"Instrument Sans\", system-ui, Helvetica, sans-serif"
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.5
  label:
    fontFamily: "\"Instrument Sans\", system-ui, Helvetica, sans-serif"
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 1.5
rounded:
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  2xl: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
shadows:
  sm: "rgb(128, 128, 128) 0px 0px 5px 0px"
  md: "color(srgb 0 0 0 / 0.25) 0px 4px 12px 0px"
  lg: "color(srgb 0 0 0 / 0.07) 0px 16px 24px 0px, color(srgb 0 0 0 / 0.06) 0px 6px 30px 0px, color(srgb 0 0 0 / 0.1) 0px 8px 10px 0px"
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
    typography: "{typography.body-lg}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
    height: 42px
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

Auto-extracted from https://netlify.com by DesignScan on 2026-06-11. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

- **primary (#2e51ed):** the dominant brand/accent color, used for primary actions.
- **on-primary (#ffffff):** the readable foreground used on primary surfaces.
- **background (#ffffff):** the base surface color behind most content.
- **text (#353a3e):** the primary foreground / body-text color.
- **accent-1 (#181a1c):** a supporting accent (used for links).
- **accent-2 (#89ddff):** a secondary accent (used for badges/tags).
- **on-accent-2 (#111111):** the readable foreground on the secondary accent.
- **border (#e9ebed):** the hairline color for dividers, card edges, and input borders.
- **muted-surface (#f6f6f7):** a subtle secondary surface fill for panels and sections.

## Typography

Primary typeface: **Instrument Sans**, with Martian Mono, Figtree. Sizes range 12px–64px across 9 level(s); weights observed: 400, 500, 600, 700, 800.

## Layout

Spacing follows an observed scale of 4px, 8px, 12px, 16px, 24px, 32px, 48px — usable for padding, gaps, and margins.

## Elevation & Depth

Depth is conveyed with 3 shadow level(s) observed on the page, smallest to largest (see the `shadows` tokens in the front matter):

- **sm:** `rgb(128, 128, 128) 0px 0px 5px 0px`
- **md:** `color(srgb 0 0 0 / 0.25) 0px 4px 12px 0px`
- **lg:** `color(srgb 0 0 0 / 0.07) 0px 16px 24px 0px, color(srgb 0 0 0 / 0.06) 0px 6px 30px 0px, color(srgb 0 0 0 / 0.1) 0px 8px 10px 0px`

_Apply these as `box-shadow` — the smaller levels on resting cards and inputs, the larger on overlays (dropdowns, modals). Don't invent intermediate shadows; this is the page's whole elevation vocabulary._

## Shapes

Corner radii observed: 2px, 4px, 6px, 8px, 12px, 16px. Use the smaller values for inputs and chips, larger for cards and surfaces.

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

- **Headings:** the `text` token (#353a3e) sits at 11.5:1 on `background` — fine for body copy, but it reads muted at display sizes. For large headings use `accent-1` (#181a1c, 17.5:1) to keep visual hierarchy. Reserve `text` for paragraph and UI copy.
- **Fonts:** the brand face `Instrument Sans` likely isn't installed locally. Use the full stack `"Instrument Sans", system-ui, Helvetica, sans-serif` verbatim — it falls back to `sans-serif`, so expect slightly different metrics; keep the declared weights and letterSpacing to stay on-brand.
- **Primary actions:** `primary` (#2e51ed) with `on-primary` (#ffffff) text is 6.0:1 (passes AA). Reserve `primary` for the single most important action per view.
- **Links:** use `accent-1` (#181a1c) for inline links, distinct from the `primary` button color.
- **Shape:** stay on the `rounded` scale — small values for inputs/buttons, larger for cards, `full` only for pills and avatars. Don't introduce radii outside it.
- **Spacing:** compose padding, gaps, and margins from the `spacing` scale (a 4px-based rhythm) rather than arbitrary pixel values.
- **Declared tokens:** the site publishes its design scale as CSS custom properties — radii (`--radius-xs: 2px`, `--radius-s: 4px`, `--radius-m: 6px`, `--border-radius-3: 8px`); spacing (`--space-3xs: 4px`, `--space-2xs: 8px`, `--space-xs: 12px`, `--space-s: 16px`); fonts (`--font-heading`, `--font-primary`, `--font-monospace`) — and the page paints these exact values. Treat them as the canonical scale and reuse the site's own variable names when you create tokens.
