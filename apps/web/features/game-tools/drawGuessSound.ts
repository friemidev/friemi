export type DrawGuessSound = "tap" | "cat" | "purr" | "secret" | "ready" | "start" | "correct" | "wrong" | "score" | "next" | "finish";
export type DrawGuessMusicPhase = "lobby" | "game";

const STORAGE_KEY = "friemi-draw-guess-sound";
const MUSIC_STORAGE_KEY = "friemi-draw-guess-music";
export const DRAW_GUESS_SOUND_EVENT = "friemi:draw-guess-sound";
export const DRAW_GUESS_MUSIC_EVENT = "friemi:draw-guess-music";

const players = new Map<DrawGuessSound, HTMLAudioElement>();
let sessionEnabled = true;
let lastPlayedAt = 0;
let lastPlayedSound: DrawGuessSound | null = null;
let musicEnabled = false;
let musicPhase: DrawGuessMusicPhase = "lobby";
const musicPlayers = new Map<DrawGuessMusicPhase, HTMLAudioElement>();
const MUSIC_VOLUME = 0.17;
let fadeFrame: number | null = null;
let visibilityBound = false;

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
    audio.volume = MUSIC_VOLUME;
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
  audio.volume = MUSIC_VOLUME;
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
  if (!previous || previous.paused) { next.volume = MUSIC_VOLUME; syncMusic(); return; }
  next.volume = 0;
  void next.play().then(() => {
    if (!musicEnabled || document.hidden || musicPhase !== phase) { next.pause(); return; }
    const start = performance.now();
    const previousVolume = previous.volume;
    const step = (now: number) => {
      if (!musicEnabled || document.hidden || musicPhase !== phase) { syncMusic(); return; }
      const progress = Math.min(1, (now - start) / 700);
      previous.volume = previousVolume * (1 - progress);
      next.volume = MUSIC_VOLUME * progress;
      if (progress < 1) fadeFrame = requestAnimationFrame(step);
      else { previous.pause(); previous.currentTime = 0; fadeFrame = null; }
    };
    fadeFrame = requestAnimationFrame(step);
  }).catch(() => { previous.pause(); previous.currentTime = 0; next.volume = MUSIC_VOLUME; });
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
}

function audioFor(sound: DrawGuessSound) {
  let audio = players.get(sound);
  if (!audio) {
    audio = new Audio(`/sounds/draw-guess/${sound}.wav`);
    audio.preload = "auto";
    audio.volume = sound === "tap" ? 0.46 : sound === "wrong" ? 0.48 : sound === "cat" || sound === "purr" ? 0.57 : 0.68;
    players.set(sound, audio);
  }
  return audio;
}

export function preloadDrawGuessClicks() {
  if (typeof window !== "undefined") audioFor("tap");
}

export function playDrawGuessSound(sound: DrawGuessSound, preview = false) {
  if (typeof window === "undefined" || (!preview && (!isDrawGuessSoundEnabled() || document.hidden))) return;
  const now = performance.now();
  if (!preview && now - lastPlayedAt < (sound === "tap" ? 45 : lastPlayedSound === sound ? 300 : 120)) return;
  lastPlayedAt = now;
  lastPlayedSound = sound;
  try {
    const audio = audioFor(sound);
    audio.currentTime = 0;
    void audio.play().catch(() => { /* Browser audio policies can block playback until a tap. */ });
  } catch { /* No sound device or unsupported audio format. */ }
}
