import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f6ff",
          100: "#e8ebff",
          200: "#cfd3ff",
          300: "#a0aaff",
          400: "#6a78ff",
          500: "#3b42f6",
          600: "#2a2fd2",
          700: "#1f23a6",
          800: "#161977",
          900: "#0c0f47"
        }
      }
    }
  },
  plugins: []
};

export default config;

