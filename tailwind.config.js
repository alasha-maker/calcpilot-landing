export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './engineering_app_landing_page.jsx',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['"Inter Tight"', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        serif: ['"Instrument Serif"', 'serif'],
      },
    },
  },
  plugins: [],
}
