import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Enable static HTML export
  trailingSlash: false, // ไม่ใช้ trailing slash
  images: {
    unoptimized: true, // Required for static export
  },
  // Disable caching in development mode
  ...(process.env.NODE_ENV === 'development' && {
    // Force reload on changes
    webpack: (config, { dev }) => {
      if (dev) {
        config.watchOptions = {
          poll: 1000, // Check for changes every second
          aggregateTimeout: 300, // Delay before rebuilding
        };
      }
      return config;
    },
  }),
};

export default nextConfig;
