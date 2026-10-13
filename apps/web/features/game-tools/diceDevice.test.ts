import assert from "node:assert/strict";
import test from "node:test";
import { createShakeDetector, createMotionRoller, createDiceAudio, type MotionState } from "./dice-preview/runtime/dice-device.js";
import { diceAudioData } from "./dice-preview/runtime/dice-audio-data.js";

const sample = (x: number) => ({ acceleration: { x, y: 0, z: 0 } });
function device(requestPermission?: () => Promise<string>) {
  const events = new EventTarget();
  const document = Object.assign(new EventTarget(), { hidden: false });
  let now = 0, nextTimer = 0;
  const timers = new Map<number, { time: number; fn: () => void }>();
  const host = {
    document, isSecureContext: true, DeviceMotionEvent: requestPermission ? { requestPermission } : {}, performance: { now: () => now },
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
    setTimeout(fn: () => void, delay: number) { const id = ++nextTimer; timers.set(id, { time: now + delay, fn }); return id; },
    clearTimeout(id: number) { timers.delete(id); },
  };
  return {
    host: host as unknown as Window, document,
    advance(ms: number) { now += ms; for (const [id, timer] of timers) if (timer.time <= now) { timers.delete(id); timer.fn(); } },
    motion(x: number | null) { events.dispatchEvent(Object.assign(new Event("devicemotion"), { acceleration: { x, y: x === null ? null : 0, z: x === null ? null : 0 } })); },
    visibility(hidden: boolean) { document.hidden = hidden; document.dispatchEvent(new Event("visibilitychange")); },
    orientation() { events.dispatchEvent(new Event("orientationchange")); },
  };
}

test("lifting, walking and a single jolt do not roll; a deliberate back-and-forth burst does", () => {
  const detector = createShakeDetector();
  for (let t = 0; t < 1000; t += 100) assert.equal(detector.feed(sample(Math.sin(t) * 4), t), false);
  assert.equal(detector.feed(sample(20), 1200), false);
  assert.equal(detector.feed(sample(23), 1300), false);
  assert.equal(detector.feed(sample(-22), 1400), false);
  assert.equal(detector.feed(sample(20), 1500), true);
  for (let t = 1600; t < 2800; t += 100) assert.equal(detector.feed(sample(t % 200 ? 25 : -25), t), false);
});

test("gravity-only sensors support shaking without treating a resting phone as a shake", () => {
  const detector = createShakeDetector();
  const gravity = (x: number) => ({ acceleration: null, accelerationIncludingGravity: { x, y: 0, z: 9.8 } });
  assert.equal(detector.feed(gravity(0), 0), false);
  assert.equal(detector.feed(gravity(0), 100), false);
  assert.equal(detector.feed(gravity(18), 200), false);
  assert.equal(detector.feed(gravity(-18), 300), false);
  assert.equal(detector.feed(gravity(18), 400), true);
  assert.equal(detector.hasReading({ acceleration: { x: null, y: null, z: null } }), false);
});

test("high-frequency gravity-only readings still recognize a sustained shake", () => {
  const detector = createShakeDetector(); let rolls = 0;
  for (let time = 0; time < 1200; time += 16) {
    const event = { acceleration: null, accelerationIncludingGravity: { x: Math.sin(time / 1000 * Math.PI * 6) * 22, y: 0, z: 9.8 } };
    if (detector.feed(event, time)) rolls += 1;
  }
  assert.equal(rolls, 1);
});

test("permission is requested in the enabling gesture and denial never attaches a motion trigger", async () => {
  let requested = 0, rolls = 0;
  const states: MotionState[] = [];
  const phone = device(async () => { requested += 1; return "denied"; });
  const roller = createMotionRoller({ host: phone.host, canRoll: () => true, onRoll: () => { rolls += 1; }, onState: (state) => states.push(state) });
  const enabling = roller.enable();
  assert.equal(requested, 1);
  assert.equal(await enabling, false);
  assert.deepEqual(states, ["requesting", "denied"]);
  for (const x of [20, -20, 20]) { phone.advance(100); phone.motion(x); }
  assert.equal(rolls, 0);
  roller.destroy();
});

