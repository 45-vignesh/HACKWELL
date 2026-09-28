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
        ref: {
          canvas: '#262730',        // Outer desktop background
          bg: '#16171d',            // Inner app window background
          card: '#1c1d25',          // Card surface
          elevated: '#232430',      // Elevated active / hover card
          muted: '#282936',         // Muted bar track
          border: 'rgba(255, 255, 255, 0.07)',
          borderSubtle: 'rgba(255, 255, 255, 0.04)',
          lilac: '#9484f7',         // Reference To-do / action card
          lilacLight: '#a99cf8',
          lilacDark: '#7864f5',
          purple: '#7c5cfc',        // Reference primary violet
          purpleHover: '#6c4cf0',
          purpleLight: '#9b72ff',
          purpleDeep: '#5b3be6',
          textMuted: '#9496a1',
        },
        sentinel: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
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
        'glow-purple': '0 10px 28px -4px rgba(124, 92, 252, 0.35)',
        'glow-purple-sm': '0 4px 14px -2px rgba(124, 92, 252, 0.3)',
        'glow-rose': '0 8px 24px -4px rgba(244, 63, 94, 0.3)',
        'app-frame': '0 30px 80px -15px rgba(0, 0, 0, 0.8)',
        'ref-card': '0 6px 20px -4px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
}
