import animate from "tailwindcss-animate";
import type { Config } from "tailwindcss";

// Every color resolves to a CSS variable from src/index.css, so components
// never carry hex values (CLAUDE.md section 3).
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "5%", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        butter: token("butter"),
        ink: token("ink"),
        surface: token("surface"),
        coral: token("coral"),
        sun: token("sun"),
        mint: token("mint"),
        lilac: token("lilac"),
        sky: token("sky"),
        muted: token("muted"),
        error: token("error"),
        line: token("line"),
        skeleton: token("skeleton"),
        fur: { DEFAULT: token("fur"), dark: token("fur-dark") },
        cat: { DEFAULT: token("cat"), dark: token("cat-dark") },
        // shadcn names mapped onto the Pet&GO palette
        background: token("butter"),
        foreground: token("ink"),
        border: token("ink"),
        input: token("ink"),
        ring: token("sun"),
        primary: { DEFAULT: token("coral"), foreground: token("ink") },
        secondary: { DEFAULT: token("surface"), foreground: token("ink") },
        destructive: { DEFAULT: token("error"), foreground: token("surface") },
        accent: { DEFAULT: token("sun"), foreground: token("ink") },
        popover: { DEFAULT: token("butter"), foreground: token("ink") },
        card: { DEFAULT: token("surface"), foreground: token("ink") },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"Space Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        control: "14px",
        button: "16px",
        card: "24px",
        hero: "28px",
      },
      boxShadow: {
        hard: "4px 4px 0 rgb(var(--ink))",
        "hard-sm": "3px 3px 0 rgb(var(--ink))",
        "hard-lg": "6px 6px 0 rgb(var(--ink))",
        "hard-xl": "8px 8px 0 rgb(var(--ink))",
        "hard-pressed": "1px 1px 0 rgb(var(--ink))",
        focus: "0 0 0 4px rgb(var(--sun))",
      },
      keyframes: {
        "float-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "20%": { opacity: "1" },
          "100%": { opacity: "0", transform: "translateY(-28px)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.6) rotate(-6deg)" },
          "70%": { opacity: "1", transform: "scale(1.08) rotate(2deg)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
      },
      animation: {
        "float-up": "float-up 900ms ease-out forwards",
        "pop-in": "pop-in 600ms ease-out",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
