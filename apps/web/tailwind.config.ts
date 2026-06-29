import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        "brand-cream": "rgb(var(--friemi-cream-rgb) / <alpha-value>)",
        "brand-green": "rgb(var(--friemi-meadow-rgb) / <alpha-value>)",
        "brand-green-dark": "rgb(var(--friemi-forest-rgb) / <alpha-value>)",
        "brand-ink": "rgb(var(--friemi-ink-rgb) / <alpha-value>)",
        "brand-sand": "rgb(var(--friemi-sand-rgb) / <alpha-value>)",
        "brand-warm": "rgb(var(--friemi-coral-rgb) / <alpha-value>)",
        coral: "rgb(var(--friemi-coral-rgb) / <alpha-value>)",
        "coral-dark": "rgb(var(--friemi-danger-rgb) / <alpha-value>)",
        "coral-soft": "rgb(var(--friemi-rose-rgb) / <alpha-value>)",
        cream: "rgb(var(--friemi-cream-rgb) / <alpha-value>)",
        danger: "rgb(var(--friemi-danger-rgb) / <alpha-value>)",
        "event-accent": "rgb(var(--friemi-sage-rgb) / <alpha-value>)",
        "event-bg": "rgb(var(--friemi-ice-rgb) / <alpha-value>)",
        "event-border": "rgb(var(--friemi-sage-rgb) / <alpha-value>)",
        fog: "rgb(var(--friemi-fog-rgb) / <alpha-value>)",
        forest: "rgb(var(--friemi-forest-rgb) / <alpha-value>)",
        ice: "rgb(var(--friemi-ice-rgb) / <alpha-value>)",
        ink: "rgb(var(--friemi-ink-rgb) / <alpha-value>)",
        meadow: "rgb(var(--friemi-meadow-rgb) / <alpha-value>)",
        moss: "rgb(var(--friemi-forest-rgb) / <alpha-value>)",
        outline: "rgb(var(--friemi-outline-rgb) / <alpha-value>)",
        paper: "rgb(var(--friemi-paper-rgb) / <alpha-value>)",
        rose: "rgb(var(--friemi-rose-rgb) / <alpha-value>)",
        sand: "rgb(var(--friemi-sand-rgb) / <alpha-value>)",
        "sand-strong": "rgb(var(--friemi-sage-rgb) / <alpha-value>)",
        sky: "rgb(var(--friemi-ice-rgb) / <alpha-value>)",
        "team-bg": "rgb(var(--friemi-paper-rgb) / <alpha-value>)",
        "team-border": "rgb(var(--friemi-sage-rgb) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
