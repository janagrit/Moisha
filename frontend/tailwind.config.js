/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './App.tsx', './components/**/*.tsx', './screens/**/*.tsx'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
      },
      colors: {
        moisha: {
          sand: '#FAF8F5',
          border: '#E8DFD3',
          navy: '#0F264A',
          muted: '#55637A',
          royal: '#2563EB',
          sky: '#EFF4FF',
          green: '#047857',
          mint: '#ECFDF5',
          amber: '#92400E',
          butter: '#FEF3C7',
          red: '#B42318',
          blush: '#FEF3F2',
        },
      },
    },
  },
  plugins: [],
};
