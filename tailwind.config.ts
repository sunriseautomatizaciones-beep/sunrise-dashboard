import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0F172A",
        "bg-card": "#1E293B",
        "bg-hover": "#263348",
        accent: "#6366F1",
        "accent-light": "#818CF8",
        gold: "#F59E0B",
        success: "#10B981",
        danger: "#EF4444",
        muted: "#64748B",
        border: "#334155",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
