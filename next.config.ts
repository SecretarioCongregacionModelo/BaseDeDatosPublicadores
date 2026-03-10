import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // REMOVED: output: "standalone" - This setting is for Docker/self-hosted deployments
  // Vercel has its own optimized serverless deployment pipeline
  // Having this setting was causing Prisma engine binaries to not bundle correctly for write operations

  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
