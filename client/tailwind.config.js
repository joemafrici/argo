/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';
export default {
  content: [
    "./index.html",
    "./src/**/*.{tsx, ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      }
    },
  },
  plugins: [],
}

