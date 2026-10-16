"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Volume2 } from "lucide-react";
import {
  createDdzAudioSession,
  DDZ_AUDIO_DEFAULTS,
  DDZ_AUDIO_OWNER,
  DDZ_AUDIO_STORAGE,
  normalizeDdzAudioPreferences,
  type DdzAudioPreferences,
} from "../doudizhuAudio";
import {
  consumeDdzPresentation,
  ddzPresentationCursor,
  type DdzPresentation,
  type DdzPresentationCursor,
} from "../doudizhuPresentation";
import type { DdzViewerState } from "../doudizhuTypes";
import s from "./DoudizhuAudioControls.module.css";

type AudioProps = {
  locale: string;
  roomKey: string;
  state?: DdzViewerState | null;
  serverNow?: number;
  localPreview?: boolean;
  connected?: boolean;
};
const AudioContext = createContext<{
  preferences: DdzAudioPreferences;
  update: (next: DdzAudioPreferences) => void;
  presentation: DdzPresentation | null;
} | null>(null);

/** A durable value, rather than a DOM event that a child effect could miss. */
export function useDoudizhuPresentation() {
  return useContext(AudioContext)?.presentation ?? null;
}

const PHONE_PORTRAIT = "(max-width: 767px) and (orientation: portrait)";
function presentationAllowed(state: AudioProps["state"], connected: boolean) {
  const table = state && ["BIDDING", "PLAYING", "RESULT"].includes(state.phase);
  return (
    state !== null &&
    connected &&
    navigator.onLine &&
    !document.hidden &&
    !(table && matchMedia(PHONE_PORTRAIT).matches)
  );
}

export function DoudizhuAudioProvider({
  roomKey,
  state,
  serverNow,
  locale,
  localPreview = false,
  connected = true,
  children,
}: AudioProps & { children: ReactNode }) {
  const [preferences, setPreferences] = useState(DDZ_AUDIO_DEFAULTS);
  const [presentation, setPresentation] = useState<DdzPresentation | null>(
    null,
  );
  const session = useRef<ReturnType<typeof createDdzAudioSession> | null>(null);
  const cursor = useRef<DdzPresentationCursor | null>(null);
  const current = useRef({ state, roomKey, locale, localPreview, connected });
  current.current = { state, roomKey, locale, localPreview, connected };
  const previousConnection = useRef(connected);

  useLayoutEffect(() => {
    const audio = createDdzAudioSession();
    session.current = audio;
    cursor.current = current.current.state
      ? ddzPresentationCursor(current.current.state, roomKey)
      : null;
    setPresentation(null);
    audio.setLocale(current.current.locale);
    audio.setPresentationAllowed(
      presentationAllowed(current.current.state, current.current.connected),
    );
    const ownerId = crypto.randomUUID();
    const readPreferences = () => {
      let stored: unknown = null;
      try {
        stored = JSON.parse(localStorage.getItem(DDZ_AUDIO_STORAGE) ?? "null");
      } catch {
        /* Session defaults. */
      }
      const next = normalizeDdzAudioPreferences(stored);
      setPreferences(next);
      audio.setPreferences(next);
    };
    readPreferences();
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(DDZ_AUDIO_OWNER);
    } catch {
      /* Storage events provide the fallback. */
    }
    if (channel)
      channel.onmessage = (event) => {
        if (event.data !== ownerId) audio.setOwner(false);
      };
    const claim = () => {
      const latest = current.current;
      if (!presentationAllowed(latest.state, latest.connected)) {
        audio.setOwner(false);
        return;
      }
      try {
        localStorage.setItem(DDZ_AUDIO_OWNER, ownerId);
      } catch {
        /* Current tab can still play. */
      }
      channel?.postMessage(ownerId);
      audio.setOwner(true);
      audio.unlock();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === DDZ_AUDIO_OWNER && event.newValue !== ownerId)
        audio.setOwner(false);
      if (event.key === DDZ_AUDIO_STORAGE) readPreferences();
    };
    const recover = () => {
      const latest = current.current;
      // Live rooms wait for a fresh baseline; local previews have no snapshot polling.
      cursor.current =
        latest.localPreview && latest.state
          ? ddzPresentationCursor(latest.state, latest.roomKey)
          : null;
      audio.cancelPresentation();
      audio.setPresentationAllowed(
        presentationAllowed(latest.state, latest.connected),
      );
      audio.visibility();
      setPresentation(null);
    };
    const selection = () => {
      if (presentationAllowed(current.current.state, current.current.connected))
        void audio.play("select");
    };
    const portrait = matchMedia(PHONE_PORTRAIT);
    document.addEventListener("pointerdown", claim, { passive: true });
    document.addEventListener("keydown", claim);
    document.addEventListener("visibilitychange", recover);
    portrait.addEventListener("change", recover);
    window.addEventListener("online", recover);
    window.addEventListener("offline", recover);
    window.addEventListener("pagehide", recover);
    window.addEventListener("pageshow", recover);
    window.addEventListener("storage", storage);
    window.addEventListener("friemi:doudizhu:select", selection);
    return () => {
      document.removeEventListener("pointerdown", claim);
      document.removeEventListener("keydown", claim);
      document.removeEventListener("visibilitychange", recover);
      portrait.removeEventListener("change", recover);
      window.removeEventListener("online", recover);
      window.removeEventListener("offline", recover);
      window.removeEventListener("pagehide", recover);
      window.removeEventListener("pageshow", recover);
      window.removeEventListener("storage", storage);
      window.removeEventListener("friemi:doudizhu:select", selection);
      channel?.close();
      audio.dispose();
      session.current = null;
    };
  }, [roomKey]);

  useLayoutEffect(() => {
    const audio = session.current;
    if (!audio) return;
    const allowed = presentationAllowed(state, connected);
    audio.setLocale(locale);
    audio.setPresentationAllowed(allowed);
    audio.setPhase(
      state?.phase === "BIDDING" || state?.phase === "PLAYING"
        ? "game"
        : "lobby",
    );
    if (previousConnection.current !== connected) {
      previousConnection.current = connected;
      cursor.current =
        localPreview && state ? ddzPresentationCursor(state, roomKey) : null;
      audio.cancelPresentation();
      setPresentation(null);
    }
    if (state === null) {
      cursor.current = null;
      audio.setOwner(false);
      setPresentation(null);
      return;
    }
    if (!state) return;
    const projection = consumeDdzPresentation(
      cursor.current,
      state,
      roomKey,
      serverNow ?? Date.now(),
      performance.now(),
      allowed,
    );
    cursor.current = projection.cursor;
    if (projection.presentation) {
      const next = projection.presentation;
      setPresentation(next);
      void audio.playEvent(next.event, {
        locale,
        startAt: next.startAt,
        sourceKey: next.sourceKey,
        result: next.result,
      });
    } else if (projection.clear) {
      audio.cancelPresentation();
      setPresentation(null);
    }
  }, [state, serverNow, roomKey, locale, connected, localPreview]);

  const value = useMemo(
    () => ({
      preferences,
      presentation,
      update: (next: DdzAudioPreferences) => {
        const normalized = normalizeDdzAudioPreferences(next);
        setPreferences(normalized);
        session.current?.setPreferences(normalized);
        try {
          localStorage.setItem(DDZ_AUDIO_STORAGE, JSON.stringify(normalized));
        } catch {
          /* Keep this session's preference. */
        }
      },
    }),
    [preferences, presentation],
  );
  return (
    <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
  );
}

