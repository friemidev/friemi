import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Fun Club",
  description: "下一场，Fun 开场。面向海外中文用户的活动组织与找搭子平台。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
