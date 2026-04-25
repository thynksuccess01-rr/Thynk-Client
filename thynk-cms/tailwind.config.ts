import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
      colors: {
        cream: { 50: "#FDFAF5", 100: "#FAF4E8", 200: "#F5E9D0", 300: "#EDD9B0" },
        espresso: { 700: "#3D2314", 800: "#2C1A0F", 900: "#1A0F08" },
        sienna: { 400: "#C27B4A", 500: "#A86035", 600: "#8B4A25" },
        forest: { 600: "#2D5A3D", 700: "#1F3D2A" },
        gold: { 400: "#D4A843", 500: "#B8922E" },
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideIn: { from: { opacity: "0", transform: "translateX(-12px)" }, to: { opacity: "1", transform: "translateX(0)" } },
      },
    },
  },
  plugins: [],
};
export default config;
