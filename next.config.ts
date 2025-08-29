import type { NextConfig } from "next";
import createPWA from "next-pwa";

const nextConfig: NextConfig = {
  // 可以在这里添加其他的 Next.js 配置
};

const withPWA = createPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // 开发环境下禁用PWA，只在生产环境生效
  register: true,
  skipWaiting: true,
});

export default withPWA(nextConfig);
