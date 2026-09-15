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
    images: [
      {
        alt: brand.name,
        height: 630,
        type: "image/png",
        url: brand.shareImagePath,
        width: 1200,
      },
    ],
    siteName: brand.name,
    title: brand.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    description: brand.description,
    images: [brand.shareImagePath],
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
