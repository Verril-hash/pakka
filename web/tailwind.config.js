/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // SF Pro on Apple devices, Inter everywhere else.
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"SF Mono"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // KeyDwar deep blue: primary actions, links, the logo tile.
        brand: {
          50: '#eaf2ff', 100: '#d4e4fb', 200: '#a9c8f5', 300: '#6fa2ea', 400: '#2f75d4',
          500: '#0a5cc4', 600: '#004aad', 700: '#003d8f', 800: '#003173', 900: '#00265a',
        },
        // KeyDwar electric cyan. Bright on black; the darker steps are for text on white.
        pakka: { 300: '#7ff7ff', 400: '#00effe', 500: '#00c8e0', 600: '#0094b3', 700: '#007590' },
        ink: { 950: '#000000', 900: '#1d1d1f', 800: '#2c2c2e', 700: '#3a3a3c', 500: '#6e6e73', 400: '#86868b', 300: '#aeaeb2' },
        line: '#e8e8ed',
        canvas: '#f5f5f7',
      },
      letterSpacing: { tightest: '-0.045em', display: '-0.03em' },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.04), 0 4px 16px -6px rgba(0,0,0,.06)',
        float: '0 2px 6px rgba(0,0,0,.04), 0 24px 48px -12px rgba(0,0,0,.14)',
        pop: '0 12px 40px -8px rgba(0,0,0,.22), 0 4px 12px -4px rgba(0,0,0,.08)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        ring: { '0%': { transform: 'scale(.6)', opacity: '1' }, '100%': { transform: 'scale(1.8)', opacity: '0' } },
        wave: { '0%,100%': { height: '4px' }, '50%': { height: '14px' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'none' } },
        'bubble-in': { from: { opacity: '0', transform: 'translateY(10px) scale(.97)' }, to: { opacity: '1', transform: 'none' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        stamp: { '0%': { opacity: '0', transform: 'rotate(-8deg) scale(1.6)' }, '60%': { opacity: '1', transform: 'rotate(-8deg) scale(.94)' }, '100%': { opacity: '1', transform: 'rotate(-8deg) scale(1)' } },
        eq: { '0%,100%': { transform: 'scaleY(.25)' }, '50%': { transform: 'scaleY(1)' } },
        pop: { '0%': { opacity: '0', transform: 'scale(.8)' }, '70%': { transform: 'scale(1.06)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        ring: 'ring 1.4s ease-out infinite',
        wave: 'wave 1s ease-in-out infinite',
        'slide-in': 'slide-in .28s cubic-bezier(.32,.72,0,1)',
        'fade-up': 'fade-up .7s cubic-bezier(.22,1,.36,1) both',
        'bubble-in': 'bubble-in .45s cubic-bezier(.22,1,.36,1) both',
        marquee: 'marquee 40s linear infinite',
        stamp: 'stamp .55s cubic-bezier(.22,1,.36,1) both',
        eq: 'eq .9s ease-in-out infinite',
        pop: 'pop .45s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
};
