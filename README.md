# Entice Feed: Agri-SaaS Website

![HTML](https://img.shields.io/badge/HTML5-E34F26) ![Tailwind](https://img.shields.io/badge/Tailwind%20CSS-38B2AC) ![Chart.js](https://img.shields.io/badge/Chart.js-FF6384) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E)

Marketing and product website for **Entice Feed Pty Ltd**, a South African agricultural Software-as-a-Service start-up connecting farmers, input suppliers, buyers, financial institutions and government in one digital ecosystem.

**Live:** https://letlhogonolo-kgatshe.github.io/entice-feed-website/

![Entice Feed homepage](docs/screenshot.jpg)

## Sections

| Section | What it does |
|---|---|
| **Hero** | Value proposition, demo and investor-deck calls to action, and a product preview with a Chart.js yield forecast |
| **Impact stats** | Key figures that count up as they scroll into view |
| **How it works** | Three-step onboarding: profile, insights, then sell and finance |
| **Platform** | Six pillars of the core differentiation strategy |
| **Ecosystem** | Accessible tabs (arrow-key navigation) for each stakeholder group and what they get |
| **AI insights** | Interactive price-forecast chart with a 6/12-month switch and a forecast band |
| **Produce auctions** | Sample live lots with countdown timers and bidding |
| **Plant tracking** | Crop health dashboard with search, status filters and moisture levels |
| **Plans** | Smallholder, Commercial and Enterprise subscription tiers |
| **FAQ** | Expandable answers to common questions |
| **Contact** | Validated form that opens the visitor's email app with the enquiry pre-filled; CTAs pre-select the topic |

Charts, auction lots and plant data are clearly labelled as illustrative sample data.

## Tech

A single `index.html` with **Tailwind CSS** (CDN, custom brand theme), **Chart.js 4**, inline SVG icons and vanilla JavaScript. It has no build step. Accessibility features include a skip link, ARIA tabs, live regions, visible focus styles and `prefers-reduced-motion` support. The layout is responsive, from phone to desktop.

## Running locally

```bash
npx http-server .
```

---

Freelance client project (2025, redesigned 2026) by **Letlhogonolo Kgatshe**.
