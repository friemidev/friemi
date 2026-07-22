import type { CapacitorConfig } from "@capacitor/cli";

const isIOSCommand =
  process.argv.includes("ios") && !process.argv.includes("android");
const baseAllowNavigation = ["friemi.com", "www.friemi.com", "*.friemi.com"];
const iosInAppAuthNavigation = [
  "clerk.com",
  "*.clerk.com",
  "accounts.dev",
  "*.accounts.dev",
  "clerk.shared.lcl.dev",
];
// Third-party OAuth providers such as Google should not be forced into the
// embedded WebView. The iOS navigation plugin opens non-Friemi/Clerk hosts
// externally when needed, then Clerk/Friemi callbacks return to the app session.
const iosAllowNavigation = [
  ...baseAllowNavigation,
  "localhost",
  "127.0.0.1",
  "*.vercel.app",
  ...iosInAppAuthNavigation,
];
const iosPreviewHost = "";
const iosPreviewPath = "/fr/home";
const iosServerUrl =
  process.env.FRIEMI_IOS_SERVER_URL ??
  (iosPreviewHost
    ? `https://${iosPreviewHost}${iosPreviewPath}`
    : "https://www.friemi.com/zh-CN/mobile-home");
const iosServerHost = new URL(iosServerUrl).hostname;
const iosAllowNavigationWithServerHost = Array.from(
  new Set([...iosAllowNavigation, iosServerHost]),
);
const pushNotifications = {
  presentationOptions: ["badge", "sound", "alert"],
};

const config: CapacitorConfig = {
  appId: "com.friemi.app",
  appName: "Friemi",
  webDir: "capacitor-www",
  plugins: {
    PushNotifications: pushNotifications,
  },
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
    cleartext: isIOSCommand && iosServerUrl.startsWith("http://"),
    allowNavigation: isIOSCommand
      ? iosAllowNavigationWithServerHost
      : baseAllowNavigation,
  },
};

export default config;
