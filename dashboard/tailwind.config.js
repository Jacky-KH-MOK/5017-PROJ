/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2C7BE5",
        success: "#30C48D",
        warning: "#FFB703",
        danger: "#F94144",
        slate: {
          900: "#0f172a",
        },
      },
    },
  },
  plugins: [],
};

