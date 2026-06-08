---
version: alpha
name: "Supabase | The Postgres Development Platform."
description: "Auto-extracted from https://supabase.com by DesignScan."
colors:
  primary: "#72e3ad"
  on-primary: "#111111"
  background: "#fcfcfc"
  text: "#707070"
  accent-1: "#171717"
  accent-2: "#000000"
  on-accent-2: "#ffffff"
  border: "#dfdfdf"
typography:
  display:
    fontFamily: "Circular, custom-font, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 72px
    fontWeight: "400"
    lineHeight: 1.2
  headline-lg:
    fontFamily: "Circular, custom-font, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 36px
    fontWeight: "400"
    lineHeight: 1.2
  headline-sm:
    fontFamily: "Circular, custom-font, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 24px
    fontWeight: "400"
    lineHeight: 1.2
  title:
    fontFamily: "Circular, custom-font, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 18px
    fontWeight: "400"
    lineHeight: 1.2
  body-lg:
    fontFamily: "Circular, custom-font, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.5
  body:
    fontFamily: "Circular, custom-font, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.5
  label:
    fontFamily: "Circular, custom-font, \"Helvetica Neue\", Helvetica, Arial, sans-serif"
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 1.5
rounded:
  xs: 6px
  sm: 8px
  md: 12px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  3xl: 32px
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
---

## Overview

Auto-extracted from https://supabase.com by DesignScan on 2026-06-08. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

- **primary (#72e3ad):** the dominant brand/accent color, used for primary actions.
- **on-primary (#111111):** the readable foreground used on primary surfaces.
- **background (#fcfcfc):** the base surface color behind most content.
- **text (#707070):** the primary foreground / body-text color.
- **accent-1 (#171717):** a supporting accent (used for links).
- **accent-2 (#000000):** a secondary accent (used for badges/tags).
- **on-accent-2 (#ffffff):** the readable foreground on the secondary accent.
- **border (#dfdfdf):** the hairline color for dividers, card edges, and input borders.

## Typography

Primary typeface: **Circular**, with Source Code Pro. Sizes range 12px–72px across 7 level(s); weights observed: 400, 500.

## Layout

Spacing follows an observed scale of 4px, 8px, 12px, 16px, 20px, 24px, 32px — usable for padding, gaps, and margins.

## Elevation & Depth

Depth is conveyed with 2 shadow level(s) observed on the page.

## Shapes

Corner radii observed: 6px, 8px, 12px, 16px. Use the smaller values for inputs and chips, larger for cards and surfaces.

## Components

- **Primary button:** filled with the primary color (`{colors.primary}`) and `{colors.on-primary}` text, rounded to `{rounded.md}`.
- **Surface / card & input:** `{colors.background}` with `{colors.text}` foreground.
- **Link:** `{colors.accent-1}` text for inline links.
- **Badge / tag:** `{colors.accent-2}` background with `{colors.on-accent-2}` text.
- **Divider:** a 1px rule in `{colors.border}` — also the hairline for card edges and input borders.

## Do's and Don'ts

- **Do** reserve `primary` for the most important actions.
- **Don't** treat these auto-extracted values as final — verify contrast and intent before production.

## Notes for your coding agent

Computed from this extraction — act on these before treating the tokens as final:

- **Headings:** the `text` token (#707070) sits at 4.8:1 on `background` — fine for body copy, but it reads muted at display sizes. For large headings use `accent-2` (#000000, 20.5:1) to keep visual hierarchy. Reserve `text` for paragraph and UI copy.
- **Fonts:** the brand face `Circular` likely isn't installed locally. Use the full stack `Circular, custom-font, "Helvetica Neue", Helvetica, Arial, sans-serif` verbatim — it falls back to `sans-serif`, so expect slightly different metrics; keep the declared weights and letterSpacing to stay on-brand.
- **Primary actions:** `primary` (#72e3ad) with `on-primary` (#111111) text is 12.0:1 (passes AA). Reserve `primary` for the single most important action per view.
- **Links:** use `accent-1` (#171717) for inline links, distinct from the `primary` button color.
- **Shape:** stay on the `rounded` scale — small values for inputs/buttons, larger for cards, `full` only for pills and avatars. Don't introduce radii outside it.
- **Spacing:** compose padding, gaps, and margins from the `spacing` scale (a 4px-based rhythm) rather than arbitrary pixel values.
