// tailwind.config.js
module.exports = {
    darkMode: "class", // ✅ enables class-based dark mode
    content: [
        "./index.html",            // include Vite entry HTML
        "./src/**/*.{js,jsx,ts,tsx}", // include all React files
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            colors: {
                primary: "#2563eb",
                secondary: "#1e293b",
            },
        },
    },

    plugins: [],
};
