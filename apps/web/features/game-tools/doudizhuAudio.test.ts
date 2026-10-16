import assert from "node:assert/strict";
import test from "node:test";
import {
  createDdzAudioSession,
  DDZ_AUDIO_DEFAULTS,
  DDZ_AUDIO_LATE_WINDOW_MS,
  ddzCueForEvent,
  freshDdzCue,
  normalizeDdzAudioPreferences,
} from "./doudizhuAudio";
import type { DdzEvent, DdzPatternType } from "./doudizhuTypes";

const event = (
  id: number,
  kind: DdzEvent["kind"],
  at = 1_000,
  type?: DdzPatternType,
): DdzEvent => ({
  id,
  kind,
  at,
  gameNo: 1,
  dealNo: 1,
  turnId: id,
  ...(type
    ? {
        play: { type, cardIds: [], mainRank: 10, cardCount: 6, chainLength: 2 },
      }
    : {}),
});

type Automation = { op: string; value?: number; at: number };
class Param {
  value = 1;
  history: Automation[] = [];
  scheduled: Automation[] = [];
  setValueAtTime(value: number, at: number) {
    this.value = value;
    this.history.push({ op: "set", value, at });
    this.scheduled.push({ op: "set", value, at });
    return this;
  }
  linearRampToValueAtTime(value: number, at: number) {
    this.history.push({ op: "ramp", value, at });
    this.scheduled.push({ op: "ramp", value, at });
    return this;
  }
  cancelScheduledValues(at: number) {
    this.history.push({ op: "cancel", at });
    this.scheduled = this.scheduled.filter((entry) => entry.at < at);
    return this;
  }
  cancelAndHoldAtTime(at: number) {
    this.cancelScheduledValues(at);
    this.history.push({ op: "hold", at });
    return this;
  }
}
class Node {
  connections: Node[] = [];
  disconnected = false;
  connect(node: Node) {
    this.connections.push(node);
    return node;
  }
  disconnect() {
    this.disconnected = true;
  }
}
class Gain extends Node {
  gain = new Param();
}
class BufferSource extends Node {
  buffer: { duration: number; path: string } | null = null;
  onended: (() => void) | null = null;
  starts: number[] = [];
  stops = 0;
  stopTimes: (number | undefined)[] = [];
  start(at: number) {
    this.starts.push(at);
  }
  stop(at?: number) {
    this.stops++;
    this.stopTimes.push(at);
  }
}
function fixture(defer: (path: string) => boolean = () => false) {
  let clock = 1_000,
    hidden = false;
  const requests: string[] = [];
  const pending = new Map<string, () => void>();
  const bytePaths = new WeakMap<ArrayBuffer, string>();
  const durations = (path: string) =>
    path.includes("/voice/")
      ? 1.1
      : path.endsWith("rocket.wav")
        ? 1.25
        : path.endsWith("straight.wav")
          ? 0.9
          : path.endsWith("finish.wav")
            ? 0.55
            : 0.3;
  class Context {
    state = "running";
    destination = new Node();
    gains: Gain[] = [];
    sources: BufferSource[] = [];
    media: Node[] = [];
    closed = false;
    get currentTime() {
      return 10 + clock / 1_000;
    }
    async resume() {
      this.state = "running";
    }
    async close() {
      this.closed = true;
      this.state = "closed";
    }
    async decodeAudioData(bytes: ArrayBuffer) {
      const path = bytePaths.get(bytes)!;
      return { duration: durations(path), path };
    }
    createGain() {
      const gain = new Gain();
      this.gains.push(gain);
      return gain;
    }
    createBufferSource() {
      const source = new BufferSource();
      this.sources.push(source);
      return source;
    }
    createMediaElementSource() {
      const node = new Node();
      this.media.push(node);
      return node;
    }
  }
  const ctx = new Context();
  const tracks: {
    path: string;
    paused: boolean;
    pauses: number;
    plays: number;
    loop: boolean;
    preload: string;
    volume: number;
    play: () => Promise<void>;
    pause: () => void;
  }[] = [];
  const audio = createDdzAudioSession({
    now: () => clock,
    isHidden: () => hidden,
    createContext: () => ctx as unknown as AudioContext,
    createMusic: (path) => {
      const track = {
        path,
        paused: true,
        pauses: 0,
        plays: 0,
        loop: false,
        preload: "",
        volume: 0,
        async play() {
          this.paused = false;
          this.plays++;
        },
        pause() {
          this.paused = true;
          this.pauses++;
        },
      };
      tracks.push(track);
      return track as unknown as HTMLAudioElement;
    },
    fetchAudio: (path) => {
      requests.push(path);
      const bytes = new ArrayBuffer(1);
      bytePaths.set(bytes, path);
      return defer(path)
        ? new Promise((resolve) => pending.set(path, () => resolve(bytes)))
        : Promise.resolve(bytes);
    },
  });
  audio.setOwner(true);
  audio.setLocale("zh-CN");
  audio.unlock();
  const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
  const resolveAll = () => {
    pending.forEach((resolve) => resolve());
    pending.clear();
  };
  return {
    audio,
    ctx,
    tracks,
    pending,
    requests,
    flush,
    resolveAll,
    setNow: (value: number) => {
      clock = value;
    },
    setHidden: (value: boolean) => {
      hidden = value;
    },
  };
}

