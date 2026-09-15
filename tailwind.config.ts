import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        border: "var(--border)",
        "border-focus": "var(--border-focus)",
        primary: {
          DEFAULT: "#10B981",
          dark: "#059669",
          light: "#34D399",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "chart-up": "#22C55E",
        "chart-down": "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
        elevated: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
        modal: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
