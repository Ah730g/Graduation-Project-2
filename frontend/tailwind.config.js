/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm dark theme to match site yellow/amber accent
        dark: {
          bg: '#1c1917',      // stone-900 - main background
          surface: '#292524', // stone-800 - cards, sidebar
          elevated: '#44403c', // stone-700 - inputs, hover
          border: '#57534e',  // stone-600
          muted: '#a8a29e',   // stone-400 - secondary text
          text: '#e7e5e4',    // stone-200 - primary text
        },
      },
    },
  },
  plugins: [],
};
