"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  Sparkles,
  ArrowRight,
  MoreHorizontal,
  X,
  History,
  ListOrdered,
} from "lucide-react";
import type { DdzAction } from "../doudizhuTypes";
import type {
  DdzReaction,
  DdzRoomView,
  DdzRoundSummary,
} from "../doudizhuRoomTypes";
import {
  beatsDdzPlay,
  classifyDdzPlay,
  getDdzCard,
  getDdzMatchView,
  listDdzHints,
} from "../doudizhuEngine";
import {
  doudizhuBidLabel,
  doudizhuRankLabel,
  doudizhuRoundLabel,
  getDoudizhuCopy,
} from "../doudizhuCopy";
import { getDdzPassFeedback } from "../doudizhuPassFeedback";
import { DoudizhuCardFace, doudizhuCardLabel } from "./DoudizhuCard";
import { DoudizhuCat, DoudizhuDialog, DoudizhuHeader } from "./DoudizhuChrome";
import { DoudizhuHand } from "./DoudizhuHand";
import {
  DoudizhuAudioControls,
  useDoudizhuPresentation,
} from "./DoudizhuAudioControls";
import { DoudizhuPlayEffects } from "./DoudizhuPlayEffects";
import { DoudizhuScoreboard } from "./DoudizhuScoreboard";
import s from "./DoudizhuGame.module.css";

