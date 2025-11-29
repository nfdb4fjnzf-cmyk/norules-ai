/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#101522", // Primary Background
          card: "#151927",    // Secondary Background (Card)
        },
        primary: {
          DEFAULT: "#1E90FF", // Accent (Blue)
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#9CA3AF", // Secondary Text
        },
        success: "#22C55E",
        danger: "#EF4444",
        warning: "#F59E0B",
        border: "rgba(255, 255, 255, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans TC", "sans-serif"],
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
        'input': '10px',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 15px rgba(30, 144, 255, 0.3)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
      }
    },
  },
  plugins: [],
}
