import assert from "node:assert/strict";
import test from "node:test";
import {
  handleHostExternalBrowserRequest,
  hostExternalBrowserRequestType,
  normalizeHostExternalUrl,
  parseHostExternalBrowserRequest,
} from "./hostExternalBrowserProtocol";

function request(action = "support", url?: string) {
  return {
    type: hostExternalBrowserRequestType,
    requestId: "test-request",
    action,
    url,
  };
}

test("external browser requests accept only valid HTTPS URLs without credentials", () => {
  assert.equal(
    normalizeHostExternalUrl(" https://example.com/form "),
    "https://example.com/form",
  );
  for (const url of [
    "http://example.com",
    "javascript:alert(1)",
    "data:text/html,hello",
    "https://user:password@example.com",
    "//example.com",
    "https://",
    "",
  ]) {
    assert.equal(parseHostExternalBrowserRequest(request("open", url)), null);
  }
  for (const invalid of [
    null,
    {},
    request("join"),
    { ...request(), requestId: "" },
    { ...request(), requestId: "x".repeat(81) },
  ]) {
    assert.equal(parseHostExternalBrowserRequest(invalid), null);
  }
});

test("capability checks and hidden detail frames never open a browser", async () => {
  let opens = 0;
  const browser = {
    isSupported: async () => true,
    open: async () => {
      opens++;
      return true;
    },
  };
  const support = await handleHostExternalBrowserRequest(
    request(),
    browser,
    false,
  );
  assert.equal(support?.result, true);
  assert.equal(
    (
      await handleHostExternalBrowserRequest(
        request("open", "https://example.com"),
        browser,
        false,
      )
    )?.result,
    false,
  );
  assert.equal(opens, 0);
});

test("an active detail frame opens a link without any registration operation", async () => {
  const opened: string[] = [];
  const browser = {
    isSupported: async () => true,
    open: async (url: string) => {
      opened.push(url);
      return true;
    },
  };
  const result = await handleHostExternalBrowserRequest(
    request("open", "https://example.com/form"),
    browser,
    true,
  );
  assert.equal(result?.result, true);
  assert.deepEqual(opened, ["https://example.com/form"]);
  assert.equal(result?.requestId, "test-request");
});

test("closing a detail frame during the capability check cancels the open request", async () => {
  let visible = true;
  let opens = 0;
  const browser = {
    isSupported: async () => {
      visible = false;
      return true;
    },
    open: async () => {
      opens++;
      return true;
    },
  };
  const result = await handleHostExternalBrowserRequest(
    request("open", "https://example.com/form"),
    browser,
    () => visible,
  );
  assert.equal(result?.result, false);
  assert.equal(opens, 0);
});

test("older native packages and native failures return an ordinary-link fallback", async () => {
  let opens = 0;
  const unavailable = {
    isSupported: async () => false,
    open: async () => {
      opens++;
      return true;
    },
  };
  assert.equal(
    (
      await handleHostExternalBrowserRequest(
        request("open", "https://example.com"),
        unavailable,
        true,
      )
    )?.result,
    false,
  );
  assert.equal(opens, 0);
  const oldPackage = {
    isSupported: async () => {
      throw new Error("UNIMPLEMENTED");
    },
    open: unavailable.open,
  };
  assert.equal(
    (await handleHostExternalBrowserRequest(request(), oldPackage, true))
      ?.result,
    false,
  );
  const failed = {
    isSupported: async () => true,
    open: async () => {
      throw new Error("Browser unavailable");
    },
  };
  assert.equal(
    (
      await handleHostExternalBrowserRequest(
        request("open", "https://example.com"),
        failed,
        true,
      )
    )?.result,
    false,
  );
});
