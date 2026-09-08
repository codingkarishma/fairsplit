/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Inter',
          'sans-serif',
        ],
        display: ['Georgia', 'Times New Roman', 'serif'],
      },
      colors: {
        charcoal: '#1a1a1a',
        'warm-white': '#f5f3ef',
        paper: '#ffffff',
        amber: '#e8a838',
        'amber-soft': '#fff4dc',
        'muted-brown': '#8b7355',
        cream: '#f5f3ef',
        'terracotta-50': '#fff4ef',
        'terracotta-100': '#ffe5dc',
        'terracotta-200': '#ffc8b8',
        'terracotta-300': '#f3a38d',
        'terracotta-400': '#e78368',
        'terracotta-500': '#d96b4f',
        'terracotta-600': '#b9523c',
        'warm-ink': '#1a1a1a',
      },
    },
  },
  plugins: [],
};
