import type { CapacitorConfig } from "@capacitor/cli";

const isIOSCommand =
  process.argv.includes("ios") && !process.argv.includes("android");
const baseAllowNavigation = ["friemi.com", "www.friemi.com", "*.friemi.com"];
const iosAllowNavigation = [...baseAllowNavigation, "*.clerk.accounts.dev"];

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
    url: isIOSCommand
      ? "https://www.friemi.com/zh-CN/mobile-home"
      : "https://friemi.com/zh-CN/mobile-home",
    cleartext: false,
    allowNavigation: isIOSCommand ? iosAllowNavigation : baseAllowNavigation,
  },
};

export default config;
