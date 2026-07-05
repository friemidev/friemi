import type { Metadata, Viewport } from "next";
import { brand } from "@/lib/brand";
import { getCanonicalSiteUrl } from "@/lib/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getCanonicalSiteUrl()),
  title: brand.name,
  description: brand.description,
  icons: {
    apple: brand.appleIconPath,
    icon: [
      {
        rel: "icon",
        sizes: "192x192",
        type: "image/png",
        url: brand.faviconPath,
      },
      {
        rel: "icon",
        sizes: "512x512",
        type: "image/png",
        url: brand.manifestIcon512Path,
      },
    ],
  },
  openGraph: {
    description: brand.description,
    images: [brand.shareImagePath],
    siteName: brand.name,
    title: brand.name,
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
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
