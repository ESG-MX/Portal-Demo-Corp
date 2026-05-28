/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'azul-primary':    '#0f172a',
        'naranja-primary': '#7c3aed',
        'naranja-hover':   '#6d28d9',
        'rojo-primary':    '#312e81',
        'violeta-soft':    '#a78bfa',
        'blanco':          '#ffffff',
        'gris-claro':      'rgba(255, 255, 255, 0.05)',
        'negro':           '#000000',
        // Legacy aliases
        'azul-bersa':    '#0f172a',
        'naranja-bersa': '#7c3aed',
        'rojo-bersa':    '#312e81',
      }
    },
  },
  plugins: [],
}