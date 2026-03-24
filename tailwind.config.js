/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./index.jsx",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Cormorant SC"', 'serif'],
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
