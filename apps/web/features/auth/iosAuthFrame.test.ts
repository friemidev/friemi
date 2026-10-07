import assert from "node:assert/strict";
import test from "node:test";
import {
  getIOSAuthMainFrameHref,
  promoteIOSAuthToMainFrame,
} from "./iosAuthFrame";

const origin = "https://www.friemi.com";
const iosUserAgent = "Mozilla/5.0 (iPhone) Mobile/15E148 FriemiIOS/1";

test("iOS frame login preserves the activity return path without sheet layout", () => {
  const url = new URL("/zh-CN/sign-in", origin);
  url.searchParams.set("sheet", "1");
  url.searchParams.set(
    "redirect_url",
    "/zh-CN/lobby/activity-1?sheet=1&join=1#members",
  );
  const result = new URL(getIOSAuthMainFrameHref(url.href, origin)!);
  assert.equal(result.pathname, "/zh-CN/sign-in");
  assert.equal(result.searchParams.has("sheet"), false);
  assert.equal(
    result.searchParams.get("redirect_url"),
    "/zh-CN/lobby/activity-1?join=1#members",
  );
});

test("sign-up and nested authentication steps retain locale and Clerk parameters", () => {
  for (const locale of ["zh-CN", "fr", "en"]) {
    for (const path of ["sign-in/factor-one", "sign-up/verify-email-address"]) {
      const url = new URL(`/${locale}/${path}?__clerk_status=test#auth`, origin);
      assert.equal(getIOSAuthMainFrameHref(url.href, origin), url.href);
    }
  }
});

test("frame promotion rejects foreign parents and non-authentication pages", () => {
  assert.equal(
    getIOSAuthMainFrameHref(`${origin}/zh-CN/sign-in`, "https://other.example"),
    null,
  );
  for (const path of ["/zh-CN/lobby/one", "/zh-CN/sign-in-other", "/sign-in"]) {
    assert.equal(getIOSAuthMainFrameHref(`${origin}${path}`, origin), null);
  }
  assert.equal(getIOSAuthMainFrameHref("not a URL", origin), null);
});

test("unsafe and recursive return targets use the existing auth fallback", () => {
  for (const target of [
    "https://other.example",
    "//other.example",
    "/zh-CN/sign-in",
  ]) {
    const url = new URL("/zh-CN/sign-in", origin);
    url.searchParams.set("redirect_url", target);
    const result = new URL(getIOSAuthMainFrameHref(url.href, origin)!);
    assert.equal(result.searchParams.get("redirect_url"), "/zh-CN/home");
  }
});

function createFrame(userAgent = iosUserAgent) {
  const navigations: string[] = [];
  const frame = {
    navigator: { userAgent },
    location: { href: `${origin}/zh-CN/sign-in`, origin },
    top: {
      location: {
        origin,
        assign: (href: string) => navigations.push(href),
      },
    },
  } as unknown as Window;
  return { frame, navigations };
}

test("iOS embedded login navigates the main frame before native auth mounts", () => {
  const { frame, navigations } = createFrame();
  assert.equal(promoteIOSAuthToMainFrame(frame), true);
  assert.deepEqual(navigations, [`${origin}/zh-CN/sign-in`]);
});

test("main-frame iOS login is unchanged and cannot enter a redirect loop", () => {
  const { frame, navigations } = createFrame();
  Object.defineProperty(frame, "top", { value: frame });
  assert.equal(promoteIOSAuthToMainFrame(frame), false);
  assert.equal(navigations.length, 0);
});

test("Android and browser login flows are unchanged", () => {
  for (const userAgent of [
    "FriemiAndroid/1",
    "Mozilla/5.0 (iPhone) Safari/604.1",
    "Mozilla/5.0",
  ]) {
    const { frame, navigations } = createFrame(userAgent);
    assert.equal(promoteIOSAuthToMainFrame(frame), false);
    assert.equal(navigations.length, 0);
  }
});

test("inaccessible parents and blocked navigation do not crash login", () => {
  for (const blocked of ["origin", "assign"]) {
    const { frame, navigations } = createFrame();
    if (blocked === "origin") {
      Object.defineProperty(frame.top!.location, "origin", {
        get() {
          throw new Error("SecurityError");
        },
      });
    } else {
      frame.top!.location.assign = () => {
        throw new Error("SecurityError");
      };
    }
    assert.equal(promoteIOSAuthToMainFrame(frame), false);
    assert.equal(navigations.length, 0);
  }
});
