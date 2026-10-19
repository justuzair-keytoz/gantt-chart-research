import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "secondary-light": "#F8F9FA",
        "tertiary-light": "#F2F3F5",
        "divider-light": "#EBEAEA",
        "neutral-light": "#979696",
        "neutral-lighter": "#BDBDBD",
        "neutral-dark": "#716F6F",
        "neutral-darker": "#3B3A3A",
        "neutral-x-light": "#EBEAEA",
        "light-bg": "#F7F7F7",
        "text-muted": "#716F6F",
      },
    },
  },
  plugins: [],
};
export default config;
