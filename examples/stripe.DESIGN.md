---
version: alpha
name: "Stripe | Financial Infrastructure to Grow Your Revenue"
description: "Auto-extracted from https://stripe.com by DesignScan."
colors:
  primary: "#533afd"
  on-primary: "#ffffff"
  secondary: "#e2e4ff"
  on-secondary: "#533afd"
  primary-hover: "#4032c8"
  background: "#ffffff"
  text: "#64748d"
  accent-1: "#50617a"
  accent-2: "#061b31"
  on-accent-2: "#ffffff"
  border: "#e5edf5"
  muted-surface: "#f8fafd"
  error: "#d8351e"
  success: "#00b261"
typography:
  display:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: 48px
    fontWeight: "300"
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline-lg:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: 32px
    fontWeight: "300"
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline-md:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: 26px
    fontWeight: "300"
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline-sm:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: 22px
    fontWeight: "300"
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body-lg:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 1.4
  body:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 1.4
  label:
    fontFamily: "sohne-var, \"SF Pro Display\", sans-serif"
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
shadows:
  sm: "rgba(23, 23, 23, 0.06) 0px 3px 6px 0px"
  md: "rgba(50, 50, 93, 0.12) 0px 16px 32px 0px"
  lg: "rgba(23, 23, 23, 0.08) 0px 15px 35px 0px"
  xl: "rgba(0, 0, 0, 0.1) 0px 30px 60px -50px, rgba(50, 50, 93, 0.25) 0px 30px 60px -10px"
breakpoints:
  sm: 480px
  md: 600px
  lg: 640px
  xl: 840px
  2xl: 940px
  3xl: 1300px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: 48px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: 48px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
    height: 48px
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
  error-message:
    textColor: "{colors.error}"
    typography: "{typography.body}"
  success-message:
    textColor: "{colors.success}"
    typography: "{typography.body}"
---

## Overview

Auto-extracted from https://stripe.com by DesignScan on 2026-06-13. These tokens reflect the computed styles observed on the live page — a high-fidelity starting point. Refine the rationale below before shipping.

## Colors

**Brand & actions**

