"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Check, Clock3, Copy, Crown, LoaderCircle, Send, Sparkles, Trash2, UsersRound, X } from "lucide-react";
import { DrawGuessArtwork, DrawGuessCanvas } from "@/features/game-tools/components/DrawGuessCanvas";
import { DrawGuessChainReview } from "@/features/game-tools/components/DrawGuessChainReview";
import { DrawGuessReportButton } from "@/features/game-tools/components/DrawGuessReportButton";
import { useDrawGuessInk } from "@/features/game-tools/hooks/useDrawGuessInk";
import { getDrawGuessRankings, type ChainStep, type DrawGuessAction, type DrawGuessMode, type DrawGuessPhase, type DrawGuessTiming, type DrawGuessWordBankSnapshot, type DrawStroke } from "@/features/game-tools/drawGuessEngine";
import { DRAW_GUESS_ROOM_EVENT, getDrawGuessRealtimeBrowserConfig, getDrawGuessRoomTopic } from "@/features/game-tools/drawGuessRealtime";
import { ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT, ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY } from "@/features/game-tools/activeGameToolRoomStorage";
import { withLocale } from "@/lib/routes";

export type DrawGuessRoomView = {
  code: string;
  id: string;
  isHost: boolean;
  mode: DrawGuessMode;
  playerCount: number;
  practiceBotSeat?: number;
  revision: number;
  seats: { name: string; number: number; isHost: boolean; isSystem?: boolean }[];
  status: string;
  viewerSeat: number;
  wordBank?: DrawGuessWordBankSnapshot | null;
  view: {
    answer?: string | null;
    chainStage: number;
    chainSubmittedCount?: number;
    chains?: ChainStep[][];
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
    task?: { kind: "WORD" | "DRAWING"; owner?: number; previous?: ChainStep | null; submitted: boolean; draft?: DrawStroke[]; options?: string[] } | null;
    timing?: DrawGuessTiming;
    turnIndex: number;
    voteCounts?: { yes: number; no: number; abstain: number }[] | null;
    votedOwners?: number[];
  };
};

const TRANSLATIONS = {
  "zh-CN": { title: "你画我猜", back: "桌游工具", room: "房间", copy: "复制邀请链接", copied: "已复制", players: "玩家", waiting: "等待玩家入座", start: "开始游戏", ready: "人齐了，可以开局", host: "房主", you: "你", seat: "号位", minute: "秒", modeClassic: "抢猜模式", modeChain: "画画接龙", select: "选一个词来画", choose: "选择", draw: "轮到你画", drawTimeUp: "作画结束，继续等大家猜", guessing: "猜猜这是什么", submitGuess: "提交猜词", answer: "答案", guessed: "已猜中", wrong: "还没猜对，继续试试", tooFast: "猜得太快了，请稍等一秒", wait: "等待其他玩家提交", word: "给你的接龙写一个起始词", nextDraw: "根据上一个词作画", nextGuess: "根据这幅画猜词", previousWord: "上一棒的词", submit: "提交这一棒", drawing: "作画中", stage: "第", vote: "首尾吻合吗？", yes: "吻合", no: "不吻合", result: "投票结果", pick: "选择你这条链最棒的画", picked: "已选", finish: "本局排行榜", rematch: "再来一局", history: "查看往期作品", chain: "传递故事", system: "系统补位", match: "吻合", mismatch: "不吻合", error: "操作没有完成，请刷新重试。", saved: "已保存", invalidWord: "请写 2–12 个字。", noArtwork: "这条链没有可评选的作品", invitation: "分享房间号或链接给朋友", loading: "加载房间中", next: "下一轮即将开始", submitted: "已提交", score: "分", draft: "画稿会自动保存", classicHint: "画者选词后，其他人边看边猜。", chainHint: "每人从一个词开始，画与猜轮流传递。" },
  en: { title: "Draw & Guess", back: "Table tools", room: "Room", copy: "Copy invite link", copied: "Copied", players: "Players", waiting: "Waiting for players", start: "Start game", ready: "Everyone is here", host: "Host", you: "You", seat: "seat", minute: "s", modeClassic: "Speed guessing", modeChain: "Picture chain", select: "Choose a word to draw", choose: "Choose", draw: "Your turn to draw", drawTimeUp: "Drawing is done; guesses are still open", guessing: "What is this?", submitGuess: "Send guess", answer: "Answer", guessed: "Solved", wrong: "Not quite. Try again", tooFast: "Please wait a second before guessing again", wait: "Waiting for the others", word: "Write a starting word", nextDraw: "Draw the previous word", nextGuess: "Guess from this picture", previousWord: "Previous word", submit: "Pass it on", drawing: "Drawing", stage: "Stage", vote: "Does the ending match?", yes: "Matches", no: "Different", result: "Vote results", pick: "Pick your favorite drawing", picked: "Selected", finish: "Leaderboard", rematch: "Play again", history: "Past games", chain: "The story", system: "Auto-filled", match: "Matched", mismatch: "Changed", error: "That action did not complete. Please try again.", saved: "Saved", invalidWord: "Enter 2–12 characters.", noArtwork: "No eligible artwork", invitation: "Share the room code or link", loading: "Loading room", next: "Next turn soon", submitted: "Submitted", score: "pts", draft: "Draft saves automatically", classicHint: "Choose a word, draw, and let everyone guess.", chainHint: "Everyone starts a word and passes drawings and guesses." },
  fr: { title: "Dessine et devine", back: "Jeux de table", room: "Salle", copy: "Copier le lien", copied: "Copié", players: "Joueurs", waiting: "En attente des joueurs", start: "Commencer", ready: "Tout le monde est là", host: "Hôte", you: "Vous", seat: "place", minute: "s", modeClassic: "Deviner vite", modeChain: "Chaîne de dessins", select: "Choisissez un mot", choose: "Choisir", draw: "À vous de dessiner", drawTimeUp: "Dessin terminé ; les réponses restent ouvertes", guessing: "Qu'est-ce que c'est ?", submitGuess: "Envoyer", answer: "Réponse", guessed: "Trouvé", wrong: "Pas encore. Réessayez", tooFast: "Attendez une seconde avant de réessayer", wait: "En attente des autres", word: "Écrivez un mot de départ", nextDraw: "Dessinez le mot reçu", nextGuess: "Devinez ce dessin", previousWord: "Mot précédent", submit: "Transmettre", drawing: "Dessin", stage: "Étape", vote: "La fin correspond-elle ?", yes: "Oui", no: "Non", result: "Votes", pick: "Choisissez le meilleur dessin", picked: "Choisi", finish: "Classement", rematch: "Rejouer", history: "Parties précédentes", chain: "L'histoire", system: "Automatique", match: "Correspond", mismatch: "Différent", error: "Action non terminée. Réessayez.", saved: "Enregistré", invalidWord: "Saisissez 2 à 12 caractères.", noArtwork: "Aucun dessin éligible", invitation: "Partagez le code ou le lien", loading: "Chargement", next: "Prochain tour", submitted: "Envoyé", score: "pts", draft: "Brouillon enregistré automatiquement", classicHint: "Choisissez un mot, dessinez et faites deviner les autres.", chainHint: "Chacun part d'un mot et transmet dessins et réponses." },
};

