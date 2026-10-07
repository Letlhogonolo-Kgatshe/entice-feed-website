// Builds data/agri-data.json from free public sources and fits the
// forecast models shown on the site. Run weekly by GitHub Actions
// (.github/workflows/update-data.yml) or locally:  node scripts/update-data.mjs
//
// Sources (all free, no API key):
//   NOAA PSL / CPC   Oceanic Niño Index (ONI), monthly, 1950-present
//   World Bank       Pink Sheet monthly maize price (USD/t, US Gulf)
//   World Bank API   South Africa cereal yield (kg/ha), annual, 1961-present
//   Frankfurter/ECB  USD -> ZAR exchange rate
//   Open-Meteo       ECMWF seasonal precipitation forecast + 1991-2020 climate
import { writeFile, mkdir } from 'node:fs/promises';
import XLSX from 'xlsx';

const OUT = new URL('../data/agri-data.json', import.meta.url);

const REGIONS = [
    { id: 'fs',  name: 'Free State (Bothaville)', crop: 'Maize', lat: -27.39, lon: 26.62, season: 'summer' },
    { id: 'nw',  name: 'North West (Lichtenburg)', crop: 'Maize', lat: -26.15, lon: 26.16, season: 'summer' },
    { id: 'mp',  name: 'Mpumalanga (Bethal)',      crop: 'Maize & soybeans', lat: -26.46, lon: 29.47, season: 'summer' },
    { id: 'kzn', name: 'KwaZulu-Natal (Greytown)', crop: 'Maize & sugarcane', lat: -29.06, lon: 30.59, season: 'summer' },
    { id: 'wc',  name: 'Western Cape (Malmesbury)', crop: 'Wheat', lat: -33.46, lon: 18.73, season: 'winter' },
];

// ── helpers ──────────────────────────────────────────────────────────────
async function get(url, type = 'json', tries = 3) {
    for (let i = 1; ; i++) {
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'entice-feed-data-bot (GitHub Actions)' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return type === 'json' ? res.json() : type === 'text' ? res.text() : Buffer.from(await res.arrayBuffer());
        } catch (err) {
            if (i >= tries) throw new Error(`${url}: ${err.message}`);
            await new Promise((r) => setTimeout(r, 2000 * i));
        }
    }
}
const round = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const ym = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
function addMonths(key, n) {
    const [y, m] = key.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    return ym(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

// Ordinary least squares: y = X·b. Returns coefficients, standard errors, R².
function ols(X, y) {
    const n = X.length, k = X[0].length;
    const XtX = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0)));
    const Xty = Array.from({ length: k }, (_, i) => X.reduce((s, r, t) => s + r[i] * y[t], 0));
    const inv = invert(XtX);
    const b = inv.map((row) => row.reduce((s, v, j) => s + v * Xty[j], 0));
    const fitted = X.map((r) => r.reduce((s, v, j) => s + v * b[j], 0));
    const resid = y.map((v, t) => v - fitted[t]);
    const sse = resid.reduce((s, e) => s + e * e, 0);
    const ybar = mean(y);
    const sst = y.reduce((s, v) => s + (v - ybar) ** 2, 0);
    const sigma2 = sse / (n - k);
    return { b, se: inv.map((row, i) => Math.sqrt(sigma2 * row[i])), r2: 1 - sse / sst, sigma: Math.sqrt(sigma2), n };
}
function invert(M) {
    const n = M.length, A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
    for (let c = 0; c < n; c++) {
        let p = c;
        for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
        [A[c], A[p]] = [A[p], A[c]];
        const pv = A[c][c];
        for (let j = 0; j < 2 * n; j++) A[c][j] /= pv;
        for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
    }
    return A.map((r) => r.slice(n));
}

// ── 1. ENSO: Oceanic Niño Index ──────────────────────────────────────────
async function loadOni() {
    const text = await get('https://psl.noaa.gov/data/correlation/oni.data', 'text');
    const series = [];
    for (const line of text.split('\n')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length !== 13 || !/^\d{4}$/.test(parts[0])) continue;
        const year = +parts[0];
        parts.slice(1).forEach((v, i) => { const x = +v; if (x > -90) series.push({ month: ym(year, i + 1), oni: x }); });
    }
    if (series.length < 600) throw new Error('ONI series too short');
    return series;
}

