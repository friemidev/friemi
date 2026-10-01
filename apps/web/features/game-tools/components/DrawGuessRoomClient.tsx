"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock3, Copy, Crown, LoaderCircle, Send, Sparkles, Trash2, Trophy, UsersRound, X } from "lucide-react";
import { DrawGuessArtwork, DrawGuessCanvas } from "@/features/game-tools/components/DrawGuessCanvas";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import { DrawGuessClassicChat } from "@/features/game-tools/components/DrawGuessClassicChat";
import { DrawGuessChainReview } from "@/features/game-tools/components/DrawGuessChainReview";
import { DrawGuessLobby } from "@/features/game-tools/components/DrawGuessLobby";
import { DrawGuessPodium } from "@/features/game-tools/components/DrawGuessPodium";
import { DrawGuessReportButton } from "@/features/game-tools/components/DrawGuessReportButton";
import { useDrawGuessInk } from "@/features/game-tools/hooks/useDrawGuessInk";
import { getDrawGuessRankings, type ChainStep, type DrawGuessAction, type DrawGuessChatMessage, type DrawGuessMode, type DrawGuessPhase, type DrawGuessTiming, type DrawGuessWordBankSnapshot, type DrawStroke } from "@/features/game-tools/drawGuessEngine";
import type { DrawGuessCatMood } from "@/features/game-tools/drawGuessCats";
import { DRAW_GUESS_ROOM_EVENT, getDrawGuessRealtimeBrowserConfig, getDrawGuessRoomTopic } from "@/features/game-tools/drawGuessRealtime";
import { ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT, ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY } from "@/features/game-tools/activeGameToolRoomStorage";
import { withLocale } from "@/lib/routes";

export type DrawGuessRoomView = {
  code: string;
  id: string;
  isHost: boolean;
  autoSize?: boolean;
  canStart?: boolean;
  mode: DrawGuessMode;
  playerCount: number;
  requiredPlayers?: number;
  practiceBotSeat?: number;
  revision: number;
  seats: { name: string; number: number; avatarUrl?: string | null; catId?: string | null; ready?: boolean; isHost: boolean; isSystem?: boolean; managed?: boolean }[];
  status: string;
  viewerSeat: number;
  wordBank?: DrawGuessWordBankSnapshot | null;
  view: {
    answer?: string | null;
    chainStage: number;
    chainSubmittedCount?: number;
    chains?: ChainStep[][];
    chat?: DrawGuessChatMessage[];
    deadlineAt: string | null;
    drawDeadlineAt?: string | null;
    gameNumber: number;
    drawing?: DrawStroke[];
    guesses?: Record<string, { at: string; points: number }>;
    inkSeq?: number;
    matchResults?: Record<string, boolean> | null;
    mode: DrawGuessMode;
    options?: string[];
    phase: DrawGuessPhase;
    picks?: Record<string, number>;
    scores: number[];
    managedSeats?: number[];
    task?: { kind: "WORD" | "DRAWING"; owner?: number; previous?: ChainStep | null; submitted: boolean; draft?: DrawStroke[]; options?: string[] } | null;
    timing?: DrawGuessTiming;
    turnIndex: number;
    voteCounts?: { yes: number; no: number; abstain: number }[] | null;
    votedOwners?: number[];
  };
};

const TRANSLATIONS = {
  "zh-CN": { title: "你画我猜", back: "桌游工具", room: "房间", copy: "复制邀请链接", copied: "已复制", players: "玩家", waiting: "等待玩家入座", start: "开始游戏", ready: "人齐了，可以开局", host: "房主", you: "你", seat: "号位", minute: "秒", modeClassic: "抢答模式", modeChain: "画画接龙", select: "选一个词来画", choose: "选择", draw: "轮到你画", drawTimeUp: "作画结束，继续等大家猜", guessing: "猜猜这是什么", submitGuess: "提交猜词", answer: "答案", guessed: "答对了！", wrong: "还没猜对，继续试试", tooFast: "猜得太快了，请稍等一秒", wait: "等待其他玩家提交", word: "给你的接龙写一个起始词", nextDraw: "根据上一个词作画", nextGuess: "根据这幅画猜词", previousWord: "上一棒的词", submit: "提交这一棒", drawing: "作画中", stage: "第", vote: "首尾吻合吗？", yes: "吻合", no: "不吻合", result: "投票结果", pick: "选择你这条链最棒的画", picked: "已选", finish: "本局排行榜", rematch: "再来一局", history: "查看往期作品", chain: "传递故事", system: "系统补位", match: "吻合", mismatch: "不吻合", error: "再试一次吧", saved: "已保存", invalidWord: "请写 2–12 个字。", noArtwork: "这条链没有可评选的作品", invitation: "分享房间号或链接给朋友", loading: "加载房间中", next: "下一轮即将开始", submitted: "已提交", score: "分", liveScore: "实时积分", draft: "画稿会自动保存", classicHint: "画者选词后，其他人边看边猜。", chainHint: "每人从一个词开始，画与猜轮流传递。" },
  en: { title: "Draw & Guess", back: "Table tools", room: "Room", copy: "Copy invite link", copied: "Copied", players: "Players", waiting: "Waiting for players", start: "Start game", ready: "Everyone is here", host: "Host", you: "You", seat: "seat", minute: "s", modeClassic: "Speed round", modeChain: "Picture chain", select: "Choose a word to draw", choose: "Choose", draw: "Your turn to draw", drawTimeUp: "Drawing is done; guesses are still open", guessing: "What is this?", submitGuess: "Send guess", answer: "Answer", guessed: "Correct!", wrong: "Not quite. Try again", tooFast: "Please wait a second before guessing again", wait: "Waiting for the others", word: "Write a starting word", nextDraw: "Draw the previous word", nextGuess: "Guess from this picture", previousWord: "Previous word", submit: "Pass it on", drawing: "Drawing", stage: "Stage", vote: "Does the ending match?", yes: "Matches", no: "Different", result: "Vote results", pick: "Pick your favorite drawing", picked: "Selected", finish: "Leaderboard", rematch: "Play again", history: "Past games", chain: "The story", system: "Auto-filled", match: "Matched", mismatch: "Changed", error: "Try again.", saved: "Saved", invalidWord: "Enter 2–12 characters.", noArtwork: "No eligible artwork", invitation: "Share the room code or link", loading: "Loading room", next: "Next turn soon", submitted: "Submitted", score: "pts", liveScore: "Live scores", draft: "Draft saves automatically", classicHint: "Choose a word, draw, and let everyone guess.", chainHint: "Everyone starts a word and passes drawings and guesses." },
  fr: { title: "Dessine et devine", back: "Jeux de table", room: "Salle", copy: "Copier le lien", copied: "Copié", players: "Joueurs", waiting: "En attente des joueurs", start: "Commencer", ready: "Tout le monde est là", host: "Hôte", you: "Vous", seat: "place", minute: "s", modeClassic: "Devine vite", modeChain: "Chaîne de dessins", select: "Choisissez un mot", choose: "Choisir", draw: "À vous de dessiner", drawTimeUp: "Dessin terminé ; les réponses restent ouvertes", guessing: "Qu'est-ce que c'est ?", submitGuess: "Envoyer", answer: "Réponse", guessed: "Bravo !", wrong: "Pas encore. Réessayez", tooFast: "Attendez une seconde avant de réessayer", wait: "En attente des autres", word: "Écrivez un mot de départ", nextDraw: "Dessinez le mot reçu", nextGuess: "Devinez ce dessin", previousWord: "Mot précédent", submit: "Transmettre", drawing: "Dessin", stage: "Étape", vote: "La fin correspond-elle ?", yes: "Oui", no: "Non", result: "Votes", pick: "Choisissez le meilleur dessin", picked: "Choisi", finish: "Classement", rematch: "Rejouer", history: "Parties précédentes", chain: "L'histoire", system: "Automatique", match: "Correspond", mismatch: "Différent", error: "Oups, réessayez.", saved: "Enregistré", invalidWord: "Saisissez 2 à 12 caractères.", noArtwork: "Aucun dessin éligible", invitation: "Partagez le code ou le lien", loading: "Chargement", next: "Prochain tour", submitted: "Envoyé", score: "pts", liveScore: "Scores en direct", draft: "Brouillon enregistré automatiquement", classicHint: "Choisissez un mot, dessinez et faites deviner les autres.", chainHint: "Chacun part d'un mot et transmet dessins et réponses." },
};

