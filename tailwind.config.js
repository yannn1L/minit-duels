/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace', 'ui-monospace'],
        pixel: ['"Press Start 2P"', 'Courier', 'monospace'],
      },
    },
  },
  plugins: [],
}