- **primary (#533afd):** the dominant brand/accent color, used for primary actions.
- **on-primary (#ffffff):** the readable foreground used on primary surfaces.
- **secondary (#e2e4ff):** the secondary action button's fill, beside the primary CTA.
- **on-secondary (#533afd):** the readable foreground on the secondary button.
- **primary-hover (#4032c8):** the primary button background as observed on hover.

**Surfaces & text**

- **background (#ffffff):** the base surface color behind most content.
- **text (#64748d):** the primary foreground / body-text color.
- **border (#e5edf5):** the hairline color for dividers, card edges, and input borders.
- **muted-surface (#f8fafd):** a subtle secondary surface fill for panels and sections.

**Accents**

- **accent-1 (#50617a):** a supporting accent (used for links).
- **accent-2 (#061b31):** a secondary accent (used for badges/tags).
- **on-accent-2 (#ffffff):** the readable foreground on the secondary accent.

**Feedback**

- **error (#d8351e):** the feedback color for errors, destructive actions, and invalid input.
- **success (#00b261):** the feedback color for success and confirmation states.

## Typography

Primary typeface: **sohne-var**. Sizes range 12px–48px across 7 level(s); weights observed: 300, 400.

## Layout

Content sits in a horizontally centered container capped at **1266px** — cap top-level page sections at this width rather than letting text run the full viewport.

The page reshapes at 6 observed breakpoint(s): 480px, 600px, 640px, 840px, 940px, 1300px (see the `breakpoints` tokens in the front matter). Write `@media (min-width: …)` rules at these exact boundaries instead of a framework's defaults.

Spacing follows an observed scale of 4px, 8px, 12px, 16px, 20px, 24px, 32px — usable for padding, gaps, and margins.

## Elevation & Depth

Depth is conveyed with 4 shadow level(s) observed on the page, smallest to largest (see the `shadows` tokens in the front matter):

- **sm:** `rgba(23, 23, 23, 0.06) 0px 3px 6px 0px`
- **md:** `rgba(50, 50, 93, 0.12) 0px 16px 32px 0px`
- **lg:** `rgba(23, 23, 23, 0.08) 0px 15px 35px 0px`
- **xl:** `rgba(0, 0, 0, 0.1) 0px 30px 60px -50px, rgba(50, 50, 93, 0.25) 0px 30px 60px -10px`

_Apply these as `box-shadow` — the smaller levels on resting cards and inputs, the larger on overlays (dropdowns, modals). Don't invent intermediate shadows; this is the page's whole elevation vocabulary._

## Shapes

Corner radii observed: 2px, 4px, 6px, 8px, 16px. Use the smaller values for inputs and chips, larger for cards and surfaces.

## Components

- **Primary button:** filled with the primary color (`{colors.primary}`) and `{colors.on-primary}` text, rounded to `{rounded.md}`, set in `{typography.body-lg}`, 48px tall as observed.
- **Primary button (hover):** background shifts to `{colors.primary-hover}` — observed on the live site, use it for `:hover` instead of a computed darken.
- **Secondary button:** the second filled style observed beside the primary — `{colors.secondary}` background with `{colors.on-secondary}` text, for secondary actions (cancel, back, alternate CTA).
- **Surface / card & input:** `{colors.background}` with `{colors.text}` foreground.
- **Link:** `{colors.accent-1}` text for inline links.
- **Badge / tag:** `{colors.accent-2}` background with `{colors.on-accent-2}` text.
- **Divider:** a 1px rule in `{colors.border}` — also the hairline for card edges and input borders.
- **Muted surface:** `{colors.muted-surface}` for subtle secondary panels and sections.
- **Feedback messages:** `{colors.error}`, `{colors.success}` for validation, alerts, and status text/icons (the site's declared semantic colors).

## Do's and Don'ts

- **Do** reserve `primary` for the most important actions.
- **Don't** treat these auto-extracted values as final — verify contrast and intent before production.

## Notes for your coding agent

Computed from this extraction — act on these before treating the tokens as final:

- **Headings:** the `text` token (#64748d) sits at 4.7:1 on `background` — fine for body copy, but it reads muted at display sizes. For large headings use `accent-2` (#061b31, 17.4:1) to keep visual hierarchy. Reserve `text` for paragraph and UI copy.
- **Fonts:** the brand face `sohne-var` likely isn't installed locally. Use the full stack `sohne-var, "SF Pro Display", sans-serif` verbatim — it falls back to `sans-serif`, so expect slightly different metrics; keep the declared weights and letterSpacing to stay on-brand.
- **Primary actions:** `primary` (#533afd) with `on-primary` (#ffffff) text is 6.2:1 (passes AA). Reserve `primary` for the single most important action per view.
- **Secondary actions:** a second filled button (`secondary`, #e2e4ff) was observed beside the primary. Use it for cancel/back/alternate actions and keep `primary` for the one main action.
- **Links:** use `accent-1` (#50617a) for inline links, distinct from the `primary` button color.
- **Shape:** stay on the `rounded` scale — small values for inputs/buttons, larger for cards, `full` only for pills and avatars. Don't introduce radii outside it.
- **Spacing:** compose padding, gaps, and margins from the `spacing` scale (a 4px-based rhythm) rather than arbitrary pixel values.
- **Status colors:** the site declares `error` (#d8351e), `success` (#00b261). Use these for validation, alerts, and status icons/text at full strength; for alert *backgrounds* tint them (~8–12% alpha) rather than filling with the solid color, and pair solid fills with a contrast-checked foreground.
- **Layout:** center page content in a container capped at `1266px`; write `@media (min-width: …)` rules at the observed boundaries (480px, 600px, 640px, 840px, 940px, 1300px), not at a framework's defaults.
- **Declared tokens:** the site publishes its design scale as CSS custom properties — radii (`--hds-space-core-radius-xs: 2px`, `--hds-space-core-radius-sm: 4px`, `--hds-space-core-radius-md: 6px`, `--hds-space-core-radius-lg: 16px`); spacing (`--hds-space-core-1: 1px`, `--hds-space-core-25: 2px`, `--hds-space-core-50: 4px`, `--hds-space-core-75: 6px`); fonts (`--hds-font-family`) — and the page really uses these exact values. Treat them as the canonical scale and reuse the site's own variable names when you create tokens.
