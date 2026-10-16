import { ANDROID_PACKAGE, APP_LOCALES } from "./appLinks";

// Public Play App Signing certificate, verified in Play Console on 2026-10-15.
// This is deliberately NOT the upload certificate.
export const PLAY_SIGNING_SHA256 =
  "B6:37:6C:1B:AC:7F:9F:EB:0A:B6:FE:FE:8C:08:05:5B:25:20:B4:F4:B8:10:60:7A:62:F2:2A:45:73:D8:64:57";
export const APPLE_APP_ID = "SQFM8Y4B8X.com.friemi.app";

export const androidAssetLinks = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: ANDROID_PACKAGE,
      sha256_cert_fingerprints: [PLAY_SIGNING_SHA256],
    },
  },
];

export const appleAppSiteAssociation = {
  applinks: {
    apps: [],
    details: [
      {
        appID: APPLE_APP_ID,
        paths: [
          "/open",
          ...APP_LOCALES.flatMap((locale) => [
            `/${locale}/lobby/*`,
            `/${locale}/activities/*`,
            `/${locale}/public-events/*`,
            `/${locale}/planets/*`,
            `/${locale}/game-tools/*`,
          ]),
        ],
      },
    ],
  },
};
