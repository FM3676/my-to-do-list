import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// 修改 Metadata 对象以包含 PWA 相关信息
export const metadata: Metadata = {
  title: "我的待办清单",
  description: "一个简单、美观的待办事项列表",
  manifest: "/manifest.json", // <-- 添加这一行
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 添加主题色 */}
        <meta name="theme-color" content="#10b981" />
      </head>
      <body className={`${poppins.className} bg-slate-50 text-slate-800`}>
        <main className="container mx-auto max-w-2xl p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
