---
version: alpha
name: "Stripe | Financial Infrastructure to Grow Your Revenue"
description: "Auto-extracted from https://stripe.com by DesignScan."
colors:
  primary: "#533afd"
  on-primary: "#ffffff"
  background: "#ffffff"
  text: "#64748d"
  accent-1: "#50617a"
  accent-2: "#061b31"
  on-accent-2: "#ffffff"
typography:
  display:
    fontFamily: "sohne-var"
    fontSize: 48px
    fontWeight: "300"
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline-lg:
    fontFamily: "sohne-var"
    fontSize: 32px
    fontWeight: "300"
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline-md:
    fontFamily: "sohne-var"
    fontSize: 26px
    fontWeight: "300"
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline-sm:
    fontFamily: "sohne-var"
    fontSize: 22px
    fontWeight: "300"
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  body-lg:
    fontFamily: "sohne-var"
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.4
  body:
    fontFamily: "sohne-var"
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.4
  label:
    fontFamily: "sohne-var"
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 1.4
rounded:
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 16px
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
---

## Overview

Auto-extracted from https://stripe.com by DesignScan on 2026-06-06. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

- **primary (#533afd):** the dominant brand/accent color, used for primary actions.
- **on-primary (#ffffff):** the readable foreground used on primary surfaces.
- **background (#ffffff):** the base surface color behind most content.
- **text (#64748d):** the primary foreground / body-text color.
- **accent-1 (#50617a):** a supporting accent (used for links).
- **accent-2 (#061b31):** a secondary accent (used for badges/tags).
- **on-accent-2 (#ffffff):** the readable foreground on the secondary accent.

## Typography

Primary typeface: **sohne-var**. Sizes range 12px–48px across 7 level(s); weights observed: 300, 400.

## Layout

Spacing follows an observed scale of 4px, 8px, 12px, 16px, 20px, 24px, 32px — usable for padding, gaps, and margins.

## Elevation & Depth

Depth is conveyed with 4 shadow level(s) observed on the page.

## Shapes

Corner radii observed: 2px, 4px, 6px, 8px, 16px. Use the smaller values for inputs and chips, larger for cards and surfaces.

## Components

- **Primary button:** filled with the primary color (`{colors.primary}`) and `{colors.on-primary}` text, rounded to `{rounded.md}`.
- **Surface / card & input:** `{colors.background}` with `{colors.text}` foreground.
- **Link:** `{colors.accent-1}` text for inline links.
- **Badge / tag:** `{colors.accent-2}` background with `{colors.on-accent-2}` text.

## Do's and Don'ts

- **Do** reserve `primary` for the most important actions.
- **Don't** treat these auto-extracted values as final — verify contrast and intent before production.
