/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F3224',
          50: '#f5f7f2',
          100: '#e8ede3',
          200: '#d1dac7',
          300: '#b0c09f',
          400: '#8ba177',
          500: '#6d8559',
          600: '#556a47',
          700: '#45553a',
          800: '#3a4632',
          900: '#1F3224',
        },
        accent: {
          DEFAULT: '#E7AA39',
          50: '#fef9f0',
          100: '#fef2d9',
          200: '#fce2b3',
          300: '#f9ca82',
          400: '#f6a94f',
          500: '#E7AA39',
          600: '#d8921f',
          700: '#b37319',
          800: '#8f5c1a',
          900: '#754d18',
        },
        'soft-primary': 'rgba(31, 50, 36, 0.08)',
        'soft-accent': 'rgba(231, 170, 57, 0.15)',
        background: '#F5F7F2',
        surface: '#FFFFFF',
      },
      fontFamily: {
        arabic: ['Amiri', '"Arabic Typesetting"', '"Traditional Arabic"', 'serif'],
        surahNames: ['QPC V2 Font', 'Surah Names', 'Amiri', '"Arabic Typesetting"', '"Traditional Arabic"', 'serif'],
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
}
