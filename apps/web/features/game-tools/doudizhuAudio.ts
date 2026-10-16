import type { DdzEvent } from "./doudizhuTypes";

export type DdzAudioPreferences = {
  sound: boolean;
  voice: boolean;
  music: boolean;
  soundVolume: number;
  voiceVolume: number;
  musicVolume: number;
};
export type DdzVoice =
  | "pass"
  | "straight"
  | "pairs"
  | "airplane"
  | "rocket"
  | "bomb";
export type DdzCue = "select" | "play" | "deal" | "bid" | "result" | DdzVoice;
export const DDZ_AUDIO_DEFAULTS: DdzAudioPreferences = {
  sound: true,
  voice: true,
  music: false,
  soundVolume: 70,
  voiceVolume: 85,
  musicVolume: 15,
};
export const DDZ_AUDIO_STORAGE = "friemi:doudizhu:audio:v1";
export const DDZ_AUDIO_OWNER = "friemi:doudizhu:audio-owner";
/** A warmed buffer may start slightly late, but never catch up with an old effect. */
export const DDZ_AUDIO_LATE_WINDOW_MS = 80;

export function normalizeDdzAudioPreferences(
  value: unknown,
): DdzAudioPreferences {
  const v =
    value && typeof value === "object"
      ? (value as Partial<DdzAudioPreferences>)
      : {};
  const volume = (n: unknown, fallback: number) =>
    typeof n === "number" && Number.isFinite(n)
      ? Math.max(0, Math.min(100, Math.round(n)))
      : fallback;
  return {
    sound: typeof v.sound === "boolean" ? v.sound : true,
    voice: typeof v.voice === "boolean" ? v.voice : true,
    music: typeof v.music === "boolean" ? v.music : false,
    soundVolume: volume(v.soundVolume, 70),
    voiceVolume: volume(v.voiceVolume, 85),
    musicVolume: volume(v.musicVolume, 15),
  };
}

export function ddzCueForEvent(event: DdzEvent): DdzCue | null {
  if (event.kind === "PASS") return "pass";
  if (event.kind === "RESULT") return "result";
  if (event.kind === "DEAL") return "deal";
  if (event.kind === "BID") return "bid";
  if (event.kind !== "PLAY") return null;
  switch (event.play?.type) {
    case "STRAIGHT":
      return "straight";
    case "PAIR_STRAIGHT":
      return "pairs";
    case "AIRPLANE":
    case "AIRPLANE_SINGLE":
    case "AIRPLANE_PAIR":
      return "airplane";
    case "BOMB":
      return "bomb";
    case "ROCKET":
      return "rocket";
    default:
      return "play";
  }
}

/** Winning PLAY keeps its voice; RESULT may be a quiet, delayed companion. */
export function freshDdzCue(
  events: DdzEvent[],
  after: number,
  now: number,
): { cue: DdzCue; event: DdzEvent; result?: boolean } | null {
  let result: DdzEvent | undefined;
  for (const event of [...events].reverse()) {
    if (event.id <= after) break;
    const cue = ddzCueForEvent(event);
    if (!cue) continue;
    if (
      now - event.at > (event.kind === "RESULT" ? 2_000 : 1_500) ||
      event.at > now + 250
    )
      return null;
    if (event.kind === "RESULT") {
      result = event;
      continue;
    }
    return {
      cue,
      event,
      ...(result && result.gameNo === event.gameNo && event.kind === "PLAY"
        ? { result: true }
        : {}),
    };
  }
  return result ? { cue: "result", event: result } : null;
}

const VOICES: DdzVoice[] = [
  "pass",
  "straight",
  "pairs",
  "airplane",
  "rocket",
  "bomb",
];
const CUES: DdzCue[] = ["select", "play", "deal", "bid", "result", ...VOICES];
const cuePath = (cue: DdzCue) =>
  cue === "result"
    ? "/sounds/draw-guess/finish.wav"
    : cue === "bid"
      ? "/sounds/draw-guess/ready.wav"
      : `/sounds/doudizhu/${cue}.wav`;
const language = (locale: string) =>
  locale === "zh-CN" ? "zh-CN" : locale === "fr" ? "fr" : "en";
const voiceFor = (cue: DdzCue): DdzVoice | null =>
  VOICES.includes(cue as DdzVoice) ? (cue as DdzVoice) : null;
const voicePath = (voice: DdzVoice, locale: string) =>
  `/sounds/doudizhu/voice/${language(locale)}/${voice}.wav`;

