/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: '#062238',
          blue: '#00598c',
          sky: '#0b79b7',
          mint: '#1fb879',
          fog: '#eef6fb',
          warning: '#e34d4d',
        },
      },
      boxShadow: {
        panel: '0 18px 55px rgba(0, 89, 140, 0.12)',
      },
    },
  },
  plugins: [],
};
