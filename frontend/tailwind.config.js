/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0b0e11',
          800: '#161a1e',
          700: '#1e2329',
          600: '#2b3139',
        },
        accent: {
          DEFAULT: '#00b8d4',
          light: '#00e5ff',
        },
        positive: '#2ebd85',
        negative: '#f6465d',
        'text-primary': '#eaecef',
        'text-secondary': '#848e9c',
        'text-muted': '#5e6673',
      },
    },
  },
  plugins: [],
};
