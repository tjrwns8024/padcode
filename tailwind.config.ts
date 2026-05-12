import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arcade: {
          bg: "#000000",
          maze: "#2121de",
          mazeGlow: "#4d4dff",
          pac: "#ffe900",
          red: "#ff2020",
          pink: "#ffb8de",
          cyan: "#00ffe9",
          orange: "#ff9b1a",
          dot: "#ffffff",
          dim: "#4444aa",
          ground: "#0a0a2e",
          phosphor: "#00ff7f",
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
        crt: ['"VT323"', "monospace"],
      },
      boxShadow: {
        maze: "0 0 0 2px #2121de",
        mazeGlow: "0 0 20px rgba(33,33,222,.4)",
        pac: "0 0 12px #ffe900",
        red: "0 0 10px #ff2020",
      },
      keyframes: {
        chomp: {
          "0%, 49%": { clipPath: "polygon(0 0, 100% 0, 100% 35%, 50% 50%, 100% 65%, 100% 100%, 0 100%)" },
          "50%, 100%": { clipPath: "none" },
        },
        recFlash: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0.6" },
        },
        padBlink: {
          "0%, 49%": { boxShadow: "0 0 0 2px #fff, 0 0 16px #fff", transform: "scale(1.04)" },
          "50%, 100%": { boxShadow: "0 0 0 2px #2121de", transform: "scale(1)" },
        },
        blink: { "50%": { opacity: "0" } },
        pelletBlink: { "50%": { opacity: "0.3" } },
      },
      animation: {
        chomp: "chomp 0.4s steps(2) infinite",
        recFlash: "recFlash 0.8s steps(2) infinite",
        padBlink: "padBlink 0.4s steps(2) infinite",
        blink: "blink 0.8s steps(2) infinite",
        pelletBlink: "pelletBlink 0.5s steps(2) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
