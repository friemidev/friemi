"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  Check,
  Copy,
  UserRoundPlus,
  ArrowRight,
  SlidersHorizontal,
  ListOrdered,
  LockKeyhole,
  History,
  DoorClosed,
} from "lucide-react";
import type {
  DdzReaction,
  DdzRoomView,
  DdzRoundSummary,
} from "../doudizhuRoomTypes";
import type { DrawGuessCatId } from "../drawGuessCats";
import {
  doudizhuRoundCountLabel,
  doudizhuRoundLabel,
  getDoudizhuCopy,
} from "../doudizhuCopy";
import {
  canChangeDdzRoomSettings,
  getDdzMatchView,
  getDdzRoomSettings,
} from "../doudizhuEngine";
import type { DdzRoomSettings } from "../doudizhuTypes";
import { DoudizhuScoreboard } from "./DoudizhuScoreboard";
import { DoudizhuHistoryDialog } from "./DoudizhuHistoryDialog";
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
  onSettings,
  onCloseRoom,
  onHistory,
}: {
  room: DdzRoomView;
  locale: string;
  busy?: boolean;
  error?: string;
  onReady: (ready: boolean) => void;
  onStart: () => void;
  onLeave: () => void;
  onCharacter: (cat: DrawGuessCatId) => Promise<boolean> | boolean | void;
  onRemove?: (seat: number) => void;
  onRetry?: () => void;
  onReact?: (kind: DdzReaction["kind"]) => void;
  onSettings?: (settings: DdzRoomSettings) => Promise<boolean> | boolean | void;
  onCloseRoom?: () => Promise<boolean> | boolean | void;
  onHistory?: () => Promise<DdzRoundSummary[]>;
}) {
  const settingsFormId = useId();
  const t = getDoudizhuCopy(locale),
    [catPicker, setCatPicker] = useState(false),
    [leaving, setLeaving] = useState(false),
    [closing, setClosing] = useState(false),
    [closeBusy, setCloseBusy] = useState(false),
    [closeError, setCloseError] = useState(false),
    [historyOpen, setHistoryOpen] = useState(false),
    [removing, setRemoving] = useState<number | null>(null),
    [copied, setCopied] = useState("");
  const settings = getDdzRoomSettings(room.state),
    match = getDdzMatchView(room.state),
    settingsUnlocked = canChangeDdzRoomSettings(room.state),
    upcomingRound =
      match.status === "ACTIVE"
        ? Math.min(match.roundIndex + 1, match.roundCount)
        : 1;
  const [settingsOpen, setSettingsOpen] = useState(false),
    [scoreboardOpen, setScoreboardOpen] = useState(false),
    [settingsDraft, setSettingsDraft] = useState<DdzRoomSettings>(settings),
    [settingsSaving, setSettingsSaving] = useState(false),
    [settingsError, setSettingsError] = useState(false),
    [settingsNotice, setSettingsNotice] = useState("");
  const submittedSettings = useRef<DdzRoomSettings | null>(null);
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
  useEffect(() => {
    if (settingsOpen && (!host || !settingsUnlocked))
      setSettingsDraft(settings);
  }, [
    settings.roundCount,
    settings.playSeconds,
    settingsOpen,
    host,
    settingsUnlocked,
  ]);
  useEffect(() => {
    if (
      settingsOpen &&
      settingsError &&
      !busy &&
      submittedSettings.current !== null &&
      settings.roundCount === submittedSettings.current.roundCount &&
      settings.playSeconds === submittedSettings.current.playSeconds
    ) {
      setSettingsOpen(false);
      setSettingsError(false);
      setSettingsNotice(t.settingsSaved);
    }
  }, [
    settingsOpen,
    settingsError,
    busy,
    settings.roundCount,
    settings.playSeconds,
    t.settingsSaved,
  ]);
  async function saveSettings() {
    if (!onSettings || busy || settingsSaving || !host || !settingsUnlocked)
      return;
    setSettingsSaving(true);
    setSettingsError(false);
    const submitted = { ...settingsDraft };
    submittedSettings.current = submitted;
    try {
      const saved = await onSettings(submitted);
      if (saved === false) setSettingsError(true);
      else {
        setSettingsOpen(false);
        setSettingsNotice(t.settingsSaved);
      }
    } catch {
      setSettingsError(true);
    } finally {
      setSettingsSaving(false);
    }
  }
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
      <main className={`${s.main} ${s.lobbyMain}`}>
        <div className={s.lobbyTopRow}>
          <div className={s.lobbyIntro}>
            <span className={s.eyebrow}>
              {match.status === "COMPLETE"
                ? t.matchComplete
                : match.status === "ACTIVE"
                  ? `${t.nextRound} · ${doudizhuRoundLabel(upcomingRound, match.roundCount, locale)}`
                  : t.players}
            </span>
            <h1>{match.status === "COMPLETE" ? t.newMatch : t.waiting}</h1>
            {copied && (
              <p role="status" className={s.help}>
                {copied}
              </p>
            )}
          </div>
          <div className={s.lobbySettingsBar}>
            <button
              className={`${s.button} ${s.small} ${s.lobbyInvite}`}
              aria-label={`${t.invite} ${room.code}`}
              title={`${t.invite} ${room.code}`}
              onClick={() => void invite()}
            >
              <Copy size={16} />
              <span className={s.lobbyInviteLabel}>{t.invite}</span>
              <span>{room.code}</span>
            </button>

            <button
              className={s.settingsSummary}
              aria-label={`${t.roomSettings} · ${doudizhuRoundCountLabel(settings.roundCount, locale)} · ${settings.playSeconds} ${t.secondsUnit}`}
              onClick={() => {
                submittedSettings.current = null;
                setSettingsDraft(settings);
                setSettingsError(false);
                setSettingsOpen(true);
              }}
            >
              {settingsUnlocked ? (
                <SlidersHorizontal size={18} />
              ) : (
                <LockKeyhole size={17} />
              )}
              <span>
                {doudizhuRoundCountLabel(settings.roundCount, locale)}
                <span aria-hidden="true"> · </span>
                {settings.playSeconds} {t.timeShort}
              </span>
            </button>
            <button
              className={s.textButton}
              aria-label={t.scoreboard}
              title={t.scoreboard}
              onClick={() => setScoreboardOpen(true)}
            >
              <ListOrdered size={18} />
              <span className={s.lobbyToolLabel}>{t.scoreboard}</span>
            </button>
            {onHistory && (
              <button
                className={s.textButton}
                aria-label={t.history}
                title={t.history}
                onClick={() => setHistoryOpen(true)}
              >
                <History size={18} />{" "}
                <span className={s.lobbyToolLabel}>{t.history}</span>
              </button>
            )}
          </div>
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
        {settingsNotice && (
          <p className={`${s.help} ${s.center} ${s.lobbyHint}`} role="status">
            {settingsNotice}
          </p>
        )}
        {match.status === "COMPLETE" && (
          <p className={`${s.help} ${s.center} ${s.lobbyHint}`}>
            {t.newMatchNote}
          </p>
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
                    <div className={s.lobbySeatInfo}>
                      <h2 title={player.name}>
                        {player.name}
                        {player.seat === room.viewerSeat ? ` · ${t.you}` : ""}
                      </h2>
                      {player.seat === room.hostSeat && (
                        <span className={s.badge}>{t.host}</span>
                      )}
                      <span className={s.readyLabel}>
                        {player.connected && !player.left && player.ready && (
                          <Check size={15} />
                        )}
                        {!player.connected || player.left
                          ? t.disconnected
                          : player.ready
                            ? t.ready
                            : t.notReady}
                      </span>
                    </div>
                    {player.seat === room.viewerSeat ? (
                      <button
                        className={`${s.textButton} ${s.lobbySeatAction}`}
                        disabled={busy}
                        onClick={() => setCatPicker(true)}
                      >
                        {t.chooseCat}
                      </button>
                    ) : host && onRemove ? (
                      <button
                        className={`${s.textButton} ${s.lobbySeatAction}`}
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
        {host && !canStart && (
          <p className={`${s.help} ${s.center} ${s.lobbyHint}`}>
            {room.seats.length === 3 &&
            room.seats.some((player) => !player.connected || player.left)
              ? t.startOffline
              : t.startNeed}
          </p>
        )}
        <div className={s.lobbyFooter}>
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
                {match.status === "COMPLETE"
                  ? t.newMatch
                  : match.status === "ACTIVE"
                    ? `${t.continueRound} ${upcomingRound}${locale === "zh-CN" ? " 局" : ""}`
                    : t.start}
                <ArrowRight size={18} />
              </button>
            )}
          </div>
          <div className={s.lobbySecondaryActions}>
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
            {host && onCloseRoom && (
              <div className={s.belowTable}>
                <button
                  className={`${s.textButton} ${s.lobbyClose}`}
                  aria-label={t.closeRoom}
                  title={t.closeRoom}
                  disabled={busy}
                  onClick={() => {
                    setCloseError(false);
                    setClosing(true);
                  }}
                >
                  <DoorClosed size={18} />
                  <span className={s.lobbyCloseLabel}>{t.closeRoom}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      {historyOpen && (
        <DoudizhuHistoryDialog
          locale={locale}
          onLoad={onHistory}
          onClose={() => setHistoryOpen(false)}
        />
      )}
      {scoreboardOpen && (
        <DoudizhuScoreboard
          match={match}
          locale={locale}
          viewerSeat={room.viewerSeat}
          onClose={() => setScoreboardOpen(false)}
        />
      )}
      {settingsOpen && (
        <DoudizhuDialog
          title={t.roomSettings}
          closeLabel={t.close}
          onClose={() => {
            if (!settingsSaving) setSettingsOpen(false);
          }}
          footer={
            host &&
            settingsUnlocked && (
              <div className={s.lobbyActions}>
                <button
                  type="button"
                  className={s.button}
                  disabled={settingsSaving}
                  onClick={() => setSettingsOpen(false)}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  form={settingsFormId}
                  className={`${s.button} ${s.primary}`}
                  disabled={
                    busy ||
                    settingsSaving ||
                    !onSettings ||
                    (settingsDraft.roundCount === settings.roundCount &&
                      settingsDraft.playSeconds === settings.playSeconds)
                  }
                >
                  {settingsSaving ? t.busy : t.saveSettings}
                </button>
              </div>
            )
          }
        >
          <form
            id={settingsFormId}
            onSubmit={(event) => {
              event.preventDefault();
              void saveSettings();
            }}
          >
            <div className={s.roomSettingsFields}>
              <label>
                {t.roundsSetting}
                <select
                  value={settingsDraft.roundCount}
                  disabled={
                    !host || !settingsUnlocked || busy || settingsSaving
                  }
                  onChange={(event) =>
                    setSettingsDraft((draft) => ({
                      ...draft,
                      roundCount: Number(
                        event.target.value,
                      ) as DdzRoomSettings["roundCount"],
                    }))
                  }
                >
                  {[1, 3, 6, 12].map((count) => (
                    <option key={count} value={count}>
                      {doudizhuRoundCountLabel(count, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.playTimeSetting}
                <select
                  value={settingsDraft.playSeconds}
                  disabled={
                    !host || !settingsUnlocked || busy || settingsSaving
                  }
                  onChange={(event) =>
                    setSettingsDraft((draft) => ({
                      ...draft,
                      playSeconds: Number(
                        event.target.value,
                      ) as DdzRoomSettings["playSeconds"],
                    }))
                  }
                >
                  {[30, 60, 90].map((seconds) => (
                    <option key={seconds} value={seconds}>
                      {seconds} {t.secondsUnit}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className={s.help}>
              {!settingsUnlocked
                ? t.settingsLocked
                : !host
                  ? t.settingsHost
                  : t.settingsNote}
            </p>
            {settingsError && (
              <div className={s.feedback} role="alert">
                <span>{error || t.changed}</span>
                {onRetry && (
                  <button
                    type="button"
                    className={s.textButton}
                    onClick={onRetry}
                  >
                    {t.retry}
                  </button>
                )}
              </div>
            )}
          </form>
        </DoudizhuDialog>
      )}
      {catPicker && (
        <DoudizhuCatPicker
          locale={locale}
          catId={self?.catId ?? "scholar"}
          busy={busy}
          error={error}
          onRetry={onRetry}
          onSelect={onCharacter}
          onClose={() => setCatPicker(false)}
        />
      )}
      {leaving && (
        <DoudizhuDialog
          title={t.leaveTitle}
          closeLabel={t.close}
          onClose={() => setLeaving(false)}
          footer={
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
          }
        >
          <p className={s.help}>{t.leaveLobby}</p>
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
        </DoudizhuDialog>
      )}
      {removing !== null && (
        <DoudizhuDialog
          title={t.confirmRemove}
          closeLabel={t.close}
          onClose={() => setRemoving(null)}
          footer={
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
          }
        >
          {null}
        </DoudizhuDialog>
      )}
      {closing && (
        <DoudizhuDialog
          title={t.confirmCloseRoom}
          closeLabel={t.close}
          onClose={() => {
            if (!closeBusy) setClosing(false);
          }}
          footer={
            <div className={s.lobbyActions}>
              <button
                className={s.button}
                disabled={closeBusy}
                onClick={() => setClosing(false)}
              >
                {t.cancel}
              </button>
              <button
                className={`${s.button} ${s.primary}`}
                disabled={busy || closeBusy || !host}
                onClick={async () => {
                  if (!onCloseRoom || closeBusy || !host) return;
                  setCloseBusy(true);
                  setCloseError(false);
                  try {
                    if ((await onCloseRoom()) === false) setCloseError(true);
                  } catch {
                    setCloseError(true);
                  } finally {
                    setCloseBusy(false);
                  }
                }}
              >
                {closeBusy ? t.busy : t.closeRoom}
              </button>
            </div>
          }
        >
          <p className={s.help}>{t.closeRoomNote}</p>
          {closeError && (
            <div className={s.feedback} role="alert">
              <span>{error || t.changed}</span>
              {onRetry && (
                <button className={s.textButton} onClick={onRetry}>
                  {t.retry}
                </button>
              )}
            </div>
          )}
        </DoudizhuDialog>
      )}
    </>
  );
}
