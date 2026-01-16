/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./App.tsx"
    ],
    darkMode: 'class', // Enable class-based dark mode
    theme: {
        extend: {
            colors: {
                primary: "#d4af37", // Gold
                secondary: "#fcd34d", // Amber
                dark: "#050505", // Deep Onyx
                light: "#fdfbf7", // Cream
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            },
            animation: {
                'float': 'float 25s infinite alternate',
                'shine': 'shine 2s infinite',
                'shimmer': 'shimmer 2.5s infinite',
            },
            keyframes: {
                float: {
                    '0%': { transform: 'translate(0, 0) scale(1) rotate(0deg)' },
                    '50%': { transform: 'translate(30px, 40px) scale(1.05) rotate(5deg)' },
                    '100%': { transform: 'translate(-20px, -20px) scale(0.95) rotate(-5deg)' },
                },
                shine: {
                    '0%': { transform: 'translateX(-100%) rotate(45deg)' },
                    '100%': { transform: 'translateX(200%) rotate(45deg)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                }
            }
        },
    },
    plugins: [],
}