type EventPlayback = {
  locale: string;
  startAt: number;
  sourceKey?: string;
  result?: boolean;
};
type PlaybackOptions = {
  startAt?: number;
  locale?: string;
  sourceKey?: string;
  result?: boolean;
};
type Source = {
  node: AudioBufferSourceNode;
  gain: GainNode;
  bus: "sound" | "voice";
  retiring?: boolean;
};
type Graph = {
  sound: GainNode;
  voice: GainNode;
  music: GainNode;
  duck: GainNode;
};
/** Injectable browser primitives keep timing and automation tests deterministic. */
export type DdzAudioRuntimeOptions = {
  now?: () => number;
  isHidden?: () => boolean;
  createContext?: () => AudioContext;
  createMusic?: (path: string) => HTMLAudioElement;
  fetchAudio?: (path: string, signal: AbortSignal) => Promise<ArrayBuffer>;
};

export function createDdzAudioSession(options: DdzAudioRuntimeOptions = {}) {
  const now = options.now ?? (() => performance.now());
  const hidden =
    options.isHidden ??
    (() => typeof document !== "undefined" && document.hidden);
  let preferences = { ...DDZ_AUDIO_DEFAULTS };
  let context: AudioContext | null = null;
  let graph: Graph | null = null;
  let music: HTMLAudioElement | null = null;
  let musicSource: MediaElementAudioSourceNode | null = null;
  let musicPath = "";
  let phase: "lobby" | "game" = "lobby";
  let locale = "en";
  let unlocked = false,
    owner = false,
    disposed = false,
    presentationAllowed = true;
  let generation = 0,
    voiceGeneration = 0,
    foregroundGeneration = 0,
    lastSelectAt = -Infinity;
  let duckStart = Infinity,
    duckUntil = -Infinity,
    duckVoice = false,
    duckSound = false;
  const sources = new Set<Source>();
  const buffers = new Map<string, AudioBuffer>();
  const loads = new Map<string, Promise<AudioBuffer | null>>();
  const controllers = new Map<AbortController, ReturnType<typeof setTimeout>>();
  const seen = new Set<string>();
  const allowed = () =>
    !disposed &&
    owner &&
    unlocked &&
    presentationAllowed &&
    !hidden() &&
    context?.state === "running";

  function hold(param: AudioParam, at: number) {
    if (typeof param.cancelAndHoldAtTime === "function")
      param.cancelAndHoldAtTime(at);
    else {
      const value = param.value;
      param.cancelScheduledValues(at);
      param.setValueAtTime(value, at);
    }
  }
  function resetDuck() {
    duckStart = Infinity;
    duckUntil = -Infinity;
    duckVoice = false;
    duckSound = false;
    if (graph && context) {
      graph.duck.gain.cancelScheduledValues(context.currentTime);
      graph.duck.gain.setValueAtTime(1, context.currentTime);
    }
  }
  function release(source: Source) {
    sources.delete(source);
    source.node.onended = null;
    source.node.disconnect();
    source.gain.disconnect();
  }
  function cancelPresentation() {
    generation++;
    voiceGeneration++;
    foregroundGeneration++;
    for (const source of [...sources]) {
      try {
        source.node.stop();
      } catch {
        /* Already ended. */
      }
      release(source);
    }
    resetDuck();
  }
  function replaceVoice() {
    voiceGeneration++;
    if (!context) return;
    for (const source of sources) {
      if (source.bus !== "voice" || source.retiring) continue;
      source.retiring = true;
      const fadeEnd = context.currentTime + 0.02;
      hold(source.gain.gain, context.currentTime);
      source.gain.gain.linearRampToValueAtTime(0, fadeEnd);
      try {
        source.node.stop(fadeEnd);
      } catch {
        release(source);
      }
    }
  }
  function applyVolumes() {
    if (!context || !graph) return;
    const at = context.currentTime;
    for (const [bus, volume] of [
      [graph.sound, preferences.sound ? preferences.soundVolume : 0],
      [graph.voice, preferences.voice ? preferences.voiceVolume : 0],
      [graph.music, preferences.music ? preferences.musicVolume : 0],
    ] as const) {
      hold(bus.gain, at);
      bus.gain.linearRampToValueAtTime(volume / 100, at + 0.025);
    }
    if (duckUntil > at) automateDuck();
  }
  function automateDuck() {
    if (!context || !graph) return;
    const at = context.currentTime;
    const musicLevel = preferences.musicVolume / 100;
    // Also cap relative to the audible foreground. Music 100 / voice 10 must
    // not defeat ducking simply because the user's sliders differ greatly.
    let ceiling = musicLevel * 0.2;
    if (duckVoice && preferences.voice && preferences.voiceVolume > 0)
      ceiling = Math.min(ceiling, (preferences.voiceVolume / 100) * 0.14);
    if (duckSound && preferences.sound && preferences.soundVolume > 0)
      ceiling = Math.min(ceiling, (preferences.soundVolume / 100) * 0.18);
    const target = musicLevel > 0 ? Math.min(0.2, ceiling / musicLevel) : 0.2;
    hold(graph.duck.gain, at);
    graph.duck.gain.linearRampToValueAtTime(
      target,
      Math.max(at, duckStart) + 0.025,
    );
    graph.duck.gain.setValueAtTime(target, Math.max(at + 0.025, duckUntil));
    graph.duck.gain.linearRampToValueAtTime(
      1,
      Math.max(at + 0.025, duckUntil) + 0.42,
    );
  }
  function duck(start: number, end: number, bus: "sound" | "voice") {
    if (!context) return;
    if (context.currentTime > duckUntil + 0.42) {
      duckStart = Infinity;
      duckVoice = false;
      duckSound = false;
    }
    duckStart = Math.min(duckStart, start);
    duckUntil = Math.max(duckUntil, end + 0.08);
    if (bus === "voice") duckVoice = true;
    else duckSound = true;
    automateDuck();
  }
  function syncMusic() {
    if (!allowed() || !preferences.music || !context || !graph) {
      music?.pause();
      return;
    }
    const path = `/sounds/draw-guess/music-${phase}.mp3`;
    if (!music || musicPath !== path) {
      music?.pause();
      musicSource?.disconnect();
      musicSource = null;
      try {
        music = options.createMusic
          ? options.createMusic(path)
          : new Audio(path);
        musicPath = path;
        music.loop = true;
        music.preload = "none";
        music.volume = 1;
        musicSource = context.createMediaElementSource(music);
        musicSource.connect(graph.music);
      } catch {
        music?.pause();
        music = null;
        musicPath = "";
        return;
      }
    }
    const current = music;
    if (!current.paused) return;
    void current
      .play()
      .then(() => {
        if (current !== music || !allowed() || !preferences.music)
          current.pause();
      })
      .catch(() => {
        /* A new gesture may retry denied music; never a past cue. */
      });
  }
  function load(path: string): Promise<AudioBuffer | null> {
    if (buffers.has(path)) return Promise.resolve(buffers.get(path)!);
    if (loads.has(path)) return loads.get(path)!;
    if (!context || disposed) return Promise.resolve(null);
    const audioContext = context,
      controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    controllers.set(controller, timeout);
    const signal = controller.signal;
    const pending = (
      options.fetchAudio
        ? options.fetchAudio(path, signal)
        : fetch(path, { signal }).then((response) => {
            if (!response.ok) throw new Error("AUDIO_UNAVAILABLE");
            return response.arrayBuffer();
          })
    )
      .then((bytes) => audioContext.decodeAudioData(bytes))
      .then((buffer) => {
        if (!disposed && context === audioContext) buffers.set(path, buffer);
        return buffer;
      })
      .catch(() => null)
      .finally(() => {
        clearTimeout(timeout);
        loads.delete(path);
        controllers.delete(controller);
      });
    loads.set(path, pending);
    return pending;
  }
  async function preload(nextLocale = locale) {
    locale = language(nextLocale);
    if (!context || disposed) return;
    await Promise.all(
      [
        ...CUES.map(cuePath),
        ...VOICES.map((voice) => voicePath(voice, locale)),
      ].map(load),
    );
  }
  async function schedule(
    path: string,
    bus: "sound" | "voice",
    startAt: number,
    level: number,
    epoch: number,
    shouldDuck: boolean,
    voiceEpoch?: number,
  ): Promise<{ played: boolean; endAt: number }> {
    const skipped = { played: false, endAt: startAt };
    if (
      !allowed() ||
      !context ||
      !graph ||
      now() > startAt + DDZ_AUDIO_LATE_WINDOW_MS
    )
      return skipped;
    const buffer = await load(path);
    if (
      !buffer ||
      !allowed() ||
      !context ||
      !graph ||
      epoch !== generation ||
      (bus === "voice" && voiceEpoch !== voiceGeneration) ||
      now() > startAt + DDZ_AUDIO_LATE_WINDOW_MS
    )
      return skipped;
    if (
      bus === "voice"
        ? !preferences.voice || preferences.voiceVolume <= 0
        : !preferences.sound || preferences.soundVolume <= 0
    )
      return skipped;
    const start = context.currentTime + Math.max(0, startAt - now()) / 1_000;
    const source: Source = {
      node: context.createBufferSource(),
      gain: context.createGain(),
      bus,
    };
    source.node.buffer = buffer;
    source.gain.gain.setValueAtTime(level, start);
    source.node
      .connect(source.gain)
      .connect(bus === "voice" ? graph.voice : graph.sound);
    sources.add(source);
    source.node.onended = () => release(source);
    try {
      source.node.start(start);
    } catch {
      release(source);
      return skipped;
    }
    if (shouldDuck) duck(start, start + buffer.duration, bus);
    return { played: true, endAt: startAt + buffer.duration * 1_000 };
  }
  async function play(
    cue: DdzCue,
    playback: PlaybackOptions = {},
  ): Promise<boolean> {
    if (playback.sourceKey) {
      if (seen.has(playback.sourceKey)) return false;
      seen.add(playback.sourceKey);
      if (seen.size > 256) seen.delete(seen.values().next().value!);
    }
    const requested = now(),
      startAt = playback.startAt ?? requested;
    if (
      !Number.isFinite(startAt) ||
      requested > startAt + DDZ_AUDIO_LATE_WINDOW_MS ||
      !allowed() ||
      !context
    )
      return false;
    if (cue === "select") {
      if (requested - lastSelectAt < 65) return false;
      lastSelectAt = requested;
    }
    const epoch = generation;
    if (cue !== "select") foregroundGeneration++;
    const foregroundEpoch = foregroundGeneration;
    const spoken = voiceFor(cue);
    const parts: Promise<{ played: boolean; endAt: number }>[] = [];
    if (preferences.sound && preferences.soundVolume > 0)
      parts.push(
        schedule(
          cuePath(cue),
          "sound",
          startAt,
          cue === "select"
            ? 0.4
            : cue === "result"
              ? 0.35
              : spoken
                ? 0.65
                : 0.8,
          epoch,
          cue !== "select",
        ),
      );
    if (spoken && preferences.voice && preferences.voiceVolume > 0) {
      replaceVoice();
      parts.push(
        schedule(
          voicePath(spoken, playback.locale ?? locale),
          "voice",
          startAt,
          1,
          epoch,
          true,
          voiceGeneration,
        ),
      );
    }
    const played = await Promise.all(parts);
    if (
      playback.result &&
      played.some((part) => part.played) &&
      epoch === generation &&
      foregroundEpoch === foregroundGeneration &&
      preferences.sound
    ) {
      const finishAt =
        Math.max(startAt + 900, ...played.map((part) => part.endAt)) + 180;
      await schedule(cuePath("result"), "sound", finishAt, 0.22, epoch, true);
    }
    return played.some((part) => part.played);
  }
  return {
    setPreferences(next: DdzAudioPreferences) {
      const previous = preferences;
      preferences = normalizeDdzAudioPreferences(next);
      if (
        (previous.sound && !preferences.sound) ||
        (previous.voice && !preferences.voice) ||
        (previous.soundVolume > 0 && preferences.soundVolume === 0) ||
        (previous.voiceVolume > 0 && preferences.voiceVolume === 0)
      )
        cancelPresentation();
      applyVolumes();
      syncMusic();
    },
    setPhase(next: "lobby" | "game") {
      phase = next;
      syncMusic();
    },
    setLocale(next: string) {
      const changed = locale !== language(next);
      locale = language(next);
      if (changed && unlocked) void preload(locale);
    },
    setOwner(next: boolean) {
      owner = next;
      if (!owner) cancelPresentation();
      syncMusic();
    },
    setPresentationAllowed(next: boolean) {
      presentationAllowed = next;
      if (!next) cancelPresentation();
      syncMusic();
    },
    visibility() {
      if (hidden()) cancelPresentation();
      syncMusic();
    },
    cancelPresentation,
    preload,
    unlock() {
      if (disposed) return;
      unlocked = true;
      if (!context) {
        try {
          context = options.createContext
            ? options.createContext()
            : new AudioContext();
          graph = {
            sound: context.createGain(),
            voice: context.createGain(),
            music: context.createGain(),
            duck: context.createGain(),
          };
          graph.sound.gain.value = preferences.sound
            ? preferences.soundVolume / 100
            : 0;
          graph.voice.gain.value = preferences.voice
            ? preferences.voiceVolume / 100
            : 0;
          graph.music.gain.value = preferences.music
            ? preferences.musicVolume / 100
            : 0;
          graph.duck.gain.value = 1;
          graph.sound.connect(context.destination);
          graph.voice.connect(context.destination);
          graph.music.connect(graph.duck).connect(context.destination);
          resetDuck();
          applyVolumes();
        } catch {
          context = null;
          graph = null;
          return;
        }
      }
      void context
        .resume()
        .then(syncMusic)
        .catch(() => {});
      void preload(locale);
      syncMusic();
    },
    play,
    playEvent(event: DdzEvent, playback: EventPlayback) {
      const cue = ddzCueForEvent(event);
      return cue ? play(cue, playback) : Promise.resolve(false);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelPresentation();
      music?.pause();
      musicSource?.disconnect();
      music = null;
      musicSource = null;
      controllers.forEach((timeout, controller) => {
        clearTimeout(timeout);
        controller.abort();
      });
      controllers.clear();
      Object.values(graph ?? {}).forEach((node) => node.disconnect());
      graph = null;
      void context?.close().catch(() => {});
      context = null;
      buffers.clear();
      loads.clear();
      seen.clear();
    },
  };
}
