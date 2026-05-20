import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // human ใช้ TF.js + WebGL → client-only กัน Next ลาก node build เข้า server bundle
  serverExternalPackages: ["@vladmandic/human"],
};

export default nextConfig;
