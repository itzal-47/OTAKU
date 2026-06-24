/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        bg2: '#12121a',
        bg3: '#1a1a25',
        bg4: '#222230',
        text: '#ffffff',
        text2: '#a1a1aa',
        text3: '#71717a',
        border: '#222233',
        border2: '#333344',
        purple: '#7b5cf0',
        purple2: '#a78bfa',
        red: '#e94560',
        teal: '#00d4aa',
        amber: '#f5a623',
        blue: '#3b82f6',
      },
      fontFamily: {
        bebas: ['"Bebas Neue"', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
        japanese: ['"Noto Sans JP"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
