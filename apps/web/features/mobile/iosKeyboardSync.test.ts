import assert from "node:assert/strict";
import test from "node:test";
import { getIOSKeyboardSyncIssues } from "./iosKeyboardSync";

const lock = "PODS:\n  - CapacitorKeyboard (7.0.6):\n    - Capacitor\n";
const synced = {
  config: { packageClassList: ["KeyboardPlugin", "PushNotificationsPlugin"] },
  installedPodfileLock: lock,
  podfileLock: lock,
};

test("iOS keyboard check accepts synced plugin metadata and installed pods", () => {
  assert.deepEqual(getIOSKeyboardSyncIssues(synced), []);
});

test("iOS keyboard check rejects missing or stale native dependencies", () => {
  assert.equal(
    getIOSKeyboardSyncIssues({ ...synced, podfileLock: "PODS:\n" }).length,
    2,
  );
  assert.equal(
    getIOSKeyboardSyncIssues({ ...synced, installedPodfileLock: null }).length,
    1,
  );
  assert.equal(
    getIOSKeyboardSyncIssues({
      ...synced,
      podfileLock: lock.replace("7.0.6", "6.0.0"),
    }).length,
    2,
  );
});

test("iOS keyboard check requires actual plugin registration, not just its settings", () => {
  for (const config of [
    null,
    {},
    { plugins: { Keyboard: { resize: "native" } } },
    { packageClassList: ["PushNotificationsPlugin"] },
  ]) {
    assert.equal(getIOSKeyboardSyncIssues({ ...synced, config }).length, 1);
  }
});
