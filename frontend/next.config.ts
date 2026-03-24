import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["three"],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      three: "three/src/Three.js",
    };
    return config;
  },
};

export default nextConfig;
