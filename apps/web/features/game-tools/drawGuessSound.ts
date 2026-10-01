export type DrawGuessSound = "cat" | "purr" | "secret" | "ready" | "start" | "correct" | "wrong" | "score" | "next" | "finish";

const STORAGE_KEY = "friemi-draw-guess-sound";
export const DRAW_GUESS_SOUND_EVENT = "friemi:draw-guess-sound";
export const DRAW_GUESS_MUSIC_EVENT = "friemi:draw-guess-music";

const players = new Map<DrawGuessSound, HTMLAudioElement>();
let sessionEnabled = false;
let lastPlayedAt = 0;
let lastPlayedSound: DrawGuessSound | null = null;
let musicEnabled = false;
let musicPlayer: HTMLAudioElement | null = null;
let visibilityBound = false;

export function isDrawGuessMusicEnabled() { return musicEnabled; }

function syncMusic() {
  if (!musicPlayer) return;
  if (!musicEnabled || document.hidden) { musicPlayer.pause(); return; }
  void musicPlayer.play().catch(() => { /* Browsers may require a fresh tap after navigation. */ });
}

export function setDrawGuessMusicEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  musicEnabled = enabled;
  if (enabled && !musicPlayer) {
    musicPlayer = new Audio("/sounds/draw-guess/music.mp3");
    musicPlayer.loop = true;
    musicPlayer.preload = "none";
    musicPlayer.volume = 0.16;
  }
  if (!visibilityBound) {
    document.addEventListener("visibilitychange", syncMusic);
    visibilityBound = true;
  }
  syncMusic();
  window.dispatchEvent(new Event(DRAW_GUESS_MUSIC_EVENT));
}

export function isDrawGuessSoundEnabled() {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(STORAGE_KEY) === "on"; }
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
    audio.volume = sound === "wrong" ? 0.48 : sound === "cat" || sound === "purr" ? 0.57 : 0.68;
    players.set(sound, audio);
  }
  return audio;
}

export function playDrawGuessSound(sound: DrawGuessSound, preview = false) {
  if (typeof window === "undefined" || (!preview && (!isDrawGuessSoundEnabled() || document.hidden))) return;
  const now = performance.now();
  if (!preview && now - lastPlayedAt < (lastPlayedSound === sound ? 300 : 120)) return;
  lastPlayedAt = now;
  lastPlayedSound = sound;
  try {
    const audio = audioFor(sound);
    audio.currentTime = 0;
    void audio.play().catch(() => { /* Browser audio policies can block playback until a tap. */ });
  } catch { /* No sound device or unsupported audio format. */ }
}
