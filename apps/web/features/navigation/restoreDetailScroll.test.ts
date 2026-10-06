import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { restoreDetailScroll } from "./restoreDetailScroll";

function browser(t: TestContext, maxScroll = 1000) {
  let id = 0;
  let resize = () => {};
  const frames = new Map<number, () => void>();
  const timers = new Map<number, () => void>();
  const listeners = new Map<string, () => void>();
  const state = { scrollY: 0, maxScroll, disconnected: false };
  const values = {
    window: {
      get scrollY() { return state.scrollY; },
      scrollTo({ top }: { top: number }) { state.scrollY = Math.min(top, state.maxScroll); },
      addEventListener(name: string, fn: () => void) { listeners.set(name, fn); },
      removeEventListener(name: string) { listeners.delete(name); },
      setTimeout(fn: () => void) { timers.set(++id, fn); return id; },
      clearTimeout(key: number) { timers.delete(key); },
    },
    document: { body: {} },
    requestAnimationFrame(fn: () => void) { frames.set(++id, fn); return id; },
    cancelAnimationFrame(key: number) { frames.delete(key); },
    ResizeObserver: class {
      constructor(fn: () => void) { resize = fn; }
      observe() {}
      disconnect() { state.disconnected = true; }
    },
  };
  for (const [key, value] of Object.entries(values)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  return {
    state, frames, timers, listeners,
    resize: () => resize(),
    frame: () => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((fn) => fn());
    },
  };
}

test("return restores the saved pixel offset, including after router scroll adjustment", (t) => {
  const env = browser(t);
  restoreDetailScroll(400);
  assert.equal(env.state.scrollY, 400);
  env.state.scrollY = 149;
  env.frame();
  assert.equal(env.state.scrollY, 400);
  assert.equal(env.timers.size, 0);
  assert.equal(env.listeners.size, 0);
});

test("return waits for streamed content to provide enough scroll range", (t) => {
  const env = browser(t, 100);
  restoreDetailScroll(400);
  env.frame();
  assert.equal(env.state.scrollY, 100);
  env.state.maxScroll = 800;
  env.resize();
  env.frame();
  assert.equal(env.state.scrollY, 400);
  assert.equal(env.state.disconnected, true);
});

test("user input cancels a pending restoration instead of pulling the page back", (t) => {
  const env = browser(t, 100);
  restoreDetailScroll(400);
  env.listeners.get("touchstart")?.();
  env.state.scrollY = 60;
  env.state.maxScroll = 800;
  env.resize();
  env.frame();
  assert.equal(env.state.scrollY, 60);
  assert.equal(env.frames.size, 0);
  assert.equal(env.timers.size, 0);
});

test("unmount and invalid saved positions leave no restoration work", (t) => {
  const env = browser(t);
  for (const invalid of [NaN, Infinity, -1]) {
    assert.equal(restoreDetailScroll(invalid), undefined);
  }
  restoreDetailScroll(400)?.();
  assert.equal(env.frames.size, 0);
  assert.equal(env.timers.size, 0);
  assert.equal(env.listeners.size, 0);
});
