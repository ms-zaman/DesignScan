---
version: alpha
name: "Retool | Build internal software better, with AI."
description: "Auto-extracted from https://retool.com by DesignScan."
colors:
  primary: "#518dd2"
  on-primary: "#111111"
  primary-hover: "#4b81bf"
  background: "#151515"
  text: "#e9ebdf"
  accent-1: "#cbccc4"
  accent-2: "#f7f8f4"
  on-accent-2: "#111111"
  border: "#433e38"
  muted-surface: "#242424"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: 72px
    fontWeight: "380"
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  display-48:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: 48px
    fontWeight: "380"
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline-lg:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: 36px
    fontWeight: "380"
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline-lg-32:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: 32px
    fontWeight: "380"
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline-sm:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: 24px
    fontWeight: "380"
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: 18px
    fontWeight: "380"
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body-lg:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.5
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 1.5
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 20px
  xl: 36px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  3xl: 40px
shadows:
  sm: "rgba(0, 0, 0, 0.12) 0px 1px 2px 0px, rgb(0, 0, 0) 0px 0px 0px 0.5px"
  md: "rgba(0, 0, 0, 0.35) 0px 68px 116px 0px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: 36px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: 36px
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

Auto-extracted from https://retool.com by DesignScan on 2026-06-11. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

- **primary (#518dd2):** the dominant brand/accent color, used for primary actions.
- **on-primary (#111111):** the readable foreground used on primary surfaces.
- **primary-hover (#4b81bf):** the primary button background as observed on hover.
- **background (#151515):** the base surface color behind most content.
- **text (#e9ebdf):** the primary foreground / body-text color.
- **accent-1 (#cbccc4):** a supporting accent (used for links).
- **accent-2 (#f7f8f4):** a secondary accent (used for badges/tags).
- **on-accent-2 (#111111):** the readable foreground on the secondary accent.
- **border (#433e38):** the hairline color for dividers, card edges, and input borders.
- **muted-surface (#242424):** a subtle secondary surface fill for panels and sections.

## Typography

Primary typeface: **ui-sans-serif**, with saansFont, pxGroteskFont. Sizes range 12px–72px across 9 level(s); weights observed: 300, 380, 400, 570.

## Layout

Spacing follows an observed scale of 4px, 8px, 12px, 16px, 20px, 24px, 40px — usable for padding, gaps, and margins.

## Elevation & Depth

Depth is conveyed with 2 shadow level(s) observed on the page, smallest to largest (see the `shadows` tokens in the front matter):

- **sm:** `rgba(0, 0, 0, 0.12) 0px 1px 2px 0px, rgb(0, 0, 0) 0px 0px 0px 0.5px`
- **md:** `rgba(0, 0, 0, 0.35) 0px 68px 116px 0px`

_Apply these as `box-shadow` — the smaller levels on resting cards and inputs, the larger on overlays (dropdowns, modals). Don't invent intermediate shadows; this is the page's whole elevation vocabulary._

## Shapes

Corner radii observed: 4px, 6px, 8px, 20px, 36px. Use the smaller values for inputs and chips, larger for cards and surfaces.

## Components

- **Primary button:** filled with the primary color (`{colors.primary}`) and `{colors.on-primary}` text, rounded to `{rounded.md}`, set in `{typography.body-lg}`, 36px tall as observed.
- **Primary button (hover):** background shifts to `{colors.primary-hover}` — observed on the live site, use it for `:hover` instead of a computed darken.
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

- **Fonts:** the brand face `ui-sans-serif` likely isn't installed locally. Use the full stack `ui-sans-serif, system-ui, sans-serif` verbatim — it falls back to `sans-serif`, so expect slightly different metrics; keep the declared weights and letterSpacing to stay on-brand.
- **Primary actions:** `primary` (#518dd2) with `on-primary` (#111111) text is 5.5:1 (passes AA). Reserve `primary` for the single most important action per view.
- **Links:** use `accent-1` (#cbccc4) for inline links, distinct from the `primary` button color.
- **Shape:** stay on the `rounded` scale — small values for inputs/buttons, larger for cards, `full` only for pills and avatars. Don't introduce radii outside it.
- **Spacing:** compose padding, gaps, and margins from the `spacing` scale (a 4px-based rhythm) rather than arbitrary pixel values.
- **Declared tokens:** the site publishes its design scale as CSS custom properties — fonts (`--font-saans`, `--font-px-grotesk`) — and the page really uses these exact values. Treat them as the canonical scale and reuse the site's own variable names when you create tokens.
