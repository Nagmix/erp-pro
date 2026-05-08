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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
