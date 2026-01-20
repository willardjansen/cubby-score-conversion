import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Disable server-side features for static export
  trailingSlash: true,
  // Use relative paths for assets (required for Electron file:// protocol)
  assetPrefix: './',
  basePath: '',
};

export default nextConfig;
