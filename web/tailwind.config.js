/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#09090C",
        card: "#121212",
        cardDarker: "#1C1828",
        cardDark2: "#13121A",
        magenta: "#C91E8C",
        magentaDark: "#A0176D",
        goldAccent: "#E4A12B",
        goldStart: "#D4901A",
        goldEnd: "#F5C842",
        textPrimary: "#FFFFFF",
        textSecondary: "rgba(255,255,255,0.52)",
        textGold: "#E4A12B",
        danger: "#DC3545",
        success: "#28A745",
        border: "rgba(228,161,43,0.15)",
        inputBg: "rgba(20,20,28,0.8)",
        surface: "#1A1A26",
      },
      fontFamily: {
        playfair: ["'Playfair Display'", "serif"],
        cormorant: ["'Cormorant Garamond'", "serif"],
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
