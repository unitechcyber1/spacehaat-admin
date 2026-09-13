/**
 * Spacehaat Admin — Tailwind theme mapped onto the CRM design tokens.
 *
 * Every colour resolves to a `--c-*` CSS variable declared in `src/index.css`,
 * so utilities follow the active `[data-theme]` automatically and still accept
 * Tailwind alpha modifiers (e.g. `bg-surface/70`).
 *
 * The stock palettes (slate, violet, rose, …) are deliberately re-pointed at
 * CRM tokens so the existing pages adopt the design system without a rewrite.
 */

/** @param {string} token */
const c = (token) => `rgb(var(--c-${token}) / <alpha-value>)`

/** Warm neutral ramp — replaces slate/gray/zinc/neutral/stone. */
const neutral = {
  50: c('surface-2'),
  100: c('surface-2'),
  200: c('border'),
  300: c('border-strong'),
  400: c('faint'),
  500: c('muted'),
  600: c('muted'),
  700: c('ink-2'),
  800: c('ink-2'),
  900: c('ink'),
  950: c('ink'),
  DEFAULT: c('muted'),
}

/** Builds a soft/base/ink ramp for a semantic status colour. */
const ramp = (soft, base, ink = base) => ({
  50: c(soft),
  100: c(soft),
  200: c(soft),
  300: c(base),
  400: c(base),
  500: c(base),
  600: c(base),
  700: c(ink),
  800: c(ink),
  900: c(ink),
  950: c(ink),
  DEFAULT: c(base),
})

const brand = ramp('brand-soft', 'brand', 'brand-ink')
const danger = ramp('expired-soft', 'expired')
const success = ramp('fresh-soft', 'fresh')
const warning = ramp('stale-soft', 'stale')
const info = ramp('info-soft', 'info')

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // ---- Semantic tokens (preferred for new markup) ----
        brand: { ...brand, soft: c('brand-soft'), ink: c('brand-ink') },
        ink: { DEFAULT: c('ink'), 2: c('ink-2') },
        muted: c('muted'),
        faint: c('faint'),
        canvas: c('bg'),
        surface: { DEFAULT: c('surface'), 2: c('surface-2') },
        line: { DEFAULT: c('border'), 2: c('border-2'), strong: c('border-strong') },
        fresh: { DEFAULT: c('fresh'), soft: c('fresh-soft') },
        stale: { DEFAULT: c('stale'), soft: c('stale-soft') },
        expired: { DEFAULT: c('expired'), soft: c('expired-soft') },
        info: { ...info, soft: c('info-soft') },

        /** Always-white foreground for filled brand/danger buttons. */
        'on-brand': '#ffffff',

        // ---- Legacy palettes re-pointed at CRM tokens ----
        white: c('surface'),
        black: c('ink'),
        slate: neutral,
        gray: neutral,
        zinc: neutral,
        neutral,
        stone: neutral,

        violet: brand,
        purple: brand,
        fuchsia: brand,
        indigo: brand,
        blue: brand,
        sky: brand,
        cyan: brand,

        rose: danger,
        red: danger,
        pink: danger,

        emerald: success,
        green: success,
        teal: success,
        lime: success,

        amber: warning,
        yellow: warning,
        orange: warning,
      },
      /**
       * Re-scaled so the existing markup lands on CRM radii:
       * `rounded-lg`/`rounded-xl` are used for controls and small panels,
       * `rounded-2xl` for cards.
       */
      borderRadius: {
        none: '0',
        sm: '5px',
        DEFAULT: 'var(--r-sm)',
        md: 'var(--r-sm)',
        lg: 'var(--r-sm)',
        xl: 'var(--r-md)',
        '2xl': 'var(--r-lg)',
        '3xl': 'var(--r-xl)',
        full: '9999px',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-md)',
        xl: 'var(--shadow-lg)',
        '2xl': 'var(--shadow-lg)',
        none: 'none',
      },
      screens: {
        /** CRM breakpoints, as max-width helpers. */
        tablet: { max: '1080px' },
        phone: { max: '760px' },
        mini: { max: '420px' },
      },
      spacing: {
        sidebar: 'var(--sidebar-w)',
        topbar: 'var(--topbar-h)',
      },
      maxWidth: {
        screen: '1340px',
      },
    },
  },
  plugins: [],
}