test("leaving during the permission prompt does not install listeners after permission arrives", async () => {
  let resolve!: (permission: string) => void;
  const phone = device(() => new Promise((finish) => { resolve = finish; }));
  const states: MotionState[] = [];
  const roller = createMotionRoller({ host: phone.host, canRoll: () => true, onRoll: () => assert.fail("disposed trigger"), onState: (state) => states.push(state) });
  const enabling = roller.enable(); roller.destroy(); resolve("granted");
  assert.equal(await enabling, false);
  phone.advance(5000); phone.motion(20);
  assert.deepEqual(states, ["requesting"]);
});

test("unsupported or blocked motion and missing sensor readings fall back to buttons", async () => {
  const phone = device();
  const roller = createMotionRoller({ host: phone.host, canRoll: () => true, onRoll: () => assert.fail("no sensor"), onState: () => {} });
  Object.assign(phone.host, { isSecureContext: false });
  assert.equal(await roller.enable(), false); assert.equal(roller.state, "unsupported");
  Object.assign(phone.host, { isSecureContext: true });
  Object.assign(phone.document, { permissionsPolicy: { allowsFeature: () => false } });
  assert.equal(await roller.enable(), false); assert.equal(roller.state, "unsupported");
  Object.assign(phone.document, { permissionsPolicy: undefined });
  assert.equal(await roller.enable(), true); phone.motion(null);
  assert.equal(roller.state, "waiting");
  phone.visibility(true); phone.advance(5000); assert.equal(roller.state, "waiting");
  phone.visibility(false); phone.advance(4001); assert.equal(roller.state, "unavailable");
  roller.destroy();
});

test("busy actions, rotation and hidden pages discard incomplete gestures; switching off removes the listener", async () => {
  const phone = device(); let allowed = true, rolls = 0;
  const roller = createMotionRoller({ host: phone.host, canRoll: () => allowed, onRoll: () => { rolls += 1; }, onState: () => {} });
  await roller.enable(); phone.motion(0); assert.equal(roller.state, "on");
  for (const x of [20, -20]) { phone.advance(100); phone.motion(x); }
  allowed = false; phone.advance(100); phone.motion(20);
  allowed = true; phone.advance(100); phone.motion(-20); assert.equal(rolls, 0);
  phone.orientation(); phone.advance(100); phone.motion(20); assert.equal(rolls, 0);
  phone.visibility(true); phone.advance(100); phone.motion(20); phone.visibility(false);
  for (const x of [20, -20, 20]) { phone.advance(100); phone.motion(x); }
  assert.equal(rolls, 1);
  roller.disable(); phone.advance(2000);
  for (const x of [20, -20, 20]) { phone.advance(100); phone.motion(x); }
  assert.equal(rolls, 1); assert.equal(roller.state, "off"); roller.destroy();
});

test("returning to the page verifies that the previously active sensor still sends readings", async () => {
  const phone = device();
  const roller = createMotionRoller({ host: phone.host, canRoll: () => true, onRoll: () => {}, onState: () => {} });
  await roller.enable(); phone.motion(0); assert.equal(roller.state, "on");
  phone.visibility(true); phone.advance(6000); phone.visibility(false);
  assert.equal(roller.state, "waiting");
  phone.advance(4001); assert.equal(roller.state, "unavailable");
  roller.destroy();
});

function audioDevice(options: { assetOk?: boolean; decodedDuration?: number } = {}) {
  const started: { time: number; offset: number; duration: number; rate: number }[] = [];
  let resumeGate: Promise<void> | undefined, fetchGate: Promise<void> | undefined, time = 0, fetches = 0, stopped = 0;
  let assetOk = options.assetOk ?? true, decodedDuration = options.decodedDuration ?? 50;
  class Audio {
    state = "suspended"; currentTime = 1; sampleRate = 24000; destination = {}; resumes = 0;
    async resume() { this.resumes += 1; if (resumeGate) await resumeGate; this.state = "running"; }
    async close() { this.state = "closed"; }
    async decodeAudioData() { return { duration: decodedDuration }; }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
    createBufferSource() { return { playbackRate: { value: 1 }, buffer: null, onended: null as (() => void) | null, connect() {}, disconnect() {}, start(time: number, offset: number, duration: number) { started.push({ time, offset, duration, rate: this.playbackRate.value }); }, stop() { stopped += 1; this.onended?.(); } }; }
  }
  const host = { AudioContext: Audio, document: { hidden: false }, performance: { now: () => time }, async fetch() { fetches += 1; if (fetchGate) await fetchGate; return { ok: assetOk, arrayBuffer: async () => new ArrayBuffer(8) }; } } as unknown as Window;
  const player = createDiceAudio(host);
  return { player, host, started, context: () => player.context as unknown as Audio, gate(promise?: Promise<void>) { resumeGate = promise; }, assetGate(promise?: Promise<void>) { fetchGate = promise; }, badAsset(ok: boolean, duration = 50) { assetOk = ok; decodedDuration = duration; }, fetches: () => fetches, stopped: () => stopped, advance(ms: number) { time += ms; } };
}