test("legacy preferences add independent speech controls while music remains opt-in", () => {
  assert.deepEqual(normalizeDdzAudioPreferences(null), DDZ_AUDIO_DEFAULTS);
  assert.deepEqual(
    normalizeDdzAudioPreferences({
      sound: false,
      music: "on",
      soundVolume: Infinity,
      musicVolume: 120,
      voiceVolume: -10,
    }),
    {
      sound: false,
      voice: true,
      music: false,
      soundVolume: 70,
      voiceVolume: 0,
      musicVolume: 100,
    },
  );
});
test("event mapping preserves each phrase, both passes and the winning play ahead of RESULT", () => {
  for (const [type, cue] of [
    ["STRAIGHT", "straight"],
    ["PAIR_STRAIGHT", "pairs"],
    ["AIRPLANE", "airplane"],
    ["AIRPLANE_SINGLE", "airplane"],
    ["AIRPLANE_PAIR", "airplane"],
    ["ROCKET", "rocket"],
    ["BOMB", "bomb"],
  ] as const)
    assert.equal(ddzCueForEvent(event(1, "PLAY", 1_000, type)), cue);
  assert.equal(freshDdzCue([event(3, "PLAY")], 3, 1_200), null);
  assert.equal(freshDdzCue([event(4, "PLAY")], 3, 2_501), null);
  assert.equal(freshDdzCue([event(4, "PLAY", 5_000)], 3, 1_000), null);
  assert.equal(freshDdzCue([event(4, "RESULT")], 3, 2_500)?.cue, "result");
  assert.equal(
    freshDdzCue(
      [event(4, "PLAY", 1_000, "ROCKET"), event(5, "RESULT")],
      3,
      1_200,
    )?.cue,
    "rocket",
  );
  assert.equal(
    freshDdzCue(
      [event(4, "PLAY", 1_000, "ROCKET"), event(5, "RESULT")],
      3,
      1_200,
    )?.result,
    true,
  );
  assert.equal(
    freshDdzCue([event(4, "PASS"), event(5, "TRICK")], 3, 1_200)?.cue,
    "pass",
  );
  assert.equal(
    freshDdzCue(
      [event(4, "PLAY", 1_000, "ROCKET"), event(5, "PLAY", 1_100, "SINGLE")],
      3,
      1_200,
    )?.cue,
    "play",
  );
});
test("warmed phrase and SFX use the exact shared WebAudio clock and independent gain buses", async () => {
  const f = fixture();
  try {
    await f.audio.preload("zh-CN");
    assert.equal(
      f.ctx.sources.length,
      0,
      "unlock/preload must not replay anything",
    );
    assert.equal(
      await f.audio.playEvent(event(1, "PLAY", 1_000, "STRAIGHT"), {
        locale: "zh-CN",
        startAt: 1_050,
        sourceKey: "game:1",
      }),
      true,
    );
    assert.equal(f.ctx.sources.length, 2);
    for (const source of f.ctx.sources) assert.equal(source.starts[0], 11.05);
    const sound = f.ctx.sources.find(
      (source) => source.buffer!.path === "/sounds/doudizhu/straight.wav",
    )!;
    const voice = f.ctx.sources.find(
      (source) =>
        source.buffer!.path === "/sounds/doudizhu/voice/zh-CN/straight.wav",
    )!;
    assert.equal(sound.connections[0].connections[0], f.ctx.gains[0]);
    assert.equal(voice.connections[0].connections[0], f.ctx.gains[1]);
    assert.equal((sound.connections[0] as Gain).gain.history[0].value, 0.65);
    assert.equal((voice.connections[0] as Gain).gain.history[0].value, 1);
    assert.equal(
      await f.audio.playEvent(event(1, "PLAY", 1_000, "STRAIGHT"), {
        locale: "zh-CN",
        startAt: 1_050,
        sourceKey: "game:1",
      }),
      false,
    );
    assert.equal(
      f.ctx.sources.length,
      2,
      "same accepted event cannot sound twice",
    );
  } finally {
    f.audio.dispose();
  }
});
test("late downloads are discarded rather than starting after the visual moment", async () => {
  const f = fixture(() => true);
  try {
    const playback = f.audio.playEvent(event(1, "PLAY", 1_000, "ROCKET"), {
      locale: "zh-CN",
      startAt: 1_050,
    });
    f.setNow(1_050 + DDZ_AUDIO_LATE_WINDOW_MS + 1);
    f.resolveAll();
    assert.equal(await playback, false);
    assert.equal(f.ctx.sources.length, 0);
    f.audio.unlock();
    await f.audio.preload("zh-CN");
    assert.equal(
      f.ctx.sources.length,
      0,
      "another gesture only warms the cache",
    );
  } finally {
    f.resolveAll();
    f.audio.dispose();
  }
});
test("a delayed voice never delays a ready SFX or joins it midway", async () => {
  const f = fixture((path) => path.includes("/voice/"));
  try {
    await f.flush();
    const playback = f.audio.playEvent(event(1, "PASS"), {
      locale: "zh-CN",
      startAt: 1_050,
    });
    await f.flush();
    assert.equal(f.ctx.sources.length, 1);
    assert.equal(f.ctx.sources[0].starts[0], 11.05);
    f.setNow(1_200);
    f.resolveAll();
    assert.equal(await playback, true);
    assert.equal(f.ctx.sources.length, 1);
  } finally {
    f.resolveAll();
    f.audio.dispose();
  }
});
test("overlapping foreground cues hold BGM ducking until the longest source finishes", async () => {
  const f = fixture();
  try {
    f.audio.setPreferences({ ...DDZ_AUDIO_DEFAULTS, music: true });
    await f.audio.preload("zh-CN");
    await f.audio.playEvent(event(1, "PLAY", 1_000, "STRAIGHT"), {
      locale: "zh-CN",
      startAt: 1_050,
    });
    const duck = f.ctx.gains[3].gain;
    const firstEnd = duck.scheduled.find(
      (entry) => entry.op === "ramp" && entry.value === 1,
    )!.at;
    f.setNow(1_200);
    await f.audio.play("play", { startAt: 1_250 });
    const finalEnd = duck.scheduled
      .filter((entry) => entry.op === "ramp" && entry.value === 1)
      .at(-1)!.at;
    assert.equal(
      finalEnd,
      firstEnd,
      "a shorter new cue cannot restore music early",
    );
    assert.ok(finalEnd > 12.15);
    f.ctx.sources.at(-1)!.onended?.();
    assert.equal(
      duck.scheduled.at(-1)!.at,
      finalEnd,
      "onended of one cue must not reset ducking",
    );
    assert.equal(
      f.tracks[0].volume,
      1,
      "music volume is controlled by the WebAudio bus",
    );
    assert.equal(f.ctx.media[0].connections[0], f.ctx.gains[2]);
    assert.equal(f.ctx.gains[2].connections[0], f.ctx.gains[3]);
  } finally {
    f.audio.dispose();
  }
});
test("music at 100 cannot mask voice at 10 and normal card play also ducks", async () => {
  const f = fixture();
  try {
    f.audio.setPreferences({
      ...DDZ_AUDIO_DEFAULTS,
      music: true,
      musicVolume: 100,
      voiceVolume: 10,
    });
    await f.audio.preload("zh-CN");
    await f.audio.playEvent(event(1, "PLAY", 1_000, "ROCKET"), {
      locale: "zh-CN",
      startAt: 1_050,
    });
    const duck = f.ctx.gains[3].gain;
    const target = duck.scheduled.find(
      (entry) => entry.op === "ramp" && entry.value! < 1,
    )!.value!;
    assert.ok(target <= 0.014001);
    f.audio.cancelPresentation();
    f.audio.setPreferences({ ...DDZ_AUDIO_DEFAULTS, music: true });
    await f.audio.play("play", { startAt: 1_100 });
    assert.ok(
      duck.scheduled.some(
        (entry) => entry.op === "ramp" && entry.value! <= 0.2,
      ),
    );
  } finally {
    f.audio.dispose();
  }
});
test("winning rocket voice and SFX remain simultaneous while a softer result waits until both end", async () => {
  const f = fixture();
  try {
    await f.audio.preload("zh-CN");
    await f.audio.playEvent(event(1, "PLAY", 1_000, "ROCKET"), {
      locale: "zh-CN",
      startAt: 1_050,
      result: true,
    });
    const main = f.ctx.sources.filter(
      (source) => !source.buffer!.path.endsWith("finish.wav"),
    );
    const finish = f.ctx.sources.find((source) =>
      source.buffer!.path.endsWith("finish.wav"),
    )!;
    assert.equal(main.length, 2);
    assert.ok(
      main.every((source) => source.starts[0] === 11.05 && source.stops === 0),
    );
    assert.ok(finish.starts[0] >= 12.48 - 1e-9);
    assert.equal((finish.connections[0] as Gain).gain.history[0].value, 0.22);
  } finally {
    f.audio.dispose();
  }
});
test("speech and effects switches work independently", async () => {
  for (const bus of ["sound", "voice"] as const) {
    const f = fixture();
    try {
      await f.audio.preload("zh-CN");
      f.audio.setPreferences({
        ...DDZ_AUDIO_DEFAULTS,
        sound: bus === "sound",
        voice: bus === "voice",
      });
      await f.audio.playEvent(event(1, "PASS"), {
        locale: "zh-CN",
        startAt: 1_050,
      });
      assert.equal(f.ctx.sources.length, 1);
      assert.equal(
        f.ctx.sources[0].buffer!.path.includes("/voice/"),
        bus === "voice",
      );
    } finally {
      f.audio.dispose();
    }
  }
});
test("mute, background, owner loss, portrait, explicit cancellation and disposal stop future sources and pending voice", async () => {
  for (const mode of [
    "mute",
    "hidden",
    "owner",
    "portrait",
    "cancel",
    "dispose",
  ] as const) {
    const f = fixture((path) => path.includes("/voice/"));
    try {
      f.audio.setPreferences({ ...DDZ_AUDIO_DEFAULTS, music: true });
      await f.flush();
      const playback = f.audio.playEvent(event(1, "PLAY", 1_000, "ROCKET"), {
        locale: "zh-CN",
        startAt: 1_500,
      });
      await f.flush();
      assert.equal(f.ctx.sources.length, 1, mode);
      const source = f.ctx.sources[0];
      if (mode === "mute")
        f.audio.setPreferences({ ...DDZ_AUDIO_DEFAULTS, voice: false });
      if (mode === "hidden") {
        f.setHidden(true);
        f.audio.visibility();
      }
      if (mode === "owner") f.audio.setOwner(false);
      if (mode === "portrait") f.audio.setPresentationAllowed(false);
      if (mode === "cancel") f.audio.cancelPresentation();
      if (mode === "dispose") f.audio.dispose();
      f.resolveAll();
      await playback;
      assert.equal(
        f.ctx.sources.length,
        1,
        `${mode}: late speech must not start`,
      );
      assert.equal(source.stops, 1, mode);
      assert.equal(source.disconnected, true, mode);
      assert.equal(
        f.ctx.gains[3].gain.history
          .filter((entry) => entry.op === "set")
          .at(-1)!.value,
        1,
        `${mode}: reset duck`,
      );
      if (["hidden", "owner", "portrait", "dispose"].includes(mode))
        assert.equal(f.tracks[0].paused, true, mode);
    } finally {
      f.resolveAll();
      f.audio.dispose();
    }
  }
});
test("owner and unlock gates never accumulate events for later replay", async () => {
  const f = fixture();
  try {
    await f.audio.preload("fr");
    f.audio.setOwner(false);
    assert.equal(
      await f.audio.playEvent(event(1, "PASS"), {
        locale: "fr",
        startAt: 1_050,
        sourceKey: "once",
      }),
      false,
    );
    f.audio.setOwner(true);
    f.audio.unlock();
    await f.audio.preload("fr");
    assert.equal(f.ctx.sources.length, 0);
    assert.equal(
      await f.audio.playEvent(event(1, "PASS"), {
        locale: "fr",
        startAt: 1_050,
        sourceKey: "once",
      }),
      false,
    );
    assert.ok(f.requests.includes("/sounds/doudizhu/voice/fr/pass.wav"));
  } finally {
    f.audio.dispose();
  }
});

