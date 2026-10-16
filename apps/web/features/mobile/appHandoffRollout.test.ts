import assert from "node:assert/strict";
import { test } from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { APP_HANDOFF_ENABLED } from "./appHandoffRollout";
import { APP_LOCALES, APP_WEB_ORIGIN } from "./appLinks";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { AppHandoff, AppOpenEntry } = await import("./components/AppHandoff");
const { GET } = await import("../../app/open/route");
const { GET: legacyGET } = await import("../../app/[locale]/open/route");
const { default: OpenAppPage } = await import("../../app/[locale]/open-app/page");
const { GET: androidAssociationGET } = await import("../../app/.well-known/assetlinks.json/route");
const { GET: appleAssociationGET } = await import("../../app/.well-known/apple-app-site-association/route");

const userAgents = [
  "Android Chrome/123",
  "iPhone Mobile/15E148 Safari",
  "Android FriemiAndroid/1.1.1",
  "iPhone FriemiIOS/1.0",
  "Android MicroMessenger",
  "iPhone Mobile/15E148 MicroMessenger",
  "Macintosh Safari",
];

test("app handoff stays disabled until the native release is explicitly approved", () => {
  assert.equal(APP_HANDOFF_ENABLED, false);
});

test("website-first deployment does not activate native OS associations for older packages", async () => {
  const android = androidAssociationGET();
  const apple = appleAssociationGET();
  for (const response of [android, apple]) {
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.deepEqual(await android.json(), []);
  assert.deepEqual(await apple.json(), { applinks: { apps: [], details: [] } });
});

test("no new launch or download prompt is rendered for any locale or client", () => {
  for (const locale of APP_LOCALES) {
    for (const userAgent of userAgents) {
      const props = { locale, target: `/${locale}/lobby/a`, userAgent };
      assert.equal(renderToStaticMarkup(React.createElement(AppOpenEntry, props)), "");
      for (const compact of [false, true]) {
        assert.equal(
          renderToStaticMarkup(
            React.createElement(AppHandoff, { ...props, compact, retry: true }),
          ),
          "",
        );
      }
    }
  }
});

test("direct universal-link requests use the web target without enabling retry or preview", () => {
  for (const locale of APP_LOCALES) {
    const target = `/${locale}/lobby/a?access=k%2B1%26two#details`;
    for (const userAgent of userAgents) {
      const query = new URLSearchParams({ target, retry: "1", preview: "ready" });
      const response = GET(new Request(`https://friemi.com/open?${query}`, {
        headers: { "user-agent": userAgent },
      }));
      assert.equal(response.status, 302);
      assert.equal(response.headers.get("location"), `${APP_WEB_ORIGIN}${target}`);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    }
  }
});

test("disabled handoff pages redirect to web content before loading the launch UI", async () => {
  for (const locale of APP_LOCALES) {
    const target = `/${locale}/planets/example?access=k%2B1#members`;
    await assert.rejects(
      OpenAppPage({
        params: Promise.resolve({ locale }),
        searchParams: Promise.resolve({ target, retry: "1" }),
      }),
      (error: unknown) => {
        assert.equal(
          (error as { digest?: string }).digest,
          `NEXT_REDIRECT;replace;${target};307;`,
        );
        return true;
      },
    );
  }
});

test("older Android localized open paths retain their target or fall back in their locale", () => {
  for (const locale of APP_LOCALES) {
    const target = `/${locale}/lobby/a?access=k%2B1#details`;
    const response = legacyGET(new Request(
      `https://www.friemi.com/${locale}/open?${new URLSearchParams({ target })}`,
    ));
    assert.equal(response.headers.get("location"), `${APP_WEB_ORIGIN}${target}`);
    const missing = legacyGET(new Request(`https://www.friemi.com/${locale}/open`));
    assert.equal(missing.headers.get("location"), `${APP_WEB_ORIGIN}/${locale}/mobile-home`);
  }
});

test("direct handoff URLs cannot redirect outside Friemi or loop through auth/handoff", () => {
  for (const target of ["https://evil.test", "//evil.test", "/open", "/en/open-app", "/en/sign-in"]) {
    const response = GET(new Request(`https://friemi.com/open?${new URLSearchParams({ target })}`));
    assert.equal(response.headers.get("location"), `${APP_WEB_ORIGIN}/zh-CN/mobile-home`);
  }
});
