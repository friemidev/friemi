import assert from "node:assert/strict";
import test from "node:test";
import { createDrawGuessFullscreenController, type DrawGuessFullscreenEnvironment } from "./drawGuessFullscreen";

function deferred() {
  let resolve!: () => void;
  let reject!: () => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = () => no(new Error("Unavailable")); });
  return { promise, resolve, reject };
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

function fixture() {
  const target = {};
  let element: object | null = null;
  let listener = () => {};
  let unlocks = 0;
  const requests: ReturnType<typeof deferred>[] = [];
  const exits: ReturnType<typeof deferred>[] = [];
  const locks: ReturnType<typeof deferred>[] = [];
  const environment: DrawGuessFullscreenEnvironment = {
    key: {}, target, getElement: () => element,
    request: () => { const value = deferred(); requests.push(value); return value.promise; },
    exit: () => { const value = deferred(); exits.push(value); return value.promise; },
    lock: () => { const value = deferred(); locks.push(value); return value.promise; },
    unlock: () => { unlocks += 1; },
    subscribe: (value) => { listener = value; },
  };
  const client = () => {
    let active = false;
    const controller = createDrawGuessFullscreenController(environment, (value) => { active = value; });
    return { ...controller, get active() { return active; } };
  };
  return {
    environment, requests, exits, locks, client,
    get unlocks() { return unlocks; },
    get element() { return element; },
    async enter(index = 0) { element = target; requests[index].resolve(); listener(); await settle(); },
    async leave(index = 0) { element = null; exits[index].resolve(); listener(); await settle(); },
    external(elementValue: object | null = null) { element = elementValue; listener(); },
  };
}

test("fullscreen starts immediately, while rejected native requests retain CSS fullscreen", async () => {
  const f = fixture(); const c = f.client();
  c.open(); assert.equal(c.active, true); assert.equal(f.requests.length, 1);
  f.requests[0].reject(); await settle();
  assert.equal(c.active, true); assert.equal(f.locks.length, 0);
  c.close(); assert.equal(c.active, false); assert.equal(f.exits.length, 0); assert.equal(f.unlocks, 0);
});

test("closing a pending request exits its late native entry without locking orientation", async () => {
  const f = fixture(); const c = f.client();
  c.open(); c.close(); await f.enter();
  assert.equal(c.active, false); assert.equal(f.exits.length, 1); assert.equal(f.locks.length, 0);
});

test("a remounted canvas adopts the pending request without an old component exiting it", async () => {
  const f = fixture(); const old = f.client(); old.open(); old.dispose();
  const next = f.client(); next.open();
  assert.equal(f.requests.length, 1);
  await f.enter();
  assert.equal(next.active, true); assert.equal(f.exits.length, 0); assert.equal(f.locks.length, 1);
  old.close(); assert.equal(f.exits.length, 0);
  next.close(); assert.equal(f.exits.length, 1);
});

test("reopening during native exit keeps the new CSS fullscreen and does not retry without a gesture", async () => {
  const f = fixture(); const c = f.client(); c.open(); await f.enter();
  c.close(); c.open(); await f.leave();
  assert.equal(c.active, true); assert.equal(f.requests.length, 1); assert.equal(f.locks.length, 1);
  c.close(); c.open(); assert.equal(f.requests.length, 2);
});

test("a rejected native exit retains ownership for the next close without retrying in a loop", async () => {
  const f = fixture(); const c = f.client(); c.open(); await f.enter(); c.close();
  f.exits[0].reject(); await settle();
  assert.equal(f.exits.length, 1); assert.equal(c.active, false);
  c.open(); assert.equal(c.active, true); assert.equal(f.requests.length, 1);
  c.close(); assert.equal(f.exits.length, 2);
});

test("a reopen adopts fullscreen that remains after a rejected asynchronous exit", async () => {
  const f = fixture(); const c = f.client(); c.open(); await f.enter(); c.close(); c.open();
  f.exits[0].reject(); await settle();
  assert.equal(c.active, true); assert.equal(f.locks.length, 2);
  f.external(); assert.equal(c.active, false);
});

test("external native exit closes the owning canvas and unlocks orientation", async () => {
  const f = fixture(); const c = f.client(); c.open(); await f.enter();
  f.external();
  assert.equal(c.active, false); assert.equal(f.unlocks, 1); assert.equal(f.exits.length, 0);
});

test("unmount cleans up native ownership and a late orientation lock", async () => {
  const f = fixture(); const c = f.client(); c.open(); await f.enter(); c.dispose();
  assert.equal(f.exits.length, 1); assert.equal(f.unlocks, 1);
  await f.leave(); f.locks[0].resolve(); await settle();
  assert.equal(f.unlocks, 2);
  c.open(); assert.equal(f.requests.length, 1);
});

test("an old orientation completion cannot unlock the new canvas", async () => {
  const f = fixture(); const old = f.client(); old.open(); await f.enter();
  old.close(); await f.leave();
  const next = f.client(); next.open(); await f.enter(1);
  const before = f.unlocks;
  f.locks[0].resolve(); await settle();
  assert.equal(next.active, true); assert.equal(f.unlocks, before);
  f.locks[1].resolve(); await settle(); assert.equal(f.unlocks, before);
});

test("CSS fallback does not exit or unlock preexisting fullscreen owned elsewhere", () => {
  const f = fixture(); f.external({}); const c = f.client(); c.open(); c.close();
  assert.equal(f.requests.length, 0); assert.equal(f.exits.length, 0); assert.equal(f.unlocks, 0);
});

test("missing fullscreen and orientation APIs preserve the CSS fallback", () => {
  const f = fixture(); f.environment.request = undefined; f.environment.lock = undefined;
  const c = f.client(); c.open(); assert.equal(c.active, true); c.close(); assert.equal(c.active, false);
});
