// Entice Feed shared layout: header, mobile menu, footer, back-to-top,
// count-up stats and scroll reveal. Exposes helpers as window.EF.
(function () {
    'use strict';
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const icon = (d, cls = 'w-6 h-6') => `<svg class="${cls}" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`;
    const ICONS = {
        network: 'M7.5 7.5a3 3 0 1 0 0-.01M16.5 7.5a3 3 0 1 0 0-.01M12 16.5a3 3 0 1 0 0-.01M9 9.5l2 4.5M15 9.5l-2 4.5M10 7.5h4',
        chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
        leaf: 'M5 19c9 0 14-5 14-14-9 0-14 5-14 14Zm0 0 7-7',
        hand: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V12m0-1V4.5a1.5 1.5 0 0 1 3 0V12m0-1.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.6 14.6a1.5 1.5 0 0 1 2.4-1.8L8 15',
        users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1m20 0v-1a4 4 0 0 0-3-3.9M15 3.1a4 4 0 0 1 0 7.8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
        cloud: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9Z',
        box: 'M21 8 12 3 3 8m18 0-9 5m9-5v8l-9 5m0-8L3 8m9 5v8M3 8v8l9 5',
        bank: 'M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M12 3l9 5H3l9-5Z',
        cart: 'M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L20 8H6.2M9 20.5a.5.5 0 1 0 0-.01M17 20.5a.5.5 0 1 0 0-.01',
        gov: 'M4 21V10m16 11V10M12 3 2 8h20L12 3ZM8 21v-7h8v7M2 21h20',
    };
    window.EF = { $, $$, icon, ICONS, reduceMotion };

    const PAGES = [
        ['index.html', 'Home'], ['platform.html', 'Platform'], ['insights.html', 'Live data'],
        ['pricing.html', 'Plans'], ['contact.html', 'Contact'],
    ];
    const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const isHome = here === 'index.html' || here === '';
    const navLink = ([href, label], mobile) => `<a href="${href}" class="${mobile ? 'px-3 py-3 rounded-lg hover:bg-brand-50' : 'nav-link px-3 py-2 rounded-lg text-gray-600 hover:text-brand-700 hover:bg-brand-50'}${href === here || (isHome && href === 'index.html') ? ' !text-brand-700 bg-brand-50 font-semibold' : ''}"${href === here ? ' aria-current="page"' : ''}>${label}</a>`;

    // ── Header ──────────────────────────────────────────────────────────
    const header = document.createElement('header');
    header.id = 'site-header';
    header.className = 'fixed inset-x-0 top-0 z-50 transition-all duration-300' + (isHome ? '' : ' scrolled');
    header.innerHTML = `
        <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] bg-brand-700 text-white px-4 py-2 rounded-lg">Skip to content</a>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between py-3">
                <a href="index.html" class="flex items-center gap-3" aria-label="Entice Feed home">
                    <img src="logo.jpg" alt="" class="w-10 h-10 rounded-xl object-cover bg-white ring-1 ring-black/5">
                    <span class="text-xl font-extrabold tracking-tight text-brand-900">Entice<span class="text-brand-500">Feed</span></span>
                </a>
                <nav class="hidden md:flex items-center gap-1 text-sm font-medium" aria-label="Main">${PAGES.map((p) => navLink(p)).join('')}</nav>
                <a href="contact.html?topic=Demo%20request" class="hidden md:inline-flex px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-700 text-white hover:bg-brand-900 transition shadow-soft">Request a demo</a>
                <button id="menu-btn" class="md:hidden w-11 h-11 grid place-items-center rounded-xl text-brand-900 hover:bg-brand-50" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
                    <svg id="menu-icon" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"/></svg>
                </button>
            </div>
        </div>
        <nav id="mobile-menu" class="md:hidden hidden bg-white border-t border-gray-100 shadow-lg" aria-label="Mobile">
            <div class="px-4 py-4 grid gap-1 text-base font-medium">${PAGES.map((p) => navLink(p, true)).join('')}
                <a href="contact.html?topic=Demo%20request" class="mt-2 px-3 py-3 rounded-xl bg-brand-700 text-white text-center font-semibold">Request a demo</a>
            </div>
        </nav>`;
    document.body.prepend(header);

    // ── Footer & back-to-top ────────────────────────────────────────────
    const footer = document.createElement('footer');
    footer.className = 'bg-brand-900 text-brand-100';
    footer.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
                <div class="flex items-center gap-3"><img src="logo.jpg" alt="" class="w-10 h-10 rounded-xl object-cover bg-white"><span class="text-xl font-extrabold text-white">Entice<span class="text-harvest-400">Feed</span></span></div>
                <p class="mt-4 text-sm">A smart, inclusive digital ecosystem for South African agriculture.</p>
            </div>
            <div><p class="font-semibold text-white">Platform</p><ul class="mt-4 space-y-2 text-sm">
                <li><a href="platform.html#ecosystem" class="hover:text-white">Ecosystem</a></li><li><a href="platform.html#ai" class="hover:text-white">AI insights</a></li>
                <li><a href="platform.html#auctions" class="hover:text-white">Produce auctions</a></li><li><a href="platform.html#tracking" class="hover:text-white">Plant tracking</a></li></ul></div>
            <div><p class="font-semibold text-white">Resources</p><ul class="mt-4 space-y-2 text-sm">
                <li><a href="insights.html" class="hover:text-white">Live climate & market data</a></li><li><a href="pricing.html" class="hover:text-white">Plans</a></li>
                <li><a href="pricing.html#faq" class="hover:text-white">FAQ</a></li><li><a href="contact.html?topic=Investor%20deck%20request" class="hover:text-white">Investors</a></li></ul></div>
            <div><p class="font-semibold text-white">Get in touch</p><ul class="mt-4 space-y-2 text-sm">
                <li>123 Agri Lane, Johannesburg</li><li><a href="tel:+27115550123" class="hover:text-white">+27 11 555 0123</a></li>
                <li><a href="mailto:invest@enticefeed.com" class="hover:text-white">invest@enticefeed.com</a></li></ul></div>
        </div>
        <div class="border-t border-white/10"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row justify-between gap-2 text-xs">
            <p>© ${new Date().getFullYear()} Entice Feed Pty Ltd. All rights reserved.</p><p>Proudly South African 🇿🇦</p></div></div>`;
    document.body.appendChild(footer);

    const top = document.createElement('button');
    top.className = 'fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-harvest-400 text-brand-900 shadow-soft grid place-items-center opacity-0 pointer-events-none transition';
    top.setAttribute('aria-label', 'Back to top');
    top.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m6 15 6-6 6 6"/></svg>';
    document.body.appendChild(top);
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

    const onScroll = () => {
        if (isHome) header.classList.toggle('scrolled', window.scrollY > 10 || !$('#mobile-menu').classList.contains('hidden'));
        const show = window.scrollY > 600;
        top.classList.toggle('opacity-0', !show);
        top.classList.toggle('pointer-events-none', !show);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const menuBtn = $('#menu-btn'), menu = $('#mobile-menu');
    const setMenu = (open) => {
        menu.classList.toggle('hidden', !open);
        menuBtn.setAttribute('aria-expanded', open);
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        $('#menu-icon').innerHTML = open ? '<path stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/>' : '<path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"/>';
        onScroll();
    };
    menuBtn.addEventListener('click', () => setMenu(menu.classList.contains('hidden')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

    // CTAs with a topic open the contact page with that topic pre-filled.
    $$('.topic-link').forEach((a) => { a.href = 'contact.html?topic=' + encodeURIComponent(a.dataset.topic); });
    $$('main section[id]').forEach((s) => (s.style.scrollMarginTop = '84px'));

    // ── Count-up stats & reveal on scroll ───────────────────────────────
    function countUp(el) {
        const to = +el.dataset.to;
        if (reduceMotion) { el.textContent = to.toLocaleString('en-ZA'); return; }
        const start = performance.now(), dur = 1200;
        const tick = (t) => { const p = Math.min(1, (t - start) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('en-ZA'); if (p < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
    }
    function reveal() {
        if ('IntersectionObserver' in window && !reduceMotion) {
            const io = new IntersectionObserver((entries) => entries.forEach((e) => {
                if (!e.isIntersecting) return;
                e.target.classList.add('visible');
                $$('.counter', e.target).forEach(countUp);
                io.unobserve(e.target);
            }), { threshold: 0.12 });
            $$('.reveal:not(.visible)').forEach((el) => io.observe(el));
        } else {
            $$('.reveal').forEach((el) => el.classList.add('visible'));
            $$('.counter').forEach(countUp);
        }
    }
    window.EF.reveal = reveal;
    document.addEventListener('DOMContentLoaded', reveal);
})();
