"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  applyDdzAction,
  advanceDdzDeadline,
  createDdzDeck,
  createDdzState,
  getDdzViewerState,
  startDdzGame,
} from "../doudizhuEngine";
import type { DdzAction, DdzState } from "../doudizhuTypes";
import type {
  DdzReaction,
  DdzRoomView,
  DdzRoundSummary,
} from "../doudizhuRoomTypes";
import { getDoudizhuCopy, doudizhuErrorMessage } from "../doudizhuCopy";
import type { DrawGuessCatId } from "../drawGuessCats";
import { DoudizhuOrientationGate } from "./DoudizhuOrientationGate";
import { DoudizhuAudioProvider } from "./DoudizhuAudioControls";
import { DoudizhuEntryClient } from "./DoudizhuEntryClient";
import { DoudizhuLobby } from "./DoudizhuLobby";
import { DoudizhuTable } from "./DoudizhuTable";
import { DoudizhuMotionLayer } from "./DoudizhuMotionLayer";
import { GameToolsMobileChrome } from "./GameToolsMobileChrome";
import s from "./DoudizhuGame.module.css";
function deck(seed: number) {
  let x = seed;
  const cards = createDdzDeck().map((c) => c.id);
  for (let i = cards.length - 1; i > 0; i--) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    const j = x % (i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
function lobby(locale: string) {
  const names =
    locale === "zh-CN"
      ? ["米粒", "桃桃", "小蓝"]
      : locale === "fr"
        ? ["Camille", "Lou", "Milo"]
        : ["Jamie", "Peach", "Milo"];
  return createDdzState(
    names.map((name, seat) => ({
      seat,
      name,
      catId: ["scholar", "baker", "artist"][seat],
    })),
  );
}
export function DoudizhuPreview({
  locale,
  initialScene = "table",
  initialDeck,
  freezeClock = false,
}: {
  locale: string;
  initialScene?: "entry" | "lobby" | "table";
  /** Local preview fixtures only; online rooms always use server shuffling. */
  initialDeck?: string[];
  /** Explicit screenshot fixtures only; the normal preview runs real deadlines. */
  freezeClock?: boolean;
}) {
  const t = getDoudizhuCopy(locale),
    motionRoot = useRef<HTMLDivElement>(null),
    [entry, setEntry] = useState(initialScene === "entry"),
    [seed, setSeed] = useState(211),
    [state, setState] = useState<DdzState>(() =>
      initialScene === "table"
        ? startDdzGame(lobby(locale), Date.now(), {
            deck: initialDeck ?? deck(211),
            firstBidSeat: 0,
          }).state
        : lobby(locale),
    ),
    [seat, setSeat] = useState(0),
    [ready, setReady] = useState([false, false, false]),
    [cats, setCats] = useState<DrawGuessCatId[]>([
      "scholar",
      "baker",
      "artist",
    ]),
    [error, setError] = useState(""),
    [reactions, setReactions] = useState<DdzReaction[]>([]),
    [history, setHistory] = useState<DdzRoundSummary[]>([]);
  const view = useMemo(() => getDdzViewerState(state, seat), [state, seat]);
  const previousPhase = useRef(state.phase);
  useEffect(() => {
    if (state.phase === "LOBBY" && previousPhase.current !== "LOBBY") {
      setReady([false, false, false]);
      setError("");
      setReactions([]);
    }
    previousPhase.current = state.phase;
  }, [state.phase]);
  useEffect(() => {
    if (entry || freezeClock) return;
    const advance = () =>
      setState((previous) =>
        advanceDdzDeadline(previous, Date.now(), () =>
          deck(seed + previous.dealNo),
        ),
      );
    const timer = setInterval(advance, 250);
    window.addEventListener("pageshow", advance);
    document.addEventListener("visibilitychange", advance);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pageshow", advance);
      document.removeEventListener("visibilitychange", advance);
    };
  }, [entry, freezeClock, seed]);
  // Manual actions and automatic deadlines both contribute one result record.
  const recordedResult = useRef(0);
  useEffect(() => {
    const result = state.result;
    if (!result || result.gameNo <= recordedResult.current) return;
    recordedResult.current = result.gameNo;
    setHistory((previous) => [
      {
        gameNo: result.gameNo,
        finishedAt: new Date(result.finishedAt).toISOString(),
        rulesetVersion: state.rulesetVersion,
        result,
        players: state.players.map((player) => ({
          seat: player.seat,
          name: player.name,
          catId: cats[player.seat],
        })),
      },
      ...previous,
    ]);
  }, [state.result, state.rulesetVersion, state.players, cats]);
  const room: DdzRoomView = {
    id: "local-preview",
    code: "PREVIEW",
    revision: state.eventSeq,
    serverNow: freezeClock
      ? (state.events.at(-1)?.at ?? Date.now())
      : Date.now(),
    hostSeat: 0,
    viewerSeat: seat,
    returnedToLobby: false,
    reactions,
    seats: state.players.map((p) => ({
      seat: p.seat,
      name: p.name,
      avatarUrl: null,
      catId: cats[p.seat],
      ready: ready[p.seat],
      connected: true,
      returned: false,
      managed: state.managedSeats.includes(p.seat),
      left: false,
    })),
    state: view,
  };
  function act(action: DdzAction) {
    const now = freezeClock
      ? (state.events.at(-1)?.at ?? Date.now()) + 100
      : Date.now();
    if (!freezeClock) {
      const advanced = advanceDdzDeadline(state, now, () =>
        deck(seed + state.dealNo),
      );
      if (advanced !== state) {
        setState(advanced);
        setError(doudizhuErrorMessage("DEADLINE_EXPIRED", locale));
        return false;
      }
    }
    const result = applyDdzAction(state, seat, action, now, () =>
      deck(seed + state.dealNo),
    );
    if (result.error) {
      setError(doudizhuErrorMessage(result.error, locale));
      return false;
    }
    setError("");
    setState(result.state);
    return true;
  }
  function restart() {
    const next = seed + 1;
    setSeed(next);
    setState(
      startDdzGame(
        {
          ...lobby(locale),
          gameNo: state.gameNo,
          turnId: state.turnId,
          eventSeq: state.eventSeq,
          handVersions: state.handVersions,
        },
        Date.now(),
        { deck: deck(next), firstBidSeat: 0 },
      ).state,
    );
    setError("");
    setReactions([]);
    setEntry(false);
  }
  function returnLobby() {
    setState({
      ...lobby(locale),
      gameNo: state.gameNo,
      turnId: state.turnId,
      eventSeq: state.eventSeq,
      handVersions: state.handVersions,
    });
    setReady([false, false, false]);
    setError("");
    setReactions([]);
  }
  if (entry)
    return (
      <DoudizhuEntryClient
        locale={locale}
        onPreviewRoom={() => {
          setEntry(false);
          returnLobby();
        }}
      />
    );
  return (
    <DoudizhuAudioProvider
      locale={locale}
      localPreview
      roomKey={room.id}
      state={view}
      serverNow={room.serverNow}
    >
      <div ref={motionRoot} className={s.game}>
        <GameToolsMobileChrome />
        <div className={s.previewBar}>
          <span>
            <b>{t.previewLabel}</b>
            <span className={s.previewNote}>
              {freezeClock ? t.previewFrozenNote : t.previewNote}
            </span>
          </span>
          <div className={s.previewControls}>
            <label htmlFor="ddz-preview-seat">{t.previewSeat}</label>
            <select
              id="ddz-preview-seat"
              value={seat}
              onChange={(e) => {
                setSeat(Number(e.target.value));
                setError("");
              }}
            >
              {state.players.map((p) => (
                <option key={p.seat} value={p.seat}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              className={`${s.button} ${s.quiet} ${s.small}`}
              onClick={restart}
            >
              <RotateCcw size={15} />
              {t.restart}
            </button>
            <button
              className={`${s.button} ${s.quiet} ${s.small}`}
              onClick={returnLobby}
            >
              {t.lobby}
            </button>
          </div>
        </div>
        {state.phase === "LOBBY" ? (
          <DoudizhuLobby
            room={room}
            locale={locale}
            error={error}
            onReady={(value) =>
              setReady((prev) => prev.map((v, i) => (i === seat ? value : v)))
            }
            onStart={() => {
              if (ready.every(Boolean))
                setState(
                  startDdzGame(state, Date.now(), {
                    deck: deck(seed),
                    firstBidSeat: 0,
                  }).state,
                );
            }}
            onLeave={() => setEntry(true)}
            onReact={(kind) =>
              setReactions((prev) => [
                ...prev.filter((r) => r.seat !== seat),
                {
                  id: crypto.randomUUID(),
                  seat,
                  kind,
                  createdAt: Date.now(),
                  expiresAt: Date.now() + 4500,
                },
              ])
            }
            onCharacter={(cat) =>
              setCats((prev) => prev.map((v, i) => (i === seat ? cat : v)))
            }
          />
        ) : (
          <DoudizhuOrientationGate
            locale={locale}
            preview={freezeClock}
            onExit={() => setEntry(true)}
          >
            <DoudizhuTable
              freezeClock={freezeClock}
              room={room}
              locale={locale}
              error={error}
              onAction={act}
              onLeave={() => setEntry(true)}
              onReturn={returnLobby}
              onHistory={async () => history}
              onReact={(kind) =>
                setReactions((prev) => [
                  ...prev.filter((r) => r.seat !== seat),
                  {
                    id: crypto.randomUUID(),
                    seat,
                    kind,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 4500,
                  },
                ])
              }
            />
          </DoudizhuOrientationGate>
        )}
        <DoudizhuMotionLayer
          rootRef={motionRoot}
          roomKey={room.id}
          state={view}
          serverNow={room.serverNow}
          demoInitialDeal
        />
      </div>
    </DoudizhuAudioProvider>
  );
}
