import assert from "node:assert/strict";
import test from "node:test";
import { createDdzAudioSession, DDZ_AUDIO_DEFAULTS, freshDdzCue, normalizeDdzAudioPreferences } from "./doudizhuAudio";
import type { DdzEvent } from "./doudizhuTypes";

const event = (id: number, kind: DdzEvent["kind"], at = 1000): DdzEvent => ({ id, kind, at, gameNo: 1, dealNo: 1, turnId: 2 });
test("audio preferences reject corrupt data and keep music opt-in", () => {
  assert.deepEqual(normalizeDdzAudioPreferences(null), DDZ_AUDIO_DEFAULTS);
  assert.deepEqual(normalizeDdzAudioPreferences({ sound: false, music: "on", soundVolume: Infinity, musicVolume: 120 }), { sound: false, music: false, soundVolume: 70, musicVolume: 100 });
});
test("snapshots do not replay seen or expired events", () => {
  assert.equal(freshDdzCue([event(3, "PLAY")], 3, 1200), null);
  assert.equal(freshDdzCue([event(4, "PLAY")], 3, 2001), null);
  assert.equal(freshDdzCue([event(4, "PLAY", 5000)], 3, 1000), null);
  assert.equal(freshDdzCue([event(4, "RESULT")], 3, 2500)?.cue, "result");
});
test("a winning play emits one result cue despite multiple domain events", () => {
  assert.equal(freshDdzCue([event(4, "PLAY"), event(5, "RESULT")], 3, 1200)?.cue, "result");
});

test("late audio downloads cannot sound after mute, background, ownership loss or unmount", async () => {
  const globals = globalThis as unknown as Record<string, unknown>;
  const originals = { document: globals.document, AudioContext: globals.AudioContext, fetch: globals.fetch };
  try {
    for (const cancel of ["mute", "hidden", "owner", "dispose"] as const) {
      const document = { hidden: false };
      globals.document = document;
      let starts = 0;
      const responses: (() => void)[] = [];
      globals.fetch = () => new Promise(resolve => responses.push(() => resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) })));
      globals.AudioContext = class {
        destination = {};
        async resume() {} async close() {}
        async decodeAudioData() { return {}; }
        createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; }
        createBufferSource() { return { buffer: null, onended: null, start() { starts++; }, stop() {}, connect(gain: unknown) { return gain; }, disconnect() {} }; }
      };
      const audio = createDdzAudioSession();
      audio.setOwner(true); audio.unlock();
      const playback = audio.play("play");
      if (cancel === "mute") audio.setPreferences({ ...DDZ_AUDIO_DEFAULTS, sound: false });
      if (cancel === "hidden") { document.hidden = true; audio.visibility(); }
      if (cancel === "owner") audio.setOwner(false);
      if (cancel === "dispose") audio.dispose();
      responses.forEach(resolve => resolve());
      await playback;
      assert.equal(starts, 0, cancel);
      audio.dispose();
    }
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globals[key]; else globals[key] = value;
    }
  }
});
