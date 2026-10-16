"use client";
import { useEffect, useState } from "react";
import { Check, Copy, UserRoundPlus, ArrowRight } from "lucide-react";
import type { DdzReaction, DdzRoomView } from "../doudizhuRoomTypes";
import type { DrawGuessCatId } from "../drawGuessCats";
import { getDoudizhuCopy } from "../doudizhuCopy";
import {
  DoudizhuCat,
  DoudizhuCatPicker,
  DoudizhuDialog,
  DoudizhuHeader,
} from "./DoudizhuChrome";
import { DoudizhuAudioControls } from "./DoudizhuAudioControls";
import s from "./DoudizhuGame.module.css";
export function DoudizhuLobby({
  room,
  locale,
  busy = false,
  error = "",
  onReady,
  onStart,
  onLeave,
  onCharacter,
  onRemove,
  onRetry,
  onReact,
}: {
  room: DdzRoomView;
  locale: string;
  busy?: boolean;
  error?: string;
  onReady: (ready: boolean) => void;
  onStart: () => void;
  onLeave: () => void;
  onCharacter: (cat: DrawGuessCatId) => void;
  onRemove?: (seat: number) => void;
  onRetry?: () => void;
  onReact?: (kind: DdzReaction["kind"]) => void;
}) {
  const t = getDoudizhuCopy(locale),
    [catPicker, setCatPicker] = useState(false),
    [leaving, setLeaving] = useState(false),
    [removing, setRemoving] = useState<number | null>(null),
    [copied, setCopied] = useState("");
  const [now, setNow] = useState(Date.now()),
    [reactionUntil, setReactionUntil] = useState(0);
  useEffect(() => {
    if (!room.reactions.length && reactionUntil <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [room.reactions.length, reactionUntil]);
  const self = room.seats.find((x) => x.seat === room.viewerSeat),
    host = room.hostSeat === room.viewerSeat,
    canStart =
      room.seats.length === 3 &&
      room.seats.every((x) => x.ready && x.connected && !x.left);
  async function invite() {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/${locale}/game-tools/doudizhu/join/${room.code}`,
      );
      setCopied(t.copied);
    } catch {
      setCopied(`${t.copyFailed}: ${room.code}`);
    }
  }
  return (
    <>
      <DoudizhuHeader
        locale={locale}
        code={room.code}
        onBack={() => setLeaving(true)}
      >
        <DoudizhuAudioControls
          locale={locale}
          roomKey={room.id}
          state={room.state}
          serverNow={room.serverNow}
        />
      </DoudizhuHeader>
      <main className={s.main}>
        <div className={s.lobbyIntro}>
          <span className={s.eyebrow}>{t.players}</span>
          <h1>{t.waiting}</h1>
          <button
            className={`${s.button} ${s.small}`}
            onClick={() => void invite()}
          >
            <Copy size={16} />
            {t.invite}
            <span>{room.code}</span>
          </button>
          {copied && (
            <p role="status" className={s.help}>
              {copied}
            </p>
          )}
        </div>
        {error && (
          <div className={s.feedback} role="alert">
            <span>{error}</span>
            {onRetry && (
              <button className={s.textButton} onClick={onRetry}>
                {t.retry}
              </button>
            )}
          </div>
        )}
        <div className={s.lobbySeats}>
          {[0, 1, 2].map((seat) => {
            const player = room.seats.find((x) => x.seat === seat);
            return (
              <section
                key={seat}
                className={`${s.lobbySeat} ${!player ? s.emptySeat : ""}`}
              >
                {player ? (
                  <>
                    <DoudizhuCat
                      catId={player.catId}
                      ready={player.ready}
                      size={110}
                    />
                    <span className={s.lastAction}>
                      {room.reactions.find(
                        (r) => r.seat === player.seat && r.expiresAt > now,
                      )?.kind === "clap"
                        ? "👏"
                        : room.reactions.find(
                              (r) =>
                                r.seat === player.seat && r.expiresAt > now,
                            )?.kind === "cheer"
                          ? "✨"
                          : room.reactions.some(
                                (r) =>
                                  r.seat === player.seat && r.expiresAt > now,
                              )
                            ? "👋"
                            : ""}
                    </span>
                    <h2>
                      {player.name}
                      {player.seat === room.viewerSeat ? ` · ${t.you}` : ""}
                    </h2>
                    {player.seat === room.hostSeat && (
                      <span className={s.badge}>{t.host}</span>
                    )}
                    <span className={s.readyLabel}>
                      {player.ready && <Check size={15} />}
                      {player.ready ? t.ready : t.notReady}
                    </span>
                    {player.seat === room.viewerSeat ? (
                      <button
                        className={s.textButton}
                        disabled={busy}
                        onClick={() => setCatPicker(true)}
                      >
                        {t.chooseCat}
                      </button>
                    ) : host && onRemove ? (
                      <button
                        className={s.textButton}
                        disabled={busy}
                        onClick={() => setRemoving(player.seat)}
                      >
                        {t.remove}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <>
                    <UserRoundPlus size={32} />
                    <p>{t.waitingSeat}</p>
                  </>
                )}
              </section>
            );
          })}
        </div>
        <div className={s.lobbyActions}>
          <button
            className={`${s.button} ${!self?.ready ? s.primary : ""}`}
            onClick={() => onReady(!self?.ready)}
            disabled={busy}
          >
            {self?.ready ? t.unready : t.readyAction}
            {!self?.ready && <Check size={18} />}
          </button>
          {host && (
            <button
              className={`${s.button} ${self?.ready ? s.primary : ""}`}
              disabled={busy || !canStart}
              onClick={onStart}
            >
              {t.start}
              <ArrowRight size={18} />
            </button>
          )}
        </div>
        {onReact && (
          <div className={s.belowTable}>
            {(["wave", "clap", "cheer"] as const).map((kind, i) => (
              <button
                key={kind}
                className={s.iconButton}
                disabled={busy || now < reactionUntil}
                aria-label={[t.smile, t.applause, t.surprise][i]}
                onClick={() => {
                  onReact(kind);
                  setReactionUntil(Date.now() + 3000);
                }}
              >
                {["👋", "👏", "✨"][i]}
              </button>
            ))}
          </div>
        )}
        {host && !canStart && (
          <p className={`${s.help} ${s.center}`}>{t.startNeed}</p>
        )}
      </main>
      {catPicker && (
        <DoudizhuCatPicker
          locale={locale}
          catId={self?.catId ?? "scholar"}
          busy={busy}
          onSelect={onCharacter}
          onClose={() => setCatPicker(false)}
        />
      )}
      {leaving && (
        <DoudizhuDialog title={t.leaveTitle} onClose={() => setLeaving(false)}>
          <p className={s.help}>{t.leaveLobby}</p>
          <div className={s.lobbyActions}>
            <button className={s.button} onClick={() => setLeaving(false)}>
              {t.cancel}
            </button>
            <button
              className={`${s.button} ${s.primary}`}
              disabled={busy}
              onClick={onLeave}
            >
              {t.leave}
            </button>
          </div>
        </DoudizhuDialog>
      )}
      {removing !== null && (
        <DoudizhuDialog
          title={t.confirmRemove}
          onClose={() => setRemoving(null)}
        >
          <div className={s.lobbyActions}>
            <button className={s.button} onClick={() => setRemoving(null)}>
              {t.cancel}
            </button>
            <button
              className={`${s.button} ${s.primary}`}
              disabled={busy}
              onClick={() => {
                onRemove?.(removing);
                setRemoving(null);
              }}
            >
              {t.remove}
            </button>
          </div>
        </DoudizhuDialog>
      )}
    </>
  );
}
