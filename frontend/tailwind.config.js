/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Royal Brutalist palette (No Yellow)
        bg: "#000000",       // Pure black
        charcoal: "#ffffff", // Pure white for text
        sage: "#3b0764",     // Deep Royal Purple for secondary backgrounds
        white: "#ffffff",    // Restored standard white
        black: "#000000",    // Restored standard black
        primary: "#7c3aed",  // Royal Purple
        "brand-gray": "#1A1A1A",  // Aurora dark surface
        
        // Aliases for existing components
        "bg-card": "#000000",
        "bg-elevated": "#3b0764", 
        "primary-dark": "#5b21b6",
        "primary-glow": "rgba(124, 58, 237, 0.15)",
        border: "#ffffff",
        "border-strong": "#ffffff",
        muted: "#a1a1aa",
        "muted-light": "#d4d4d8",
      },
      fontFamily: {
        sans: ["Satoshi", "system-ui", "sans-serif"],
        inter: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["Cabinet Grotesk", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        brutal: "4px 4px 0px 0px #000000",
        "brutal-lg": "8px 8px 0px 0px #000000",
        "brutal-hover": "0px 0px 0px 0px #000000",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}