export function DoudizhuAudioControls(
  props: AudioProps & { viewerSeat?: number },
) {
  const context = useContext(AudioContext);
  if (!context)
    return (
      <DoudizhuAudioProvider {...props}>
        <DoudizhuAudioPanel locale={props.locale} />
      </DoudizhuAudioProvider>
    );
  return <DoudizhuAudioPanel locale={props.locale} />;
}

function DoudizhuAudioPanel({ locale }: { locale: string }) {
  const { preferences, update } = useContext(AudioContext)!;
  const root = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (
        root.current?.open &&
        event.target instanceof Node &&
        !root.current.contains(event.target)
      )
        root.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        !root.current?.open ||
        document.querySelector("dialog[open]")
      )
        return;
      event.preventDefault();
      root.current.open = false;
      root.current.querySelector("summary")?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const t =
    locale === "zh-CN"
      ? {
          title: "声音",
          sound: "音效",
          voice: "语音",
          music: "背景音乐",
          sv: "音效音量",
          vv: "语音音量",
          mv: "音乐音量",
        }
      : locale === "fr"
        ? {
            title: "Son",
            sound: "Effets sonores",
            voice: "Annonces vocales",
            music: "Musique",
            sv: "Volume des effets",
            vv: "Volume des annonces",
            mv: "Volume de la musique",
          }
        : {
            title: "Sound",
            sound: "Sound effects",
            voice: "Voice",
            music: "Background music",
            sv: "Effects volume",
            vv: "Voice volume",
            mv: "Music volume",
          };
  return (
    <details
      ref={root}
      className={s.root}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          event.currentTarget.open = false;
      }}
    >
      <summary aria-label={t.title}>
        <Volume2 size={19} aria-hidden="true" />
        <span>{t.title}</span>
      </summary>
      <div className={s.panel}>
        <label className={s.toggle}>
          <span>{t.sound}</span>
          <input
            type="checkbox"
            checked={preferences.sound}
            onChange={(event) =>
              update({ ...preferences, sound: event.target.checked })
            }
          />
        </label>
        <label className={s.range}>
          <span>
            {t.sv} · {preferences.soundVolume}%
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={preferences.soundVolume}
            onChange={(event) =>
              update({
                ...preferences,
                soundVolume: Number(event.target.value),
              })
            }
          />
        </label>
        <label className={s.toggle}>
          <span>{t.voice}</span>
          <input
            type="checkbox"
            checked={preferences.voice}
            onChange={(event) =>
              update({ ...preferences, voice: event.target.checked })
            }
          />
        </label>
        <label className={s.range}>
          <span>
            {t.vv} · {preferences.voiceVolume}%
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={preferences.voiceVolume}
            onChange={(event) =>
              update({
                ...preferences,
                voiceVolume: Number(event.target.value),
              })
            }
          />
        </label>
        <label className={s.toggle}>
          <span>{t.music}</span>
          <input
            type="checkbox"
            checked={preferences.music}
            onChange={(event) =>
              update({ ...preferences, music: event.target.checked })
            }
          />
        </label>
        <label className={s.range}>
          <span>
            {t.mv} · {preferences.musicVolume}%
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={preferences.musicVolume}
            onChange={(event) =>
              update({
                ...preferences,
                musicVolume: Number(event.target.value),
              })
            }
          />
        </label>
      </div>
    </details>
  );
}
