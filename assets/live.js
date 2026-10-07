// Live climate & market data for the hero (home), AI section (platform)
// and dashboards (insights). Every widget is optional: missing elements
// on a page are skipped.
(function () {
    'use strict';
    const reduceMotion = window.EF.reduceMotion;
    const NOOP = document.createElement('div');
    const $ = (s) => document.querySelector(s) || NOOP;
    const $$ = (s) => Array.from(document.querySelectorAll(s));
    // ── Live data: weekly model output + live weather ───────────────────
    // data/agri-data.json is rebuilt weekly by scripts/update-data.mjs
    // (NOAA ONI, World Bank prices & yields, ECB FX, ECMWF seasonal).
    // The 7-day weather is fetched live from Open-Meteo in the browser.
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mLabel = (k) => `${MONTHS[+k.slice(5, 7) - 1]} ${k.slice(2, 4)}`;
    const zar = (n) => 'R' + Math.round(n).toLocaleString('en-ZA');
    const sign = (n) => (n > 0 ? '+' : '') + n;
    const charts = {};
    const chartReady = Boolean(window.Chart);
    if (chartReady) Chart.defaults.font.family = '"Plus Jakarta Sans", system-ui, sans-serif';
    const baseOpts = (extra = {}) => ({
        responsive: true, maintainAspectRatio: false, animation: reduceMotion ? false : undefined,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 }, filter: (i) => !i.text.startsWith('_') } },
                   tooltip: { filter: (i) => !i.dataset.label.startsWith('_') } },
        ...extra,
    });
    function draw(id, config) {
        if (!chartReady || !document.getElementById(id)) return;
        if (charts[id]) charts[id].destroy();
        charts[id] = new Chart(document.getElementById(id), config);
    }
    const ensoColor = (o) => (o >= 0.5 ? '#d97706' : o <= -0.5 ? '#2563eb' : '#9ca3af');

    function renderEnso(d, dark) {
        const hist = d.enso.history.slice(dark ? -24 : -48), fc = d.enso.forecast;
        const labels = [...hist.map((h) => mLabel(h.month)), ...fc.map((f) => mLabel(f.month))];
        const pad = Array(hist.length - 1).fill(null);
        const lastVal = hist[hist.length - 1].oni;
        return {
            type: 'line',
            data: { labels, datasets: [
                { label: 'Observed ONI', data: [...hist.map((h) => h.oni), ...fc.map(() => null)], borderColor: '#1b5e20', backgroundColor: '#1b5e20', tension: .3, pointRadius: 0, borderWidth: 2.5,
                  segment: { borderColor: (c) => ensoColor(c.p1.parsed.y) } },
                { label: 'Outlook', data: [...pad, lastVal, ...fc.map((f) => f.oni)], borderColor: '#f5c400', borderDash: [5, 4], pointRadius: 0, tension: .3 },
                { label: '_hi', data: [...pad, lastVal, ...fc.map((f) => f.hi)], borderColor: 'transparent', backgroundColor: 'rgba(255,214,0,.18)', fill: '+1', pointRadius: 0 },
                { label: '_lo', data: [...pad, lastVal, ...fc.map((f) => f.lo)], borderColor: 'transparent', pointRadius: 0, fill: false },
                { label: '_el', data: labels.map(() => 0.5), borderColor: 'rgba(217,119,6,.35)', borderDash: [2, 3], pointRadius: 0, borderWidth: 1 },
                { label: '_la', data: labels.map(() => -0.5), borderColor: 'rgba(37,99,235,.35)', borderDash: [2, 3], pointRadius: 0, borderWidth: 1 },
            ] },
            options: baseOpts({ plugins: { legend: { display: !dark, position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 }, filter: (i) => !i.text.startsWith('_') } },
                                            tooltip: { filter: (i) => !i.dataset.label.startsWith('_') } },
                scales: { x: { ticks: { maxTicksLimit: 8, font: { size: 10 } }, grid: { display: false } },
                          y: { suggestedMin: -2, suggestedMax: 2.5, ticks: { font: { size: 10 } }, grid: { color: '#f1f1f1' } } } }),
        };
    }

    function renderLive(d) {
        const e = d.enso.latest, y = d.yield, p = d.price;
        const lastPrice = p.history[p.history.length - 1];
        const updated = new Date(d.updated).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

        // Hero
        $('#h-oni-label').textContent = `ONI (${mLabel(e.month)})`;
        $('#h-oni').textContent = sign(e.oni);
        $('#h-yield-label').textContent = `${y.outlook.harvestYear} harvest`;
        $('#h-yield').textContent = `${sign(y.outlook.changeVsTrendPct)}% vs trend`;
        $('#h-price').textContent = `${zar(lastPrice.zar)}/t`;
        $('#h-alert').textContent = e.phase === 'El Niño' ? `${e.strength[0].toUpperCase() + e.strength.slice(1)} El Niño: plan for drought risk`
            : e.phase === 'La Niña' ? 'La Niña: wetter summer, watch for flooding' : 'ENSO neutral: normal season odds';
        $('#h-updated').textContent = `updated ${updated}`;
        draw('hero-chart', renderEnso(d, true));

        // ENSO card
        const badge = $('#enso-badge');
        badge.textContent = `${e.strength ? e.strength + ' ' : ''}${e.phase}`;
        badge.className = 'text-xs font-bold px-3 py-1 rounded-full capitalize ' + (e.phase === 'El Niño' ? 'bg-amber-100 text-amber-800' : e.phase === 'La Niña' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600');
        const endFc = d.enso.forecast[d.enso.forecast.length - 1];
        $('#enso-text').innerHTML = `The Oceanic Niño Index was <strong>${sign(e.oni)}</strong> in ${mLabel(e.month)}. Readings above +0.5 mean El Niño, which for South Africa usually brings a <strong>hotter, drier summer</strong> in the maize belt. The outlook keeps it near <strong>${sign(endFc.oni)}</strong> by ${mLabel(endFc.month)}.`;
        draw('enso-chart', renderEnso(d, false));

        // AI section: yields vs El Niño
        const yh = y.history.slice(-25);
        const yLabels = [...yh.map((r) => String(r.year)), `${y.outlook.harvestYear}*`];
        draw('ai-chart', {
            type: 'bar',
            data: { labels: yLabels, datasets: [
                { type: 'bar', label: 'Actual yield', data: [...yh.map((r) => r.kgha), null], backgroundColor: yh.map((r) => (r.oni >= 0.5 ? '#ffd600' : 'rgba(255,255,255,.55)')), borderRadius: 4 },
                { type: 'bar', label: 'Projected', data: [...yh.map(() => null), y.outlook.predictedKgha], backgroundColor: '#f97316', borderRadius: 4 },
                { type: 'line', label: 'Trend', data: [...yh.map((r) => r.trend), y.outlook.trendKgha], borderColor: '#b9dfba', borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5 },
            ] },
            options: baseOpts({ plugins: { legend: { position: 'bottom', labels: { color: '#dcefdc', boxWidth: 10, usePointStyle: true, font: { size: 11 } } },
                tooltip: { callbacks: { afterBody: (items) => { const r = yh[items[0].dataIndex]; return r ? `Growing-season ONI: ${sign(r.oni)}` : `Season ONI (outlook): ${sign(y.outlook.seasonOni)}`; } } } },
                scales: { x: { stacked: true, ticks: { color: '#b9dfba', maxTicksLimit: 9, font: { size: 10 } }, grid: { display: false } },
                          y: { ticks: { color: '#b9dfba', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,.06)' } } } }),
        });
        $('#ai-summary').innerHTML = `Over ${y.model.n} seasons, every +1 on the growing-season ONI cut yields by about <strong>${Math.abs(y.model.betaPctPerOni)}%</strong> against the long-term trend (yellow bars are El Niño years). With the current outlook, the <strong>${y.outlook.harvestYear} harvest</strong> is projected near <strong>${y.outlook.predictedKgha.toLocaleString('en-ZA')} kg/ha (${sign(y.outlook.changeVsTrendPct)}% vs trend)</strong>.`;

        // Price
        const ph = p.history, pf = p.forecast;
        const pLabels = [...ph.map((h) => mLabel(h.month)), ...pf.map((f) => mLabel(f.month))];
        const ppad = Array(ph.length - 1).fill(null);
        const pLast = lastPrice.zar;
        draw('price-chart', {
            type: 'line',
            data: { labels: pLabels, datasets: [
                { label: 'Actual (R/t)', data: [...ph.map((h) => h.zar), ...pf.map(() => null)], borderColor: '#1b5e20', backgroundColor: '#1b5e20', tension: .3, pointRadius: 0, borderWidth: 2.5 },
                { label: 'Forecast', data: [...ppad, pLast, ...pf.map((f) => f.zar)], borderColor: '#f5c400', borderDash: [5, 4], pointRadius: 0, tension: .3, borderWidth: 2 },
                { label: 'If ENSO were neutral', data: [...ppad, pLast, ...pf.map((f) => f.neutralZar)], borderColor: '#9ca3af', borderDash: [2, 3], pointRadius: 0, tension: .3, borderWidth: 1.5 },
                { label: '_hi', data: [...ppad, pLast, ...pf.map((f) => f.hi)], borderColor: 'transparent', backgroundColor: 'rgba(255,214,0,.18)', fill: '+1', pointRadius: 0 },
                { label: '_lo', data: [...ppad, pLast, ...pf.map((f) => f.lo)], borderColor: 'transparent', pointRadius: 0, fill: false },
            ] },
            options: baseOpts({ plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 }, filter: (i) => !i.text.startsWith('_') } },
                tooltip: { filter: (i) => !i.dataset.label.startsWith('_'), callbacks: { label: (c) => `${c.dataset.label}: ${zar(c.parsed.y)}` } } },
                scales: { x: { ticks: { maxTicksLimit: 8, font: { size: 10 } }, grid: { display: false } },
                          y: { ticks: { font: { size: 10 }, callback: (v) => zar(v) }, grid: { color: '#f1f1f1' } } } }),
        });
        const pEnd = pf[pf.length - 1];
        $('#price-now').innerHTML = `<span class="block text-xl font-extrabold text-brand-900">${zar(pLast)}</span><span class="text-[11px] text-gray-500">per ton · ${mLabel(lastPrice.month)}</span>`;
        const dir = p.model.oniEffect6mPct < 0 ? 'lower' : 'higher';
        $('#price-text').innerHTML = `Forecast for ${mLabel(pEnd.month)}: <strong>${zar(pEnd.zar)}/t</strong> (range ${zar(pEnd.lo)}–${zar(pEnd.hi)}). Historically, El Niño has meant <strong>${dir} world maize prices</strong> (${sign(p.model.oniEffect6mPct)}% per +1 ONI over six months), because it tends to favour US crops. Local South African prices can move the other way when drought cuts our own harvest and pushes prices towards import parity.`;

        // Rainfall + regions
        const sel = $('#region-select');
        sel.innerHTML = d.rainfall.map((r) => `<option value="${r.id}">${r.name} · ${r.crop}</option>`).join('');
        sel.addEventListener('change', () => { renderRain(d, sel.value); loadWeather(d, sel.value); });
        renderRain(d, sel.value);
        loadWeather(d, sel.value);

        // Footer bits
        $('#intel-updated').textContent = `Model data updated ${updated}`;
        $('#method-text').innerHTML = `
            <p><strong>El Niño outlook.</strong> Monthly Oceanic Niño Index from NOAA (1950–present), projected forward with a fitted persistence model (AR(1), φ = ${d.enso.model.phi}). This is a statistical extension, not NOAA's official forecast. See the <a class="underline" href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/" target="_blank" rel="noopener">CPC ENSO advisory</a>.</p>
            <p><strong>Harvest outlook.</strong> ${y.model.type}, fitted on South African cereal yields (World Bank, ${y.model.n} seasons since 1980). Effect: ${y.model.betaPctPerOni}% per +1 ONI (±${y.model.betaSe}), trend +${y.model.trendPctPerYear}%/year, R² ${y.model.r2}. The 80% range for ${y.outlook.harvestYear} is ${y.outlook.lo.toLocaleString('en-ZA')}–${y.outlook.hi.toLocaleString('en-ZA')} kg/ha.</p>
            <p><strong>Price outlook.</strong> World Bank Pink Sheet maize (US Gulf, USD/t) converted at monthly average ECB USD/ZAR rates. The model regresses each 1–6-month log return on ONI and the gap from the 12-month average (n = ${p.model.n}, R² ${p.model.r2_6m} at 6 months). This is the global benchmark, not the SAFEX white maize price.</p>
            <p><strong>Rainfall.</strong> ECMWF SEAS5 ensemble via the Open-Meteo Seasonal API, compared with the ERA5 1991–2020 monthly normal at each site. Raw model output is not bias-corrected. "% of members below 80% of normal" shows how many ensemble members expect a dry month.</p>
            <p><strong>Weather.</strong> Live 7-day forecast and soil moisture (3–9 cm) from Open-Meteo.</p>
            <p class="text-xs text-gray-400">These are indicative decision-support figures, not financial or agronomic advice.</p>`;
    }

    function renderRain(d, id) {
        const r = d.rainfall.find((x) => x.id === id);
        if (!r || !r.months.length) { $('#rain-text').textContent = 'Seasonal outlook unavailable for this region right now.'; return; }
        draw('rain-chart', {
            type: 'bar',
            data: { labels: r.months.map((m) => mLabel(m.month)), datasets: [
                { label: 'Forecast (mm)', data: r.months.map((m) => m.mm), backgroundColor: r.months.map((m) => (m.pctOfNormal != null && m.pctOfNormal < 80 ? '#f59e0b' : '#2e7d32')), borderRadius: 6 },
                { label: '1991–2020 normal', data: r.months.map((m) => m.normalMm), backgroundColor: '#dcefdc', borderRadius: 6 },
            ] },
            options: baseOpts({ plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } } },
                tooltip: { callbacks: { afterBody: (items) => { const m = r.months[items[0].dataIndex]; return `${m.pctOfNormal ?? '–'}% of normal · ${m.probBelow}% of members dry`; } } } },
                scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: '#f1f1f1' } } } }),
        });
        const dry = r.months.filter((m) => m.pctOfNormal != null && m.pctOfNormal < 80).map((m) => mLabel(m.month));
        const total = r.months.reduce((s, m) => s + m.mm, 0), normal = r.months.reduce((s, m) => s + m.normalMm, 0);
        $('#rain-text').innerHTML = `Six-month total <strong>${total} mm vs ${normal} mm normal (${Math.round((total / normal) * 100)}%)</strong>. ${dry.length ? `Drier than normal: <strong>${dry.join(', ')}</strong>.` : 'No month is forecast below 80% of normal.'} Amber bars mark months under 80% of normal.`;
    }

    const wxCache = {};
    async function loadWeather(d, id) {
        const r = d.regions.find((x) => x.id === id);
        if (!r || !document.getElementById('wx-rain')) return;   // widget not on this page
        $('#wx-region').textContent = r.name.split(' (')[1]?.replace(')', '') || r.name;
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${r.lat}&longitude=${r.lon}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&hourly=soil_moisture_3_to_9cm&forecast_days=7&timezone=Africa%2FJohannesburg`;
            const w = wxCache[id] || (wxCache[id] = await fetch(url).then((res) => { if (!res.ok) throw new Error(res.status); return res.json(); }));
            const rain = w.daily.precipitation_sum.reduce((a, b) => a + (b || 0), 0);
            const soilNow = w.hourly.soil_moisture_3_to_9cm.find((v) => v != null);
            const tmax = Math.max(...w.daily.temperature_2m_max);
            $('#wx-rain').textContent = `${rain.toFixed(0)} mm`;
            $('#wx-soil').textContent = soilNow != null ? `${Math.round(soilNow * 100)}%` : '–';
            $('#wx-tmax').textContent = `${Math.round(tmax)}°C`;
            $('#wx-days').innerHTML = w.daily.time.map((t, i) => {
                const p = w.daily.precipitation_sum[i] || 0;
                const day = new Date(t + 'T12:00').toLocaleDateString('en-ZA', { weekday: 'short' });
                return `<div class="rounded-xl bg-white/5 py-2"><p class="text-brand-100">${day}</p><p class="text-base">${p >= 5 ? '🌧️' : p >= 1 ? '🌦️' : w.daily.temperature_2m_max[i] >= 30 ? '🔥' : '☀️'}</p><p class="font-semibold">${Math.round(w.daily.temperature_2m_max[i])}°</p><p class="text-brand-100">${p.toFixed(0)}mm</p></div>`;
            }).join('');
            const soilPct = soilNow != null ? soilNow * 100 : null;
            let advice;
            if (r.season === 'summer') {
                advice = soilPct != null && soilPct < 15 && rain < 10 ? 'Dry topsoil and little rain ahead: hold off on planting until about 25 mm has fallen.'
                    : rain >= 25 ? 'Good rain expected: a planting window may open once fields are workable.'
                    : 'Monitor soil moisture; plant when the topsoil profile is wet enough to germinate.';
            } else {
                advice = tmax >= 32 ? 'Hot spell ahead: watch for heat stress on wheat during grain fill.' : 'Conditions are typical for this stage of the winter-crop season.';
            }
            $('#wx-advice').textContent = advice;
        } catch (err) {
            $('#wx-advice').textContent = 'Live weather is unavailable right now. Please try again later.';
        }
    }

    fetch('data/agri-data.json', { cache: 'no-cache' })
        .then((res) => { if (!res.ok) throw new Error(res.status); return res.json(); })
        .then(renderLive)
        .catch((err) => {
            console.error('Live data failed:', err);
            const box = $('#intel-error');
            box.textContent = 'Live model data could not be loaded. Please refresh, or check back shortly.';
            box.classList.remove('hidden');
            $('#h-alert').textContent = 'Live data temporarily unavailable';
        });

})();
