---
version: alpha
name: "Application Performance Monitoring & Error Tracking Software | Sentry"
description: "Auto-extracted from https://sentry.io by DesignScan."
colors:
  primary: "#79628c"
  on-primary: "#ffffff"
  background: "#1f1633"
  text: "#d4d4d4"
  accent-1: "#ffffff"
  accent-2: "#569cd6"
  on-accent-2: "#111111"
typography:
  display:
    fontFamily: "Rubik, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 88px
    fontWeight: "500"
    lineHeight: 1.1
  display-60:
    fontFamily: "Rubik, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 60px
    fontWeight: "500"
    lineHeight: 1.1
  headline-md:
    fontFamily: "Rubik, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 27px
    fontWeight: "500"
    lineHeight: 1.1
  headline-sm:
    fontFamily: "Rubik, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 24px
    fontWeight: "500"
    lineHeight: 1.1
  title:
    fontFamily: "Rubik, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 20px
    fontWeight: "500"
    lineHeight: 1.1
  body-lg:
    fontFamily: "Rubik, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.5
  body:
    fontFamily: "Rubik, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.5
  label:
    fontFamily: "Rubik, -apple-system, system-ui, \"Segoe UI\", Helvetica, Arial, sans-serif"
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 1.5
rounded:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 13px
  xl: 18px
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
  sm: "rgba(0, 0, 0, 0.1) 0px 1px 3px 0px inset"
  md: "rgba(0, 0, 0, 0.08) 0px 2px 8px 0px"
  lg: "rgba(0, 0, 0, 0.15) 0px 2px 10px 0px inset"
  xl: "rgb(21, 15, 35) 0px 0px 8px 6px"
breakpoints:
  sm: 576px
  md: 641px
  lg: 768px
  xl: 992px
  2xl: 1024px
  3xl: 1152px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: 26px
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
---

## Overview

Auto-extracted from https://sentry.io by DesignScan on 2026-06-13. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

**Brand & actions**

- **primary (#79628c):** the dominant brand/accent color, used for primary actions.
- **on-primary (#ffffff):** the readable foreground used on primary surfaces.

**Surfaces & text**

- **background (#1f1633):** the base surface color behind most content.
- **text (#d4d4d4):** the primary foreground / body-text color.

**Accents**

- **accent-1 (#ffffff):** a supporting accent (used for links).
- **accent-2 (#569cd6):** a secondary accent (used for badges/tags).
- **on-accent-2 (#111111):** the readable foreground on the secondary accent.

## Typography

Primary typeface: **Rubik**, with Monaco, IBM Plex Mono. Sizes range 12px–88px across 8 level(s); weights observed: 400, 500, 600, 700.

## Layout

Content sits in a horizontally centered container capped at **1152px** — cap top-level page sections at this width rather than letting text run the full viewport.

The page reshapes at 6 observed breakpoint(s): 576px, 641px, 768px, 992px, 1024px, 1152px (see the `breakpoints` tokens in the front matter). Write `@media (min-width: …)` rules at these exact boundaries instead of a framework's defaults.

Spacing follows an observed scale of 4px, 8px, 12px, 16px, 20px, 24px, 32px — usable for padding, gaps, and margins.

## Elevation & Depth

Depth is conveyed with 4 shadow level(s) observed on the page, smallest to largest (see the `shadows` tokens in the front matter):

- **sm:** `rgba(0, 0, 0, 0.1) 0px 1px 3px 0px inset`
- **md:** `rgba(0, 0, 0, 0.08) 0px 2px 8px 0px`
- **lg:** `rgba(0, 0, 0, 0.15) 0px 2px 10px 0px inset`
- **xl:** `rgb(21, 15, 35) 0px 0px 8px 6px`

_Apply these as `box-shadow` — the smaller levels on resting cards and inputs, the larger on overlays (dropdowns, modals). Don't invent intermediate shadows; this is the page's whole elevation vocabulary._

## Shapes

Corner radii observed: 4px, 6px, 10px, 13px, 18px. Use the smaller values for inputs and chips, larger for cards and surfaces.

## Components

- **Primary button:** filled with the primary color (`{colors.primary}`) and `{colors.on-primary}` text, rounded to `{rounded.md}`, set in `{typography.label}`, 26px tall as observed.
- **Surface / card & input:** `{colors.background}` with `{colors.text}` foreground.
- **Link:** `{colors.accent-1}` text for inline links.
- **Badge / tag:** `{colors.accent-2}` background with `{colors.on-accent-2}` text.

## Do's and Don'ts

- **Do** reserve `primary` for the most important actions.
- **Don't** treat these auto-extracted values as final — verify contrast and intent before production.

## Notes for your coding agent

Computed from this extraction — act on these before treating the tokens as final:

- **Fonts:** the brand face `Rubik` likely isn't installed locally. Use the full stack `Rubik, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif` verbatim — it falls back to `sans-serif`, so expect slightly different metrics; keep the declared weights and letterSpacing to stay on-brand.
- **Primary actions:** `primary` (#79628c) with `on-primary` (#ffffff) text is 5.3:1 (passes AA). Reserve `primary` for the single most important action per view.
- **Links:** use `accent-1` (#ffffff) for inline links, distinct from the `primary` button color.
- **Shape:** stay on the `rounded` scale — small values for inputs/buttons, larger for cards, `full` only for pills and avatars. Don't introduce radii outside it.
- **Spacing:** compose padding, gaps, and margins from the `spacing` scale (a 4px-based rhythm) rather than arbitrary pixel values.
- **Layout:** center page content in a container capped at `1152px`; write `@media (min-width: …)` rules at the observed boundaries (576px, 641px, 768px, 992px, 1024px, 1152px), not at a framework's defaults.
- **Declared tokens:** the site publishes its design scale as CSS custom properties — breakpoints (`--breakpoint-sm: 576px`, `--breakpoint-md: 768px`, `--breakpoint-lg: 992px`, `--breakpoint-xl: 1152px`) — and the page really uses these exact values. Treat them as the canonical scale and reuse the site's own variable names when you create tokens.
