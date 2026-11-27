/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta do app da profissional = a do LashAgenda v1 (decisão de 2026-11-24,
        // DECISOES_DE_PRODUTO.md seção 7). 50/100/200/400/600/800 são os valores
        // exatos do v1; 300/500/700/900/950 não existiam lá e são intermediários.
        // Os temas do catálogo público usam catalog-theme.css, não esta escala.
        rose: {
          50: '#FDF5F5',
          100: '#FAE8E8',
          200: '#F5CECE',
          300: '#E5A9AC',
          400: '#D4848A',
          500: '#BE6C75',
          600: '#A85560',
          700: '#91424C',
          800: '#7A2E38',
          900: '#5E2129',
          950: '#3A1319',
        },
        gold: {
          DEFAULT: '#C9A96E',
          light: '#F0E6D3',
        },
        luxury: {
          gold: '#d4af37',
          'gold-light': '#f3e5ab',
          'gold-dark': '#aa820a',
          dark: '#0d0d0d',
          card: '#161618',
          border: '#2a2a2e',
        },
        // Neutros do app da profissional (/app/[slug]) — também do v1.
        cream: '#F7F3EE',
        surface: '#FFFFFF',
        linen: '#ECE4DD',
        ink: {
          DEFAULT: '#2C1810',
          soft: '#7A6A62',
          faint: '#B0A097',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(168, 85, 96, 0.12)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.25)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
};