type Props = {
  room: DdzRoomView;
  locale: string;
  busy?: boolean;
  error?: string;
  onAction: (action: DdzAction) => Promise<boolean> | boolean | void;
  onReturn: () => void;
  onLeave: () => void;
  onRetry?: () => void;
  onHistory?: () => Promise<DdzRoundSummary[]>;
  onReact?: (kind: DdzReaction["kind"]) => void;
  freezeClock?: boolean;
};
export function DoudizhuTable({
  room,
  locale,
  busy = false,
  error = "",
  onAction,
  onReturn,
  onLeave,
  onRetry,
  onHistory,
  onReact,
  freezeClock = false,
}: Props) {
  const t = getDoudizhuCopy(locale),
    state = room.state,
    match = getDdzMatchView(state),
    matchComplete = match.status === "COMPLETE",
    self = room.seats.find((x) => x.seat === room.viewerSeat),
    isTurn = state.currentSeat === room.viewerSeat,
    managed = state.managedSeats.includes(room.viewerSeat);
  const [selected, setSelected] = useState<string[]>([]),
    [expanded, setExpanded] = useState(false),
    [scoreboardOpen, setScoreboardOpen] = useState(false),
    [leaving, setLeaving] = useState(false),
    [notice, setNotice] = useState(""),
    [reactions, setReactions] = useState(false),
    [history, setHistory] = useState<DdzRoundSummary[] | null>(null),
    [historyBusy, setHistoryBusy] = useState(false),
    [historyError, setHistoryError] = useState(false),
    [now, setNow] = useState(room.serverNow),
    [reactionUntil, setReactionUntil] = useState(0),
    [passTick, setPassTick] = useState(0);
  const clock = useRef({ server: room.serverNow, local: performance.now() }),
    hintIndex = useRef(0),
    hintKey = useRef("");
  const presentation = useDoudizhuPresentation(),
    passArea = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (presentation?.event.kind !== "PASS") return;
    const node = passArea.current?.querySelector<HTMLElement>(
      `[data-ddz-pass-event="${presentation.event.id}"]`,
    );
    const origin =
      Number(document.timeline.currentTime ?? performance.now()) +
      presentation.startAt -
      performance.now();
    for (const animation of node?.getAnimations() ?? [])
      animation.startTime = origin;
  }, [presentation]);
  useEffect(() => {
    clock.current = { server: room.serverNow, local: performance.now() };
    setNow(room.serverNow);
  }, [room.serverNow]);
  useEffect(() => {
    if (freezeClock) return;
    const timer = setInterval(
      () =>
        setNow(clock.current.server + performance.now() - clock.current.local),
      250,
    );
    return () => clearInterval(timer);
  }, [freezeClock]);
  // Visual holds keep their own monotonic elapsed time, even in manual preview.
  const passNow = Math.max(
      room.serverNow,
      clock.current.server + performance.now() - clock.current.local,
    ),
    passFeedback = getDdzPassFeedback(state, passNow),
    passExpiresAt = passFeedback.find(
      (item) => item.expiresAt !== null,
    )?.expiresAt;
  useEffect(() => {
    if (passExpiresAt === null || passExpiresAt === undefined) return;
    const timer = setTimeout(
      () => setPassTick((tick) => tick + 1),
      Math.max(0, passExpiresAt - passNow) + 10,
    );
    return () => clearTimeout(timer);
  }, [passExpiresAt, room.serverNow, passTick]);
  useEffect(() => {
    setSelected([]);
    setNotice("");
    setExpanded(false);
  }, [room.id, room.viewerSeat, state.gameNo, state.dealNo]);
  const handKey = state.hand.map((c) => c.id).join(",");
  useEffect(() => {
    const ids = new Set(state.hand.map((c) => c.id));
    setSelected((prev) => prev.filter((id) => ids.has(id)));
  }, [handKey]);
  useEffect(() => {
    setNotice("");
  }, [state.turnId]);
  const pattern = useMemo(() => classifyDdzPlay(selected), [selected]),
    canBeat =
      pattern && (!state.targetPlay || beatsDdzPlay(pattern, state.targetPlay));
  const seconds =
    state.deadlineAt === null
      ? 0
      : Math.max(0, Math.ceil((state.deadlineAt - now) / 1000));
  const timerLabel = `${seconds} ${seconds === 1 ? t.timeSingular : t.time}`,
    timerUrgent = state.deadlineAt !== null && seconds <= 5;
  const currentName =
    room.seats.find((x) => x.seat === state.currentSeat)?.name ?? "";
  const hand = useMemo(
    () =>
      [...state.hand].sort(
        (a, b) => b.rank - a.rank || a.id.localeCompare(b.id),
      ),
    [handKey],
  );
  const targetCards = (state.targetPlay?.cardIds ?? []).flatMap((id) => {
    const card = getDdzCard(id);
    return card ? [card] : [];
  });
  function hint() {
    const key = `${handKey}:${JSON.stringify(state.targetPlay)}`;
    if (key !== hintKey.current) {
      hintKey.current = key;
      hintIndex.current = 0;
    }
    const choices = listDdzHints(state.hand, state.targetPlay);
    if (!choices.length) {
      setNotice(t.noHint);
      return;
    }
    setSelected(choices[hintIndex.current % choices.length].cardIds);
    hintIndex.current += 1;
    setNotice("");
  }
  async function play() {
    if (!canBeat || !isTurn || busy) return;
    const accepted = await onAction({
      type: "PLAY",
      cardIds: selected,
      handVersion: state.handVersion,
    });
    if (accepted) {
      setSelected([]);
      setNotice("");
    }
  }
  async function showHistory() {
    setHistory([]);
    setHistoryBusy(true);
    setHistoryError(false);
    try {
      setHistory((await onHistory?.()) ?? []);
    } catch {
      setHistoryError(true);
    } finally {
      setHistoryBusy(false);
    }
  }
  const selectionText =
    notice ||
    (selected.length
      ? !pattern
        ? t.invalid
        : !canBeat
          ? t.cannotBeat
          : ""
      : "");
  const selectionLabel =
    selectionText === t.invalid
      ? t.invalidShort
      : selectionText === t.cannotBeat
        ? t.cannotBeatShort
        : selectionText === t.noHint
          ? t.noHintShort
          : selectionText;
  const turnText = isTurn
    ? state.phase === "PLAYING" && !state.targetPlay
      ? t.lead
      : t.yourTurn
    : `${currentName} · ${state.phase === "BIDDING" ? t.bid : t.acting}`;
  const result = state.result;
  function opponent(seat: number, position: "left" | "right") {
    const p = room.seats.find((x) => x.seat === seat),
      view = state.players.find((x) => x.seat === seat);
    if (!p || !view) return null;
    const bid = state.bid.bids.find((bid) => bid.seat === seat),
      reaction = room.reactions.find(
        (r) => r.seat === seat && r.expiresAt > now,
      );
    return (
      <section
        key={seat}
        data-ddz-seat-position={position}
        data-ddz-motion-anchor={position}
        className={`${s.player} ${seat === state.currentSeat ? s.activePlayer : ""}`}
        aria-label={`${p.name} · ${view.cardCount} ${t.cards}`}
      >
        <DoudizhuCat
          catId={p.catId}
          active={seat === state.currentSeat && !view.managed}
          size={80}
        />
        {reaction && (
          <span
            className={s.reactionBubble}
            aria-label={
              reaction.kind === "clap"
                ? t.applause
                : reaction.kind === "cheer"
                  ? t.surprise
                  : t.smile
            }
          >
            {reaction.kind === "clap"
              ? "👏"
              : reaction.kind === "cheer"
                ? "✨"
                : "👋"}
          </span>
        )}
        <div className={s.playerInfo}>
          <strong>{p.name}</strong>
          {view.gameRole && (
            <span className={s.badge}>
              {view.gameRole === "landlord" ? t.landlord : t.farmer}
            </span>
          )}
        </div>
        <span className={s.cardCount}>
          <b>{view.cardCount}</b> {t.cards}
          {view.managed
            ? ` · ${t.managed}`
            : !p.connected
              ? ` · ${t.disconnected}`
              : ""}
        </span>
        {state.phase === "BIDDING" && bid && (
          <span className={s.lastAction}>
            {bid.score
              ? `${t.bidScore} ${doudizhuBidLabel(bid.score, locale)}`
              : t.noBid}
          </span>
        )}
      </section>
    );
  }
  return (
    <>
      <DoudizhuHeader
        locale={locale}
        code={room.code}
        onBack={() => setLeaving(true)}
      >
        <button
          className={s.matchButton}
          onClick={() => setScoreboardOpen(true)}
          aria-label={`${doudizhuRoundLabel(Math.max(1, match.roundIndex), match.roundCount, locale)} · ${t.scoreboard}`}
          title={`${doudizhuRoundLabel(Math.max(1, match.roundIndex), match.roundCount, locale)} · ${t.scoreboard}`}
          data-ddz-round={`${match.roundIndex}/${match.roundCount}`}
        >
          <ListOrdered size={18} />
          <span>
            {Math.max(1, match.roundIndex)}/{match.roundCount}
          </span>
        </button>
        <DoudizhuAudioControls
          locale={locale}
          roomKey={room.id}
          state={state}
          viewerSeat={room.viewerSeat}
          serverNow={room.serverNow}
        />
      </DoudizhuHeader>
      <DoudizhuPlayEffects
        state={state}
        serverNow={room.serverNow}
        roomKey={room.id}
        locale={locale}
        freezeClock={freezeClock}
      />
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
      {state.phase === "CLOSED" ? (
        <main className={s.result}>
          <h1>{t.expired}</h1>
          <a
            className={`${s.button} ${s.primary}`}
            href={`/${locale}/game-tools/doudizhu`}
          >
            {t.returnEntry}
          </a>
        </main>
      ) : result && state.phase === "RESULT" ? (
        <main className={s.result}>
          <span className={`${s.eyebrow} ${s.resultEyebrow}`}>
            <span className={s.resultEffectArea} data-ddz-effects-area="result">
              <span data-ddz-effect-copy="result">
                {t.result} ·{" "}
                {doudizhuRoundLabel(match.roundIndex, match.roundCount, locale)}
              </span>
            </span>
          </span>
          <h1>
            {matchComplete
              ? t.matchResults
              : result.winnerSide === "landlord"
                ? t.landlordWin
                : t.farmersWin}
          </h1>
          <div className={s.resultPlayers}>
            {(matchComplete
              ? [...room.seats].sort(
                  (a, b) =>
                    (match.players.find((p) => p.seat === a.seat)?.rank ?? 3) -
                    (match.players.find((p) => p.seat === b.seat)?.rank ?? 3),
                )
              : room.seats
            ).map((player) => {
              const delta =
                result.scores.find((x) => x.seat === player.seat)?.delta ?? 0;
              const standing = match.players.find(
                (p) => p.seat === player.seat,
              );
              const tied =
                !!standing &&
                match.players.some(
                  (p) => p.seat !== player.seat && p.rank === standing.rank,
                );
              const displayedScore = matchComplete
                ? (standing?.totalScore ?? 0)
                : delta;
              return (
                <section className={s.resultPlayer} key={player.seat}>
                  <DoudizhuCat
                    catId={player.catId}
                    winner={matchComplete ? standing?.rank === 1 : delta > 0}
                    size={106}
                  />
                  <strong>
                    {player.name}
                    {player.seat === room.viewerSeat ? ` · ${t.you}` : ""}
                  </strong>
                  <span className={s.help}>
                    {matchComplete
                      ? doudizhuRankLabel(standing?.rank ?? 3, tied, locale)
                      : player.seat === result.landlordSeat
                        ? t.landlord
                        : t.farmer}
                  </span>
                  <span
                    className={`${s.delta} ${displayedScore > 0 ? s.positive : ""}`}
                    aria-label={`${matchComplete ? t.totalScore : t.score}: ${displayedScore}`}
                  >
                    {displayedScore > 0 ? "+" : ""}
                    {displayedScore}
                  </span>
                </section>
              );
            })}
          </div>
          {!matchComplete && (
            <div className={s.scoreDetails}>
              <span>
                {t.base} <b>{result.baseScore}</b>
              </span>
              <span>
                {t.bombs} <b>{result.bombCount}</b>
              </span>
              <span>
                {t.multiplier} <b>×{result.multiplier}</b>
              </span>
              {result.spring && (
                <span>
                  {result.spring === "spring" ? t.spring : t.antiSpring}
                </span>
              )}
              {result.capped && <span>{t.capped}</span>}
            </div>
          )}
          <button
            className={`${s.button} ${s.primary}`}
            disabled={busy || room.returnedToLobby}
            onClick={onReturn}
          >
            {room.returnedToLobby ? t.returning : t.returnLobby}
            <ArrowRight size={18} />
          </button>
          <div className={s.belowTable}>
            <button
              className={s.textButton}
              onClick={() => setScoreboardOpen(true)}
            >
              <ListOrdered size={16} />
              {t.scoreboard}
            </button>
            <button className={s.textButton} onClick={() => void showHistory()}>
              <History size={16} /> {t.history}
            </button>
          </div>
          <details>
            <summary className={s.textButton}>{t.remaining}</summary>
            {state.remainingHands?.map((x) => (
              <div key={x.seat} style={{ margin: "12px 0" }}>
                <p className={s.help}>
                  {room.seats.find((p) => p.seat === x.seat)?.name}
                </p>
                <div className={s.playedCards}>
                  {x.cards.map((card) => (
                    <span key={card.id} className={s.playedCard}>
                      <DoudizhuCardFace card={card} />
                      <span className="sr-only">
                        {doudizhuCardLabel(card, locale)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </details>
        </main>
      ) : (
        <main className={`${s.table} ${s.tableClassic}`}>
          <div className={s.tableArena} data-ddz-effects-area="table">
            <div className={s.tableMeta}>
              <div
                className={s.bottomCards}
                aria-label={t.bottom}
                data-ddz-motion-anchor="deck"
              >
                {[0, 1, 2].map((i) => (
                  <span key={i} className={s.bottomCard}>
                    <DoudizhuCardFace
                      card={state.bottomCards[i]}
                      back={!state.bottomCards[i]}
                    />
                    <span className="sr-only">
                      {state.bottomCards[i]
                        ? doudizhuCardLabel(state.bottomCards[i], locale)
                        : t.bottom}
                    </span>
                  </span>
                ))}
              </div>
              <span className={s.stat}>
                {t.highBid}
                <strong>
                  {state.bid.highestScore
                    ? doudizhuBidLabel(state.bid.highestScore, locale)
                    : "—"}
                </strong>
              </span>
              <span className={s.stat}>
                {t.multiplier}
                <strong>×{state.multiplier}</strong>
              </span>
              {state.dealNo > 1 && (
                <span className={s.stat}>
                  {t.redeal}
                  <strong>{state.dealNo}</strong>
                </span>
              )}
              <div
                className={`${s.turn} ${isTurn ? s.ownTurn : ""}`}
                role="status"
              >
                <span className={s.turnName} title={turnText}>
                  {turnText}
                </span>
                <span
                  className={s.turnTime}
                  role="timer"
                  aria-live="off"
                  aria-label={timerLabel}
                  title={timerLabel}
                  data-ddz-countdown={seconds}
                  data-urgent={timerUrgent || undefined}
                >
                  <span>{seconds}</span>
                  <span className={s.timeUnit} aria-hidden="true">
                    {t.timeShort}
                  </span>
                </span>
              </div>
            </div>
            <div className={s.opponents}>
              {opponent((room.viewerSeat + 2) % 3, "left")}
              {opponent((room.viewerSeat + 1) % 3, "right")}
            </div>
            <section
              className={s.playArea}
              aria-label={t.target}
              data-source={
                state.targetPlay
                  ? state.targetPlay.seat === room.viewerSeat
                    ? "self"
                    : state.targetPlay.seat === (room.viewerSeat + 2) % 3
                      ? "left"
                      : "right"
                  : "self"
              }
            >
              <div
                className={s.playedCards}
                data-ddz-motion-anchor="target"
                key={`${state.gameNo}:${state.targetPlay?.cardIds.join("-") ?? "empty"}`}
              >
                {targetCards.map((card) => (
                  <span
                    key={card.id}
                    className={s.playedCard}
                    data-ddz-play-card-id={card.id}
                  >
                    <DoudizhuCardFace card={card} />
                    <span className="sr-only">
                      {doudizhuCardLabel(card, locale)}
                    </span>
                  </span>
                ))}
              </div>
              {!state.targetPlay && state.phase === "BIDDING" && (
                <span
                  className={s.emptyPlay}
                >{`${t.bidScore} ${[1, 2, 3].map((score) => doudizhuBidLabel(score, locale)).join(" · ")}`}</span>
              )}
            </section>
            <div
              ref={passArea}
              className={s.passFeedback}
              role="status"
              aria-live="polite"
            >
              {passFeedback.map(({ seat, eventId }) => (
                <span
                  key={eventId}
                  className={`${s.passMarker} ${presentation?.event.kind === "PASS" && presentation.event.id === eventId ? s.passAnimated : ""}`}
                  data-ddz-pass-seat={seat}
                  data-ddz-pass-event={eventId}
                  data-ddz-presentation-event-id={eventId}
                  data-ddz-presentation-start-at={
                    presentation?.event.kind === "PASS" &&
                    presentation.event.id === eventId
                      ? presentation.startAt
                      : undefined
                  }
                  data-position={
                    seat === room.viewerSeat
                      ? "self"
                      : seat === (room.viewerSeat + 2) % 3
                        ? "left"
                        : "right"
                  }
                >
                  <span className="sr-only">
                    {room.seats.find((player) => player.seat === seat)?.name}{" "}
                    ·{" "}
                  </span>
                  {t.pass}
                </span>
              ))}
            </div>
          </div>
          <div className={s.decisionRow}>
            <div className={s.tableSelf}>
              <DoudizhuCat catId={self?.catId} size={52} />
              <div className={s.tableSelfCopy}>
                <strong>
                  {self?.name} · {t.you}
                </strong>
                <span
                  className={s.tableSelection}
                  role="status"
                  title={selectionText}
                  aria-label={selectionText || undefined}
                >
                  {selectionText
                    ? selectionLabel
                    : state.landlordSeat !== null
                      ? state.landlordSeat === room.viewerSeat
                        ? t.landlord
                        : t.farmer
                      : ""}
                </span>
              </div>
            </div>
            {managed ? (
              <div className={s.takeOverControls}>
                <span>{t.managed}</span>
                <button
                  className={`${s.button} ${s.primary}`}
                  disabled={busy}
                  title={t.timerNote}
                  onClick={() =>
                    void onAction({ type: "SET_MANAGED", managed: false })
                  }
                >
                  {t.takeOver}
                </button>
              </div>
            ) : state.phase === "BIDDING" ? (
              <div className={s.bidActions}>
                {([0, 1, 2, 3] as const).map((score) => (
                  <button
                    key={score}
                    className={`${s.button} ${score === 3 ? s.primary : ""}`}
                    disabled={
                      busy ||
                      !isTurn ||
                      (score > 0 && score <= state.bid.highestScore)
                    }
                    onClick={() => void onAction({ type: "BID", score })}
                    aria-label={
                      score
                        ? `${t.bidScore} ${doudizhuBidLabel(score, locale)}`
                        : t.noBid
                    }
                  >
                    {score ? doudizhuBidLabel(score, locale) : t.noBid}
                  </button>
                ))}
              </div>
            ) : (
              <div className={s.actions}>
                <button
                  className={s.button}
                  disabled={busy || !isTurn || !state.targetPlay}
                  onClick={() => void onAction({ type: "PASS" })}
                >
                  {t.pass}
                </button>
                <button className={s.button} disabled={busy} onClick={hint}>
                  <Sparkles size={16} />
                  {t.hint}
                </button>
                <button
                  className={`${s.button} ${s.primary}`}
                  disabled={busy || !isTurn || !canBeat}
                  onClick={() => void play()}
                >
                  {busy ? t.busy : t.play}
                </button>
              </div>
            )}
            <div className={s.tableTools}>
              {selected.length > 0 && (
                <button
                  className={s.iconButton}
                  aria-label={t.clear}
                  title={t.clear}
                  disabled={busy}
                  onClick={() => {
                    setSelected([]);
                    setNotice("");
                  }}
                >
                  <X size={18} />
                </button>
              )}
              <button
                className={s.iconButton}
                aria-label={t.expand}
                title={t.expand}
                onClick={() => setExpanded(true)}
              >
                <Maximize2 size={19} />
              </button>
              <button
                className={s.iconButton}
                aria-label={`${t.manage} · ${t.history} · ${t.reaction}`}
                aria-expanded={reactions}
                onClick={() => setReactions((value) => !value)}
              >
                <MoreHorizontal size={22} />
              </button>
            </div>
          </div>
          <DoudizhuHand
            cards={hand}
            selected={selected}
            locale={locale}
            label={t.hand}
            disabled={busy}
            onSelectionChange={(ids) => {
              setSelected(ids);
              setNotice("");
            }}
          />
          {reactions && (
            <div className={s.tableUtility}>
              {onReact && (
                <div className={s.tableReactionButtons}>
                  {(["wave", "clap", "cheer"] as const).map((kind, i) => (
                    <button
                      key={kind}
                      className={s.iconButton}
                      disabled={busy || now < reactionUntil}
                      aria-label={[t.smile, t.applause, t.surprise][i]}
                      onClick={() => {
                        onReact(kind);
                        setReactionUntil(now + 3000);
                        setReactions(false);
                      }}
                    >
                      {["👋", "👏", "✨"][i]}
                    </button>
                  ))}
                </div>
              )}
              <button
                className={s.textButton}
                disabled={busy}
                title={t.timerNote}
                onClick={() => {
                  void onAction({ type: "SET_MANAGED", managed: !managed });
                  setReactions(false);
                }}
              >
                {managed ? t.takeOver : t.manage}
              </button>
              <button
                className={s.textButton}
                onClick={() => {
                  void showHistory();
                  setReactions(false);
                }}
              >
                {t.history}
              </button>
            </div>
          )}
        </main>
      )}
      {scoreboardOpen && (
        <DoudizhuScoreboard
          match={match}
          locale={locale}
          viewerSeat={room.viewerSeat}
          onClose={() => setScoreboardOpen(false)}
        />
      )}
      {expanded && (
        <DoudizhuDialog title={t.hand} onClose={() => setExpanded(false)}>
          <div className={`${s.turn} ${isTurn ? s.ownTurn : ""}`}>
            <span>{turnText}</span>
            <span
              className={s.turnTime}
              role="timer"
              aria-live="off"
              aria-label={timerLabel}
              title={timerLabel}
              data-ddz-countdown={seconds}
              data-urgent={timerUrgent || undefined}
            >
              <span>{seconds}</span>
              <span className={s.timeUnit} aria-hidden="true">
                {t.timeShort}
              </span>
            </span>
          </div>
          <DoudizhuHand
            layout="grid"
            cards={hand}
            selected={selected}
            locale={locale}
            label={t.hand}
            disabled={busy}
            onSelectionChange={(ids) => {
              setSelected(ids);
              setNotice("");
            }}
          />
          {selectionText && (
            <p className={s.help} role="status">
              {selectionText}
            </p>
          )}
          <button
            className={`${s.button} ${s.primary}`}
            style={{ width: "100%" }}
            onClick={() => setExpanded(false)}
          >
            {t.collapse}
          </button>
        </DoudizhuDialog>
      )}
      {leaving && (
        <DoudizhuDialog title={t.leaveTitle} onClose={() => setLeaving(false)}>
          <p className={s.help}>
            {["BIDDING", "PLAYING"].includes(state.phase)
              ? t.leaveActive
              : t.leaveLobby}
          </p>
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
      {history !== null && (
        <DoudizhuDialog title={t.history} onClose={() => setHistory(null)}>
          {historyBusy ? (
            <p>{t.busy}</p>
          ) : historyError ? (
            <div className={s.feedback}>
              <span>{t.reconnecting}</span>
              <button
                className={s.textButton}
                onClick={() => void showHistory()}
              >
                {t.refresh}
              </button>
            </div>
          ) : !history.length ? (
            <p className={s.help}>{t.noHistory}</p>
          ) : (
            <ol className={s.historyList}>
              {history.map((round) => (
                <li className={s.historyItem} key={round.gameNo}>
                  <details>
                    <summary>
                      <span>
                        #{round.gameNo} ·{" "}
                        {round.result.winnerSide === "landlord"
                          ? t.landlordWin
                          : t.farmersWin}
                      </span>
                      <time className={s.help}>
                        {new Date(round.finishedAt).toLocaleDateString(locale)}
                      </time>
                    </summary>
                    <div className={s.scoreDetails}>
                      {round.players.map((p) => (
                        <span key={p.seat}>
                          {p.name}:{" "}
                          <b>
                            {
                              round.result.scores.find((x) => x.seat === p.seat)
                                ?.delta
                            }
                          </b>
                        </span>
                      ))}
                    </div>
                    <p className={s.help}>
                      {t.base} {round.result.baseScore} · {t.multiplier} ×
                      {round.result.multiplier}
                      {round.result.spring
                        ? ` · ${round.result.spring === "spring" ? t.spring : t.antiSpring}`
                        : ""}
                    </p>
                  </details>
                </li>
              ))}
            </ol>
          )}
        </DoudizhuDialog>
      )}
    </>
  );
}
