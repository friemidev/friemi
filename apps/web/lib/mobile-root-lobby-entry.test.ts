import assert from "node:assert/strict";
import test from "node:test";
import {
  getMobileRootLobbyRedirectPath,
  isMobileUserAgent,
  resolveRootEntryLocale,
} from "./mobile-root-lobby-entry";

test("isMobileUserAgent treats unknown and desktop user agents conservatively", () => {
  assert.equal(isMobileUserAgent(null), false);
  assert.equal(
    isMobileUserAgent("Mozilla/5.0 (X11; Linux x86_64) Chrome/125"),
    false,
  );
});

test("isMobileUserAgent detects common mobile browsers", () => {
  assert.equal(
    isMobileUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile",
    ),
    true,
  );
  assert.equal(
    isMobileUserAgent(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36",
    ),
    true,
  );
});

test("isMobileUserAgent does not redirect search crawlers with mobile user agents", () => {
  assert.equal(
    isMobileUserAgent(
      "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    ),
    false,
  );
});

test("resolveRootEntryLocale prefers the locale cookie", () => {
  assert.equal(
    resolveRootEntryLocale({
      acceptLanguage: "en-US,en;q=0.9",
      localeCookie: "fr",
    }),
    "fr",
  );
});

test("resolveRootEntryLocale negotiates accepted languages", () => {
  assert.equal(
    resolveRootEntryLocale({
      acceptLanguage: "de-DE,de;q=0.9,en-US;q=0.8,fr;q=0.7",
      localeCookie: null,
    }),
    "en",
  );
  assert.equal(
    resolveRootEntryLocale({
      acceptLanguage: "zh-TW,zh;q=0.9,en;q=0.5",
      localeCookie: "invalid",
    }),
    "zh-CN",
  );
});

test("getMobileRootLobbyRedirectPath redirects only mobile root requests", () => {
  assert.equal(
    getMobileRootLobbyRedirectPath({
      acceptLanguage: "fr-FR,fr;q=0.9",
      localeCookie: null,
      pathname: "/",
      search: "?utm_source=qr",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile",
    }),
    "/fr/lobby?utm_source=qr",
  );

  assert.equal(
    getMobileRootLobbyRedirectPath({
      pathname: "/zh-CN/lobby",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile",
    }),
    null,
  );

  assert.equal(
    getMobileRootLobbyRedirectPath({
      pathname: "/",
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/125",
    }),
    null,
  );
});