const STATUS_COPY = {
  "zh-CN": { syncing: "正在重连；房间进度仍会定期刷新", polling: "房间进度定期刷新", inkSyncing: "画笔正在重连；已完成笔画仍会同步", inkLive: "实时画笔已连接", expired: "时间已到，正在更新下一阶段", draftFailed: "草稿保存失败，请检查网络后重试", signIn: "登录已失效，请重新登录后返回房间", missing: "人数还没到齐，暂时无法开局", closed: "新对局暂时暂停", phase: "这一阶段已结束，房间正在更新", invalid: "请输入可见文字，勿包含链接或个人信息", rate: "提交太频繁，请稍后再试" },
  en: { syncing: "Reconnecting; room progress still refreshes", polling: "Room progress refreshes regularly", inkSyncing: "Ink is reconnecting; completed strokes still sync", inkLive: "Live ink connected", expired: "Time is up; moving to the next stage", draftFailed: "Draft was not saved. Check your connection and try again.", signIn: "Your sign-in expired. Sign in again and return to the room.", missing: "Wait for everyone before starting", closed: "New games are temporarily paused", phase: "This stage ended; refreshing the room", invalid: "Use visible words without links or personal details", rate: "Too many submissions. Try again shortly." },
  fr: { syncing: "Reconnexion en cours ; la salle se rafraîchit", polling: "La salle se rafraîchit régulièrement", inkSyncing: "Les traits se reconnectent ; les traits terminés restent synchronisés", inkLive: "Dessin en direct connecté", expired: "Temps écoulé ; passage à l’étape suivante", draftFailed: "Brouillon non enregistré. Vérifiez votre connexion.", signIn: "Connexion expirée. Reconnectez-vous puis revenez.", missing: "Attendez tous les joueurs avant de commencer", closed: "Nouvelles parties temporairement suspendues", phase: "Cette étape est terminée ; actualisation en cours", invalid: "Utilisez des mots visibles sans lien ni données privées", rate: "Trop d'envois. Réessayez dans un instant." },
};

const BANK_COPY = {
  "zh-CN": { title: "本局词库", preview: "预览全部词语", words: "个词", choose: "从词库选一个起始词", progress: "人完成" },
  en: { title: "Word pack", preview: "Preview every word", words: "words", choose: "Choose a starting word from this pack", progress: "done" },
  fr: { title: "Thème", preview: "Voir tous les mots", words: "mots", choose: "Choisissez un mot du thème", progress: "terminés" },
};

const TIMING_COPY = {
  "zh-CN": { title: "本局计时", draw: "作画", guess: "答题" },
  en: { title: "Round timers", draw: "Drawing", guess: "Guessing" },
  fr: { title: "Durées des tours", draw: "Dessin", guess: "Réponse" },
};

