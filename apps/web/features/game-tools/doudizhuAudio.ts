import type { DdzEvent } from "./doudizhuTypes";

export type DdzAudioPreferences = { sound: boolean; music: boolean; soundVolume: number; musicVolume: number };
export type DdzCue = "select" | "play" | "deal" | "bomb" | "bid" | "result";
export const DDZ_AUDIO_DEFAULTS: DdzAudioPreferences = { sound: true, music: false, soundVolume: 70, musicVolume: 15 };
export const DDZ_AUDIO_STORAGE = "friemi:doudizhu:audio:v1";
export const DDZ_AUDIO_OWNER = "friemi:doudizhu:audio-owner";

export function normalizeDdzAudioPreferences(value: unknown): DdzAudioPreferences {
  const v = value && typeof value === "object" ? value as Partial<DdzAudioPreferences> : {};
  const volume = (n: unknown, fallback: number) => typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
  return { sound: typeof v.sound === "boolean" ? v.sound : true, music: typeof v.music === "boolean" ? v.music : false, soundVolume: volume(v.soundVolume, 70), musicVolume: volume(v.musicVolume, 15) };
}

/** A snapshot may contain many events. Only the newest useful cue is audible. */
export function freshDdzCue(events: DdzEvent[], after: number, now: number): { cue: DdzCue; event: DdzEvent } | null {
  for (const event of [...events].reverse()) {
    if (event.id <= after || now - event.at > (event.kind === "RESULT" ? 2_000 : 1_000) || event.at > now + 2_000) continue;
    if (event.kind === "RESULT") return { cue: "result", event };
    if (event.kind === "PLAY") return { cue: event.play?.type === "BOMB" || event.play?.type === "ROCKET" ? "bomb" : "play", event };
    if (event.kind === "DEAL") return { cue: "deal", event };
    if (event.kind === "BID") return { cue: "bid", event };
  }
  return null;
}

const cuePath = (cue: DdzCue) => cue === "result" ? "/sounds/draw-guess/finish.wav" : cue === "bid" ? "/sounds/draw-guess/ready.wav" : `/sounds/doudizhu/${cue}.wav`;

/** One lifetime per mounted room. Generation guards cancel pending decode/play work. */
export function createDdzAudioSession() {
  let preferences = { ...DDZ_AUDIO_DEFAULTS };
  let context: AudioContext | null = null;
  let music: HTMLAudioElement | null = null;
  let phase: "lobby" | "game" = "lobby";
  let unlocked = false;
  let owner = false;
  let disposed = false;
  let generation = 0;
  let lastCueAt = -Infinity;
  const sources = new Set<AudioBufferSourceNode>();
  const buffers = new Map<DdzCue, AudioBuffer>();
  const loads = new Map<DdzCue, Promise<AudioBuffer | null>>();

  const allowed = () => !disposed && owner && unlocked && !document.hidden;
  const stopSounds = () => {
    generation++;
    sources.forEach(source => { try { source.stop(); } catch { /* Already ended. */ } });
    sources.clear();
  };
  const syncMusic = () => {
    if (!allowed() || !preferences.music) { music?.pause(); return; }
    const path = `/sounds/draw-guess/music-${phase}.mp3`;
    if (!music || !music.src.endsWith(path)) {
      music?.pause();
      music = new Audio(path);
      music.loop = true;
      music.preload = "none";
    }
    const current = music;
    current.volume = preferences.musicVolume / 100;
    if (!current.paused) return;
    void current.play().then(() => {
      if (current !== music || !allowed() || !preferences.music) current.pause();
    }).catch(() => { /* A new user gesture can retry browser autoplay denial. */ });
  };
  const load = (cue: DdzCue): Promise<AudioBuffer | null> => {
    if (buffers.has(cue)) return Promise.resolve(buffers.get(cue)!);
    if (loads.has(cue)) return loads.get(cue)!;
    if (!context) return Promise.resolve(null);
    const audioContext = context;
    const pending = fetch(cuePath(cue), { signal: AbortSignal.timeout(5_000) })
      .then(response => response.ok ? response.arrayBuffer() : Promise.reject(new Error("AUDIO_UNAVAILABLE")))
      .then(bytes => audioContext.decodeAudioData(bytes))
      .then(buffer => { if (!disposed) buffers.set(cue, buffer); return buffer; })
      .catch(() => null).finally(() => loads.delete(cue));
    loads.set(cue, pending);
    return pending;
  };

  return {
    setPreferences(next: DdzAudioPreferences) {
      const previous = preferences;
      preferences = normalizeDdzAudioPreferences(next);
      if (!preferences.sound || preferences.soundVolume !== previous.soundVolume) stopSounds();
      syncMusic();
    },
    setPhase(next: "lobby" | "game") { phase = next; syncMusic(); },
    setOwner(next: boolean) { owner = next; if (!owner) stopSounds(); syncMusic(); },
    visibility() { if (document.hidden) stopSounds(); syncMusic(); },
    unlock() {
      if (disposed) return;
      unlocked = true;
      if (!context && typeof AudioContext !== "undefined") {
        try { context = new AudioContext(); } catch { /* Audio is optional. */ }
      }
      void context?.resume().catch(() => {});
      for (const cue of ["select", "play", "deal", "bomb", "bid", "result"] as DdzCue[]) void load(cue);
      syncMusic();
    },
    async play(cue: DdzCue) {
      if (!allowed() || !preferences.sound || !context) return;
      const requested = performance.now();
      if (requested - lastCueAt < 65) return;
      lastCueAt = requested;
      const epoch = generation;
      const buffer = await load(cue);
      if (!buffer || !context || epoch !== generation || !allowed() || !preferences.sound || performance.now() - requested > (cue === "result" ? 2_000 : 1_000)) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = preferences.soundVolume / 100 * (cue === "select" ? 0.65 : 0.9);
      source.connect(gain).connect(context.destination);
      sources.add(source);
      source.onended = () => { sources.delete(source); source.disconnect(); gain.disconnect(); };
      source.start();
    },
    dispose() {
      disposed = true; stopSounds(); music?.pause(); music = null;
      void context?.close().catch(() => {}); context = null; buffers.clear();
    },
  };
}
