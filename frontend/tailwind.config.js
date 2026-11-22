/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './App.tsx', './components/**/*.tsx'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans Variable"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
