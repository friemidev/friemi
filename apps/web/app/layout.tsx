import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.name,
  description: brand.description,
  icons: {
    icon: brand.logoIconPath,
    apple: brand.logoIconPath,
  },
  openGraph: {
    description: brand.description,
    images: [brand.shareImagePath],
    siteName: brand.name,
    title: brand.name,
  },
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