test("two quick spoken events replace the previous voice with a short fade without cutting SFX", async () => {
  const f = fixture();
  try {
    await f.audio.preload("zh-CN");
    await f.audio.playEvent(event(1, "PASS"), {
      locale: "zh-CN",
      startAt: 1_050,
    });
    const oldVoice = f.ctx.sources.find((source) =>
      source.buffer!.path.includes("/voice/"),
    )!;
    const oldSfx = f.ctx.sources.find(
      (source) => !source.buffer!.path.includes("/voice/"),
    )!;
    f.setNow(1_100);
    await f.audio.playEvent(event(2, "PASS"), {
      locale: "zh-CN",
      startAt: 1_150,
    });
    const nextVoice = f.ctx.sources
      .filter((source) => source.buffer!.path.includes("/voice/"))
      .at(-1)!;
    assert.equal(oldVoice.stops, 1);
    assert.ok(oldVoice.stopTimes[0]! < nextVoice.starts[0]);
    assert.ok(
      (oldVoice.connections[0] as Gain).gain.history.some(
        (entry) => entry.op === "ramp" && entry.value === 0,
      ),
    );
    assert.equal(oldSfx.stops, 0);
    const target = f.ctx.gains[3].gain.scheduled
      .filter((entry) => entry.op === "ramp" && entry.value === 1)
      .at(-1)!;
    assert.ok(target.at > nextVoice.starts[0] + 1.1);
  } finally {
    f.audio.dispose();
  }
});
test("only latest pending speech may decode into a source, and stale requests do not silence it", async () => {
  const f = fixture((path) => path.includes("/voice/"));
  try {
    await f.flush();
    const first = f.audio.playEvent(event(1, "PASS"), {
      locale: "zh-CN",
      startAt: 1_050,
    });
    const second = f.audio.playEvent(event(2, "PASS"), {
      locale: "zh-CN",
      startAt: 1_060,
    });
    f.resolveAll();
    await Promise.all([first, second]);
    const voices = f.ctx.sources.filter((source) =>
      source.buffer!.path.includes("/voice/"),
    );
    assert.equal(voices.length, 1);
    assert.equal(voices[0].starts[0], 11.06);
    assert.equal(
      await f.audio.playEvent(event(3, "PASS"), {
        locale: "zh-CN",
        startAt: 900,
      }),
      false,
    );
    assert.equal(
      voices[0].stops,
      0,
      "expired requests must not replace a valid voice",
    );
  } finally {
    f.resolveAll();
    f.audio.dispose();
  }
});