function enso(series) {
    // AR(1) on monthly ONI (persistence with decay), fitted on 1950-present.
    const x = series.map((s) => s.oni);
    const fit = ols(x.slice(0, -1).map((v) => [1, v]), x.slice(1));
    const [c, phi] = fit.b;
    const last = series[series.length - 1];
    const forecast = [];
    let v = last.oni, varAcc = 0;
    for (let h = 1; h <= 9; h++) {
        v = c + phi * v;
        varAcc = varAcc * phi * phi + fit.sigma ** 2;
        forecast.push({ month: addMonths(last.month, h), oni: round(v), lo: round(v - 1.28 * Math.sqrt(varAcc)), hi: round(v + 1.28 * Math.sqrt(varAcc)) });
    }
    const phase = (o) => (o >= 0.5 ? 'El Niño' : o <= -0.5 ? 'La Niña' : 'Neutral');
    const strength = (o) => { const a = Math.abs(o); return a >= 2 ? 'very strong' : a >= 1.5 ? 'strong' : a >= 1 ? 'moderate' : a >= 0.5 ? 'weak' : ''; };
    return {
        latest: { ...last, phase: phase(last.oni), strength: strength(last.oni) },
        history: series.slice(-60),
        forecast,
        model: { type: 'AR(1) persistence', phi: round(phi, 3), sigma: round(fit.sigma, 3), n: fit.n },
    };
}

// ── 2. Yields: SA cereal yield vs El Niño ────────────────────────────────
async function loadYields() {
    const j = await get('https://api.worldbank.org/v2/country/ZAF/indicator/AG.YLD.CREL.KG?format=json&per_page=100&date=1961:2030');
    return j[1].filter((d) => d.value != null).map((d) => ({ year: +d.date, kgha: d.value })).sort((a, b) => a.year - b.year);
}

function yieldModel(yields, oniSeries, ensoOut) {
    // Summer crops are planted Oct-Dec and harvested Apr-Jun, so the harvest in
    // year Y depends on the Nov(Y-1)–Feb(Y) ONI. Model: log yield on a linear
    // trend (technology gains) plus that growing-season ONI.
    const oni = new Map(oniSeries.map((s) => [s.month, s.oni]));
    const seasonOni = (y) => {
        const v = [ym(y - 1, 11), ym(y - 1, 12), ym(y, 1), ym(y, 2)].map((k) => oni.get(k));
        return v.every((x) => x != null) ? mean(v) : null;
    };
    const rows = yields.filter((r) => r.year >= 1980).map((r) => ({ ...r, oni: seasonOni(r.year) })).filter((r) => r.oni != null);
    const t0 = 2000;
    const fit = ols(rows.map((r) => [1, r.year - t0, r.oni]), rows.map((r) => Math.log(r.kgha)));
    const [a, trend, beta] = fit.b;

    // Next harvest: use observed ONI where available, forecast where not.
    const all = new Map([...oni, ...ensoOut.forecast.map((f) => [f.month, f.oni])]);
    const lastObs = ensoOut.latest.month;
    const nextHarvest = +lastObs.slice(0, 4) + (+lastObs.slice(5) >= 7 ? 1 : 0);
    const nov = ym(nextHarvest - 1, 11), feb = ym(nextHarvest, 2);
    const seasonVals = [nov, ym(nextHarvest - 1, 12), ym(nextHarvest, 1), feb].map((k) => all.get(k)).filter((x) => x != null);
    const nextOni = seasonVals.length ? mean(seasonVals) : ensoOut.latest.oni;
    const trendYield = Math.exp(a + trend * (nextHarvest - t0));
    const predicted = Math.exp(a + trend * (nextHarvest - t0) + beta * nextOni);

    return {
        history: rows.map((r) => ({ year: r.year, kgha: round(r.kgha, 0), oni: round(r.oni), trend: round(Math.exp(a + trend * (r.year - t0)), 0) })),
        model: {
            type: 'log(yield) = a + trend·year + β·ONI(Nov–Feb)',
            betaPctPerOni: round((Math.exp(beta) - 1) * 100, 1),
            betaSe: round(fit.se[2] * 100, 1),
            trendPctPerYear: round((Math.exp(trend) - 1) * 100, 2),
            r2: round(fit.r2, 2), n: fit.n,
        },
        outlook: {
            harvestYear: nextHarvest, seasonOni: round(nextOni),
            trendKgha: round(trendYield, 0), predictedKgha: round(predicted, 0),
            changeVsTrendPct: round((predicted / trendYield - 1) * 100, 1),
            lo: round(predicted * Math.exp(-1.28 * fit.sigma), 0), hi: round(predicted * Math.exp(1.28 * fit.sigma), 0),
        },
    };
}

