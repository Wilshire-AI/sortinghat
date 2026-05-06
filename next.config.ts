import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Static export so we can host on any static-file host (Vercel, GitHub Pages, etc.).
// All runtime behavior lives client-side; the engine is pure.
const isProd = process.env.NODE_ENV === "production";
const isPagesBuild = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true, // required for static export
  },
  // When building for GitHub Pages at /sortinghat, set basePath/assetPrefix.
  // Vercel deployment doesn't need this; pass GITHUB_PAGES=true to enable.
  basePath: isPagesBuild ? "/sortinghat" : undefined,
  assetPrefix: isPagesBuild ? "/sortinghat" : undefined,
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
