"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, UsersRound, Play, History } from "lucide-react";
import { getDoudizhuCopy, doudizhuErrorMessage } from "../doudizhuCopy";
import { sendDdzRoomWrite, type DdzPendingWrite } from "../doudizhuRoomRequest";
import { clearDdzRoomShortcuts } from "../doudizhuRoomStorage";
import { ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT } from "../activeGameToolRoomStorage";
import type { DdzRoundSummary } from "../doudizhuRoomTypes";
import { DoudizhuHistoryDialog } from "./DoudizhuHistoryDialog";
import { DoudizhuCardFace } from "./DoudizhuCard";
import { DoudizhuCat, DoudizhuHeader } from "./DoudizhuChrome";
import { DoudizhuAudioControls } from "./DoudizhuAudioControls";
import { GameToolsMobileChrome } from "./GameToolsMobileChrome";
import s from "./DoudizhuGame.module.css";
export function DoudizhuEntryClient({
  locale,
  initialCode = "",
  preview = false,
  onPreviewRoom,
  initialClerkUserId,
  initialResume = null,
  onHistory,
}: {
  locale: string;
  initialCode?: string;
  preview?: boolean;
  onPreviewRoom?: () => void;
  initialClerkUserId?: string;
  initialResume?: { id: string; code: string } | null;
  onHistory?: () => Promise<DdzRoundSummary[]>;
}) {
  const t = getDoudizhuCopy(locale),
    [code, setCode] = useState(initialCode),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [uncertain, setUncertain] = useState(false),
    [signIn, setSignIn] = useState(false),
    [historyOpen, setHistoryOpen] = useState(false);
  const pending = useRef<DdzPendingWrite | null>(null),
    inFlight = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const pendingKey = initialClerkUserId
    ? `friemi:ddz:entry-pending:${initialClerkUserId}`
    : null;
  const [resume, setResume] = useState<{ id: string; code: string } | null>(
    initialResume,
  );
  useEffect(() => {
    if (!initialClerkUserId || initialResume) return;
    try {
      const value = JSON.parse(
        localStorage.getItem(`friemi:ddz:resume:${initialClerkUserId}`) ??
          "null",
      );
      if (
        value &&
        typeof value.id === "string" &&
        /^[A-Z0-9]{6,8}$/.test(value.code)
      )
        setResume(value);
    } catch {}
  }, [initialClerkUserId, initialResume]);
  useEffect(() => {
    if (!pendingKey) return;
    try {
      const value = JSON.parse(sessionStorage.getItem(pendingKey) ?? "null");
      if (
        value &&
        ["/rooms", "/join"].includes(value.path) &&
        value.method === "POST" &&
        typeof value.body?.commandId === "string"
      ) {
        pending.current = value;
        setUncertain(true);
        setError(t.uncertain);
      }
    } catch {}
  }, [pendingKey, t.uncertain]);
  async function submit(write: DdzPendingWrite) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    pending.current = write;
    try {
      if (pendingKey) sessionStorage.setItem(pendingKey, JSON.stringify(write));
    } catch {}
    const result = await sendDdzRoomWrite("/api/game-tools/doudizhu", write);
    inFlight.current = false;
    if (!mounted.current) return;
    setBusy(false);
    if (result.status === "uncertain") {
      setUncertain(true);
      setError(t.uncertain);
      return;
    }
    pending.current = null;
    try {
      if (pendingKey) sessionStorage.removeItem(pendingKey);
    } catch {}
    setUncertain(false);
    if (result.status === "rejected") {
      if (
        write.path === "/join" &&
        result.error === "ROOM_NOT_FOUND" &&
        resume &&
        write.body.expectedRoomId === resume.id
      ) {
        try {
          if (
            initialClerkUserId &&
            clearDdzRoomShortcuts(localStorage, initialClerkUserId, resume.id)
          )
            window.dispatchEvent(
              new Event(ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT),
            );
        } catch {
          /* Storage is optional. */
        }
        setResume(null);
      }
      setError(doudizhuErrorMessage(result.error, locale));
      setSignIn(result.error === "SIGN_IN_REQUIRED");
      return;
    }
    if (result.roomId)
      window.location.assign(
        `/${locale}/game-tools/doudizhu/rooms/${encodeURIComponent(result.roomId)}`,
      );
    else setError(doudizhuErrorMessage("UNKNOWN", locale));
  }
  function openRoom(join: boolean) {
    if (busy || pending.current || (join && !code.trim())) return;
    if (onPreviewRoom) {
      onPreviewRoom();
      return;
    }
    void submit({
      path: join ? "/join" : "/rooms",
      method: "POST",
      body: {
        commandId: crypto.randomUUID(),
        ...(join
          ? {
              code: code.trim().toUpperCase(),
              ...(resume?.code === code.trim().toUpperCase()
                ? { expectedRoomId: resume.id }
                : {}),
            }
          : { locale: ["zh-CN", "en", "fr"].includes(locale) ? locale : "en" }),
      },
    });
  }
  async function loadHistory() {
    if (onHistory) return onHistory();
    const response = await fetch("/api/game-tools/doudizhu/history", {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.rounds))
      throw new Error("HISTORY_UNAVAILABLE");
    return data.rounds as DdzRoundSummary[];
  }
  return (
    <div className={s.game}>
      <GameToolsMobileChrome />
      <DoudizhuHeader locale={locale}>
        <DoudizhuAudioControls locale={locale} roomKey="entry" />
      </DoudizhuHeader>
      <main className={s.entryMain}>
        <div className={s.entryArt} aria-hidden="true">
          <span className={s.artCircle} />
          <span className={s.entrySpark}>✦</span>
          {[
            { id: "s14", rank: 14, suit: "spades" },
            { id: "h13", rank: 13, suit: "hearts" },
            { id: "c12", rank: 12, suit: "clubs" },
          ].map((card, i) => (
            <div
              key={card.id}
              className={s.heroCard}
              style={{ "--i": i } as CSSProperties}
            >
              <DoudizhuCardFace
                card={card as Parameters<typeof DoudizhuCardFace>[0]["card"]}
              />
            </div>
          ))}
          <span className={s.entryCat}>
            <DoudizhuCat catId="baker" size={155} />
          </span>
        </div>
        <div className={s.entryCopy}>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
          <div className={s.entryTags}>
            <span>
              <UsersRound size={16} />
              {t.players}
            </span>
            <span>{t.mode}</span>
          </div>
        </div>
        <div className={s.entryActions}>
          <div className={s.entryPrimaryActions}>
            {resume && (
              <button
                className={`${s.button} ${!initialCode ? s.primary : ""}`}
                disabled={busy || uncertain}
                onClick={() =>
                  void submit({
                    path: "/join",
                    method: "POST",
                    body: {
                      commandId: crypto.randomUUID(),
                      code: resume.code,
                      expectedRoomId: resume.id,
                    },
                  })
                }
              >
                {t.resume} · {resume.code}
                <ArrowRight size={18} />
              </button>
            )}
            <button
              type="button"
              className={`${s.button} ${!resume && !initialCode ? s.primary : ""}`}
              disabled={busy || uncertain}
              onClick={() => openRoom(false)}
            >
              {busy ? t.busy : t.create}
              <ArrowRight size={21} />
            </button>
          </div>
          <form
            className={s.joinForm}
            onSubmit={(e) => {
              e.preventDefault();
              openRoom(true);
            }}
          >
            <label htmlFor="ddz-code">{t.roomCode}</label>
            <div>
              <input
                id="ddz-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={t.codePlaceholder}
                autoComplete="off"
                autoCapitalize="characters"
                enterKeyHint="go"
                spellCheck={false}
                maxLength={8}
                minLength={6}
                required
                disabled={busy || uncertain}
              />
              <button
                type="submit"
                className={`${s.button} ${initialCode ? s.primary : ""}`}
                disabled={busy || uncertain || code.trim().length < 6}
              >
                {t.join}
                <ArrowRight size={17} />
              </button>
            </div>
          </form>
          <div className={s.entryUtility}>
            {(initialClerkUserId || onHistory) && (
              <button
                className={s.textButton}
                onClick={() => setHistoryOpen(true)}
              >
                <History size={17} /> {t.history}
              </button>
            )}
            {preview && (
              <a
                className={s.previewLink}
                href={`/${locale}/game-tools/doudizhu/preview`}
              >
                <Play size={16} />
                {t.preview}
                <ArrowRight size={16} />
              </a>
            )}
          </div>
          {error && (
            <div className={`${s.inlineError} ${s.entryFeedback}`} role="alert">
              {error}
              {uncertain && (
                <button
                  className={s.textButton}
                  onClick={() =>
                    pending.current && void submit(pending.current)
                  }
                  disabled={busy}
                >
                  {t.retry}
                </button>
              )}
              {signIn && (
                <a
                  className={s.previewLink}
                  href={`/${locale}/sign-in?redirect_url=${encodeURIComponent(`/${locale}/game-tools/doudizhu${code ? `/join/${code}` : ""}`)}`}
                >
                  {t.signIn}
                  <ArrowRight size={16} />
                </a>
              )}
            </div>
          )}
        </div>
      </main>
      {historyOpen && (
        <DoudizhuHistoryDialog
          locale={locale}
          onClose={() => setHistoryOpen(false)}
          onLoad={loadHistory}
        />
      )}
    </div>
  );
}