test("enabled roll audio recovers after the browser suspends or interrupts its context", async () => {
  const device = audioDevice(); await device.player.enable();
  for (const state of ["suspended", "interrupted"]) {
    device.context().state = state;
    const before = device.started.length;
    assert.equal(await device.player.roll(900, 5), "played");
    assert.equal(device.context().state, "running");
    assert.equal(device.started.length - before, 2);
  }
  device.player.dispose();
});

test("a pending audio resume cannot replay a roll after mute, background or the animation deadline", async () => {
  for (const reason of ["mute", "background", "expired", "new roll", "phase change"] as const) {
    const device = audioDevice(); await device.player.enable(); device.context().state = "suspended";
    let resolve!: () => void;
    device.gate(new Promise<void>((finish) => { resolve = finish; }));
    const pending = device.player.roll(900, 5);
    if (reason === "mute") device.player.disable();
    if (reason === "background") { Object.assign(device.host.document, { hidden: true }); device.player.stop(); }
    if (reason === "expired") device.advance(1000);
    if (reason === "phase change") device.player.stop();
    if (reason === "new roll") { device.context().state = "running"; await device.player.roll(900, 5); }
    const before = device.started.length;
    resolve(); assert.equal(await pending, "canceled", reason);
    assert.equal(device.started.length, before, reason);
    device.player.dispose();
  }
});

test("a delayed audio resume plays only the remaining part of the current roll", async () => {
  const device = audioDevice(); await device.player.enable(); device.context().state = "suspended";
  let resolve!: () => void;
  device.gate(new Promise<void>((finish) => { resolve = finish; }));
  const pending = device.player.roll(900, 1);
  device.advance(250); resolve();
  assert.equal(await pending, "played");
  assert.equal(device.started.length, 2);
  assert.ok(device.started[0].offset > 0, "recovery skips already elapsed shake audio");
  assert.ok(device.started.every((voice) => voice.time >= 1 && voice.time + voice.duration <= 1.651));
  device.player.dispose();
});

test("audio resume failures are distinguished from muted or canceled rolls", async () => {
  const device = audioDevice(); await device.player.enable(); device.context().state = "suspended";
  device.context().resume = async () => { throw new Error("Audio unavailable"); };
  assert.equal(await device.player.roll(900, 5), "blocked");
  assert.equal(device.started.length, 0);
  device.player.disable(); assert.equal(await device.player.roll(900, 5), "canceled");
  device.player.dispose();
});

test("recorded foley keeps its pitch for quick rolls, distinguishes one die, and stops when muted", async () => {
  const device = audioDevice(), audio = device.player;
  assert.equal(await audio.roll(), "canceled");
  assert.equal(await audio.enable(), true);
  assert.equal(await audio.roll(900, 1), "played");
  assert.equal(device.started.length, 2);
  assert.ok(device.started.every(voice => voice.rate === 1 && voice.time + voice.duration <= 1.901));
  assert.ok(diceAudioData.groups["1"].landing.some(take => take.offset === device.started[1].offset), "one die uses a single-die landing");
  audio.disable(); assert.equal(device.stopped(), 2);
  assert.equal(await audio.roll(), "canceled"); assert.equal(device.started.length, 2);
  await audio.enable(); assert.equal(await audio.roll(140, 5), "played");
  assert.equal(device.started.length, 3, "reduced motion only plays a brief landing");
  assert.ok(device.started[2].duration <= .14 && device.started[2].rate === 1);
  assert.equal(device.fetches(), 1, "muting and re-enabling reuse the cached atlas");
  Object.assign(device.host.document, { hidden: true }); assert.equal(await audio.roll(), "canceled");
  audio.dispose(); assert.equal(audio.context?.state, "closed"); assert.equal(await audio.enable(), false);
});

