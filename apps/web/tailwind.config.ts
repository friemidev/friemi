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
        "brand-cream": "#f6fbef",
        "brand-green": "#049d73",
        "brand-green-dark": "#006e4d",
        "brand-ink": "#10265c",
        "brand-sand": "#d8e7cf",
        "brand-warm": "#f48d81",
        coral: "#f48d81",
        "coral-dark": "#e77f73",
        "coral-soft": "#fff0ed",
        "event-accent": "#5caec1",
        "event-bg": "#f8feff",
        "event-border": "#c6e4e8",
        ink: "#151515",
        paper: "#f6fbef",
        moss: "#006e4d",
        clay: "#d86f61",
        sand: "#d8e7cf",
        "sand-strong": "#bfd6b7",
        "team-bg": "#f7fff3",
        "team-border": "#bfd6b7",
        sky: "#eaf6f1"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
