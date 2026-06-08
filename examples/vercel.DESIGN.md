---
version: alpha
name: "Vercel: Build and deploy the best web experiences with the AI Cloud"
description: "Auto-extracted from https://vercel.com by DesignScan."
colors:
  primary: "#171717"
  on-primary: "#ffffff"
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
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
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

Auto-extracted from https://vercel.com by DesignScan on 2026-06-08. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

- **primary (#171717):** the dominant brand/accent color, used for primary actions.
- **on-primary (#ffffff):** the readable foreground used on primary surfaces.
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

Depth is conveyed with 4 shadow level(s) observed on the page.

## Shapes

Corner radii observed: 2px, 4px, 6px. Use the smaller values for inputs and chips, larger for cards and surfaces.

## Components

- **Primary button:** filled with the primary color (`{colors.primary}`) and `{colors.on-primary}` text, rounded to `{rounded.md}`.
- **Surface / card & input:** `{colors.background}` with `{colors.text}` foreground.
- **Link:** `{colors.accent-1}` text for inline links.
- **Badge / tag:** `{colors.accent-2}` background with `{colors.on-accent-2}` text.

## Do's and Don'ts

- **Do** reserve `primary` for the most important actions.
- **Don't** treat these auto-extracted values as final — verify contrast and intent before production.
