import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        gold: "rgb(var(--color-gold) / <alpha-value>)",
        sand: "rgb(var(--color-sand) / <alpha-value>)",
        parchment: "rgb(var(--color-parchment) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        "park-mk": "rgb(var(--color-park-mk) / <alpha-value>)",
        "park-epcot": "rgb(var(--color-park-epcot) / <alpha-value>)",
        "park-hs": "rgb(var(--color-park-hs) / <alpha-value>)",
        "park-ak": "rgb(var(--color-park-ak) / <alpha-value>)",
        "park-rest": "rgb(var(--color-park-rest) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: { control: "0.75rem", card: "1.25rem" },
      boxShadow: { card: "0 12px 36px rgba(35, 29, 20, 0.07)", lift: "0 18px 50px rgba(11, 31, 58, 0.12)" },
    },
  },
  plugins: [],
};
export default config;
