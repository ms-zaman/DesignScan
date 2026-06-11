---
version: alpha
name: "Finally, AI for the entire software lifecycle."
description: "Auto-extracted from https://gitlab.com by DesignScan."
colors:
  primary: "#7759c2"
  on-primary: "#ffffff"
  background: "#ffffff"
  text: "#171321"
  accent-1: "#74717a"
  accent-2: "#1f1c2e"
  on-accent-2: "#ffffff"
  border: "#e8e7eb"
  muted-surface: "#ebeaec"
typography:
  display:
    fontFamily: "\"GitLab Sans\", sans-serif"
    fontSize: 96px
    fontWeight: "660"
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  display-64:
    fontFamily: "\"GitLab Sans\", sans-serif"
    fontSize: 64px
    fontWeight: "660"
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  display-40:
    fontFamily: "\"GitLab Sans\", sans-serif"
    fontSize: 40px
    fontWeight: "660"
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  headline-lg:
    fontFamily: "\"GitLab Sans\", sans-serif"
    fontSize: 32px
    fontWeight: "660"
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  headline-sm:
    fontFamily: "\"GitLab Sans\", sans-serif"
    fontSize: 24px
    fontWeight: "660"
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  title:
    fontFamily: "\"GitLab Sans\", sans-serif"
    fontSize: 18px
    fontWeight: "660"
    lineHeight: 1.06
    letterSpacing: "-0.03em"
  body-lg:
    fontFamily: "\"GitLab Sans\", sans-serif"
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.5
  body:
    fontFamily: "\"GitLab Sans\", sans-serif"
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.5
rounded:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
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
  sm: "rgba(0, 0, 0, 0.06) 0px 1px 3px 0px"
  md: "rgba(0, 0, 0, 0.08) 0px -4px 20px 0px"
  lg: "rgba(0, 0, 0, 0.12) 0px 0px 24px 0px"
  xl: "rgba(0, 0, 0, 0.01) 0px 52px 21px 0px, rgba(0, 0, 0, 0.03) 0px 29px 17px 0px, rgba(0, 0, 0, 0.04) 0px 13px 13px 0px, rgba(0, 0, 0, 0.05) 0px 3px 7px 0px"
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

Auto-extracted from https://gitlab.com by DesignScan on 2026-06-11. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

- **primary (#7759c2):** the dominant brand/accent color, used for primary actions.
- **on-primary (#ffffff):** the readable foreground used on primary surfaces.
- **background (#ffffff):** the base surface color behind most content.
- **text (#171321):** the primary foreground / body-text color.
- **accent-1 (#74717a):** a supporting accent (used for links).
- **accent-2 (#1f1c2e):** a secondary accent (used for badges/tags).
- **on-accent-2 (#ffffff):** the readable foreground on the secondary accent.
- **border (#e8e7eb):** the hairline color for dividers, card edges, and input borders.
- **muted-surface (#ebeaec):** a subtle secondary surface fill for panels and sections.

## Typography

Primary typeface: **GitLab Sans**, with Inter. Sizes range 14px–96px across 8 level(s); weights observed: 400, 580, 600, 660, 700.

## Layout

Spacing follows an observed scale of 4px, 8px, 12px, 16px, 24px, 32px, 48px — usable for padding, gaps, and margins.

## Elevation & Depth

Depth is conveyed with 4 shadow level(s) observed on the page, smallest to largest (see the `shadows` tokens in the front matter):

- **sm:** `rgba(0, 0, 0, 0.06) 0px 1px 3px 0px`
- **md:** `rgba(0, 0, 0, 0.08) 0px -4px 20px 0px`
- **lg:** `rgba(0, 0, 0, 0.12) 0px 0px 24px 0px`
- **xl:** `rgba(0, 0, 0, 0.01) 0px 52px 21px 0px, rgba(0, 0, 0, 0.03) 0px 29px 17px 0px, rgba(0, 0, 0, 0.04) 0px 13px 13px 0px, rgba(0, 0, 0, 0.05) 0px 3px 7px 0px`

_Apply these as `box-shadow` — the smaller levels on resting cards and inputs, the larger on overlays (dropdowns, modals). Don't invent intermediate shadows; this is the page's whole elevation vocabulary._

## Shapes

Corner radii observed: 4px, 8px, 16px, 24px, 32px. Use the smaller values for inputs and chips, larger for cards and surfaces.

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

- **Fonts:** the brand face `GitLab Sans` likely isn't installed locally. Use the full stack `"GitLab Sans", sans-serif` verbatim — it falls back to `sans-serif`, so expect slightly different metrics; keep the declared weights and letterSpacing to stay on-brand.
- **Primary actions:** `primary` (#7759c2) with `on-primary` (#ffffff) text is 5.3:1 (passes AA). Reserve `primary` for the single most important action per view.
- **Links:** use `accent-1` (#74717a) for inline links, distinct from the `primary` button color.
- **Shape:** stay on the `rounded` scale — small values for inputs/buttons, larger for cards, `full` only for pills and avatars. Don't introduce radii outside it.
- **Spacing:** compose padding, gaps, and margins from the `spacing` scale (a 4px-based rhythm) rather than arbitrary pixel values.
