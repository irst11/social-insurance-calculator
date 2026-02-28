import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 确保 xlsx 库被正确打包
  transpilePackages: ['xlsx'],
};

export default nextConfig;
