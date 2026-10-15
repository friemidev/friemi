import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  getAppHandoffPath,
  getAppLinkPlatform,
  getAppLinks,
  normalizeAppLinkTarget,
} from "./appLinks";
import {
  androidAssetLinks,
  appleAppSiteAssociation,
  APPLE_APP_ID,
  PLAY_SIGNING_SHA256,
} from "./appAssociations";

test("app links preserve language, private invitation access and content anchors", () => {
  const target = "/fr/lobby/plan-1?access=private%2Bkey&ref=friend#details";
  const links = getAppLinks("zh-CN", target);
  assert.equal(links.target, target);
  assert.equal(new URL(links.universal).origin, "https://friemi.com");
  assert.equal(new URL(links.universal).searchParams.get("target"), target);
  assert.equal(new URL(links.scheme).searchParams.get("target"), target);
  assert.equal(new URL(links.fallback).origin, "https://www.friemi.com");
  assert.equal(
    normalizeAppLinkTarget("/planets/hello", "en"),
    "/en/planets/hello",
  );
});

test("app links reject foreign URLs, callbacks, malformed input and navigation loops", () => {
  for (const target of [
    null,
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%5cevil.test",
    "/en/sign-in",
    "/en/android-auth-complete?ticket=x",
    "/open?target=x",
    "/en/open-app",
    "/api/auth/delete",
    "/en/lobby/../../sign-in",
    "/en/lobby/%2e%2e/%2e%2e/api",
    "/en/lobby/a\n",
    "/en/lobby/%00",
    "/en/lobby/%",
    "x".repeat(5000),
  ]) {
    assert.equal(
      normalizeAppLinkTarget(target, "fr"),
      "/fr/mobile-home",
      String(target),
    );
  }
  assert.equal(
    normalizeAppLinkTarget(["/en/lobby/a"] as unknown as string, "en"),
    "/en/mobile-home",
  );
});

test("no OAuth credentials or embedded detail state enters app or store URLs", () => {
  const links = getAppLinks(
    "en",
    "/en/lobby/a?access=ok&code=secret&state=secret&__clerk_ticket=secret&__friemi_ios_auth_ts=secret&embedded=1&redirect_url=secret#photo",
  );
  assert.equal(links.target, "/en/lobby/a?access=ok#photo");
  for (const value of Object.values(links))
    assert.ok(!value.includes("secret"));
});

test("game invitation codes survive, while detail-sheet flags and repeated escapes do not", () => {
  assert.equal(
    normalizeAppLinkTarget("/fr/game-tools/dice/online?code=AB1234", "en"),
    "/fr/game-tools/dice/online?code=AB1234",
  );
  assert.equal(
    normalizeAppLinkTarget("/fr/lobby/a?sheet=1&access=k", "en"),
    "/fr/lobby/a?access=k",
  );
  assert.equal(
    normalizeAppLinkTarget("/en/lobby/%252e%252e/api", "en"),
    "/en/mobile-home",
  );
});

test("Android intent has a safe browser fallback, package and nested Play referrer", () => {
  const target = "/en/lobby/a?access=one%26two#details";
  const links = getAppLinks("en", target);
  assert.ok(links.androidIntent.includes(";package=com.friemi.app;"));
  const fallback = links.androidIntent
    .split("S.browser_fallback_url=")[1]
    .split(";end")[0];
  assert.equal(decodeURIComponent(fallback), links.fallback);
  assert.equal(new URL(links.androidStore).searchParams.get("referrer"), null);
  const publicLinks = getAppLinks("en", "/en/lobby/a?ref=friend");
  assert.equal(
    new URLSearchParams(
      new URL(publicLinks.androidStore).searchParams.get("referrer")!,
    ).get("friemi_target"),
    "/en/lobby/a",
  );
  assert.equal(
    new URL(
      getAppHandoffPath("en", target),
      "https://www.friemi.com",
    ).searchParams.get("target"),
    target,
  );
});

test("native shells never receive a download prompt; iOS and Android get their own store", () => {
  assert.equal(
    getAppLinkPlatform("Mozilla Android FriemiAndroid/1.2"),
    "native",
  );
  assert.equal(getAppLinkPlatform("iPhone FriemiIOS/2.7"), "native");
  assert.equal(getAppLinkPlatform("iPhone Mobile/abc MicroMessenger"), "ios");
  assert.equal(getAppLinkPlatform("Macintosh Mobile/15E148"), "ios");
  assert.equal(getAppLinkPlatform("Android Chrome/123"), "android");
  assert.equal(getAppLinkPlatform("Macintosh Safari"), "desktop");
});

test("public associations use Play signing certificate and exact Apple bundle/team", () => {
  assert.match(PLAY_SIGNING_SHA256, /^([A-F0-9]{2}:){31}[A-F0-9]{2}$/);
  assert.equal(androidAssetLinks[0].target.package_name, "com.friemi.app");
  assert.equal(APPLE_APP_ID, "SQFM8Y4B8X.com.friemi.app");
  const paths = appleAppSiteAssociation.applinks.details[0].paths;
  assert.ok(paths.includes("/open"));
  assert.ok(paths.includes("/fr/lobby/*"));
  assert.ok(
    !paths.some((path) => path.includes("auth") || path.includes("sign-in")),
  );
});

test("native packaging includes the resolver and both associated domains", () => {
  const entitlements = readFileSync(
    new URL("../../../ios/App/App/App.entitlements", import.meta.url),
    "utf8",
  );
  assert.ok(entitlements.includes("applinks:friemi.com"));
  assert.ok(entitlements.includes("applinks:www.friemi.com"));
  const project = readFileSync(
    new URL("../../../ios/App/App.xcodeproj/project.pbxproj", import.meta.url),
    "utf8",
  );
  assert.ok(project.includes("FriemiAppLinks.swift in Sources"));
  const manifest = readFileSync(
    new URL(
      "../../../android/app/src/main/AndroidManifest.xml",
      import.meta.url,
    ),
    "utf8",
  );
  assert.ok(manifest.includes('android:host="friemi.com"'));
  assert.ok(manifest.includes('android:path="/open"'));
  assert.ok(!manifest.includes('android:pathPrefix="/"'));
});
