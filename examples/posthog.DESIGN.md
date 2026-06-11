---
version: alpha
name: "PostHog – We make dev tools for product engineers"
description: "Auto-extracted from https://posthog.com by DesignScan."
colors:
  primary: "#eb9d2a"
  on-primary: "#111111"
  background: "#ffffff"
  text: "#374151"
  accent-1: "#4d4f46"
  accent-2: "#111827"
  on-accent-2: "#ffffff"
  border: "#bfc1b7"
  muted-surface: "#eeefe9"
typography:
  headline-sm:
    fontFamily: "\"IBM Plex Sans Variable\", \"IBM Plex Sans\", -apple-system, system-ui, \"avenir next\", avenir, \"segoe ui\", \"helvetica neue\", helvetica, Ubuntu, roboto, noto, arial, sans-serif"
    fontSize: 24px
    fontWeight: "700"
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  title:
    fontFamily: "\"IBM Plex Sans Variable\", \"IBM Plex Sans\", -apple-system, system-ui, \"avenir next\", avenir, \"segoe ui\", \"helvetica neue\", helvetica, Ubuntu, roboto, noto, arial, sans-serif"
    fontSize: 21px
    fontWeight: "700"
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  title-18:
    fontFamily: "\"IBM Plex Sans Variable\", \"IBM Plex Sans\", -apple-system, system-ui, \"avenir next\", avenir, \"segoe ui\", \"helvetica neue\", helvetica, Ubuntu, roboto, noto, arial, sans-serif"
    fontSize: 18px
    fontWeight: "700"
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  body:
    fontFamily: "\"IBM Plex Sans Variable\", \"IBM Plex Sans\", -apple-system, system-ui, \"avenir next\", avenir, \"segoe ui\", \"helvetica neue\", helvetica, Ubuntu, roboto, noto, arial, sans-serif"
    fontSize: 15px
    fontWeight: "400"
    lineHeight: 1.71
  label:
    fontFamily: "\"IBM Plex Sans Variable\", \"IBM Plex Sans\", -apple-system, system-ui, \"avenir next\", avenir, \"segoe ui\", \"helvetica neue\", helvetica, Ubuntu, roboto, noto, arial, sans-serif"
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 1.71
rounded:
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
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
  sm: "rgba(255, 255, 255, 0.4) 0px 0px 6px 2px"
  md: "rgba(0, 0, 0, 0.25) 0px 25px 50px -12px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: 30px
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

Auto-extracted from https://posthog.com by DesignScan on 2026-06-11. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

- **primary (#eb9d2a):** the dominant brand/accent color, used for primary actions.
- **on-primary (#111111):** the readable foreground used on primary surfaces.
- **background (#ffffff):** the base surface color behind most content.
- **text (#374151):** the primary foreground / body-text color.
- **accent-1 (#4d4f46):** a supporting accent (used for links).
- **accent-2 (#111827):** a secondary accent (used for badges/tags).
- **on-accent-2 (#ffffff):** the readable foreground on the secondary accent.
- **border (#bfc1b7):** the hairline color for dividers, card edges, and input borders.
- **muted-surface (#eeefe9):** a subtle secondary surface fill for panels and sections.

## Typography

Primary typeface: **IBM Plex Sans Variable**, with ui-monospace, Source Code Pro. Sizes range 13px–24px across 5 level(s); weights observed: 400, 500, 600, 700, 800.

## Layout

Spacing follows an observed scale of 4px, 8px, 12px, 16px, 20px, 24px, 32px — usable for padding, gaps, and margins.

## Elevation & Depth

Depth is conveyed with 2 shadow level(s) observed on the page, smallest to largest (see the `shadows` tokens in the front matter):

- **sm:** `rgba(255, 255, 255, 0.4) 0px 0px 6px 2px`
- **md:** `rgba(0, 0, 0, 0.25) 0px 25px 50px -12px`

_Apply these as `box-shadow` — the smaller levels on resting cards and inputs, the larger on overlays (dropdowns, modals). Don't invent intermediate shadows; this is the page's whole elevation vocabulary._

## Shapes

Corner radii observed: 2px, 4px, 6px, 8px. Use the smaller values for inputs and chips, larger for cards and surfaces.

## Components

- **Primary button:** filled with the primary color (`{colors.primary}`) and `{colors.on-primary}` text, rounded to `{rounded.md}`, set in `{typography.body}`, 30px tall as observed.
- **Primary button (pressed, micro-interaction):** moves `translateY(-1.5px)` — the press physically reshapes the button, not just its color.
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

- **Headings:** the `text` token (#374151) sits at 10.3:1 on `background` — fine for body copy, but it reads muted at display sizes. For large headings use `accent-2` (#111827, 17.7:1) to keep visual hierarchy. Reserve `text` for paragraph and UI copy.
- **Fonts:** the brand face `IBM Plex Sans Variable` likely isn't installed locally. Use the full stack `"IBM Plex Sans Variable", "IBM Plex Sans", -apple-system, system-ui, "avenir next", avenir, "segoe ui", "helvetica neue", helvetica, Ubuntu, roboto, noto, arial, sans-serif` verbatim — it falls back to `sans-serif`, so expect slightly different metrics; keep the declared weights and letterSpacing to stay on-brand.
- **Primary actions:** `primary` (#eb9d2a) with `on-primary` (#111111) text is 8.4:1 (passes AA). Reserve `primary` for the single most important action per view.
- **Primary button hover:** observed on the live site, the button also moves (`transform: translateY(-3px)`) on `:hover` (its background color does not change). Reproduce this for fidelity.
- **Links:** use `accent-1` (#4d4f46) for inline links, distinct from the `primary` button color.
- **Shape:** stay on the `rounded` scale — small values for inputs/buttons, larger for cards, `full` only for pills and avatars. Don't introduce radii outside it.
- **Spacing:** compose padding, gaps, and margins from the `spacing` scale (a 4px-based rhythm) rather than arbitrary pixel values.