test("a first roll waiting for audio download cannot play after mute or its deadline", async () => {
  for (const reason of ["mute", "expired", "dispose"] as const) {
    const device = audioDevice({ assetOk: false });
    // Force a retry so the constructor's initial preload has finished first.
    device.badAsset(false); assert.equal(await device.player.enable(), false); device.badAsset(true);
    let resolve!: () => void;
    device.assetGate(new Promise<void>(finish => { resolve = finish; }));
    const enabling = device.player.enable();
    await Promise.resolve();
    const roll = device.player.roll(900);
    if (reason === "mute") device.player.disable();
    if (reason === "dispose") device.player.dispose();
    if (reason === "expired") device.advance(1000);
    resolve(); await enabling;
    assert.equal(await roll, "canceled", reason); assert.equal(device.started.length, 0, reason);
    device.player.dispose();
  }
});

test("missing or invalid recorded audio reports failure and can be retried", async () => {
  for (const failure of ["missing", "short"] as const) {
    const device = audioDevice({ assetOk: failure !== "missing", decodedDuration: failure === "short" ? .1 : 50 });
    assert.equal(await device.player.enable(), false);
    assert.equal(await device.player.roll(), "canceled");
    device.badAsset(true); assert.equal(await device.player.enable(), true);
    assert.equal(await device.player.roll(), "played"); assert.equal(device.started.length, 2);
    device.player.dispose();
  }
});

test("dice count and cover choose matching physical recordings; a covered roll never lands outside", async () => {
  const device = audioDevice(); await device.player.enable();
  for (const count of [1, 2, 3, 4, 5, 6]) {
    const group = diceAudioData.groups[count === 1 ? "1" : count <= 3 ? "3" : "6"];
    const before = device.started.length;
    await device.player.roll(1800, count, { covered: true });
    const voices = device.started.slice(before);
    assert.equal(voices.length, 1, `covered ${count} dice have only internal cup impacts`);
    assert.ok(group.covered.some(take => Math.abs(voices[0].offset - take.offset) < .001));
    assert.ok(voices[0].time + voices[0].duration <= 2.801);
    await device.player.roll(900, count);
    assert.ok(group.landing.some(take => take.offset === device.started.at(-1)!.offset), `${count} dice use their recorded landing group`);
  }
  const before = device.started.length;
  await device.player.roll(140, 5, { covered: true });
  assert.equal(device.started.length, before + 1);
  assert.ok(diceAudioData.groups["6"].closedTick.some(take => take.offset === device.started.at(-1)!.offset), "reduced covered cue also stays inside the cup");
  device.player.dispose();
});

test("quick covered rolls keep the real settling tail, don't repeat a take, and skip elapsed audio after recovery", async () => {
  const device = audioDevice(); await device.player.enable();
  let lastOffset: number | undefined;
  for (let n = 0; n < 8; n += 1) {
    await device.player.roll(900, 5, { covered: true });
    const voice = device.started.at(-1)!;
    assert.equal(voice.rate, 1);
    assert.equal(voice.duration, .9);
    assert.ok(diceAudioData.groups["6"].covered.some(take => Math.abs(voice.offset + voice.duration - take.offset - take.duration) < .001), "quick roll ends at the recording's own settling tail");
    assert.notEqual(voice.offset, lastOffset, "avoid immediately repeating a cup take");
    lastOffset = voice.offset;
  }
  device.context().state = "interrupted";
  let resolve!: () => void;
  device.gate(new Promise<void>(finish => { resolve = finish; }));
  const pending = device.player.roll(900, 5, { covered: true });
  device.advance(250); resolve(); assert.equal(await pending, "played");
  const voice = device.started.at(-1)!;
  assert.ok(Math.abs(voice.duration - .65) < .001);
  assert.ok(diceAudioData.groups["6"].covered.some(take => Math.abs(voice.offset + voice.duration - take.offset - take.duration) < .001));
  device.player.dispose();
});