function formatTimer(deadlineAt: string | null, now: number) {
  if (!deadlineAt) return "";
  const seconds = Math.max(0, Math.ceil((Date.parse(deadlineAt) - now) / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function ActionButton({ children, disabled, onClick, tone = "green" }: { children: React.ReactNode; disabled?: boolean; onClick: () => void; tone?: "green" | "peach" }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${tone === "green" ? "bg-[#156240] text-white hover:bg-[#0E4E35]" : "bg-[#E8A184] text-[#472A21] hover:bg-[#F2B197]"}`}>{children}</button>;
}

export function DrawGuessRoomClient({ initialRoom, locale }: { initialRoom: DrawGuessRoomView; locale: string }) {
  const t = TRANSLATIONS[locale as keyof typeof TRANSLATIONS] ?? TRANSLATIONS.en;
  const statusCopy = STATUS_COPY[locale as keyof typeof STATUS_COPY] ?? STATUS_COPY.en;
  const bankCopy = BANK_COPY[locale as keyof typeof BANK_COPY] ?? BANK_COPY.en;
  const timingCopy = TIMING_COPY[locale as keyof typeof TIMING_COPY] ?? TIMING_COPY.en;
  const [room, setRoom] = useState(initialRoom);
  const practiceCopy = locale === "en" ? { note: "Two people plus an automatic helper. The helper's drawing and guess are test placeholders.", people: "people", botClue: "Automatic test drawing" }
    : locale === "fr" ? { note: "Deux personnes et un joueur automatique. Son dessin et sa réponse sont des substituts de test.", people: "personnes", botClue: "Dessin automatique de test" }
    : { note: "两位真人 + 一位系统补位。系统画作与猜词仅作测试占位。", people: "位真人", botClue: "系统测试画作" };
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [guessFeedback, setGuessFeedback] = useState("");
  const [copied, setCopied] = useState(false);
  const [strokes, setStrokes] = useState<DrawStroke[]>(initialRoom.view.drawing ?? []);
  const [syncStatus, setSyncStatus] = useState<"CONNECTED" | "RECONNECTING" | "POLLING">("POLLING");
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [draftFailed, setDraftFailed] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [phaseToast, setPhaseToast] = useState(false);
  const lastPhaseKey = useRef("");
  const playStageRef = useRef<HTMLDivElement>(null);
  const refreshRunning = useRef<Promise<void> | null>(null);
  const mutationQueue = useRef<Promise<unknown>>(Promise.resolve());
  const previousTask = useRef("");
  const warmedInkTurn = useRef("");
  const latestRoom = useRef(room);
  latestRoom.current = room;
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
    const poll = () => { if (!document.hidden) void refresh(); };
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
    setGuessFeedback("");
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
        if ((action.type === "SAVE_DRAFT" || action.type === "SAVE_CLASSIC_DRAFT") &&
            code !== "PHASE_ENDED" && code !== "STALE_PHASE" && code !== "STALE_GAME" && code !== "DRAW_TIME_ENDED") setDraftFailed(true);
        const expectedDraftEnd = action.type === "SAVE_CLASSIC_DRAFT" && code === "DRAW_TIME_ENDED";
        setError(expectedDraftEnd ? "" : code === "TOO_FAST" ? t.tooFast : code === "SIGN_IN_REQUIRED" ? statusCopy.signIn : code === "WAIT_FOR_PLAYERS" ? statusCopy.missing : code === "CHAIN_NOT_ENABLED" ? statusCopy.closed : code === "PHASE_ENDED" || code === "STALE_PHASE" || code === "STALE_GAME" ? statusCopy.phase : code === "INVALID_WORD" ? statusCopy.invalid : code === "RATE_LIMITED" ? statusCopy.rate : action.type === "SAVE_DRAFT" || action.type === "SAVE_CLASSIC_DRAFT" ? statusCopy.draftFailed : t.error);
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
  const amArtist = room.viewerSeat === room.view.turnIndex;
  const guessed = Boolean(room.view.guesses?.[String(room.viewerSeat)]);
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
    if (!hadPreviousPhase) return;
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
    if (!showPlayers && !confirmClear) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setShowPlayers(false); setConfirmClear(false); }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [showPlayers, confirmClear]);

  async function copyInvite() {
    const url = new URL(withLocale(locale, `/game-tools/draw-guess/join/${room.code}`), window.location.origin).toString();
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2_000); }
    catch { setError(url); }
  }

  function submitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    if (room.view.phase === "CHAIN_WORD") {
      if (Array.from(value).length < 2 || Array.from(value).length > 12) { setError(t.invalidWord); return; }
      void send({ type: "SUBMIT_STEP", value });
    } else if (room.view.phase === "CHAIN_STEP") void send({ type: "SUBMIT_STEP", value });
    else if (room.view.phase === "DRAW_GUESS") void send({ type: "GUESS", value }).then((result) => { if (result?.correct === false) setGuessFeedback(t.wrong); else setGuessFeedback(""); });
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

  const inputForm = (placeholder: string, action: string, disabled = false) => <form onSubmit={submitText} className="flex gap-2"><input aria-label={placeholder} autoComplete="off" enterKeyHint="send" maxLength={room.view.phase === "CHAIN_WORD" ? 12 : room.view.phase === "DRAW_GUESS" ? 20 : 40} value={input} onChange={(event) => setInput(event.target.value)} placeholder={placeholder} disabled={disabled} className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#C9D9C9] bg-white px-4 text-base outline-none focus:border-[#156240] disabled:opacity-50" /><button type="submit" disabled={disabled || busy || !input.trim()} className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-[#156240] px-3 text-sm font-bold text-white disabled:opacity-45 sm:px-4"><Send className="h-4 w-4" />{action}</button></form>;

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
    const isClassicGuessing = isClassicRound && room.view.phase === "DRAW_GUESS" && !amArtist;
    const stageTitle = room.view.phase === "WORD_SELECT" ? (amArtist ? t.select : `${currentArtist?.name ?? ""} · ${t.select}`)
      : isClassicRound ? (amArtist ? classicArtistWaiting ? t.drawTimeUp : t.draw : `${currentArtist?.name ?? ""} · ${t.guessing}`)
      : room.view.phase === "CHAIN_WORD" ? room.wordBank ? bankCopy.choose : t.word
      : chainTask?.kind === "DRAWING" ? t.nextDraw : t.nextGuess;
    const stageProgress = isClassic ? `${room.view.turnIndex + 1} / ${room.playerCount}`
      : `${t.stage} ${Math.max(1, room.view.chainStage)}${room.view.chainSubmittedCount === undefined ? "" : ` · ${room.view.chainSubmittedCount}/${room.playerCount} ${bankCopy.progress}`}`;
    const stageDeadlineAt = isClassicDrawing && room.view.drawDeadlineAt ? room.view.drawDeadlineAt : room.view.deadlineAt;
    const stageTimer = formatTimer(stageDeadlineAt ?? null, now);
    const secondsLeft = stageDeadlineAt ? Math.max(0, Math.ceil((Date.parse(stageDeadlineAt) - now) / 1_000)) : null;
    const clearDrawing = () => {
      setConfirmClear(false);
      if (isClassicDrawing) replaceClassicDrawing([]);
      else updateStrokes([]);
    };

    return <div ref={playStageRef} className="draw-guess-play-stage fixed inset-x-0 top-0 z-[80] flex h-dvh flex-col overflow-hidden bg-[#F8F4EA] text-[#173D32]" style={{ top: "var(--draw-guess-visual-top, 0px)", height: "var(--draw-guess-visual-height, 100dvh)" }}>
      <span aria-hidden="true" className="pointer-events-none absolute -left-16 top-16 h-48 w-48 rounded-full bg-[#E8A184]/20 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-10 h-56 w-56 rounded-full bg-[#8AB68E]/20 blur-3xl" />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl shrink-0 items-center gap-2 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:gap-3 sm:px-5 sm:pt-4">
        <Link aria-label={t.back} href={withLocale(locale, "/game-tools")} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#DCE7D6] bg-white text-[#156240] shadow-sm transition hover:-translate-x-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#156240]"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-[#A75B48]">{isClassic ? t.modeClassic : t.modeChain} <span aria-hidden="true">·</span> {stageProgress}</p><h1 className="truncate text-lg font-bold leading-tight sm:text-2xl">{stageTitle}</h1></div>
        {stageTimer ? <span className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl border px-2.5 font-mono text-sm font-bold tabular-nums sm:px-3 sm:text-base ${secondsLeft !== null && secondsLeft <= 10 ? "border-[#E8A184] bg-[#FFF0E7] text-[#A24636] motion-safe:animate-pulse" : "border-[#DCE7D6] bg-white text-[#156240]"}`}><Clock3 className="h-4 w-4" />{stageTimer}</span> : null}
        <button aria-label={`${t.players} ${humanCount}/${humanCapacity}`} aria-haspopup="dialog" aria-expanded={showPlayers} type="button" onClick={() => setShowPlayers(true)} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-2xl border border-[#DCE7D6] bg-white px-2.5 text-xs font-bold text-[#156240] shadow-sm transition hover:bg-[#F1F8EF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#156240]"><UsersRound className="h-4 w-4" /><span>{humanCount}/{humanCapacity}</span></button>
      </header>

      <main className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] sm:gap-3 sm:px-5 sm:pb-4">
        <section aria-label={stageTitle} className="draw-guess-stage-card flex min-h-0 flex-1 flex-col rounded-[1.6rem] border border-[#D8E5D5] bg-[#FFFDF8] p-2 shadow-[0_16px_45px_rgba(39,80,55,0.1)] sm:rounded-[2rem] sm:p-4">
          {(isClassicRound && room.view.answer || isChainDrawing && chainTask?.previous?.kind === "WORD") ? <div className="mb-2 flex shrink-0 items-center gap-2 rounded-2xl bg-[#FFEBD8] px-3 py-2 sm:px-4"><Sparkles className="h-4 w-4 shrink-0 text-[#B66348]" /><span className="text-xs font-semibold text-[#80533D]">{isClassicRound ? t.answer : t.previousWord}</span><strong className="min-w-0 truncate text-base text-[#173D32] sm:text-lg">{isClassicRound ? room.view.answer : chainTask?.previous?.kind === "WORD" ? chainTask.previous.value : ""}</strong></div> : null}

          {isClassicDrawing ? <DrawGuessCanvas compact strokes={strokes} onProgress={progressStroke} onStroke={addStroke} onUndo={() => replaceClassicDrawing(strokesRef.current.slice(0, -1))} onClear={() => setConfirmClear(true)} /> : null}
          {isClassicRound && !isClassicDrawing ? <DrawGuessCanvas compact disabled strokes={amArtist ? strokes : room.view.phase === "DRAW_GUESS" ? ink.drawing : room.view.drawing ?? []} /> : null}
          {isChainDrawing ? <DrawGuessCanvas compact strokes={strokes} onStroke={addStroke} onUndo={() => updateStrokes(strokesRef.current.slice(0, -1))} onClear={() => setConfirmClear(true)} /> : null}
          {isChainGuessing && chainTask?.previous?.kind === "DRAWING" ? <DrawGuessCanvas compact disabled strokes={chainTask.previous.value} /> : null}

          {room.view.phase === "WORD_SELECT" ? <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 text-center"><span aria-hidden="true" className="grid h-20 w-20 place-items-center rounded-[1.8rem] bg-[#F8E4D5] text-4xl shadow-[0_12px_28px_rgba(224,147,111,0.2)]">✏️</span><p className="max-w-md text-sm leading-6 text-[#62756A]">{amArtist ? t.classicHint : t.wait}</p>{amArtist ? <div className="flex flex-wrap justify-center gap-2">{room.view.options?.map((word) => <ActionButton key={word} disabled={busy} onClick={() => void send({ type: "CHOOSE_WORD", value: word })}>{word}</ActionButton>)}</div> : null}</div> : null}
          {room.view.phase === "CHAIN_WORD" ? <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 text-center"><span aria-hidden="true" className="grid h-20 w-20 place-items-center rounded-[1.8rem] bg-[#E5F2E5] text-4xl shadow-[0_12px_28px_rgba(65,128,77,0.14)]">💭</span><p className="max-w-sm text-sm leading-6 text-[#62756A]">{room.wordBank ? `${bankCopy.title} · ${room.wordBank.title}` : t.chainHint}</p>{!chainTask?.submitted && chainTask?.options?.length ? <div className="flex flex-wrap justify-center gap-2">{chainTask.options.map((word) => <ActionButton key={word} disabled={busy} onClick={() => void send({ type: "SUBMIT_STEP", value: word })}>{word}</ActionButton>)}</div> : null}</div> : null}
          {isChainStep && chainTask?.submitted ? <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center"><span className="grid h-16 w-16 place-items-center rounded-full bg-[#EAF3E9] text-[#156240]"><Check className="h-8 w-8" /></span><p className="text-lg font-bold">{t.submitted}</p><p className="text-sm text-[#62756A]">{t.wait}</p></div> : null}
          {isChainStep && !chainTask ? <div role="status" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center text-[#607268]"><LoaderCircle className="h-7 w-7 animate-spin" /><p className="text-sm font-semibold">{t.wait}</p></div> : null}
          {isChainGuessing && chainTask?.previous?.system && room.practiceBotSeat !== undefined ? <p className="shrink-0 px-2 pt-2 text-xs font-semibold text-[#9E634B]">{practiceCopy.botClue}</p> : null}
        </section>

        <div className="draw-guess-stage-card shrink-0 rounded-[1.35rem] border border-[#E4E5D8] bg-white/95 p-2.5 shadow-[0_8px_24px_rgba(39,80,55,0.08)] sm:p-3">
          {isClassicGuessing ? guessed ? <p className="flex items-center gap-2 text-sm font-bold text-[#156240]"><Check className="h-5 w-5" />{t.guessed} · +{room.view.guesses?.[String(room.viewerSeat)]?.points}</p> : inputForm(t.guessing, t.submitGuess) : null}
          {isClassicDrawing ? <p role="status" className={`flex items-center gap-2 text-xs font-semibold ${draftFailed ? "text-[#9E4B3C]" : "text-[#607268]"}`}><span className={`h-2.5 w-2.5 rounded-full ${ink.connected && !draftFailed ? "bg-[#5EAD7F]" : "bg-[#E6A17B]"}`} />{draftFailed ? statusCopy.draftFailed : strokeSaving ? t.drawing : ink.connected ? statusCopy.inkLive : statusCopy.inkSyncing}</p> : null}
          {classicArtistWaiting ? <p role="status" className="flex items-center gap-2 text-sm font-semibold text-[#607268]"><Clock3 className="h-4 w-4 text-[#C4734F]" />{t.drawTimeUp}</p> : null}
          {isChainDrawing ? <div className="flex items-center justify-between gap-3"><p role="status" className={`text-xs font-semibold ${draftFailed ? "text-[#9E4B3C]" : "text-[#738477]"}`}>{draftFailed ? statusCopy.draftFailed : t.draft}</p><ActionButton disabled={busy || !strokes.length} onClick={() => void send({ type: "SUBMIT_STEP", strokes })}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{t.submit}</ActionButton></div> : null}
          {isChainGuessing ? inputForm(t.nextGuess, t.submit) : null}
          {room.view.phase === "CHAIN_WORD" ? chainTask?.submitted ? <p className="flex items-center gap-2 text-sm font-bold text-[#156240]"><Check className="h-5 w-5" />{t.submitted} · {t.wait}</p> : chainTask?.options?.length ? <p className="text-center text-xs font-semibold text-[#738477]">{bankCopy.choose}</p> : inputForm(t.word, t.submit) : null}
          {room.view.phase === "TURN_REVEAL" ? <p className="flex items-center gap-2 text-sm font-semibold text-[#607268]"><Sparkles className="h-4 w-4 text-[#E09370]" />{t.next}</p> : null}
          {room.view.phase === "WORD_SELECT" ? <p className="text-center text-xs font-semibold text-[#738477]">{amArtist ? t.select : t.wait}</p> : null}
          {isChainStep && chainTask?.submitted ? <p className="flex items-center gap-2 text-sm font-bold text-[#156240]"><Check className="h-5 w-5" />{t.submitted} · {t.wait}</p> : null}
          {isClassicGuessing && guessFeedback ? <p role="status" className="mt-2 text-xs font-semibold text-[#B05D49]">{guessFeedback}</p> : null}
          {syncStatus !== "CONNECTED" || refreshFailed ? <p role="status" className="mt-2 text-xs font-semibold text-[#9E634B]">{refreshFailed || syncStatus === "RECONNECTING" ? statusCopy.syncing : statusCopy.polling}</p> : null}
          {deadlinePassed ? <p role="status" className="mt-2 text-xs font-semibold text-[#9E634B]">{statusCopy.expired}</p> : null}
          {error ? <p role="alert" className="mt-2 rounded-xl bg-[#FBE7E1] px-3 py-2 text-xs font-semibold text-[#9E4B3C]">{error}</p> : null}
        </div>
      </main>

      {phaseToast ? <div role="status" className="draw-guess-phase-toast pointer-events-none absolute left-1/2 top-[20%] z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#173D32] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_40px_rgba(23,61,50,0.24)]"><Sparkles className="h-4 w-4 text-[#F5CA8C]" />{stageTitle}</div> : null}

      {showPlayers ? <div className="absolute inset-0 z-30 flex items-end justify-center bg-[#173D32]/45 p-3 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPlayers(false); }}><div role="dialog" aria-modal="true" aria-label={t.players} className="draw-guess-dialog w-full max-w-md rounded-[1.8rem] bg-[#FFFDF8] p-5 shadow-[0_28px_70px_rgba(23,61,50,0.28)]"><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#A75B48]">{t.room} · {room.code}</p><h2 className="text-xl font-bold">{t.players} <span className="text-sm text-[#738477]">{humanCount}/{humanCapacity}</span></h2></div><button aria-label={locale === "zh-CN" ? "关闭" : "Close"} autoFocus type="button" onClick={() => setShowPlayers(false)} className="grid h-9 w-9 place-items-center rounded-full bg-[#F0F2E9]"><X className="h-4 w-4" /></button></div><ol className="mt-4 max-h-[45dvh] space-y-2 overflow-y-auto">{Array.from({ length: room.playerCount }, (_, index) => { const seat = room.seats.find((item) => item.number === index + 1); return <li key={index} className={`flex items-center gap-3 rounded-xl p-2.5 ${index === room.viewerSeat ? "bg-[#EAF3E9]" : "bg-[#F5F4EC]"}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-bold text-[#156240]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{seat?.name ?? "—"}{seat?.isSystem ? ` · ${t.system}` : ""}{index === room.viewerSeat ? ` · ${t.you}` : ""}</span>{seat?.isHost ? <Crown className="h-4 w-4 text-[#C98759]" /> : null}{!seat?.isSystem ? <span className="text-xs font-bold tabular-nums">{room.view.scores[index]}</span> : null}</li>; })}</ol><button type="button" onClick={() => void copyInvite()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#156240] px-4 text-sm font-bold text-white"><Copy className="h-4 w-4" />{copied ? t.copied : t.copy}</button></div></div> : null}
      {confirmClear ? <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#173D32]/45 p-4"><div role="dialog" aria-modal="true" aria-label={locale === "zh-CN" ? "清空画布" : "Clear drawing"} className="draw-guess-dialog w-full max-w-sm rounded-[1.8rem] bg-[#FFFDF8] p-6 text-center shadow-[0_28px_70px_rgba(23,61,50,0.28)]"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FBE4D8] text-[#B45C47]"><Trash2 className="h-6 w-6" /></span><h2 className="mt-4 text-xl font-bold">{locale === "zh-CN" ? "要清空这张画吗？" : locale === "fr" ? "Effacer ce dessin ?" : "Clear this drawing?"}</h2><p className="mt-2 text-sm text-[#607268]">{locale === "zh-CN" ? "这一张画的所有笔画都会被清除。" : locale === "fr" ? "Tous les traits de ce dessin seront effacés." : "Every stroke on this drawing will be removed."}</p><div className="mt-5 flex gap-2"><button autoFocus type="button" onClick={() => setConfirmClear(false)} className="min-h-11 flex-1 rounded-xl bg-[#F0F2E9] px-3 text-sm font-bold">{locale === "zh-CN" ? "继续画" : locale === "fr" ? "Continuer" : "Keep drawing"}</button><button type="button" onClick={clearDrawing} className="min-h-11 flex-1 rounded-xl bg-[#B45C47] px-3 text-sm font-bold text-white">{locale === "zh-CN" ? "清空画布" : locale === "fr" ? "Effacer" : "Clear"}</button></div></div></div> : null}
    </div>;
  }

  const compactSummary = room.view.phase !== "LOBBY";
  return <div className="min-h-[80vh] pb-24 text-[#173D32]">
    <Link href={withLocale(locale, "/game-tools")} className="inline-flex items-center gap-2 text-sm font-semibold text-[#156240] hover:underline"><ArrowLeft className="h-4 w-4" />{t.back}</Link>
    <header className={`relative overflow-hidden bg-[#F6F3E8] shadow-[0_18px_55px_rgba(20,57,42,0.09)] ${compactSummary ? "mt-3 rounded-2xl p-4 sm:p-5" : "mt-5 rounded-[2rem] p-6 sm:p-8"}`}>
      <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-[#E8A184]/50 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A75B48]">Friemi · {room.mode === "CLASSIC" ? t.modeClassic : t.modeChain} · #{room.view.gameNumber}</p><h1 className={`font-bold ${compactSummary ? "mt-1 text-xl sm:text-2xl" : "mt-3 text-3xl sm:text-4xl"}`}>{t.title}</h1>{!compactSummary ? <p className="mt-2 text-sm text-[#5D7369]">{room.mode === "CLASSIC" ? t.classicHint : t.chainHint}</p> : null}</div>
        {compactSummary ? <div className="flex shrink-0 flex-col items-end gap-2"><button type="button" aria-label={copied ? t.copied : t.copy} onClick={() => void copyInvite()} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-white/80 px-2.5 text-sm font-bold tracking-widest shadow-sm"><Copy className="h-3.5 w-3.5 text-[#156240]" />{room.code}</button>{timer ? <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-mono text-sm font-bold tabular-nums"><Clock3 className="h-3.5 w-3.5 text-[#D07153]" />{timer}</span> : null}</div>
          : <div className="rounded-2xl bg-white/80 px-5 py-3 text-center shadow-sm"><span className="block text-[11px] font-bold uppercase tracking-widest text-[#718679]">{t.room}</span><strong className="text-2xl tracking-[0.18em]">{room.code}</strong></div>}
      </div>
      {compactSummary ? room.view.gameNumber > 1 || room.view.phase === "FINISHED" ? <Link className="relative mt-2 inline-block text-xs font-bold text-[#156240] underline" href={withLocale(locale, `/game-tools/draw-guess/rooms/${room.id}/history`)}>{t.history}</Link> : null
        : <div className="relative mt-5 flex flex-wrap items-center gap-3"><ActionButton tone="peach" onClick={copyInvite}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? t.copied : t.copy}</ActionButton><span className="text-sm text-[#62756A]">{t.invitation}</span>{room.view.gameNumber > 1 ? <Link className="text-sm font-bold text-[#156240] underline" href={withLocale(locale, `/game-tools/draw-guess/rooms/${room.id}/history`)}>{t.history}</Link> : null}{timer ? <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-mono text-lg font-bold tabular-nums"><Clock3 className="h-4 w-4 text-[#D07153]" />{timer}</span> : null}</div>}
    </header>

    {room.practiceBotSeat !== undefined && room.view.phase !== "FINISHED" ? <p className={`rounded-xl border border-[#E8D6C8] bg-[#FFF9F0] font-semibold text-[#78553E] ${compactSummary ? "mt-3 px-3 py-2 text-xs leading-5" : "mt-4 px-4 py-3 text-sm leading-6"}`}>{practiceCopy.note}</p> : null}

    {syncStatus !== "CONNECTED" || refreshFailed ? <p role="status" className="mt-4 rounded-xl border border-[#E8D6C8] bg-[#FFF9F5] px-4 py-3 text-sm font-semibold text-[#73584A]">{refreshFailed || syncStatus === "RECONNECTING" ? statusCopy.syncing : statusCopy.polling}</p> : null}
    {deadlinePassed ? <p role="status" className="mt-3 rounded-xl bg-[#EAF3E9] px-4 py-3 text-sm font-semibold text-[#156240]">{statusCopy.expired}</p> : null}

    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
      <section className="min-w-0 space-y-5">
        {room.view.phase === "LOBBY" ? <div className="rounded-[1.6rem] border border-[#DCE6D7] bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#EAF3E9]"><UsersRound className="h-6 w-6" /></span><div><h2 className="text-xl font-bold">{room.seats.length === room.playerCount ? t.ready : t.waiting}</h2><p className="text-sm text-[#607268]">{humanCount} / {humanCapacity} {room.practiceBotSeat === undefined ? t.players : practiceCopy.people}</p></div></div>{room.isHost ? <div className="mt-5"><ActionButton disabled={busy || room.seats.length !== room.playerCount} onClick={() => void send({ type: "START" })}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{t.start}</ActionButton></div> : null}</div> : null}

        {room.view.phase === "LOBBY" && room.view.timing ? <section aria-label={timingCopy.title} className="rounded-[1.6rem] border border-[#DCE6D7] bg-[#F7FBF6] p-5"><div className="flex items-center gap-2 text-sm font-bold text-[#315548]"><Clock3 className="h-4 w-4 text-[#156240]" />{timingCopy.title}</div><div className="mt-3 grid grid-cols-2 gap-3">{([{ label: timingCopy.draw, seconds: room.view.timing.drawSeconds }, { label: timingCopy.guess, seconds: room.view.timing.guessSeconds }] as const).map(({ label, seconds }) => <div key={label} className="rounded-xl bg-white px-3 py-3 text-center shadow-sm"><p className="text-xs font-semibold text-[#62756A]">{label}</p><strong className="mt-1 block text-xl text-[#156240]">{seconds}<span className="ml-1 text-xs">{t.minute}</span></strong></div>)}</div></section> : null}

        {room.view.phase === "LOBBY" && room.wordBank ? <section className="rounded-[1.6rem] border border-[#D6E5E7] bg-[#F7FCFC] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#E7EFF9] text-[#0E5296]"><BookOpen className="h-5 w-5" /></span><div><p className="text-xs font-bold text-[#0E5296]">{bankCopy.title} · {room.wordBank.words.length} {bankCopy.words}</p><h2 className="mt-1 text-lg font-bold">{room.wordBank.title}</h2>{room.wordBank.description ? <p className="mt-1 text-sm text-[#62756A]">{room.wordBank.description}</p> : null}</div></div><details className="mt-4 rounded-xl bg-white p-3"><summary className="cursor-pointer text-sm font-bold text-[#0E5296]">{bankCopy.preview}</summary><ul className="mt-3 flex flex-wrap gap-2">{room.wordBank.words.map((word) => <li key={word} className="rounded-full bg-[#F0F5F5] px-2.5 py-1 text-xs font-semibold">{word}</li>)}</ul></details></section> : null}

        {room.view.phase === "FINISHED" ? <section className="rounded-[1.6rem] bg-[#173D32] p-6 text-white"><h2 className="text-2xl font-bold">{t.finish}</h2>{getDrawGuessRankings(room.practiceBotSeat === undefined ? room.view.scores : room.view.scores.slice(0, -1)).map((item) => <div key={item.seat} className="mt-3 flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3"><span className="w-7 text-xl font-bold text-[#F1BD8D]">{item.rank}</span><span className="flex-1 font-semibold">{room.seats[item.seat]?.name}</span><strong>{item.score} {t.score}</strong></div>)}{room.isHost ? <button type="button" disabled={busy} onClick={() => void send({ type: "REMATCH" })} className="mt-5 min-h-11 rounded-xl bg-[#E8A184] px-5 text-sm font-bold text-[#472A21] disabled:opacity-50">{t.rematch}</button> : null}</section> : null}

        {room.mode === "CHAIN" && (room.view.phase === "REVEAL_VOTE" || room.view.phase === "AUTHOR_PICK") ? <DrawGuessChainReview busy={busy} locale={locale} room={room} onVote={(owner, value) => send({ type: "VOTE", owner, value })} onPick={(owner, step) => send({ type: "PICK", owner, step })} /> : null}

        {room.mode === "CHAIN" && room.view.phase === "FINISHED" ? <div className="space-y-5">{room.view.chains?.map((chain, owner) => <article key={owner} className="rounded-[1.6rem] border border-[#DFE7D9] bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{room.seats[owner]?.name ?? `#${owner + 1}`} · {t.chain}</h2>{room.view.matchResults ? <span className={`rounded-full px-3 py-1 text-xs font-bold ${room.view.matchResults[String(owner)] ? "bg-[#EAF3E9] text-[#156240]" : "bg-[#FBECE5] text-[#B05D49]"}`}>{room.view.matchResults[String(owner)] ? t.match : t.mismatch}</span> : null}</div><div className="mt-4 space-y-3">{chain.map((step, index) => <div key={index} className="rounded-2xl bg-[#F7F6F0] p-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#6A7D70]"><span className="rounded-full bg-white px-2 py-1">{index + 1}</span>{room.seats[step.seat]?.name}{step.system ? ` · ${t.system}` : ""}{room.view.picks?.[String(owner)] === index ? <span className="ml-auto text-[#C4734F]">★ {t.picked}</span> : null}</div>{step.kind === "WORD" ? <p className="py-2 text-center text-xl font-bold">{step.value}</p> : <div className="aspect-[10/7] max-w-xl overflow-hidden rounded-xl border border-[#E3E6DE]"><DrawGuessArtwork strokes={step.value} /></div>}{room.view.phase === "AUTHOR_PICK" && owner === room.viewerSeat && step.kind === "DRAWING" && !step.system ? <button type="button" disabled={busy || room.view.picks?.[String(owner)] !== undefined} onClick={() => void send({ type: "PICK", owner, step: index })} className="mt-2 rounded-lg bg-[#E8A184] px-3 py-2 text-xs font-bold text-[#472A21] disabled:opacity-50">★ {t.pick}</button> : null}{!step.system ? <DrawGuessReportButton kind={step.kind} locale={locale} ownerSeat={owner} roomId={room.id} roundNumber={room.view.gameNumber} stage={index} /> : null}</div>)}</div>
          {room.view.phase === "REVEAL_VOTE" ? <div className="mt-4 border-t border-[#E6EBE1] pt-4"><p className="mb-3 text-sm font-bold">{t.vote}</p><div className="flex flex-wrap gap-2"><ActionButton disabled={busy} onClick={() => void send({ type: "VOTE", owner, value: true })}>{t.yes}</ActionButton><ActionButton tone="peach" disabled={busy} onClick={() => void send({ type: "VOTE", owner, value: false })}>{t.no}</ActionButton>{room.view.votedOwners?.includes(owner) ? <span className="self-center text-xs text-[#5B7E62]">✓ {t.saved}</span> : null}</div></div> : null}
          {room.view.voteCounts?.[owner] ? <p className="mt-4 text-xs text-[#607268]">{t.result}: {t.yes} {room.view.voteCounts[owner].yes} · {t.no} {room.view.voteCounts[owner].no} · — {room.view.voteCounts[owner].abstain}</p> : null}
          {room.view.phase === "AUTHOR_PICK" && owner === room.viewerSeat && !chain.some((step) => step.kind === "DRAWING" && !step.system) ? <p className="mt-4 text-sm text-[#607268]">{t.noArtwork}</p> : null}
        </article>)}</div> : null}

        {error ? <p role="alert" className="rounded-xl bg-[#FBE7E1] p-4 text-sm font-semibold text-[#9E4B3C]">{error}</p> : null}
      </section>

      <aside className="h-fit rounded-[1.6rem] border border-[#DCE6D7] bg-white p-5"><h2 className="flex items-center gap-2 font-bold"><UsersRound className="h-5 w-5 text-[#156240]" />{t.players} <span className="ml-auto text-xs text-[#708579]">{humanCount}/{humanCapacity}</span></h2><ol className="mt-4 space-y-2">{Array.from({ length: room.playerCount }, (_, index) => { const seat = room.seats.find((item) => item.number === index + 1); return <li key={index} className={`flex items-center gap-3 rounded-xl p-2.5 ${index === room.viewerSeat ? "bg-[#EAF3E9]" : "bg-[#F8F8F3]"}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-bold text-[#156240]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{seat?.name ?? "—"}{seat?.isSystem ? ` · ${t.system}` : ""}{index === room.viewerSeat ? ` · ${t.you}` : ""}</span>{seat?.isHost ? <Crown className="h-4 w-4 text-[#C98759]" /> : null}{room.view.phase !== "LOBBY" && !seat?.isSystem ? <span className="text-xs font-bold tabular-nums text-[#61796A]">{room.view.scores[index]}</span> : null}</li>; })}</ol></aside>
    </div>
  </div>;
}
