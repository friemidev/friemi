import type { CapacitorConfig } from "@capacitor/cli";

const isIOSCommand =
  process.argv.includes("ios") && !process.argv.includes("android");
const baseAllowNavigation = ["friemi.com", "www.friemi.com", "*.friemi.com"];
const iosAllowNavigation = [
  ...baseAllowNavigation,
  "localhost",
  "127.0.0.1",
  "clerk.com",
  "*.clerk.com",
  "accounts.dev",
  "*.accounts.dev",
  "clerk.shared.lcl.dev",
];
const iosServerUrl =
  process.env.FRIEMI_IOS_SERVER_URL ?? "https://www.friemi.com/zh-CN/mobile-home";

const config: CapacitorConfig = {
  appId: "com.friemi.app",
  appName: "Friemi",
  webDir: "capacitor-www",
  ...(isIOSCommand
    ? {
        ios: {
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
