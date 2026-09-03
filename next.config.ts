import type { NextConfig } from "next";

/**
 * Production builds use `next build --webpack` (see package.json `build` / `build:webpack`)
 * to avoid Turback/native toolchain requirements on some Windows environments.
 * Bundling uses webpack; Next still transpiles with SWC WASM fallback when native SWC fails.
 */
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  output: 'standalone',
  images: {
    // MED-09: نطاقات محددة بدل ** — كان مُحسِّن الصور بروكسي مفتوحاً لأي نطاق (SSRF/إسهاب)
    remotePatterns: [
      { protocol: 'https', hostname: '*.bunnyenv.com' },
      { protocol: 'https', hostname: '*.bunnyshell.net' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      // اسم خدمة الباك إند الداخلية في docker-compose/BunnyShell
      { protocol: 'http', hostname: 'backend' },
    ],
  },
};

export default nextConfig;
