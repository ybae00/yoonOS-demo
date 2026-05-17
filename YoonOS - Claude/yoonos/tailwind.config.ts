import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'os-surface': '#fdfdfd',
        'os-muted': '#e3e3e3',
        'os-placeholder': '#e5e5e5',
      },
      borderRadius: {
        'prompt': '20px',
      },
      maxWidth: {
        'prompt': '567px',
      },
      boxShadow: {
        'floating': '2px 2px 13px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};
export default config;
