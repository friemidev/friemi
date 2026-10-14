import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import {
  activityFavoriteUpdatedMessage,
  notifyActivityFavoriteUpdated,
  parseActivityFavoriteSnapshot,
  subscribeActivityFavoriteUpdates,
  type ActivityFavoriteSnapshot,
} from "./activityFavoriteUpdates";

function snapshot(
  overrides: Partial<ActivityFavoriteSnapshot> = {},
): ActivityFavoriteSnapshot {
  return {
    activityId: "plan",
    viewerProfileId: "viewer",
    favoriteCount: 2,
    isFavorited: true,
    updatedAt: 1000,
    ...overrides,
  };
}

test("favorite snapshots accept zero counts and reject malformed updates", () => {
  assert.deepEqual(
    parseActivityFavoriteSnapshot(
      snapshot({ favoriteCount: 0, isFavorited: false }),
    ),
    snapshot({ favoriteCount: 0, isFavorited: false }),
  );
  for (const invalid of [
    null,
    {},
    snapshot({ activityId: " " }),
    snapshot({ viewerProfileId: "" }),
    snapshot({ favoriteCount: -1 }),
    snapshot({ favoriteCount: 0.5 }),
    snapshot({ favoriteCount: Infinity }),
    snapshot({ updatedAt: NaN }),
    { ...snapshot(), isFavorited: "true" },
  ]) {
    assert.equal(parseActivityFavoriteSnapshot(invalid), null);
  }
});

function browser(t: TestContext) {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  let onMessage: ((event: MessageEvent) => void) | undefined;
  const sent: Array<{ message: unknown; origin: string }> = [];
  const cleanups: Array<() => void> = [];
  const frame = {
    postMessage: (message: unknown, origin: string) =>
      sent.push({ message, origin }),
  };
  const win = {
    location: { origin: "https://friemi.test" },
    parent: null as unknown,
    addEventListener: (_name: string, listener: typeof onMessage) => {
      onMessage = listener;
    },
    removeEventListener: () => {
      onMessage = undefined;
    },
  };
  win.parent = win;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: win,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { querySelectorAll: () => [{ contentWindow: frame }] },
  });
  t.after(() => {
    for (const cleanup of cleanups) cleanup();
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalDocument)
      Object.defineProperty(globalThis, "document", originalDocument);
    else Reflect.deleteProperty(globalThis, "document");
  });
  return {
    frame,
    sent,
    win,
    cleanup: (fn: () => void) => cleanups.push(fn),
    dispatch: (
      data: unknown,
      origin = win.location.origin,
      source: unknown = frame,
    ) => onMessage?.({ data, origin, source } as MessageEvent),
  };
}

test("a confirmed update synchronizes matching cards once and uses an explicit frame origin", (t) => {
  const mock = browser(t);
  const matches: ActivityFavoriteSnapshot[] = [];
  const other: ActivityFavoriteSnapshot[] = [];
  const unsubscribe = subscribeActivityFavoriteUpdates(
    "local-card",
    "viewer",
    (value) => matches.push(value),
  );
  const unsubscribeOther = subscribeActivityFavoriteUpdates(
    "another-card",
    "viewer",
    (value) => other.push(value),
  );
  mock.cleanup(unsubscribeOther);
  mock.cleanup(unsubscribe);
  const value = snapshot({ activityId: "local-card" });
  notifyActivityFavoriteUpdated(value);
  assert.deepEqual(matches, [value]);
  assert.equal(other.length, 0);
  assert.equal(mock.sent.length, 1);
  assert.equal(mock.sent[0].origin, "https://friemi.test");
});

test("updates from unknown windows or other origins are ignored, including stale results", (t) => {
  const mock = browser(t);
  const received: ActivityFavoriteSnapshot[] = [];
  const unsubscribe = subscribeActivityFavoriteUpdates(
    "frame-card",
    "viewer",
    (value) => received.push(value),
  );
  mock.cleanup(unsubscribe);
  const data = {
    type: activityFavoriteUpdatedMessage,
    ...snapshot({ activityId: "frame-card" }),
  };
  mock.dispatch(data, "https://evil.test");
  mock.dispatch(data, mock.win.location.origin, {});
  assert.equal(received.length, 0);
  mock.dispatch(data);
  mock.dispatch({ ...data, updatedAt: 999, favoriteCount: 9 });
  assert.equal(received.length, 1);
  assert.equal(
    mock.sent.length,
    0,
    "Do not send the change back to its originating frame",
  );
});

test("a newly hydrated detail frame can request the recent result for its own viewer", (t) => {
  const mock = browser(t);
  const unsubscribe = subscribeActivityFavoriteUpdates(
    "hydration-card",
    "viewer",
    () => {},
  );
  mock.cleanup(unsubscribe);
  notifyActivityFavoriteUpdated(snapshot({ activityId: "hydration-card" }));
  mock.sent.length = 0;
  mock.dispatch({
    type: "friemi:activity-favorite-snapshot-request",
    activityId: "hydration-card",
    viewerProfileId: "other-viewer",
  });
  assert.equal(mock.sent.length, 0);
  mock.dispatch({
    type: "friemi:activity-favorite-snapshot-request",
    activityId: "hydration-card",
    viewerProfileId: "viewer",
  });
  assert.equal(mock.sent.length, 1);
});
