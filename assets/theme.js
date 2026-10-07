// Shared Tailwind (CDN) theme for every Entice Feed page.
tailwind.config = {
    theme: {
        extend: {
            fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
            colors: {
                brand: { 50: '#f1f8f1', 100: '#dcefdc', 200: '#b9dfba', 500: '#2e7d32', 600: '#256b29', 700: '#1b5e20', 900: '#0f3812' },
                harvest: { 300: '#ffe566', 400: '#ffd600', 500: '#f5c400' },
                soil: { 500: '#795548', 700: '#4e342e' },
            },
            boxShadow: { soft: '0 10px 40px -12px rgba(27, 94, 32, 0.25)' },
        },
    },
};
