import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tokens centralizados (§5). Superficies planas, tema oscuro.
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "#0a0a0a", // fondo base
        card: "#0a0a0a", // tarjetas (con borde line)
        line: "#262626", // bordes (neutral-800)
        brand: {
          DEFAULT: "#34d399", // emerald-400: acento/protagonista
          strong: "#10b981", // emerald-500: botones
        },
        danger: "#fb7185", // rose-400: adverso (real, dólar en contra)
        warn: "#fbbf24", // amber-400
      },
    },
  },
  plugins: [],
};
export default config;