// ── 3. Prices: World Bank maize (USD/t) × USD/ZAR ────────────────────────
async function loadMaize() {
    const page = await get('https://www.worldbank.org/en/research/commodity-markets', 'text');
    const link = (page.match(/https:\/\/thedocs\.worldbank\.org\/[^"']*CMO-Historical-Data-Monthly\.xlsx/) || [])[0];
    if (!link) throw new Error('Pink Sheet link not found');
    const wb = XLSX.read(await get(link, 'buffer'));
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Monthly Prices'], { header: 1 });
    const hdr = rows.findIndex((r) => r && r.some((c) => String(c).trim() === 'Maize'));
    const col = rows[hdr].findIndex((c) => String(c).trim() === 'Maize');
    const out = [];
    for (const r of rows.slice(hdr + 2)) {
        const m = /^(\d{4})M(\d{2})$/.exec(String(r?.[0] ?? ''));
        if (m && typeof r[col] === 'number') out.push({ month: `${m[1]}-${m[2]}`, usd: r[col] });
    }
    return { source: link, series: out };
}

async function loadUsdZar(fromMonth) {
    const start = `${fromMonth}-01`, end = new Date().toISOString().slice(0, 10);
    const j = await get(`https://api.frankfurter.dev/v1/${start}..${end}?from=USD&to=ZAR`);
    const byMonth = {};
    for (const [d, r] of Object.entries(j.rates)) (byMonth[d.slice(0, 7)] ||= []).push(r.ZAR);
    return Object.fromEntries(Object.entries(byMonth).map(([m, v]) => [m, mean(v)]));
}

function priceModel(maize, fx, oniSeries, ensoOut) {
    const oni = new Map(oniSeries.map((s) => [s.month, s.oni]));
    const series = maize.series.filter((p) => fx[p.month]).map((p) => ({ month: p.month, usd: p.usd, fx: fx[p.month], zar: p.usd * fx[p.month] }));
    const lp = series.map((s) => Math.log(s.zar));

    // For each horizon h: log-return over h months regressed on ONI at the
    // start and on the gap between the price and its 12-month average (mean reversion).
    const H = 6, out = [];
    const startIdx = 12;
    const last = series.length - 1;
    const ma12 = (i) => mean(lp.slice(i - 11, i + 1));
    const coefs = [];
    for (let h = 1; h <= H; h++) {
        const X = [], y = [];
        for (let i = startIdx; i + h <= last; i++) {
            const o = oni.get(series[i].month);
            if (o == null) continue;
            X.push([1, o, lp[i] - ma12(i)]);
            y.push(lp[i + h] - lp[i]);
        }
        const fit = ols(X, y);
        coefs.push({ h, oni: fit.b[1], oniSe: fit.se[1], sigma: fit.sigma, r2: fit.r2, n: fit.n });
        const x0 = [1, ensoOut.latest.oni, lp[last] - ma12(last)];
        const ret = x0.reduce((s, v, j) => s + v * fit.b[j], 0);
        const neutral = ret - fit.b[1] * x0[1];       // same model with ONI = 0
        const base = series[last].zar;
        out.push({
            month: addMonths(series[last].month, h),
            zar: round(base * Math.exp(ret), 0),
            lo: round(base * Math.exp(ret - 1.28 * fit.sigma), 0),
            hi: round(base * Math.exp(ret + 1.28 * fit.sigma), 0),
            neutralZar: round(base * Math.exp(neutral), 0),
        });
    }
    const c6 = coefs[H - 1];
    return {
        history: series.slice(-36).map((s) => ({ month: s.month, zar: round(s.zar, 0), usd: round(s.usd, 1), fx: round(s.fx, 2) })),
        forecast: out,
        model: {
            type: `${H}-month log return ~ ONI + (price − 12-month mean)`,
            oniEffect6mPct: round((Math.exp(c6.oni) - 1) * 100, 1),
            oniEffect6mSe: round(c6.oniSe * 100, 1),
            r2_6m: round(c6.r2, 2), n: c6.n,
        },
        source: maize.source,
    };
}

// ── 4. Seasonal rainfall outlook per region (ECMWF via Open-Meteo) ───────
async function rainfallOutlook() {
    const out = [];
    for (const r of REGIONS) {
        try {
            const s = await get(`https://seasonal-api.open-meteo.com/v1/seasonal?latitude=${r.lat}&longitude=${r.lon}&daily=precipitation_sum&forecast_days=183`);
            const keys = Object.keys(s.daily).filter((k) => k.startsWith('precipitation_sum'));
            const months = {};
            s.daily.time.forEach((d, i) => {
                const m = d.slice(0, 7);
                const vals = keys.map((k) => s.daily[k][i]).filter((v) => v != null);
                if (!vals.length) return;
                (months[m] ||= { sum: 0, days: 0, members: keys.map(() => 0) });
                months[m].sum += mean(vals); months[m].days += 1;
                keys.forEach((k, j) => { if (s.daily[k][i] != null) months[m].members[j] += s.daily[k][i]; });
            });

            const clim = await get(`https://archive-api.open-meteo.com/v1/archive?latitude=${r.lat}&longitude=${r.lon}&start_date=1991-01-01&end_date=2020-12-31&daily=precipitation_sum&timezone=GMT`);
            const byMonth = {};
            clim.daily.time.forEach((d, i) => { const m = +d.slice(5, 7); (byMonth[m] ||= []).push(clim.daily.precipitation_sum[i] ?? 0); });
            const normal = Object.fromEntries(Object.entries(byMonth).map(([m, v]) => [m, (v.reduce((a, b) => a + b, 0) / 30)]));

            const monthsOut = Object.entries(months)
                .filter(([, v]) => v.days >= 25)
                .map(([m, v]) => {
                    const full = v.sum * (new Date(+m.slice(0, 4), +m.slice(5), 0).getDate() / v.days);
                    const norm = normal[+m.slice(5)];
                    const below = v.members.filter((x) => x * (30 / v.days) < norm * 0.8).length / v.members.length;
                    return { month: m, mm: round(full, 0), normalMm: round(norm, 0), pctOfNormal: norm > 5 ? round((full / norm) * 100, 0) : null, probBelow: round(below * 100, 0) };
                });
            out.push({ ...r, months: monthsOut });
        } catch (err) {
            console.warn(`rainfall ${r.id}: ${err.message}`);
            out.push({ ...r, months: [], error: true });
        }
    }
    return out;
}

// ── main ─────────────────────────────────────────────────────────────────
const oniSeries = await loadOni();
const ensoOut = enso(oniSeries);
const yields = await loadYields();
const maize = await loadMaize();
const fx = await loadUsdZar('2000-01');
const data = {
    updated: new Date().toISOString(),
    regions: REGIONS.map(({ id, name, crop, lat, lon, season }) => ({ id, name, crop, lat, lon, season })),
    enso: ensoOut,
    yield: yieldModel(yields, oniSeries, ensoOut),
    price: priceModel(maize, fx, oniSeries, ensoOut),
    rainfall: await rainfallOutlook(),
    sources: {
        oni: 'NOAA PSL / CPC Oceanic Niño Index — https://psl.noaa.gov/data/correlation/oni.data',
        yield: 'World Bank WDI AG.YLD.CREL.KG (cereal yield, South Africa)',
        maize: 'World Bank Commodity Price Data (Pink Sheet), Maize (US Gulf), USD/t',
        fx: 'Frankfurter (European Central Bank reference rates), USD/ZAR',
        rainfall: 'Open-Meteo Seasonal API (ECMWF SEAS5 ensemble) and ERA5 1991–2020 climatology',
    },
};
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(OUT, JSON.stringify(data, null, 1));
console.log(`ENSO ${data.enso.latest.month}: ONI ${data.enso.latest.oni} (${data.enso.latest.strength} ${data.enso.latest.phase})`);
console.log(`Yield model: ${data.yield.model.betaPctPerOni}% per +1 ONI (±${data.yield.model.betaSe}), R² ${data.yield.model.r2}; ${data.yield.outlook.harvestYear} outlook ${data.yield.outlook.changeVsTrendPct}% vs trend`);
console.log(`Price model: ${data.price.model.oniEffect6mPct}% per +1 ONI over 6 months (±${data.price.model.oniEffect6mSe}); last ${data.price.history.at(-1).month} R${data.price.history.at(-1).zar}/t`);
console.log(`Rainfall: ${data.rainfall.map((r) => `${r.id}:${r.months.length}m`).join(' ')}`);
