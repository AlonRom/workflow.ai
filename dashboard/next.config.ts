import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
  reactStrictMode: true,
};

export default nextConfig;

