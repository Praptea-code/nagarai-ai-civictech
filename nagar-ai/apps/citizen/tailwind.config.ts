import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F5F6F4",
        ink: "#1C2321",
        signal: {
          DEFAULT: "#2A4D8F",
          dark: "#213C71",
        },
        hazard: {
          DEFAULT: "#D98E04",
          dark: "#8F5E03",
        },
        moss: "#3F7856",
        rule: "#D8DBD6",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