const STATUS_COPY = {
  "zh-CN": { syncing: "正在重连", polling: "定期刷新", inkSyncing: "画笔同步中", inkLive: "实时已连接", expired: "马上继续…", draftFailed: "保存失败，请重试", signIn: "登录已失效，请重新登录后返回房间", missing: "人数还没到齐", closed: "新对局暂时暂停", invalid: "请输入可见文字，勿包含链接或个人信息", rate: "提交太频繁，请稍后再试" },
  en: { syncing: "Reconnecting", polling: "Refreshing", inkSyncing: "Syncing ink", inkLive: "Live ink", expired: "One moment…", draftFailed: "Save failed. Try again.", signIn: "Your sign-in expired. Sign in again and return to the room.", missing: "Waiting for players", closed: "New games are temporarily paused", invalid: "Use visible words without links or personal details", rate: "Too many submissions. Try again shortly." },
  fr: { syncing: "Reconnexion", polling: "Actualisation", inkSyncing: "Synchronisation", inkLive: "Dessin en direct", expired: "Ça arrive…", draftFailed: "Échec de l'enregistrement. Réessayez.", signIn: "Connexion expirée. Reconnectez-vous puis revenez.", missing: "En attente de joueurs", closed: "Nouvelles parties temporairement suspendues", invalid: "Utilisez des mots visibles sans lien ni données privées", rate: "Trop d'envois. Réessayez dans un instant." },
};

const BANK_COPY = {
  "zh-CN": { title: "本局词库", preview: "预览全部词语", words: "个词", choose: "从词库选一个起始词", progress: "人完成" },
  en: { title: "Word pack", preview: "Preview every word", words: "words", choose: "Choose a starting word from this pack", progress: "done" },
  fr: { title: "Thème", preview: "Voir tous les mots", words: "mots", choose: "Choisissez un mot du thème", progress: "terminés" },
};

