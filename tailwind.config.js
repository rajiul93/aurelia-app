/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#e1a566",
          foreground: "#1a1208",
        },
      },
      fontFamily: {
        sans: ["Roboto_400Regular"],
        medium: ["Roboto_500Medium"],
        bold: ["Roboto_700Bold"],
      },
    },
  },
  plugins: [],
};
