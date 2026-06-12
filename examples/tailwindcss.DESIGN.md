---
version: alpha
name: "Tailwind CSS - Rapidly build modern websites without ever leaving your HTML."
description: "Auto-extracted from https://tailwindcss.com by DesignScan."
colors:
  primary: "#f6339a"
  on-primary: "#111111"
  background: "#ffffff"
  text: "#030712"
  accent-1: "#4a5565"
  accent-2: "#90a1b9"
  on-accent-2: "#111111"
  border: "#ddd6ff"
  muted-surface: "#fefce8"
typography:
  display:
    fontFamily: "inter, \"inter Fallback\", system-ui"
    fontSize: 40px
    fontWeight: "500"
    lineHeight: 1
  headline-md:
    fontFamily: "inter, \"inter Fallback\", system-ui"
    fontSize: 30px
    fontWeight: "500"
    lineHeight: 1
  headline-sm:
    fontFamily: "inter, \"inter Fallback\", system-ui"
    fontSize: 24px
    fontWeight: "500"
    lineHeight: 1
  title:
    fontFamily: "inter, \"inter Fallback\", system-ui"
    fontSize: 20px
    fontWeight: "500"
    lineHeight: 1
  title-18:
    fontFamily: "inter, \"inter Fallback\", system-ui"
    fontSize: 18px
    fontWeight: "500"
    lineHeight: 1
  body-lg:
    fontFamily: "inter, \"inter Fallback\", system-ui"
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.5
  label:
    fontFamily: "inter, \"inter Fallback\", system-ui"
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 1.5
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 24px
  3xl: 32px
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
  sm: "oklab(0.129999 -0.00404751 -0.027702 / 0.1) 0px 0px 0px 1px inset"
  md: "oklab(0.999994 0.0000455678 0.0000200868 / 0.05) 0px 0px 0px 1px inset"
  lg: "oklab(0.999994 0.0000455678 0.0000200868 / 0.1) 0px 0px 0px 1px inset"
  xl: "oklab(0.999994 0.0000455678 0.0000200868 / 0.2) 0px 0px 0px 1px inset, oklab(0.129999 -0.00404751 -0.027702 / 0.1) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: 40px
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
    height: 24px
  body-text:
    textColor: "{colors.text}"
    typography: "{typography.title-18}"
  link:
    textColor: "{colors.accent-1}"
    typography: "{typography.title-18}"
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

Auto-extracted from https://tailwindcss.com by DesignScan on 2026-06-11. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

- **primary (#f6339a):** the dominant brand/accent color, used for primary actions.
- **on-primary (#111111):** the readable foreground used on primary surfaces.
- **background (#ffffff):** the base surface color behind most content.
- **text (#030712):** the primary foreground / body-text color.
- **accent-1 (#4a5565):** a supporting accent (used for links).
- **accent-2 (#90a1b9):** a secondary accent (used for badges/tags).
- **on-accent-2 (#111111):** the readable foreground on the secondary accent.
- **border (#ddd6ff):** the hairline color for dividers, card edges, and input borders.
- **muted-surface (#fefce8):** a subtle secondary surface fill for panels and sections.

## Typography

Primary typeface: **inter**, with plexMono. Sizes range 13px–40px across 7 level(s); weights observed: 400, 500, 600, 700.

## Layout

Spacing follows an observed scale of 4px, 8px, 12px, 16px, 24px, 32px, 40px — usable for padding, gaps, and margins.

## Elevation & Depth

Depth is conveyed with 4 shadow level(s) observed on the page, smallest to largest (see the `shadows` tokens in the front matter):

- **sm:** `oklab(0.129999 -0.00404751 -0.027702 / 0.1) 0px 0px 0px 1px inset`
- **md:** `oklab(0.999994 0.0000455678 0.0000200868 / 0.05) 0px 0px 0px 1px inset`
- **lg:** `oklab(0.999994 0.0000455678 0.0000200868 / 0.1) 0px 0px 0px 1px inset`
- **xl:** `oklab(0.999994 0.0000455678 0.0000200868 / 0.2) 0px 0px 0px 1px inset, oklab(0.129999 -0.00404751 -0.027702 / 0.1) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.1) 0px 1px 2px -1px`

_Apply these as `box-shadow` — the smaller levels on resting cards and inputs, the larger on overlays (dropdowns, modals). Don't invent intermediate shadows; this is the page's whole elevation vocabulary._

## Shapes

Corner radii observed: 4px, 6px, 8px, 12px, 16px, 24px, 32px. Use the smaller values for inputs and chips, larger for cards and surfaces.

## Components

- **Primary button:** filled with the primary color (`{colors.primary}`) and `{colors.on-primary}` text, rounded to `{rounded.md}`, set in `{typography.label}`, 40px tall as observed.
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

- **Fonts:** the brand face `inter` likely isn't installed locally. Use the full stack `inter, "inter Fallback", system-ui` verbatim — it falls back to `system-ui`, so expect slightly different metrics; keep the declared weights and letterSpacing to stay on-brand.
- **Primary actions:** `primary` (#f6339a) with `on-primary` (#111111) text is 5.3:1 (passes AA). Reserve `primary` for the single most important action per view.
- **Links:** use `accent-1` (#4a5565) for inline links, distinct from the `primary` button color.
- **Shape:** stay on the `rounded` scale — small values for inputs/buttons, larger for cards, `full` only for pills and avatars. Don't introduce radii outside it.
- **Spacing:** compose padding, gaps, and margins from the `spacing` scale (a 4px-based rhythm) rather than arbitrary pixel values.
- **Declared tokens:** the site publishes its design scale as CSS custom properties — radii (`--radius-sm: 4px`, `--radius-md: 6px`, `--radius-lg: 8px`, `--radius-xl: 12px`); spacing (`--spacing: 4px`); fonts (`--font-mono`, `--font-sans`, `--font-inter`) — and the page really uses these exact values. Treat them as the canonical scale and reuse the site's own variable names when you create tokens.
