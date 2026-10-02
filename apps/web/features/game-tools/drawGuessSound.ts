export type DrawGuessSound = "tap" | "cat" | "purr" | "secret" | "ready" | "start" | "correct" | "wrong" | "score" | "next" | "finish";
export type DrawGuessMusicPhase = "lobby" | "game";

const STORAGE_KEY = "friemi-draw-guess-sound";
const MUSIC_STORAGE_KEY = "friemi-draw-guess-music";
const SOUND_VOLUME_STORAGE_KEY = "friemi-draw-guess-sound-volume";
const MUSIC_VOLUME_STORAGE_KEY = "friemi-draw-guess-music-volume";
export const DEFAULT_DRAW_GUESS_SOUND_VOLUME = 80;
export const DEFAULT_DRAW_GUESS_MUSIC_VOLUME = 17;
export const DRAW_GUESS_SOUND_EVENT = "friemi:draw-guess-sound";
export const DRAW_GUESS_MUSIC_EVENT = "friemi:draw-guess-music";

const players = new Map<DrawGuessSound, HTMLAudioElement>();
const soundBuffers = new Map<DrawGuessSound, AudioBuffer>();
const soundLoads = new Map<DrawGuessSound, Promise<void>>();
const activeSources = new Set<AudioBufferSourceNode>();
const SOUND_CUES: DrawGuessSound[] = ["tap", "cat", "purr", "secret", "ready", "start", "correct", "wrong", "score", "next", "finish"];
let soundContext: AudioContext | null = null;
let sessionEnabled = true;
let lastPlayedAt = 0;
let lastPlayedSound: DrawGuessSound | null = null;
let lastTapAt = 0;
let musicEnabled = false;
let musicPhase: DrawGuessMusicPhase = "lobby";
const musicPlayers = new Map<DrawGuessMusicPhase, HTMLAudioElement>();
let fadeFrame: number | null = null;
let visibilityBound = false;

function storedVolume(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : fallback;
  } catch { return fallback; }
}

export function getDrawGuessSoundVolume() { return storedVolume(SOUND_VOLUME_STORAGE_KEY, DEFAULT_DRAW_GUESS_SOUND_VOLUME); }
export function getDrawGuessMusicVolume() { return storedVolume(MUSIC_VOLUME_STORAGE_KEY, DEFAULT_DRAW_GUESS_MUSIC_VOLUME); }

export function setDrawGuessSoundVolume(volume: number) {
  if (typeof window === "undefined") return;
  const next = Math.max(0, Math.min(100, Math.round(volume)));
  try { window.localStorage.setItem(SOUND_VOLUME_STORAGE_KEY, String(next)); } catch { /* Keep the current sound preference. */ }
  players.forEach((player, sound) => { player.volume = soundVolume(sound); });
  window.dispatchEvent(new Event(DRAW_GUESS_SOUND_EVENT));
}

export function setDrawGuessMusicVolume(volume: number) {
  if (typeof window === "undefined") return;
  const next = Math.max(0, Math.min(100, Math.round(volume)));
  try { window.localStorage.setItem(MUSIC_VOLUME_STORAGE_KEY, String(next)); } catch { /* Keep the current music preference. */ }
  for (const audio of musicPlayers.values()) if (!audio.paused) audio.volume = next / 100;
  window.dispatchEvent(new Event(DRAW_GUESS_MUSIC_EVENT));
}

export function isDrawGuessMusicEnabled() { return musicEnabled; }

export function shouldPlayDrawGuessMusic() {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(MUSIC_STORAGE_KEY) !== "off"; }
  catch { return true; }
}

function musicFor(phase: DrawGuessMusicPhase) {
  let audio = musicPlayers.get(phase);
  if (!audio) {
    audio = new Audio(`/sounds/draw-guess/music-${phase}.mp3`);
    audio.loop = true;
    audio.preload = "none";
    audio.volume = getDrawGuessMusicVolume() / 100;
    musicPlayers.set(phase, audio);
  }
  return audio;
}

function stopFade() {
  if (fadeFrame !== null) cancelAnimationFrame(fadeFrame);
  fadeFrame = null;
}

function syncMusic() {
  stopFade();
  for (const [phase, audio] of musicPlayers) {
    if (!musicEnabled || document.hidden || phase !== musicPhase) audio.pause();
  }
  if (!musicEnabled || document.hidden) return;
  const audio = musicFor(musicPhase);
  audio.volume = getDrawGuessMusicVolume() / 100;
  void audio.play().catch(() => { /* Browsers may require a fresh tap after navigation. */ });
}

