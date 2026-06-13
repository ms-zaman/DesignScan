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
  error: "#ee0000"
  warning: "#f5a623"
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
breakpoints:
  sm: 401px
  md: 601px
  lg: 641px
  xl: 769px
  2xl: 961px
  3xl: 1200px
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
  error-message:
    textColor: "{colors.error}"
    typography: "{typography.body}"
  warning-message:
    textColor: "{colors.warning}"
    typography: "{typography.body}"
---

## Overview

Auto-extracted from https://vercel.com by DesignScan on 2026-06-13. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

**Brand & actions**

- **primary (#171717):** the dominant brand/accent color, used for primary actions.
- **on-primary (#ffffff):** the readable foreground used on primary surfaces.
- **primary-hover (#383838):** the primary button background as observed on hover.

**Surfaces & text**

- **background (#fafafa):** the base surface color behind most content.
- **text (#4d4d4d):** the primary foreground / body-text color.

**Accents**

- **accent-1 (#666666):** a supporting accent (used for links).
- **accent-2 (#8f8f8f):** a secondary accent (used for badges/tags).
- **on-accent-2 (#111111):** the readable foreground on the secondary accent.

**Feedback**

- **error (#ee0000):** the feedback color for errors, destructive actions, and invalid input.
- **warning (#f5a623):** the feedback color for warnings and caution states.

## Typography

Primary typeface: **Geist**, with geistMonoFont. Sizes range 12px–32px across 5 level(s); weights observed: 400, 500, 600.

## Layout

Content sits in a horizontally centered container capped at **1080px** — cap top-level page sections at this width rather than letting text run the full viewport.

The page reshapes at 6 observed breakpoint(s): 401px, 601px, 641px, 769px, 961px, 1200px (see the `breakpoints` tokens in the front matter). Write `@media (min-width: …)` rules at these exact boundaries instead of a framework's defaults.

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
- **Feedback messages:** `{colors.error}`, `{colors.warning}` for validation, alerts, and status text/icons (the site's declared semantic colors).

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
- **Status colors:** the site declares `error` (#ee0000), `warning` (#f5a623). Use these for validation, alerts, and status icons/text at full strength; for alert *backgrounds* tint them (~8–12% alpha) rather than filling with the solid color, and pair solid fills with a contrast-checked foreground.
- **Layout:** center page content in a container capped at `1080px`; write `@media (min-width: …)` rules at the observed boundaries (401px, 601px, 641px, 769px, 961px, 1200px), not at a framework's defaults.
- **Declared tokens:** the site publishes its design scale as CSS custom properties — radii (`--geist-radius: 6px`); spacing (`--spacing: 4px`, `--geist-space-2x: 8px`, `--geist-gap-half: 12px`, `--geist-space-4x: 16px`); fonts (`--font-mono`, `--font-sans`) — and the page really uses these exact values. Treat them as the canonical scale and reuse the site's own variable names when you create tokens.
