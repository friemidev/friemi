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
        coral: "#d88d72",
        "coral-dark": "#c87b61",
        "coral-soft": "#fff2e7",
        "event-accent": "#7eb7cf",
        "event-bg": "#f8fdff",
        "event-border": "#b9d7e5",
        ink: "#151515",
        paper: "#f7f3ea",
        moss: "#556b4e",
        clay: "#b85f3f",
        sand: "#eadfce",
        "sand-strong": "#dfccb2",
        "team-bg": "#fffaf4",
        "team-border": "#e1b89c",
        sky: "#dcebf0"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
