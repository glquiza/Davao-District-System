import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "-apple-system", "sans-serif"],
        serif: ['"Playfair Display"', "Georgia", "Cambria", "serif"],
      },
      colors: {
        ivory: "#F5F1E9",
        cream: "#F0ECE3",
        charcoal: "#202820",
        olive: {
          DEFAULT: "#303B32",
          light: "#3E4B40",
          dark: "#202820",
          muted: "#5A655B",
        },
        gold: {
          DEFAULT: "#D6C6A5",
          light: "#E6DBC4",
          soft: "#F5F1E9",
          dark: "#8C7853",
        },
        // Remap brand & neutral palettes to the Warm Ivory / Soft Cream / Dark Olive / Muted Gold aesthetic
        brand: {
          50: "#F5F1E9",
          100: "#F0ECE3",
          200: "#D6C6A5",
          300: "#C4B18B",
          400: "#8C7853",
          500: "#3E4B40",
          600: "#303B32",
          700: "#202820",
          800: "#202820",
          900: "#192019",
          950: "#141A14",
        },
        slate: {
          50: "#F5F1E9",
          100: "#F0ECE3",
          200: "#E4DDD0",
          300: "#D6C6A5",
          400: "#8C9288",
          500: "#636B62",
          600: "#475048",
          700: "#303B32",
          800: "#262F27",
          900: "#202820",
          950: "#161C16",
        },
      },
      boxShadow: {
        sm: "0 2px 12px -3px rgba(32, 40, 32, 0.05), 0 1px 3px -1px rgba(32, 40, 32, 0.03)",
        DEFAULT: "0 4px 20px -4px rgba(32, 40, 32, 0.06), 0 2px 6px -1px rgba(32, 40, 32, 0.03)",
        md: "0 8px 28px -6px rgba(32, 40, 32, 0.08), 0 2px 8px -2px rgba(32, 40, 32, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
