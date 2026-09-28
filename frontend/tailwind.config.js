/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        medical: {
          primary: '#006B4F',       // Primary Medical Green (brand, key buttons)
          primaryDark: '#004D3A',   // Primary Dark (sidebar, deep contrast)
          secondary: '#008F83',     // Secondary Teal (icons, links, highlights)
          gold: '#F4B400',          // Accent / CTA Gold (simulation, actions)
          mint: '#F3FAF7',          // Soft Mint Background (pages, headers)
          canvas: '#E6F4F0',        // Outer Canvas Background (desktop wrapper)
          card: '#FFFFFF',          // White Card (containers, surfaces)
          text: '#12332C',          // Primary Text (main text, headings)
          textMuted: '#647772',     // Secondary Text (descriptions, metadata)
          border: '#D9E8E3',        // Border (dividers, input outlines)
          success: '#16A34A',       // Success (healthy stock, approved)
          warning: '#F59E0B',       // Warning (impending risk, pending)
          critical: '#DC2626',      // Emergency / Critical (critical stockout)
        },
        ref: {
          canvas: '#E6F4F0',        // Outer desktop background
          bg: '#F3FAF7',            // Inner app window background
          card: '#FFFFFF',          // Card surface
          elevated: '#F8FCFA',      // Elevated active / hover card
          muted: '#E2EEEA',         // Muted bar track
          border: '#D9E8E3',        // Border divider
          borderSubtle: '#EBF3F0',  // Subtle border
          lilac: '#008F83',         // Secondary Teal action card
          lilacLight: '#14A396',
          lilacDark: '#00756B',
          purple: '#006B4F',        // Primary Medical Green
          purpleHover: '#004D3A',   // Primary Dark hover
          purpleLight: '#008F83',   // Secondary Teal
          purpleDeep: '#004D3A',
          textMuted: '#647772',     // Secondary Text
        },
        sentinel: {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6df',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#008F83',
          600: '#006B4F',
          700: '#004D3A',
          800: '#003B2C',
          900: '#12332C',
          950: '#0a1d19',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'glow-purple': '0 8px 24px -4px rgba(0, 107, 79, 0.25)',
        'glow-purple-sm': '0 4px 14px -2px rgba(0, 107, 79, 0.2)',
        'glow-teal': '0 8px 24px -4px rgba(0, 143, 131, 0.25)',
        'glow-gold': '0 8px 24px -4px rgba(244, 180, 0, 0.35)',
        'glow-rose': '0 8px 24px -4px rgba(220, 38, 38, 0.25)',
        'app-frame': '0 20px 60px -15px rgba(0, 77, 58, 0.12), 0 0 1px 1px rgba(217, 232, 227, 0.8)',
        'ref-card': '0 2px 12px -2px rgba(0, 77, 58, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
      },
    },
  },
  plugins: [],
}