export function setDrawGuessMusicPhase(phase: DrawGuessMusicPhase) {
  if (typeof window === "undefined" || musicPhase === phase) return;
  const previous = musicPlayers.get(musicPhase);
  musicPhase = phase;
  if (!musicEnabled || document.hidden) { syncMusic(); return; }
  stopFade();
  const next = musicFor(phase);
  next.currentTime = 0;
  if (!previous || previous.paused) { next.volume = getDrawGuessMusicVolume() / 100; syncMusic(); return; }
  next.volume = 0;
  void next.play().then(() => {
    if (!musicEnabled || document.hidden || musicPhase !== phase) { next.pause(); return; }
    const start = performance.now();
    const step = (now: number) => {
      if (!musicEnabled || document.hidden || musicPhase !== phase) { syncMusic(); return; }
      const progress = Math.min(1, (now - start) / 700);
      previous.volume = getDrawGuessMusicVolume() / 100 * (1 - progress);
      next.volume = getDrawGuessMusicVolume() / 100 * progress;
      if (progress < 1) fadeFrame = requestAnimationFrame(step);
      else { previous.pause(); previous.currentTime = 0; fadeFrame = null; }
    };
    fadeFrame = requestAnimationFrame(step);
  }).catch(() => { previous.pause(); previous.currentTime = 0; next.volume = getDrawGuessMusicVolume() / 100; });
}

export function setDrawGuessMusicEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  musicEnabled = enabled;
  try { window.localStorage.setItem(MUSIC_STORAGE_KEY, enabled ? "on" : "off"); }
  catch { /* Keep this tab's preference when storage is unavailable. */ }
  if (!visibilityBound) {
    document.addEventListener("visibilitychange", syncMusic);
    const retryAfterGesture = () => {
      if (musicEnabled && musicFor(musicPhase).paused) syncMusic();
    };
    document.addEventListener("pointerdown", retryAfterGesture, { passive: true });
    document.addEventListener("keydown", retryAfterGesture);
    visibilityBound = true;
  }
  syncMusic();
  window.dispatchEvent(new Event(DRAW_GUESS_MUSIC_EVENT));
}

export function stopDrawGuessMusic() {
  if (typeof window === "undefined") return;
  musicEnabled = false;
  syncMusic();
  window.dispatchEvent(new Event(DRAW_GUESS_MUSIC_EVENT));
}

export function isDrawGuessSoundEnabled() {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(STORAGE_KEY) !== "off"; }
  catch { return sessionEnabled; }
}

export function setDrawGuessSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  sessionEnabled = enabled;
  try { window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off"); }
  catch { /* The current page can still preview sounds when storage is unavailable. */ }
  if (!enabled) stopDrawGuessSounds();
  window.dispatchEvent(new Event(DRAW_GUESS_SOUND_EVENT));
}

export function stopDrawGuessSounds() {
  players.forEach((player) => player.pause());
  activeSources.forEach((source) => { try { source.stop(); } catch { /* The cue already ended. */ } });
  activeSources.clear();
}

function soundVolume(sound: DrawGuessSound) {
  const balance = sound === "tap" ? 0.78 : sound === "wrong" ? 0.69 : sound === "cat" || sound === "purr" ? 0.78 : 0.91;
  return balance * getDrawGuessSoundVolume() / 100;
}

function audioFor(sound: DrawGuessSound) {
  let audio = players.get(sound);
  if (!audio) {
    audio = new Audio(`/sounds/draw-guess/${sound}.wav`);
    audio.preload = "auto";
    audio.volume = soundVolume(sound);
    players.set(sound, audio);
  }
  return audio;
}

function contextForSounds() {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return null;
  if (!soundContext) {
    try { soundContext = new AudioContext(); }
    catch { return null; }
  }
  return soundContext;
}

export function preloadDrawGuessSounds() {
  if (typeof window !== "undefined") audioFor("tap").load();
  const context = contextForSounds();
  if (!context) return;
  for (const sound of SOUND_CUES) {
    if (soundBuffers.has(sound) || soundLoads.has(sound)) continue;
    const load = fetch(`/sounds/draw-guess/${sound}.wav`)
      .then((response) => { if (!response.ok) throw new Error("AUDIO_FETCH"); return response.arrayBuffer(); })
      .then((bytes) => context.decodeAudioData(bytes))
      .then((buffer) => { soundBuffers.set(sound, buffer); })
      .catch(() => { soundLoads.delete(sound); });
    soundLoads.set(sound, load);
  }
}

export function playDrawGuessSound(sound: DrawGuessSound, preview = false) {
  if (typeof window === "undefined" || (!preview && (!isDrawGuessSoundEnabled() || document.hidden))) return;
  const now = performance.now();
  if (!preview && (sound === "tap" ? now - lastTapAt < 55 : lastPlayedSound !== "tap" && now - lastPlayedAt < (lastPlayedSound === sound ? 300 : 120))) return;
  lastPlayedAt = now;
  lastPlayedSound = sound;
  if (sound === "tap") lastTapAt = now;
  try {
    const context = contextForSounds();
    const buffer = soundBuffers.get(sound);
    if (context && buffer) {
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = soundVolume(sound);
      source.connect(gain).connect(context.destination);
      source.onended = () => { activeSources.delete(source); source.disconnect(); gain.disconnect(); };
      activeSources.add(source);
      if (context.state !== "running") void context.resume().catch(() => { /* The next gesture can unlock audio. */ });
      source.start(0);
      return;
    }
    const audio = audioFor(sound);
    audio.currentTime = 0;
    void audio.play().catch(() => { /* Browser audio policies can block playback until a tap. */ });
  } catch { /* No sound device or unsupported audio format. */ }
}
