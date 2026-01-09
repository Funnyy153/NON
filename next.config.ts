import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Enable static HTML export
  trailingSlash: false, // ไม่ใช้ trailing slash
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
