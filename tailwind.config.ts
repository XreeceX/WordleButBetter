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
        background: "#121213",
        surface: "#1a1a1b",
        border: "#3a3a3c",
        correct: "#538d4e",
        present: "#b59f3b",
        absent: "#3a3a3c",
        key: "#818384",
        keyBg: "#818384",
      },
      animation: {
        "flip-in": "flipIn 0.5s ease-in-out",
        "flip-out": "flipOut 0.5s ease-in-out",
        pop: "pop 0.2s ease",
      },
      keyframes: {
        flipIn: {
          "0%": { transform: "rotateX(90deg)" },
          "100%": { transform: "rotateX(0deg)" },
        },
        flipOut: {
          "0%": { transform: "rotateX(0deg)" },
          "100%": { transform: "rotateX(90deg)" },
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
