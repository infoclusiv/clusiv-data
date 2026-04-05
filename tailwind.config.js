/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{svelte,ts,js}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f9f7",
          100: "#d5ece4",
          200: "#addccd",
          300: "#7fcab5",
          400: "#4ea88f",
          600: "#17695b",
          700: "#0f5448",
          800: "#0a4037",
        },
        paper: {
          50: "#fbfaf5",
          100: "#f4efe3",
          200: "#e9dcc2",
        },
      },
      boxShadow: {
        soft: "0 18px 48px rgba(16, 52, 45, 0.12)",
      },
      fontFamily: {
        sans: ['"Segoe UI Variable Display"', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};