function formatTimer(deadlineAt: string | null, now: number) {
  if (!deadlineAt) return "";
  const seconds = Math.max(0, Math.ceil((Date.parse(deadlineAt) - now) / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function ActionButton({ children, disabled, onClick, tone = "soft" }: { children: React.ReactNode; disabled?: boolean; onClick: () => void; tone?: "soft" | "strong" }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`draw-guess-btn ${tone === "soft" ? "draw-guess-btn--blush" : "draw-guess-btn--candy"} min-h-11 px-5 text-sm`}>{children}</button>;
}

export function DrawGuessRoomClient({ initialRoom, locale }: { initialRoom: DrawGuessRoomView; locale: string }) {
  const router = useRouter();
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] ?? TRANSLATIONS.en;
  const statusCopy = STATUS_COPY[locale as keyof typeof STATUS_COPY] ?? STATUS_COPY.en;
  const bankCopy = BANK_COPY[locale as keyof typeof BANK_COPY] ?? BANK_COPY.en;
  const [room, setRoom] = useState(initialRoom);
  const practiceCopy = locale === "en" ? { note: "Two-player practice · helper uses test drawings", people: "people", botClue: "Automatic test drawing" }
    : locale === "fr" ? { note: "À deux · le joueur automatique utilise des dessins tests", people: "personnes", botClue: "Dessin automatique de test" }
    : { note: "双人练习 · 系统画作仅供测试", people: "位真人", botClue: "系统测试画作" };
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [pendingGuess, setPendingGuess] = useState<{ id: string; text: string } | null>(null);
  const [guessMood, setGuessMood] = useState<DrawGuessCatMood>("idle");
  const guessMoodTimer = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [strokes, setStrokes] = useState<DrawStroke[]>(initialRoom.view.drawing ?? []);
  const [syncStatus, setSyncStatus] = useState<"CONNECTED" | "RECONNECTING" | "POLLING">("POLLING");
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [draftFailed, setDraftFailed] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [phaseToast, setPhaseToast] = useState(false);
  const lastPhaseKey = useRef("");
  const playStageRef = useRef<HTMLDivElement>(null);
  const refreshRunning = useRef<Promise<void> | null>(null);
  const mutationQueue = useRef<Promise<unknown>>(Promise.resolve());
  const previousTask = useRef("");
  const warmedInkTurn = useRef("");
  const latestRoom = useRef(room);
  latestRoom.current = room;
  const leaveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (leaveTimer.current !== null) { window.clearTimeout(leaveTimer.current); leaveTimer.current = null; }
    return () => {
      leaveTimer.current = window.setTimeout(() => {
        if (latestRoom.current.view.phase !== "FINISHED") {
          void fetch(`/api/game-tools/draw-guess/rooms/${latestRoom.current.id}/leave`, { method: "POST", keepalive: true });
          try {
            const active = JSON.parse(window.localStorage.getItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY) ?? "null") as { id?: string } | null;
            if (active?.id === latestRoom.current.id) {
              window.localStorage.removeItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY);
              window.dispatchEvent(new Event(ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT));
            }
          } catch { /* Private browsing may block local storage. */ }
        }
      }, 500);
    };
  }, []);
  const ink = useDrawGuessInk(room, (snapshot) => {
    if (snapshot.revision >= latestRoom.current.revision) setRoom(snapshot);
  });
  const pendingInk = useRef<{ stroke: DrawStroke; strokeIndex: number } | null>(null);
  const inkTimer = useRef<number | null>(null);
  const inkDrain = useRef<Promise<void> | null>(null);
  const inkYieldForDraft = useRef(false);
  const currentStroke = useRef<DrawStroke | null>(null);
  const strokesRef = useRef(strokes);
  const lastInkSeq = useRef(initialRoom.view.inkSeq ?? 0);
  const classicEdited = useRef(false);
  const classicDraftDirty = useRef(false);
  const classicDraftSaving = useRef<Promise<void> | null>(null);
  const [strokeSaving, setStrokeSaving] = useState(false);
  const [scoreGains, setScoreGains] = useState<Record<number, { points: number; id: number }>>({});
  const previousScores = useRef({ gameNumber: initialRoom.view.gameNumber, scores: initialRoom.view.scores });
  const scoreGainId = useRef(0);
  const scoreGainTimers = useRef<number[]>([]);

  useEffect(() => () => { scoreGainTimers.current.forEach((timer) => window.clearTimeout(timer)); if (guessMoodTimer.current !== null) window.clearTimeout(guessMoodTimer.current); }, []);

  useEffect(() => {
    const previous = previousScores.current;
    previousScores.current = { gameNumber: room.view.gameNumber, scores: room.view.scores };
    if (previous.gameNumber !== room.view.gameNumber) { setScoreGains({}); return; }
    const gains: Record<number, { points: number; id: number }> = {};
    room.view.scores.forEach((score, seat) => {
      const points = score - (previous.scores[seat] ?? 0);
      if (points > 0) gains[seat] = { points, id: ++scoreGainId.current };
    });
    if (!Object.keys(gains).length) return;
    setScoreGains((current) => ({ ...current, ...gains }));
    Object.entries(gains).forEach(([seatKey, gain]) => {
      const seat = Number(seatKey);
      scoreGainTimers.current.push(window.setTimeout(() => setScoreGains((current) => {
        if (current[seat]?.id !== gain.id) return current;
        const next = { ...current };
        delete next[seat];
        return next;
      }), 1_650));
    });
  }, [room.view.gameNumber, room.view.scores]);

  const drainInk = useCallback(() => {
    if (inkDrain.current) return inkDrain.current;
    const running = (async () => {
      while (pendingInk.current) {
        const batch = pendingInk.current;
        pendingInk.current = null;
        const seq = await ink.publishStroke(batch.stroke, batch.strokeIndex);
        if (seq !== null) lastInkSeq.current = Math.max(lastInkSeq.current, seq);
        if (inkYieldForDraft.current) break;
      }
    })();
    inkDrain.current = running.finally(() => { inkDrain.current = null; });
    return inkDrain.current;
  }, [ink.publishStroke]);

  useEffect(() => () => { if (inkTimer.current !== null) window.clearTimeout(inkTimer.current); }, []);

  const refresh = useCallback(async (afterMutation = false) => {
    if (refreshRunning.current) {
      await refreshRunning.current;
      if (!afterMutation) return;
    }
    const running = (async () => {
      try {
        const response = await fetch(`/api/game-tools/draw-guess/rooms/${initialRoom.id}`, {
          cache: "no-store",
          headers: { "if-none-match": `W/"draw-guess-${latestRoom.current.revision}"` },
        });
        if (response.status === 304) {
          setRefreshFailed(false);
        } else if (response.ok) {
          const result = await response.json() as { room: DrawGuessRoomView };
          if (result.room && result.room.revision >= latestRoom.current.revision) setRoom(result.room);
          setRefreshFailed(false);
        } else {
          setRefreshFailed(true);
          if (response.status === 401) setError(statusCopy.signIn);
        }
      } catch { setRefreshFailed(true); }
    })();
    refreshRunning.current = running;
    try { await running; }
    finally { if (refreshRunning.current === running) refreshRunning.current = null; }
  }, [initialRoom.id, statusCopy.signIn]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (room.mode !== "CLASSIC" || room.view.phase !== "WORD_SELECT" || room.viewerSeat !== room.view.turnIndex) return;
    const turnKey = `${room.id}:${room.view.gameNumber}:${room.view.turnIndex}`;
    if (warmedInkTurn.current === turnKey) return;
    warmedInkTurn.current = turnKey;
    void fetch(`/api/game-tools/draw-guess/rooms/${room.id}/ink`, {
      method: "HEAD",
      cache: "no-store",
    }).catch(() => {});
  }, [room.id, room.mode, room.viewerSeat, room.view.gameNumber, room.view.phase, room.view.turnIndex]);

  useEffect(() => {
    const intervalMs = syncStatus === "CONNECTED" ? 10_000 : 2_000;
    // Spread safety polls across clients that subscribe to the same room at once.
    const poll = () => { void refresh(); };
    let intervalId: number | null = null;
    const firstPollId = window.setTimeout(() => {
      poll();
      intervalId = window.setInterval(poll, intervalMs);
    }, 250 + Math.random() * (intervalMs - 250));
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(firstPollId);
      if (intervalId !== null) window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh, syncStatus]);

  useEffect(() => {
    const config = getDrawGuessRealtimeBrowserConfig();
    if (!config) { setSyncStatus("POLLING"); return; }
    setSyncStatus("RECONNECTING");
    const client = createClient(config.url, config.publishableKey, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
    const channel = client.channel(getDrawGuessRoomTopic(initialRoom.id)).on("broadcast", { event: DRAW_GUESS_ROOM_EVENT }, () => { void refresh(); }).subscribe((status) => {
      setSyncStatus(status === "SUBSCRIBED" ? "CONNECTED" : "RECONNECTING");
      if (status === "SUBSCRIBED") void refresh();
    });
    return () => { void client.removeChannel(channel).finally(() => client.realtime.disconnect()); };
  }, [initialRoom.id, refresh]);

  useEffect(() => {
    const taskKey = `${room.view.gameNumber}:${room.view.phase}:${room.view.turnIndex}:${room.view.chainStage}`;
    if (taskKey === previousTask.current) return;
    previousTask.current = taskKey;
    lastInkSeq.current = room.view.inkSeq ?? 0;
    currentStroke.current = null;
    pendingInk.current = null;
    inkYieldForDraft.current = false;
    classicEdited.current = false;
    classicDraftDirty.current = false;
    setDraftFailed(false);
    if (inkTimer.current !== null) window.clearTimeout(inkTimer.current);
    inkTimer.current = null;
    setInput("");
    const nextStrokes = room.view.phase === "CHAIN_STEP" ? room.view.task?.draft ?? [] : room.view.drawing ?? [];
    strokesRef.current = nextStrokes;
    setStrokes(nextStrokes);
  }, [room.view]);

  useEffect(() => {
    if (room.mode !== "CLASSIC" || room.view.phase !== "DRAW_GUESS" || room.view.turnIndex !== room.viewerSeat) return;
    if (currentStroke.current || classicEdited.current) return;
    const nextStrokes = room.view.drawing ?? [];
    strokesRef.current = nextStrokes;
    setStrokes(nextStrokes);
  }, [room.mode, room.revision, room.view.drawing, room.view.phase, room.view.turnIndex, room.viewerSeat]);

  useEffect(() => {
    const href = withLocale(locale, `/game-tools/draw-guess/rooms/${room.id}`);
    try {
      window.localStorage.setItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY, JSON.stringify({ code: room.code, href, id: room.id, kind: "DRAW_GUESS", locale, privateSeatHref: null, seatNumber: room.viewerSeat + 1, title: t.title }));
      window.dispatchEvent(new Event(ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT));
    } catch { /* Private browsing may block local storage. */ }
  }, [locale, room.code, room.id, room.viewerSeat, t.title]);

  const send = useCallback((action: DrawGuessAction | { type: "START" } | { type: "REMATCH" }) => {
    const run = async () => {
      setBusy(true); setError("");
      try {
        const response = await fetch(`/api/game-tools/draw-guess/rooms/${room.id}/actions`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            commandId: crypto.randomUUID(),
            expectedChainStage: room.view.chainStage,
            expectedPhase: room.view.phase,
            expectedTurnIndex: room.view.turnIndex,
            gameNumber: room.view.gameNumber,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error ?? "UNKNOWN");
        if (action.type === "SAVE_DRAFT" || action.type === "SAVE_CLASSIC_DRAFT") setDraftFailed(false);
        await refresh(true);
        return result as { correct?: boolean; points?: number };
      } catch (cause) {
        const code = cause instanceof Error ? cause.message : "UNKNOWN";
        const phaseChanged = code === "PHASE_ENDED" || code === "STALE_PHASE" || code === "STALE_GAME";
        const expectedDraftEnd = action.type === "SAVE_CLASSIC_DRAFT" && code === "DRAW_TIME_ENDED";
        if (phaseChanged || expectedDraftEnd) {
          setError("");
          await refresh(true);
          return null;
        }
        if (action.type === "SAVE_DRAFT" || action.type === "SAVE_CLASSIC_DRAFT") setDraftFailed(true);
        setError(code === "TOO_FAST" ? t.tooFast : code === "SIGN_IN_REQUIRED" ? statusCopy.signIn : code === "WAIT_FOR_PLAYERS" ? statusCopy.missing : code === "CHAIN_NOT_ENABLED" ? statusCopy.closed : code === "INVALID_WORD" ? statusCopy.invalid : code === "RATE_LIMITED" ? statusCopy.rate : action.type === "SAVE_DRAFT" || action.type === "SAVE_CLASSIC_DRAFT" ? statusCopy.draftFailed : t.error);
        await refresh(true);
        return null;
      }
      finally { setBusy(false); }
    };
    const queued = mutationQueue.current.then(run, run);
    mutationQueue.current = queued.then(() => undefined, () => undefined);
    return queued;
  }, [refresh, room.id, room.view.chainStage, room.view.gameNumber, room.view.phase, room.view.turnIndex, statusCopy, t.error, t.tooFast]);

  const sendRef = useRef(send);
  sendRef.current = send;
  const flushClassicDraft = useCallback(() => {
    classicDraftDirty.current = true;
    if (classicDraftSaving.current) return classicDraftSaving.current;
    const taskKey = previousTask.current;
    const startingRoom = latestRoom.current;
    const turnKey = `${startingRoom.id}:${startingRoom.view.gameNumber}:${startingRoom.view.turnIndex}`;
    const running = (async () => {
      setStrokeSaving(true);
      try {
        while (classicDraftDirty.current && previousTask.current === taskKey) {
          classicDraftDirty.current = false;
          inkYieldForDraft.current = true;
          try { await drainInk(); }
          finally { inkYieldForDraft.current = false; }
          if (previousTask.current !== taskKey) break;
          const currentRoom = latestRoom.current;
          const pastDrawDeadline = Boolean(currentRoom.view.drawDeadlineAt && Date.now() >= Date.parse(currentRoom.view.drawDeadlineAt));
          if (currentRoom.mode !== "CLASSIC" || currentRoom.view.phase !== "DRAW_GUESS" || currentRoom.viewerSeat !== currentRoom.view.turnIndex ||
              `${currentRoom.id}:${currentRoom.view.gameNumber}:${currentRoom.view.turnIndex}` !== turnKey || pastDrawDeadline) break;
          // The snapshot includes the latest local stroke, so an unsent older ink batch is redundant.
          pendingInk.current = null;
          const partial = currentStroke.current;
          const snapshot = partial ? [...strokesRef.current, partial] : strokesRef.current;
          const result = await sendRef.current({ type: "SAVE_CLASSIC_DRAFT", strokes: snapshot, inkSeq: lastInkSeq.current });
          if (!result) { classicDraftDirty.current = !currentRoom.view.drawDeadlineAt || Date.now() < Date.parse(currentRoom.view.drawDeadlineAt); break; }
        }
      } finally { setStrokeSaving(false); }
    })();
    const completed = running.finally(() => {
      classicDraftSaving.current = null;
      if (classicDraftDirty.current && previousTask.current !== taskKey) void flushClassicDraft();
    });
    classicDraftSaving.current = completed;
    return completed;
  }, [drainInk]);
  useEffect(() => {
    const id = window.setInterval(() => {
      const current = latestRoom.current;
      const partial = currentStroke.current;
      if (!partial || current.mode !== "CLASSIC" || current.view.phase !== "DRAW_GUESS" || current.viewerSeat !== current.view.turnIndex) return;
      void flushClassicDraft();
    }, 2_000);
    return () => window.clearInterval(id);
  }, [flushClassicDraft]);

  useEffect(() => {
    if (!draftFailed || room.mode !== "CLASSIC" || room.view.phase !== "DRAW_GUESS" || room.viewerSeat !== room.view.turnIndex) return;
    const id = window.setTimeout(() => {
      void flushClassicDraft();
    }, 3_000);
    return () => window.clearTimeout(id);
  }, [draftFailed, flushClassicDraft, room.mode, room.view.phase, room.view.turnIndex, room.viewerSeat]);

  useEffect(() => {
    if (room.view.phase !== "CHAIN_STEP" || room.view.task?.kind !== "DRAWING" || room.view.task.submitted || !strokes.length) return;
    const id = window.setTimeout(() => { void send({ type: "SAVE_DRAFT", strokes }); }, 5_000);
    return () => window.clearTimeout(id);
  }, [room.view.phase, room.view.chainStage, room.view.task?.kind, room.view.task?.submitted, strokes, send]);

  const timer = formatTimer(room.view.deadlineAt, now);
  const deadlinePassed = Boolean(room.view.deadlineAt && now >= Date.parse(room.view.deadlineAt));
  const currentArtist = room.seats.find((seat) => seat.number === room.view.turnIndex + 1);
  const viewerCatId = room.seats.find((seat) => seat.number === room.viewerSeat + 1)?.catId;
  const amArtist = room.viewerSeat === room.view.turnIndex;
  const guessed = Boolean(room.view.guesses?.[String(room.viewerSeat)]);
  const displayedGuessMood: DrawGuessCatMood = guessed ? "happy" : guessMood;
  const humanCapacity = room.playerCount - (room.practiceBotSeat === undefined ? 0 : 1);
  const humanCount = room.seats.filter((seat) => !seat.isSystem).length;
  const immersivePhase = ["WORD_SELECT", "DRAW_GUESS", "TURN_REVEAL", "CHAIN_WORD", "CHAIN_STEP"].includes(room.view.phase);
  const phaseKey = `${room.view.gameNumber}:${room.view.phase}:${room.view.turnIndex}:${room.view.chainStage}`;

  useEffect(() => {
    if (lastPhaseKey.current === phaseKey) return;
    const hadPreviousPhase = Boolean(lastPhaseKey.current);
    lastPhaseKey.current = phaseKey;
    setShowPlayers(false);
    setConfirmClear(false);
    setConfirmLeave(false);
    setPendingGuess(null);
    setGuessMood("idle");
    if (guessMoodTimer.current !== null) window.clearTimeout(guessMoodTimer.current);
    if (!hadPreviousPhase) return;
    setError("");
    setPhaseToast(true);
    const timeout = window.setTimeout(() => setPhaseToast(false), 1_500);
    return () => window.clearTimeout(timeout);
  }, [phaseKey]);

  useEffect(() => {
    if (!immersivePhase) return;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const viewport = window.visualViewport;
    const updateViewport = () => {
      const stage = playStageRef.current;
      if (!stage) return;
      stage.style.setProperty("--draw-guess-visual-height", `${viewport?.height ?? window.innerHeight}px`);
      stage.style.setProperty("--draw-guess-visual-top", `${viewport?.offsetTop ?? 0}px`);
    };
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [immersivePhase]);

  useEffect(() => {
    if (!showPlayers && !confirmClear && !confirmLeave) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setShowPlayers(false); setConfirmClear(false); setConfirmLeave(false); }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [showPlayers, confirmClear, confirmLeave]);

  async function copyInvite() {
    const url = new URL(withLocale(locale, `/game-tools/draw-guess/join/${room.code}`), window.location.origin).toString();
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2_000); }
    catch { setError(url); }
  }

  async function leaveRoom() {
    const response = await fetch(`/api/game-tools/draw-guess/rooms/${room.id}/leave`, { method: "POST" });
    if (!response.ok) throw new Error("LEAVE_FAILED");
    try {
      const active = JSON.parse(window.localStorage.getItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY) ?? "null") as { id?: string } | null;
      if (active?.id === room.id) {
        window.localStorage.removeItem(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY);
        window.dispatchEvent(new Event(ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT));
      }
    } catch { /* Private browsing may block local storage. */ }
    router.push(withLocale(locale, "/game-tools/draw-guess"));
  }

  async function returnToLobby() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/game-tools/draw-guess/rooms/${room.id}/return`, { method: "POST" });
      if (!response.ok) throw new Error("RETURN_FAILED");
      await refresh(true);
    } catch { setError(t.error); }
    finally { setBusy(false); }
  }

  function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    if (room.view.phase === "DRAW_GUESS") {
      if (busy || pendingGuess) return;
      const pending = { id: crypto.randomUUID(), text: value };
      setPendingGuess(pending);
      setInput("");
      void send({ type: "GUESS", value }).then((result) => {
        if (!result || typeof result.correct !== "boolean") return;
        setGuessMood(result.correct ? "happy" : "sad");
        if (guessMoodTimer.current !== null) window.clearTimeout(guessMoodTimer.current);
        guessMoodTimer.current = window.setTimeout(() => setGuessMood("idle"), result.correct ? 2_600 : 1_700);
      }).finally(() => setPendingGuess((current) => current?.id === pending.id ? null : current));
      return;
    }
    if (room.view.phase === "CHAIN_WORD") {
      if (Array.from(value).length < 2 || Array.from(value).length > 12) { setError(t.invalidWord); return; }
      void send({ type: "SUBMIT_STEP", value });
    } else if (room.view.phase === "CHAIN_STEP") void send({ type: "SUBMIT_STEP", value });
    setInput("");
  }

  function addStroke(stroke: DrawStroke) {
    if (strokesRef.current.length >= 120) return;
    currentStroke.current = null;
    const nextStrokes = [...strokesRef.current, stroke];
    strokesRef.current = nextStrokes;
    setStrokes(nextStrokes);
    if (room.mode === "CLASSIC") {
      classicEdited.current = true;
      if (inkTimer.current !== null) window.clearTimeout(inkTimer.current);
      inkTimer.current = null;
      pendingInk.current = { stroke, strokeIndex: nextStrokes.length - 1 };
      void flushClassicDraft();
    }
  }

  function updateStrokes(next: DrawStroke[]) {
    strokesRef.current = next;
    setStrokes(next);
  }

  function progressStroke(stroke: DrawStroke) {
    if (room.mode !== "CLASSIC" || strokesRef.current.length >= 120) return;
    currentStroke.current = stroke;
    classicEdited.current = true;
    pendingInk.current = { stroke, strokeIndex: strokesRef.current.length };
    if (inkTimer.current !== null) return;
    inkTimer.current = window.setTimeout(() => {
      inkTimer.current = null;
      void drainInk();
    }, 150);
  }

  function replaceClassicDrawing(next: DrawStroke[]) {
    classicEdited.current = true;
    pendingInk.current = null;
    if (inkTimer.current !== null) window.clearTimeout(inkTimer.current);
    inkTimer.current = null;
    updateStrokes(next);
    void flushClassicDraft();
  }

  const inputForm = (placeholder: string, action: string, disabled = false) => <form onSubmit={submitText} className="flex gap-2"><input aria-label={placeholder} autoComplete="off" enterKeyHint="send" maxLength={room.view.phase === "CHAIN_WORD" ? 12 : room.view.phase === "DRAW_GUESS" ? 20 : 40} value={input} onChange={(event) => setInput(event.target.value)} placeholder={placeholder} disabled={disabled} className="min-h-12 min-w-0 flex-1 rounded-full border border-[#D5E4F2] bg-[#FFFCF5] px-4 text-base outline-none focus:border-[#3F74AE] disabled:opacity-50" /><button type="submit" disabled={disabled || busy || !input.trim()} className="draw-guess-btn draw-guess-btn--candy min-h-12 shrink-0 whitespace-nowrap px-4 text-sm sm:px-5"><Send className="h-4 w-4" />{action}</button></form>;

  if (room.view.phase === "LOBBY") return <DrawGuessLobby locale={locale} room={room} onRefresh={() => refresh(true)} onLeave={leaveRoom} />;

  if (immersivePhase) {
    const isClassic = room.mode === "CLASSIC";
    const isClassicRound = isClassic && (room.view.phase === "DRAW_GUESS" || room.view.phase === "TURN_REVEAL");
    const chainTask = room.view.task;
    const isChainStep = !isClassic && room.view.phase === "CHAIN_STEP";
    const isChainDrawing = isChainStep && chainTask?.kind === "DRAWING" && !chainTask.submitted;
    const isChainGuessing = isChainStep && chainTask?.kind === "WORD" && !chainTask.submitted;
    const classicDrawingOpen = !room.view.drawDeadlineAt || now < Date.parse(room.view.drawDeadlineAt);
    const isClassicDrawing = isClassicRound && room.view.phase === "DRAW_GUESS" && amArtist && classicDrawingOpen;
    const classicArtistWaiting = isClassicRound && room.view.phase === "DRAW_GUESS" && amArtist && !classicDrawingOpen;
    const stageTitle = room.view.phase === "WORD_SELECT" ? (amArtist ? t.select : `${currentArtist?.name ?? ""} · ${t.select}`)
      : room.view.phase === "TURN_REVEAL" ? t.answer
      : isClassicRound ? (amArtist ? classicArtistWaiting ? t.drawTimeUp : t.draw : t.guessing)
      : room.view.phase === "CHAIN_WORD" ? room.wordBank ? bankCopy.choose : t.word
      : chainTask?.kind === "DRAWING" ? t.nextDraw : t.nextGuess;
    const stageProgress = isClassic ? `${room.view.turnIndex + 1} / ${room.playerCount}`
      : `${t.stage} ${Math.max(1, room.view.chainStage)}${room.view.chainSubmittedCount === undefined ? "" : ` · ${room.view.chainSubmittedCount}/${room.playerCount} ${bankCopy.progress}`}`;
    const stageDeadlineAt = isClassicDrawing && room.view.drawDeadlineAt ? room.view.drawDeadlineAt : room.view.deadlineAt;
    const stageTimer = formatTimer(stageDeadlineAt ?? null, now);
    const secondsLeft = stageDeadlineAt ? Math.max(0, Math.ceil((Date.parse(stageDeadlineAt) - now) / 1_000)) : null;
    const showAnswerCelebration = isClassicRound && Boolean(room.view.answer) && (guessed || room.view.phase === "TURN_REVEAL");
    const earnedPoints = room.view.guesses?.[String(room.viewerSeat)]?.points ?? scoreGains[room.viewerSeat]?.points;
    const showControls = !isClassicRound && (isChainDrawing || isChainGuessing || room.view.phase === "CHAIN_WORD" && !chainTask?.submitted && !chainTask?.options?.length || syncStatus === "RECONNECTING" || refreshFailed || deadlinePassed || Boolean(error));
    const classicStatus = draftFailed ? statusCopy.draftFailed : syncStatus === "RECONNECTING" || refreshFailed ? statusCopy.syncing : deadlinePassed ? statusCopy.expired : isClassicDrawing && (strokeSaving || !ink.connected) ? statusCopy.inkSyncing : classicArtistWaiting ? t.drawTimeUp : undefined;
    const clearDrawing = () => {
      setConfirmClear(false);
      if (isClassicDrawing) replaceClassicDrawing([]);
      else updateStrokes([]);
    };

    return <div ref={playStageRef} className="draw-guess-theme draw-guess-game-shell draw-guess-play-stage fixed inset-x-0 top-0 z-[80] flex h-dvh flex-col overflow-hidden" style={{ top: "var(--draw-guess-visual-top, 0px)", height: "var(--draw-guess-visual-height, 100dvh)" }}>
      <span aria-hidden="true" className="pointer-events-none absolute -left-16 top-16 h-48 w-48 rounded-full bg-[#BED6EC]/20 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-10 h-56 w-56 rounded-full bg-[#DADAF0]/20 blur-3xl" />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl shrink-0 items-center gap-2 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:gap-3 sm:px-5 sm:pt-4">
        <button aria-label={locale === "zh-CN" ? "退出游戏，进入托管" : "Leave game"} type="button" onClick={() => setConfirmLeave(true)} className="draw-guess-btn draw-guess-btn--milk grid h-10 min-h-10 w-10 shrink-0 place-items-center"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-[#3E70AA]">{isClassic ? t.modeClassic : t.modeChain} <span aria-hidden="true">·</span> {stageProgress}</p><h1 className="line-clamp-2 text-lg font-bold leading-tight sm:truncate sm:text-2xl">{stageTitle}</h1></div>
        {stageTimer ? <span className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-2.5 font-mono text-sm font-black tabular-nums shadow-[0_3px_0_#DFE8F0] sm:px-3 sm:text-base ${secondsLeft !== null && secondsLeft <= 10 ? "bg-[#DFECF8] text-[#506E9E] motion-safe:animate-pulse" : "bg-white text-[#3E6FA8]"}`}><Clock3 className="h-4 w-4" />{stageTimer}</span> : null}
        <button aria-label={`${t.players} ${humanCount}/${humanCapacity}`} aria-haspopup="dialog" aria-expanded={showPlayers} type="button" onClick={() => setShowPlayers(true)} className="draw-guess-btn draw-guess-btn--milk h-10 min-h-10 shrink-0 gap-1 px-2.5 text-xs"><UsersRound className="h-4 w-4" /><span>{humanCount}/{humanCapacity}</span></button>
      </header>

      {isClassic ? <div role="region" aria-label={t.liveScore} className="relative z-10 mx-auto flex w-full max-w-5xl shrink-0 items-center gap-2 px-3 pb-2 sm:px-5">
        <Trophy aria-hidden="true" className="h-4 w-4 shrink-0 text-[#D8A14B]" />
        <ol tabIndex={0} className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-1 outline-none focus-visible:ring-2 focus-visible:ring-[#3F74AE] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {getDrawGuessRankings(room.view.scores).map(({ seat, score, rank }) => <li key={seat} className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-[0_2px_0_#DEE8F1] sm:text-xs ${seat === room.viewerSeat ? "bg-[#FFF0C9] text-[#765A35]" : "bg-white text-[#405875]"}`}>
            <span className="text-[10px] opacity-70">#{rank}</span>
            <DrawGuessCatSprite catId={room.seats.find((item) => item.number === seat + 1)?.catId} size={22} />
            <span className="max-w-16 truncate sm:max-w-24">{room.seats.find((item) => item.number === seat + 1)?.name ?? `#${seat + 1}`}</span>
            <strong key={`${room.view.gameNumber}-${seat}-${score}`} className="draw-guess-score-pop text-xs tabular-nums sm:text-sm">{score}</strong>
            {scoreGains[seat] ? <span key={scoreGains[seat].id} aria-hidden="true" className="draw-guess-score-gain pointer-events-none absolute -right-1 -top-3 rounded-full bg-[#FFE4A4] px-1.5 py-0.5 text-[10px] font-black text-[#765A35] shadow-sm">+{scoreGains[seat].points}</span> : null}
          </li>)}
        </ol>
      </div> : null}

      <main className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:gap-3 sm:px-5 sm:pb-4">
        <section key={phaseKey} aria-label={stageTitle} className="draw-guess-stage-card relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.6rem] bg-[#FFFCF5] p-2 shadow-[0_16px_45px_rgba(48,66,92,0.1)] sm:rounded-[2rem] sm:p-4">
          {((isClassicRound && room.view.answer && !showAnswerCelebration) || isChainDrawing && chainTask?.previous?.kind === "WORD") ? <div className="mb-2 flex shrink-0 items-center gap-2 rounded-2xl bg-[#E8F2FB] px-3 py-2 sm:px-4"><Sparkles className="h-4 w-4 shrink-0 text-[#3C70A9]" /><span className="text-xs font-semibold text-[#405875]">{isClassicRound ? t.answer : t.previousWord}</span><strong className="min-w-0 truncate text-base text-[#30425C] sm:text-lg">{isClassicRound ? room.view.answer : chainTask?.previous?.kind === "WORD" ? chainTask.previous.value : ""}</strong></div> : null}

          {isClassicDrawing ? <DrawGuessCanvas catId={viewerCatId} compact fullscreenPrompt={room.view.answer ?? undefined} fullscreenTimer={stageTimer} locale={locale} strokes={strokes} onProgress={progressStroke} onStroke={addStroke} onUndo={() => replaceClassicDrawing(strokesRef.current.slice(0, -1))} onClear={() => setConfirmClear(true)} /> : null}
          {isClassicRound && !isClassicDrawing ? <DrawGuessCanvas catId={currentArtist?.catId} compact disabled strokes={amArtist ? strokes : room.view.phase === "DRAW_GUESS" ? ink.drawing : room.view.drawing ?? []} /> : null}
          {isChainDrawing ? <DrawGuessCanvas catId={viewerCatId} compact fullscreenPrompt={chainTask?.previous?.kind === "WORD" ? chainTask.previous.value : undefined} fullscreenTimer={stageTimer} locale={locale} strokes={strokes} onStroke={addStroke} onUndo={() => updateStrokes(strokesRef.current.slice(0, -1))} onClear={() => setConfirmClear(true)} onSubmit={() => void send({ type: "SUBMIT_STEP", strokes })} submitDisabled={busy} /> : null}
          {isChainGuessing && chainTask?.previous?.kind === "DRAWING" ? <DrawGuessCanvas catId={viewerCatId} compact disabled strokes={chainTask.previous.value} /> : null}

          {room.view.phase === "WORD_SELECT" ? <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 text-center"><div className="draw-guess-logo-in"><DrawGuessCatSprite animated catId={currentArtist?.catId} mood="happy" size={96} /></div>{!amArtist ? <p className="text-sm text-[#63758D]">{t.wait}</p> : null}{amArtist ? <div className="flex flex-wrap justify-center gap-2">{room.view.options?.map((word) => <ActionButton key={word} disabled={busy} onClick={() => void send({ type: "CHOOSE_WORD", value: word })}>{word}</ActionButton>)}</div> : null}</div> : null}
          {room.view.phase === "CHAIN_WORD" ? <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 text-center"><div className="draw-guess-logo-in"><DrawGuessCatSprite animated catId={viewerCatId} mood="happy" size={96} /></div>{room.wordBank ? <p className="text-sm font-semibold text-[#63758D]">{room.wordBank.title}</p> : null}{chainTask?.submitted ? <p className="draw-guess-check-pop flex items-center gap-2 text-sm font-black text-[#3E6FA8]"><Check className="h-5 w-5" />{t.submitted}</p> : chainTask?.options?.length ? <div className="flex flex-wrap justify-center gap-2">{chainTask.options.map((word) => <ActionButton key={word} disabled={busy} onClick={() => void send({ type: "SUBMIT_STEP", value: word })}>{word}</ActionButton>)}</div> : null}</div> : null}
          {isChainStep && chainTask?.submitted ? <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center"><span className="grid h-16 w-16 place-items-center rounded-full bg-[#ECF4FB] text-[#3E6FA8]"><Check className="h-8 w-8" /></span><p className="text-lg font-bold">{t.submitted}</p><p className="text-sm text-[#63758D]">{t.wait}</p></div> : null}
          {isChainStep && !chainTask ? <div role="status" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center text-[#63758D]"><LoaderCircle className="h-7 w-7 animate-spin" /><p className="text-sm font-semibold">{t.wait}</p></div> : null}
          {isChainGuessing && chainTask?.previous?.system && room.practiceBotSeat !== undefined ? <p className="shrink-0 px-2 pt-2 text-xs font-semibold text-[#506E9E]">{practiceCopy.botClue}</p> : null}
          {showAnswerCelebration ? <div role="status" aria-live="polite" className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-[inherit] bg-[#FFFCF5]/90 px-4 text-center backdrop-blur-[2px]">
            <span aria-hidden="true" className="absolute left-[12%] top-[27%] text-xl text-[#BED6EC] draw-guess-answer-spark">✦</span>
            <span aria-hidden="true" className="absolute right-[14%] top-[20%] text-2xl text-[#BED6EA] draw-guess-answer-spark [animation-delay:130ms]">✳</span>
            <span aria-hidden="true" className="absolute bottom-[25%] left-[18%] text-lg text-[#D8DEF2] draw-guess-answer-spark [animation-delay:230ms]">●</span>
            <span aria-hidden="true" className="absolute bottom-[20%] right-[15%] text-xl text-[#AFCFEC] draw-guess-answer-spark [animation-delay:330ms]">✦</span>
            <div className="relative flex max-w-full flex-col items-center gap-3">
              <span className="draw-guess-answer-icon"><DrawGuessCatSprite animated catId={viewerCatId} mood="happy" size={78} /></span>
              <p className="draw-guess-answer-label text-xl font-black text-[#3E70AA] sm:text-2xl">{guessed ? t.guessed : t.answer}</p>
              <strong className="draw-guess-answer-word max-w-full break-words rounded-[1.4rem] bg-white px-5 py-3 text-4xl font-black leading-tight text-[#30425C] shadow-[0_5px_0_#DFE8F0] sm:text-6xl">{room.view.answer}</strong>
              {earnedPoints ? <span className="draw-guess-points-pop rounded-full bg-[#FFE4A4] px-4 py-1.5 text-lg font-black text-[#765A35] shadow-[0_4px_0_#E4BF76]">+{earnedPoints} {t.score}</span> : null}
              {room.view.phase === "TURN_REVEAL" ? <p className="text-sm font-bold text-[#65748A]">{t.next}</p> : null}
            </div>
          </div> : null}
        </section>

        {isClassicRound ? <DrawGuessClassicChat busy={busy} error={error} guessed={guessed} input={input} locale={locale} mood={displayedGuessMood} onInputChange={setInput} onSubmit={submitText} pending={pendingGuess} room={room} status={classicStatus} /> : null}

        {showControls ? <div key={`${phaseKey}-controls`} className="draw-guess-stage-card shrink-0 rounded-[1.35rem] bg-white/95 p-2.5 shadow-[0_8px_24px_rgba(48,66,92,0.08)] sm:p-3">
          {isChainDrawing ? <div className="flex items-center justify-between gap-3"><p role="status" className={`text-xs font-semibold ${draftFailed ? "text-[#506E9E]" : "text-[#65748A]"}`}>{draftFailed ? statusCopy.draftFailed : t.draft}</p><ActionButton disabled={busy || !strokes.length} onClick={() => void send({ type: "SUBMIT_STEP", strokes })}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{t.submit}</ActionButton></div> : null}
          {isChainGuessing ? inputForm(t.nextGuess, t.submit) : null}
          {room.view.phase === "CHAIN_WORD" && !chainTask?.submitted && !chainTask?.options?.length ? inputForm(t.word, t.submit) : null}
          {syncStatus === "RECONNECTING" || refreshFailed ? <p role="status" className="mt-2 text-xs font-semibold text-[#506E9E]">{statusCopy.syncing}</p> : null}
          {deadlinePassed ? <p role="status" className="mt-2 text-xs font-semibold text-[#506E9E]">{statusCopy.expired}</p> : null}
          {error ? <p role="alert" className="mt-2 flex items-center gap-2 rounded-2xl bg-[#FFF0C9] px-3 py-2 text-xs font-semibold text-[#765A35]"><Sparkles aria-hidden="true" className="h-4 w-4 shrink-0" />{error}</p> : null}
        </div> : null}
      </main>

      {phaseToast && room.view.phase !== "TURN_REVEAL" ? <div key={phaseKey} role="status" className="draw-guess-phase-toast pointer-events-none absolute left-1/2 top-[20%] z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[#FFE4A4] px-5 py-3 text-sm font-black text-[#765A35] shadow-[0_6px_0_#E2C080,0_16px_40px_rgba(87,61,34,0.2)]"><Sparkles className="h-4 w-4 text-[#3C70A9]" />{stageTitle}</div> : null}

      {showPlayers ? <div className="absolute inset-0 z-30 flex items-end justify-center bg-[#30425C]/45 p-3 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPlayers(false); }}><div role="dialog" aria-modal="true" aria-label={t.players} className="draw-guess-dialog w-full max-w-md rounded-[1.8rem] bg-[#FFFCF5] p-5 shadow-[0_28px_70px_rgba(48,66,92,0.28)]"><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#3E70AA]">{t.room} · {room.code}</p><h2 className="text-xl font-bold">{t.players} <span className="text-sm text-[#65748A]">{humanCount}/{humanCapacity}</span></h2></div><button aria-label={locale === "zh-CN" ? "关闭" : "Close"} autoFocus type="button" onClick={() => setShowPlayers(false)} className="grid h-9 w-9 place-items-center rounded-full bg-[#ECF4FB]"><X className="h-4 w-4" /></button></div><ol className="mt-4 max-h-[45dvh] space-y-2 overflow-y-auto">{Array.from({ length: room.playerCount }, (_, index) => { const seat = room.seats.find((item) => item.number === index + 1); return <li key={index} className={`flex items-center gap-3 rounded-xl p-2.5 ${index === room.viewerSeat ? "bg-[#ECF4FB]" : "bg-[#F1F6FC]"}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-bold text-[#3E6FA8]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{seat?.name ?? "—"}{seat?.isSystem ? ` · ${t.system}` : ""}{seat?.managed ? ` · ${locale === "zh-CN" ? "托管" : locale === "fr" ? "Absent" : "Away"}` : ""}{index === room.viewerSeat ? ` · ${t.you}` : ""}</span>{seat?.isHost ? <Crown className="h-4 w-4 text-[#E1A451]" /> : null}{!seat?.isSystem ? <span className="text-xs font-bold tabular-nums">{room.view.scores[index]}</span> : null}</li>; })}</ol><button type="button" onClick={() => void copyInvite()} className="mt-4 draw-guess-btn draw-guess-btn--blush min-h-11 w-full px-4 text-sm"><Copy className="h-4 w-4" />{copied ? t.copied : t.copy}</button></div></div> : null}
      {confirmLeave ? <div className="absolute inset-0 z-40 grid place-items-center bg-[#30425C]/55 p-4"><div role="dialog" aria-modal="true" aria-label={locale === "zh-CN" ? "退出游戏" : "Leave game"} className="draw-guess-dialog w-full max-w-sm rounded-[1.8rem] bg-[#FFFCF5] p-6 text-center shadow-[0_28px_70px_rgba(48,66,92,0.28)]"><DrawGuessCatSprite animated catId={viewerCatId} mood="sad" size={82} /><h2 className="mt-2 text-xl font-black">{locale === "zh-CN" ? "先离开一下？" : locale === "fr" ? "Quitter la partie ?" : "Leave the game?"}</h2><p className="mt-2 text-sm font-semibold text-[#63758D]">{locale === "zh-CN" ? "离开后由系统托管，输入房间号可以重连。" : locale === "fr" ? "Votre place sera gardée. Revenez avec le code de salle." : "Your seat stays saved. Rejoin with the room code."}</p><div className="mt-5 flex gap-2"><button autoFocus type="button" onClick={() => setConfirmLeave(false)} className="draw-guess-btn draw-guess-btn--milk min-h-11 flex-1 px-3 text-sm">{locale === "zh-CN" ? "继续玩" : locale === "fr" ? "Continuer" : "Keep playing"}</button><button type="button" onClick={() => { void leaveRoom().catch(() => { setConfirmLeave(false); setError(t.error); }); }} className="draw-guess-btn draw-guess-btn--candy min-h-11 flex-1 px-3 text-sm">{locale === "zh-CN" ? "退出房间" : locale === "fr" ? "Quitter" : "Leave"}</button></div></div></div> : null}
      {confirmClear ? <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#30425C]/45 p-4"><div role="dialog" aria-modal="true" aria-label={locale === "zh-CN" ? "清空画布" : "Clear drawing"} className="draw-guess-dialog w-full max-w-sm rounded-[1.8rem] bg-[#FFFCF5] p-6 text-center shadow-[0_28px_70px_rgba(48,66,92,0.28)]"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#DBEBF9] text-[#558BC3]"><Trash2 className="h-6 w-6" /></span><h2 className="mt-4 text-xl font-bold">{locale === "zh-CN" ? "要清空这张画吗？" : locale === "fr" ? "Effacer ce dessin ?" : "Clear this drawing?"}</h2><p className="mt-2 text-sm text-[#63758D]">{locale === "zh-CN" ? "这一张画的所有笔画都会被清除。" : locale === "fr" ? "Tous les traits de ce dessin seront effacés." : "Every stroke on this drawing will be removed."}</p><div className="mt-5 flex gap-2"><button autoFocus type="button" onClick={() => setConfirmClear(false)} className="draw-guess-btn draw-guess-btn--milk min-h-11 flex-1 px-3 text-sm">{locale === "zh-CN" ? "继续画" : locale === "fr" ? "Continuer" : "Keep drawing"}</button><button type="button" onClick={clearDrawing} className="draw-guess-btn draw-guess-btn--candy min-h-11 flex-1 px-3 text-sm">{locale === "zh-CN" ? "清空画布" : locale === "fr" ? "Effacer" : "Clear"}</button></div></div></div> : null}
    </div>;
  }

  const compactSummary = true;
  return <div className="draw-guess-theme min-h-[80vh] pb-24">
    <button type="button" onClick={() => { void leaveRoom().catch(() => setError(t.error)); }} className="inline-flex items-center gap-2 text-sm font-semibold text-[#3E6FA8] hover:underline"><ArrowLeft className="h-4 w-4" />{t.back}</button>
    <header className={`relative overflow-hidden bg-[#F1F6FC] shadow-[0_18px_55px_rgba(48,66,92,0.09)] ${compactSummary ? "mt-3 rounded-2xl p-4 sm:p-5" : "mt-5 rounded-[2rem] p-6 sm:p-8"}`}>
      <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-[#BED6EC]/50 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#3E70AA]">Friemi · {room.mode === "CLASSIC" ? t.modeClassic : t.modeChain} · #{room.view.gameNumber}</p><h1 className={`font-bold ${compactSummary ? "mt-1 text-xl sm:text-2xl" : "mt-3 text-3xl sm:text-4xl"}`}>{t.title}</h1>{!compactSummary ? <p className="mt-2 text-sm text-[#63758D]">{room.mode === "CLASSIC" ? t.classicHint : t.chainHint}</p> : null}</div>
        {compactSummary ? <div className="flex shrink-0 flex-col items-end gap-2"><button type="button" aria-label={copied ? t.copied : t.copy} onClick={() => void copyInvite()} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-white/80 px-2.5 text-sm font-bold tracking-widest shadow-sm"><Copy className="h-3.5 w-3.5 text-[#3E6FA8]" />{room.code}</button>{timer ? <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-mono text-sm font-bold tabular-nums"><Clock3 className="h-3.5 w-3.5 text-[#3C70A9]" />{timer}</span> : null}</div>
          : <div className="rounded-2xl bg-white/80 px-5 py-3 text-center shadow-sm"><span className="block text-[11px] font-bold uppercase tracking-widest text-[#65748A]">{t.room}</span><strong className="text-2xl tracking-[0.18em]">{room.code}</strong></div>}
      </div>
      {compactSummary ? room.view.gameNumber > 1 || room.view.phase === "FINISHED" ? <Link className="relative mt-2 inline-block text-xs font-bold text-[#3E6FA8] underline" href={withLocale(locale, `/game-tools/draw-guess/rooms/${room.id}/history`)}>{t.history}</Link> : null
        : <div className="relative mt-5 flex flex-wrap items-center gap-3"><ActionButton tone="strong" onClick={copyInvite}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? t.copied : t.copy}</ActionButton><span className="text-sm text-[#63758D]">{t.invitation}</span>{room.view.gameNumber > 1 ? <Link className="text-sm font-bold text-[#3E6FA8] underline" href={withLocale(locale, `/game-tools/draw-guess/rooms/${room.id}/history`)}>{t.history}</Link> : null}{timer ? <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-mono text-lg font-bold tabular-nums"><Clock3 className="h-4 w-4 text-[#3C70A9]" />{timer}</span> : null}</div>}
    </header>

    {room.practiceBotSeat !== undefined && room.view.phase !== "FINISHED" ? <p className={`rounded-xl border border-[#D5E4F2] bg-[#F7FAFE] font-semibold text-[#60758C] ${compactSummary ? "mt-3 px-3 py-2 text-xs leading-5" : "mt-4 px-4 py-3 text-sm leading-6"}`}>{practiceCopy.note}</p> : null}

    {syncStatus === "RECONNECTING" || refreshFailed ? <p role="status" className="mt-4 rounded-xl bg-[#F7FAFE] px-4 py-3 text-sm font-semibold text-[#60758C]">{statusCopy.syncing}</p> : null}
    {deadlinePassed ? <p role="status" className="mt-3 rounded-xl bg-[#ECF4FB] px-4 py-3 text-sm font-semibold text-[#3E6FA8]">{statusCopy.expired}</p> : null}

    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
      <section className="min-w-0 space-y-5">
        {room.view.phase === "FINISHED" ? <DrawGuessPodium busy={busy} finishLabel={t.finish} locale={locale} onReturn={() => void returnToLobby()} returnLabel={locale === "zh-CN" ? "返回房间" : locale === "fr" ? "Retour à la salle" : "Back to room"} room={room} scoreLabel={t.score} /> : null}

        {room.mode === "CHAIN" && (room.view.phase === "REVEAL_VOTE" || room.view.phase === "AUTHOR_PICK") ? <DrawGuessChainReview busy={busy} locale={locale} room={room} onVote={(owner, value) => send({ type: "VOTE", owner, value })} onPick={(owner, step) => send({ type: "PICK", owner, step })} /> : null}

        {room.mode === "CHAIN" && room.view.phase === "FINISHED" ? <div className="space-y-5">{room.view.chains?.map((chain, owner) => <article key={owner} className="rounded-[1.6rem] border border-[#DCE8F2] bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{room.seats[owner]?.name ?? `#${owner + 1}`} · {t.chain}</h2>{room.view.matchResults ? <span className={`rounded-full px-3 py-1 text-xs font-bold ${room.view.matchResults[String(owner)] ? "bg-[#ECF4FB] text-[#3E6FA8]" : "bg-[#E8F2FB] text-[#506E9E]"}`}>{room.view.matchResults[String(owner)] ? t.match : t.mismatch}</span> : null}</div><div className="mt-4 space-y-3">{chain.map((step, index) => <div key={index} className="rounded-2xl bg-[#F7FAFE] p-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#65748A]"><span className="rounded-full bg-white px-2 py-1">{index + 1}</span>{room.seats[step.seat]?.name}{step.system ? ` · ${t.system}` : ""}{room.view.picks?.[String(owner)] === index ? <span className="ml-auto text-[#3C70A9]">★ {t.picked}</span> : null}</div>{step.kind === "WORD" ? <p className="py-2 text-center text-xl font-bold">{step.value}</p> : <div className="aspect-[10/7] max-w-xl overflow-hidden rounded-xl border border-[#DCE8F2]"><DrawGuessArtwork strokes={step.value} /></div>}{room.view.phase === "AUTHOR_PICK" && owner === room.viewerSeat && step.kind === "DRAWING" && !step.system ? <button type="button" disabled={busy || room.view.picks?.[String(owner)] !== undefined} onClick={() => void send({ type: "PICK", owner, step: index })} className="mt-2 rounded-lg bg-[#BED6EC] px-3 py-2 text-xs font-bold text-[#30425C] disabled:opacity-50">★ {t.pick}</button> : null}{!step.system ? <DrawGuessReportButton kind={step.kind} locale={locale} ownerSeat={owner} roomId={room.id} roundNumber={room.view.gameNumber} stage={index} /> : null}</div>)}</div>
          {room.view.phase === "REVEAL_VOTE" ? <div className="mt-4 border-t border-[#DCE8F2] pt-4"><p className="mb-3 text-sm font-bold">{t.vote}</p><div className="flex flex-wrap gap-2"><ActionButton disabled={busy} onClick={() => void send({ type: "VOTE", owner, value: true })}>{t.yes}</ActionButton><ActionButton tone="strong" disabled={busy} onClick={() => void send({ type: "VOTE", owner, value: false })}>{t.no}</ActionButton>{room.view.votedOwners?.includes(owner) ? <span className="self-center text-xs text-[#3E6FA8]">✓ {t.saved}</span> : null}</div></div> : null}
          {room.view.voteCounts?.[owner] ? <p className="mt-4 text-xs text-[#63758D]">{t.result}: {t.yes} {room.view.voteCounts[owner].yes} · {t.no} {room.view.voteCounts[owner].no} · — {room.view.voteCounts[owner].abstain}</p> : null}
          {room.view.phase === "AUTHOR_PICK" && owner === room.viewerSeat && !chain.some((step) => step.kind === "DRAWING" && !step.system) ? <p className="mt-4 text-sm text-[#63758D]">{t.noArtwork}</p> : null}
        </article>)}</div> : null}

        {error ? <p role="alert" className="flex items-center gap-2 rounded-2xl bg-[#FFF0C9] px-4 py-3 text-sm font-semibold text-[#765A35]"><Sparkles aria-hidden="true" className="h-4 w-4 shrink-0" />{error}</p> : null}
      </section>

      <aside className="h-fit rounded-[1.6rem] border border-[#DCE8F2] bg-white p-5"><h2 className="flex items-center gap-2 font-bold"><UsersRound className="h-5 w-5 text-[#3E6FA8]" />{t.players} <span className="ml-auto text-xs text-[#65748A]">{humanCount}/{humanCapacity}</span></h2><ol className="mt-4 space-y-2">{Array.from({ length: room.playerCount }, (_, index) => { const seat = room.seats.find((item) => item.number === index + 1); return <li key={index} className={`flex items-center gap-3 rounded-xl p-2.5 ${index === room.viewerSeat ? "bg-[#ECF4FB]" : "bg-[#FAFCFE]"}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-bold text-[#3E6FA8]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{seat?.name ?? "—"}{seat?.isSystem ? ` · ${t.system}` : ""}{seat?.managed ? ` · ${locale === "zh-CN" ? "托管" : locale === "fr" ? "Absent" : "Away"}` : ""}{index === room.viewerSeat ? ` · ${t.you}` : ""}</span>{seat?.isHost ? <Crown className="h-4 w-4 text-[#E1A451]" /> : null}{!seat?.isSystem ? <span className="text-xs font-bold tabular-nums text-[#63758D]">{room.view.scores[index]}</span> : null}</li>; })}</ol></aside>
    </div>
  </div>;
}
