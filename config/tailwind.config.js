export default {
  content: ['./src/**/*.{html,js}', './js/**/*.js', './scripts/site-shell.js', '!./js/**/*.local.js'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      colors: {
        brand: { 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
      },
    },
  },
};
