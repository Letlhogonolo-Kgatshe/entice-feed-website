# Entice Feed: Agri-SaaS Website

![HTML](https://img.shields.io/badge/HTML5-E34F26) ![Tailwind](https://img.shields.io/badge/Tailwind%20CSS-38B2AC) ![Chart.js](https://img.shields.io/badge/Chart.js-FF6384) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E)

Marketing and product website for **Entice Feed Pty Ltd**, a South African agricultural Software-as-a-Service start-up connecting farmers, input suppliers, buyers, financial institutions and government in one digital ecosystem.

**Live:** https://letlhogonolo-kgatshe.github.io/entice-feed-website/

![Entice Feed homepage](docs/screenshot.jpg)

## Pages

| Page | What it offers |
|---|---|
| **Home** (`index.html`) | Live "El Niño watch" hero, impact stats, a "who it's for" role picker that deep-links to each stakeholder's tools, how it works, and the six platform pillars |
| **Platform** (`platform.html`) | Ecosystem tabs per stakeholder (open directly with `platform.html#farmers`, `#suppliers`, `#financial`, `#buyers`, `#government`), real SA yields vs El Niño, sample produce auctions with countdowns, and the plant tracking dashboard |
| **Live data** (`insights.html`) | El Niño (ONI) outlook, 6-month rand maize price forecast, ECMWF seasonal rainfall per growing region, live 7-day weather and soil moisture, and the methodology (`#method`) |
| **Plans** (`pricing.html`) | Smallholder, Commercial and Enterprise tiers, plus the FAQ |
| **Contact** (`contact.html`) | Validated form that opens the visitor's email app; calls to action across the site pre-fill the topic (`contact.html?topic=…`) |

All pages share one header, footer and theme (`assets/site.js`, `assets/site.css`, `assets/theme.js`). The live-data widgets live in `assets/live.js`, which skips any widget that isn't on the current page.

Auction lots and plant-tracking rows are labelled as sample data. The climate, yield and price figures are real.

## Live data & forecasting

`scripts/update-data.mjs` runs **every Monday** through GitHub Actions (`.github/workflows/update-data.yml`, which can also be run manually). It pulls free public data, fits the models and commits `data/agri-data.json`, which the page reads.

| Data | Source (free, no API key) |
|---|---|
| El Niño index (ONI), 1950–present | NOAA PSL / CPC |
| South Africa cereal yield, 1961–present | World Bank WDI `AG.YLD.CREL.KG` |
| Maize price, USD/t (monthly) | World Bank Pink Sheet |
| USD/ZAR | Frankfurter (ECB reference rates) |
| Seasonal rainfall forecast + 1991–2020 normals | Open-Meteo (ECMWF SEAS5, ERA5) |
| 7-day weather & soil moisture (fetched live in the browser) | Open-Meteo Forecast API |

**Models.** All are fitted from the data each run, so no effect is hard-coded:
- **El Niño outlook:** AR(1) persistence model on the monthly ONI.
- **Harvest outlook:** `log(yield) = a + trend·year + β·ONI(Nov–Feb)`. El Niño seasons cut SA cereal yields by about 9% per +1 ONI.
- **Price outlook:** 1–6-month log returns regressed on ONI and the gap from the 12-month average, with 80% ranges.

These are indicative decision-support figures, not financial or agronomic advice.

```bash
cd scripts && npm ci && cd .. && node scripts/update-data.mjs
```

## Tech

A single `index.html` (plus `data/agri-data.json`) with **Tailwind CSS** (CDN, custom brand theme), **Chart.js 4**, inline SVG icons and vanilla JavaScript. It has no build step. Accessibility features include a skip link, ARIA tabs, live regions, visible focus styles and `prefers-reduced-motion` support. The layout is responsive, from phone to desktop.

## Running locally

```bash
npx http-server .
```

---

Freelance client project (2025, redesigned 2026) by **Letlhogonolo Kgatshe**.
