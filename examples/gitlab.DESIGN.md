---
version: alpha
name: "Finally, AI for the entire software lifecycle."
description: "Auto-extracted from https://gitlab.com by DesignScan."
colors:
  primary: "#7759c2"
  on-primary: "#ffffff"
  background: "#171321"
  text: "#ffffff"
  accent-1: "#74717a"
  accent-2: "#d1d0d3"
  on-accent-2: "#111111"
  border: "#1f1c2e"
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
  lg: 32px
  full: 9999px
spacing:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
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

Auto-extracted from https://gitlab.com by DesignScan on 2026-06-08. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

- **primary (#7759c2):** the dominant brand/accent color, used for primary actions.
- **on-primary (#ffffff):** the readable foreground used on primary surfaces.
- **background (#171321):** the base surface color behind most content.
- **text (#ffffff):** the primary foreground / body-text color.
- **accent-1 (#74717a):** a supporting accent (used for links).
- **accent-2 (#d1d0d3):** a secondary accent (used for badges/tags).
- **on-accent-2 (#111111):** the readable foreground on the secondary accent.
- **border (#1f1c2e):** the hairline color for dividers, card edges, and input borders.

## Typography

Primary typeface: **GitLab Sans**. Sizes range 14px–96px across 8 level(s); weights observed: 400, 580, 600, 660, 700.

## Layout

Spacing follows an observed scale of 8px, 12px, 16px, 24px, 32px, 48px, 64px — usable for padding, gaps, and margins.

## Elevation & Depth

Depth is conveyed with 2 shadow level(s) observed on the page.

## Shapes

Corner radii observed: 4px, 8px, 16px, 32px. Use the smaller values for inputs and chips, larger for cards and surfaces.

## Components

- **Primary button:** filled with the primary color (`{colors.primary}`) and `{colors.on-primary}` text, rounded to `{rounded.md}`.
- **Surface / card & input:** `{colors.background}` with `{colors.text}` foreground.
- **Link:** `{colors.accent-1}` text for inline links.
- **Badge / tag:** `{colors.accent-2}` background with `{colors.on-accent-2}` text.
- **Divider:** a 1px rule in `{colors.border}` — also the hairline for card edges and input borders.

## Do's and Don'ts

- **Do** reserve `primary` for the most important actions.
- **Don't** treat these auto-extracted values as final — verify contrast and intent before production.
