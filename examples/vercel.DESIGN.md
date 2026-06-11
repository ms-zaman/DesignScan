---
version: alpha
name: "Vercel: Build and deploy the best web experiences with the AI Cloud"
description: "Auto-extracted from https://vercel.com by DesignScan."
colors:
  primary: "#171717"
  on-primary: "#ffffff"
  primary-hover: "#383838"
  background: "#fafafa"
  text: "#4d4d4d"
  accent-1: "#666666"
  accent-2: "#8f8f8f"
  on-accent-2: "#111111"
typography:
  headline-lg:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: 32px
    fontWeight: "600"
    lineHeight: 1.25
    letterSpacing: "-0.04em"
  headline-sm:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 1.25
    letterSpacing: "-0.04em"
  body-lg:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.5
  body:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.5
  label:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 1.5
rounded:
  xs: 2px
  sm: 4px
  md: 6px
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
  sm: "rgb(235, 235, 235) 0px 0px 0px 1px"
  md: "rgba(0, 0, 0, 0.08) 0px 0px 0px 1px, rgba(0, 0, 0, 0.04) 0px 2px 2px 0px, rgb(250, 250, 250) 0px 0px 0px 1px"
  lg: "rgb(255, 255, 255) 0px 0px 0px 2px, rgb(0, 114, 245) 0px 0px 0px 4px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: 32px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: 32px
  surface:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
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
---

## Overview

Auto-extracted from https://vercel.com by DesignScan on 2026-06-11. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

- **primary (#171717):** the dominant brand/accent color, used for primary actions.
- **on-primary (#ffffff):** the readable foreground used on primary surfaces.
- **primary-hover (#383838):** the primary button background as observed on hover.
- **background (#fafafa):** the base surface color behind most content.
- **text (#4d4d4d):** the primary foreground / body-text color.
- **accent-1 (#666666):** a supporting accent (used for links).
- **accent-2 (#8f8f8f):** a secondary accent (used for badges/tags).
- **on-accent-2 (#111111):** the readable foreground on the secondary accent.

## Typography

Primary typeface: **Geist**, with geistMonoFont. Sizes range 12px–32px across 5 level(s); weights observed: 400, 500, 600.

## Layout

Spacing follows an observed scale of 4px, 8px, 12px, 16px, 24px, 32px, 40px — usable for padding, gaps, and margins.

## Elevation & Depth

Depth is conveyed with 3 shadow level(s) observed on the page, smallest to largest (see the `shadows` tokens in the front matter):

- **sm:** `rgb(235, 235, 235) 0px 0px 0px 1px`
- **md:** `rgba(0, 0, 0, 0.08) 0px 0px 0px 1px, rgba(0, 0, 0, 0.04) 0px 2px 2px 0px, rgb(250, 250, 250) 0px 0px 0px 1px`
- **lg:** `rgb(255, 255, 255) 0px 0px 0px 2px, rgb(0, 114, 245) 0px 0px 0px 4px`

_Apply these as `box-shadow` — the smaller levels on resting cards and inputs, the larger on overlays (dropdowns, modals). Don't invent intermediate shadows; this is the page's whole elevation vocabulary._

## Shapes

Corner radii observed: 2px, 4px, 6px. Use the smaller values for inputs and chips, larger for cards and surfaces.

## Components

- **Primary button:** filled with the primary color (`{colors.primary}`) and `{colors.on-primary}` text, rounded to `{rounded.md}`, set in `{typography.body}`, 32px tall as observed.
- **Primary button (hover):** background shifts to `{colors.primary-hover}` — observed on the live site, use it for `:hover` instead of a computed darken.
- **Surface / card & input:** `{colors.background}` with `{colors.text}` foreground.
- **Link:** `{colors.accent-1}` text for inline links.
- **Badge / tag:** `{colors.accent-2}` background with `{colors.on-accent-2}` text.

## Do's and Don'ts

- **Do** reserve `primary` for the most important actions.
- **Don't** treat these auto-extracted values as final — verify contrast and intent before production.

## Notes for your coding agent

Computed from this extraction — act on these before treating the tokens as final:

- **Headings:** the `text` token (#4d4d4d) sits at 8.1:1 on `background` — fine for body copy, but it reads muted at display sizes. For large headings use `primary` (#171717, 17.2:1) to keep visual hierarchy. Reserve `text` for paragraph and UI copy.
- **Fonts:** the brand face `Geist` likely isn't installed locally. Use the full stack `Geist, Arial, sans-serif` verbatim — it falls back to `sans-serif`, so expect slightly different metrics; keep the declared weights and letterSpacing to stay on-brand.
- **Primary actions:** `primary` (#171717) with `on-primary` (#ffffff) text is 17.9:1 (passes AA). Reserve `primary` for the single most important action per view.
- **Links:** use `accent-1` (#666666) for inline links, distinct from the `primary` button color.
- **Shape:** stay on the `rounded` scale — small values for inputs/buttons, larger for cards, `full` only for pills and avatars. Don't introduce radii outside it.
- **Spacing:** compose padding, gaps, and margins from the `spacing` scale (a 4px-based rhythm) rather than arbitrary pixel values.
- **Declared tokens:** the site publishes its design scale as CSS custom properties — radii (`--geist-radius: 6px`); spacing (`--spacing: 4px`, `--geist-space-2x: 8px`, `--geist-gap-half: 12px`, `--geist-space-4x: 16px`); fonts (`--font-mono`, `--font-sans`) — and the page paints these exact values. Treat them as the canonical scale and reuse the site's own variable names when you create tokens.
