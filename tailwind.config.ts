import type { Config } from "tailwindcss";

/**
 * Tailwind v4: الألوان والـ radius والـ spacing تُعرَّف في `src/app/globals.css` (`@import "tailwindcss"` + `@theme inline`).
 * هذا الملف يبقى لمسارات المحتوى ولأدوات تقرأ الإعداد (IDE، تحليل ثابت).
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
};

export default config;
