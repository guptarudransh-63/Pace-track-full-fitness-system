/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c', // PaceTrack primary energetic athletic orange
          700: '#c2410c',
        },
        slate: {
          850: '#151d2e',
          900: '#0f172a',
          950: '#090d16',
        },
      },
    },
  },
  plugins: [],
};
