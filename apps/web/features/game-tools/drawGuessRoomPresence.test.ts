import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { registerDrawGuessRoomPresence } from "./drawGuessRoomPresence";

function browser(t: TestContext, beaconResult = true) {
  const page = new EventTarget();
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const beacons: string[] = [];
  Object.defineProperty(globalThis, "window", { configurable: true, value: page });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
    sendBeacon: (url: string) => { beacons.push(url); return beaconResult; },
  } });
  const fetchMock = t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, _init?: RequestInit) => Response.json({ ok: true }));
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.after(() => {
    t.mock.timers.tick(500);
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (oldNavigator) Object.defineProperty(globalThis, "navigator", oldNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
  });
  return { page, beacons, fetchMock };
}

test("soft unmount delays /depart and preserves the room instead of leaving it", (t) => {
  const { fetchMock } = browser(t);
  const dispose = registerDrawGuessRoomPresence("soft-unmount");
  dispose();
  t.mock.timers.tick(499);
  assert.equal(fetchMock.mock.callCount(), 0);
  t.mock.timers.tick(1);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.deepEqual(fetchMock.mock.calls[0].arguments, [
    "/api/game-tools/draw-guess/rooms/soft-unmount/depart", { method: "POST", keepalive: true },
  ]);
});

test("a new component instance cancels the old instance's delayed departure", (t) => {
  const { fetchMock } = browser(t);
  registerDrawGuessRoomPresence("quick-reentry")();
  t.mock.timers.tick(250);
  const disposeNew = registerDrawGuessRoomPresence("quick-reentry");
  t.mock.timers.tick(500);
  assert.equal(fetchMock.mock.callCount(), 0);
  disposeNew();
  t.mock.timers.tick(500);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("overlapping room owners and repeated cleanup cannot depart an active room", (t) => {
  const { fetchMock } = browser(t);
  const disposeOld = registerDrawGuessRoomPresence("overlap");
  const disposeNew = registerDrawGuessRoomPresence("overlap");
  disposeOld();
  disposeOld();
  t.mock.timers.tick(500);
  assert.equal(fetchMock.mock.callCount(), 0);
  disposeNew();
  t.mock.timers.tick(500);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("pagehide sends one beacon and cleanup does not duplicate that departure", (t) => {
  const { page, beacons, fetchMock } = browser(t);
  const dispose = registerDrawGuessRoomPresence("pagehide");
  page.dispatchEvent(new Event("pagehide"));
  page.dispatchEvent(new Event("pagehide"));
  dispose();
  t.mock.timers.tick(500);
  assert.deepEqual(beacons, ["/api/game-tools/draw-guess/rooms/pagehide/depart"]);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("pageshow permits a later pagehide to record the next departure", (t) => {
  const { page, beacons } = browser(t);
  const dispose = registerDrawGuessRoomPresence("restored-page");
  page.dispatchEvent(new Event("pagehide"));
  page.dispatchEvent(new Event("pageshow"));
  page.dispatchEvent(new Event("pagehide"));
  dispose();
  assert.equal(beacons.length, 2);
});

test("beacon refusal falls back to a caught keepalive request", async (t) => {
  const { page, fetchMock } = browser(t, false);
  fetchMock.mock.mockImplementation(async () => { throw new TypeError("Offline"); });
  const dispose = registerDrawGuessRoomPresence("offline-page");
  page.dispatchEvent(new Event("pagehide"));
  dispose();
  await Promise.resolve();
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.deepEqual(fetchMock.mock.calls[0].arguments, [
    "/api/game-tools/draw-guess/rooms/offline-page/depart", { method: "POST", keepalive: true },
  ]);
});

test("deliberate leave suppresses pagehide and delayed cleanup", (t) => {
  const { page, beacons, fetchMock } = browser(t);
  let leaving = false;
  const dispose = registerDrawGuessRoomPresence("explicit-leave", () => !leaving);
  dispose();
  leaving = true;
  page.dispatchEvent(new Event("pagehide"));
  t.mock.timers.tick(500);
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.deepEqual(beacons, []);

  const disposeLeaving = registerDrawGuessRoomPresence("explicit-leave-mounted", () => !leaving);
  page.dispatchEvent(new Event("pagehide"));
  disposeLeaving();
  t.mock.timers.tick(500);
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.deepEqual(beacons, []);
});

test("mounting another room cannot cancel the first room's departure", (t) => {
  const { fetchMock } = browser(t);
  registerDrawGuessRoomPresence("first-room")();
  const disposeOther = registerDrawGuessRoomPresence("second-room", () => false);
  t.mock.timers.tick(500);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.equal(fetchMock.mock.calls[0].arguments[0], "/api/game-tools/draw-guess/rooms/first-room/depart");
  disposeOther();
});
