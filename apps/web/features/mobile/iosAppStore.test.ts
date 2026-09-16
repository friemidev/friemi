import assert from "node:assert/strict";
import test from "node:test";
import { isIOSWebUserAgent } from "./iosAppStore";

test("iOS web detection accepts iPhone and iPad browser user agents", () => {
  assert.equal(
    isIOSWebUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
    ),
    true,
  );
  assert.equal(
    isIOSWebUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    ),
    true,
  );
});

test("iOS web detection excludes native Friemi and non-Apple clients", () => {
  assert.equal(
    isIOSWebUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 FriemiIOS/1",
    ),
    false,
  );
  assert.equal(
    isIOSWebUserAgent("Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile"),
    false,
  );
  assert.equal(isIOSWebUserAgent(null), false);
});
