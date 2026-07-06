import type { CapacitorConfig } from "@capacitor/cli";

const isIOSCommand =
  process.argv.includes("ios") && !process.argv.includes("android");
const baseAllowNavigation = ["friemi.com", "www.friemi.com", "*.friemi.com"];
const iosAllowNavigation = [
  ...baseAllowNavigation,
  "localhost",
  "127.0.0.1",
  "*.vercel.app",
  "clerk.com",
  "*.clerk.com",
  "accounts.dev",
  "*.accounts.dev",
  "clerk.shared.lcl.dev",
];
const iosPreviewHost = "";
const iosPreviewPath = "/fr/home";
const iosServerUrl =
  process.env.FRIEMI_IOS_SERVER_URL ??
  (iosPreviewHost
    ? `https://${iosPreviewHost}${iosPreviewPath}`
    : "https://www.friemi.com/zh-CN/mobile-home");

const config: CapacitorConfig = {
  appId: "com.friemi.app",
  appName: "Friemi",
  webDir: "capacitor-www",
  ...(isIOSCommand
    ? {
        ios: {
          path: "../ios",
          appendUserAgent: "FriemiIOS/1",
        },
      }
    : {}),
  server: {
    url: isIOSCommand ? iosServerUrl : "https://friemi.com/zh-CN/mobile-home",
    ...(isIOSCommand ? { errorPath: "error.html" } : {}),
    cleartext: isIOSCommand && iosServerUrl.startsWith("http://"),
    allowNavigation: isIOSCommand ? iosAllowNavigation : baseAllowNavigation,
  },
};

export default config;
