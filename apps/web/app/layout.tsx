import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Fun Club",
  description:
    "Next Fun Club helps overseas Chinese-speaking users discover, create, and join local activities.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
