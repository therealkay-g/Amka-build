/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: {
          solid: "var(--surface-solid)",
          soft: "var(--surface-soft)",
          mid: "var(--surface-mid)",
          high: "var(--surface-high)",
          DEFAULT: "var(--surface-solid)",
        },
        border: "var(--border)",
        text: "var(--text)",
        muted: "var(--muted)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        error: "var(--error)",
        success: "var(--success)",
        warning: "var(--warning)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        card: "var(--glass-shadow)",
        glass: "0 8px 32px rgba(70, 72, 212, 0.08)",
      },
      backdropBlur: {
        glass: "16px",
      },
    },
  },
  plugins: [],
};