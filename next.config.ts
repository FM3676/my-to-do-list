import type { NextConfig } from "next";
import createPWA from "next-pwa";

const nextConfig: NextConfig = {
  eslint: {
    // 这一段是可选的：如果你想保留之前禁用ESLint的规则。
    // 如果上次的代码修复已经解决了ESLint问题，你可以删掉这3行。
    ignoreDuringBuilds: true,
  },
};

const withPWA = createPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

// 关键的改动在这里！我们用 "as any" 来绕过类型检查的冲突。
export default withPWA(nextConfig as any);
