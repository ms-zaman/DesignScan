---
version: alpha
name: "PostHog – We make dev tools for product engineers"
description: "Auto-extracted from https://posthog.com by DesignScan."
colors:
  primary: "#cd8407"
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

Auto-extracted from https://posthog.com by DesignScan on 2026-06-08. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

- **primary (#cd8407):** the dominant brand/accent color, used for primary actions.
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

Depth is conveyed with 2 shadow level(s) observed on the page.

## Shapes

Corner radii observed: 2px, 4px, 6px, 8px. Use the smaller values for inputs and chips, larger for cards and surfaces.

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
