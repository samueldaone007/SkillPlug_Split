/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'rgb(var(--primary-50) / <alpha-value>)',
          100: 'rgb(var(--primary-100) / <alpha-value>)',
          200: 'rgb(var(--primary-200) / <alpha-value>)',
          300: 'rgb(var(--primary-300) / <alpha-value>)',
          400: 'rgb(var(--primary-400) / <alpha-value>)',
          500: 'rgb(var(--primary-500) / <alpha-value>)',
          600: 'rgb(var(--primary-600) / <alpha-value>)',
          700: 'rgb(var(--primary-700) / <alpha-value>)',
          800: 'rgb(var(--primary-800) / <alpha-value>)',
          900: 'rgb(var(--primary-900) / <alpha-value>)',
          950: 'rgb(var(--primary-950) / <alpha-value>)',
        },
        accent: {
          300: 'rgb(var(--accent-300) / <alpha-value>)',
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
          700: 'rgb(var(--accent-700) / <alpha-value>)',
        },
        ink: 'rgb(var(--ink) / <alpha-value>)',
        cream: 'rgb(var(--cream) / <alpha-value>)',
        lemon: 'rgb(var(--lemon) / <alpha-value>)',
        hot: 'rgb(var(--hot) / <alpha-value>)',
        orange: 'rgb(var(--orange) / <alpha-value>)',
        sky: 'rgb(var(--sky) / <alpha-value>)',
        lime: 'rgb(var(--lime) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        bru: 'var(--shadow-bru)',
        'bru-lg': 'var(--shadow-bru-lg)',
        'bru-sm': 'var(--shadow-bru-sm)',
        'bru-w': 'var(--shadow-bru-w)',
        'bru-lg-w': 'var(--shadow-bru-lg-w)',
        'bru-sm-w': 'var(--shadow-bru-sm-w)',
        float: 'var(--shadow-float)',
      },
      keyframes: {
        marquee: {
          'from': { transform: 'translateX(0)' },
          'to': { transform: 'translateX(-50%)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
      },
      animation: {
        marquee: 'marquee 20s linear infinite',
        wiggle: 'wiggle 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}