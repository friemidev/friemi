"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, Copy, Crown, LoaderCircle, Send, Sparkles, UsersRound } from "lucide-react";
import { DrawGuessArtwork, DrawGuessCanvas } from "@/features/game-tools/components/DrawGuessCanvas";
import { getDrawGuessRankings, type ChainStep, type DrawGuessAction, type DrawGuessMode, type DrawGuessPhase, type DrawStroke } from "@/features/game-tools/drawGuessEngine";
import { DRAW_GUESS_ROOM_EVENT, getDrawGuessRealtimeBrowserConfig, getDrawGuessRoomTopic } from "@/features/game-tools/drawGuessRealtime";
import { ACTIVE_GAME_TOOL_ROOM_STORAGE_EVENT, ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY } from "@/features/game-tools/activeGameToolRoomStorage";
import { withLocale } from "@/lib/routes";

export type DrawGuessRoomView = {
  code: string;
  id: string;
  isHost: boolean;
  mode: DrawGuessMode;
  playerCount: number;
  revision: number;
  seats: { name: string; number: number; isHost: boolean }[];
  status: string;
  viewerSeat: number;
  view: {
    answer?: string | null;
    chainStage: number;
    chains?: ChainStep[][];
    deadlineAt: string | null;
    gameNumber: number;
    drawing?: DrawStroke[];
    guesses?: Record<string, { at: string; points: number }>;
    matchResults?: Record<string, boolean> | null;
    mode: DrawGuessMode;
    options?: string[];
    phase: DrawGuessPhase;
    picks?: Record<string, number>;
    scores: number[];
    task?: { kind: "WORD" | "DRAWING"; owner?: number; previous?: ChainStep | null; submitted: boolean; draft?: DrawStroke[] } | null;
    turnIndex: number;
    voteCounts?: { yes: number; no: number; abstain: number }[] | null;
    votedOwners?: number[];
  };
};

const TRANSLATIONS = {
  "zh-CN": { title: "你画我猜", back: "桌游工具", room: "房间", copy: "复制邀请链接", copied: "已复制", players: "玩家", waiting: "等待玩家入座", start: "开始游戏", ready: "人齐了，可以开局", host: "房主", you: "你", seat: "号位", minute: "秒", modeClassic: "抢猜模式", modeChain: "画画接龙", select: "选一个词来画", choose: "选择", draw: "轮到你画", guessing: "猜猜这是什么", submitGuess: "提交猜词", answer: "答案", guessed: "已猜中", wrong: "还没猜对，继续试试", tooFast: "猜得太快了，请稍等一秒", wait: "等待其他玩家提交", word: "给你的接龙写一个起始词", nextDraw: "根据上一个词作画", nextGuess: "根据这幅画猜词", previousWord: "上一棒的词", submit: "提交这一棒", drawing: "作画中", stage: "第", vote: "首尾吻合吗？", yes: "吻合", no: "不吻合", result: "投票结果", pick: "选择你这条链最棒的画", picked: "已选", finish: "本局排行榜", rematch: "再来一局", history: "查看往期作品", chain: "传递故事", system: "系统补位", match: "吻合", mismatch: "不吻合", error: "操作没有完成，请刷新重试。", saved: "已保存", invalidWord: "请写 2–12 个字。", noArtwork: "这条链没有可评选的作品", invitation: "分享房间号或链接给朋友", loading: "加载房间中", next: "下一轮即将开始", submitted: "已提交", score: "分", draft: "画稿会自动保存", classicHint: "画者选词后，其他人边看边猜。", chainHint: "每人从一个词开始，画与猜轮流传递。" },
  en: { title: "Draw & Guess", back: "Table tools", room: "Room", copy: "Copy invite link", copied: "Copied", players: "Players", waiting: "Waiting for players", start: "Start game", ready: "Everyone is here", host: "Host", you: "You", seat: "seat", minute: "s", modeClassic: "Speed guessing", modeChain: "Picture chain", select: "Choose a word to draw", choose: "Choose", draw: "Your turn to draw", guessing: "What is this?", submitGuess: "Send guess", answer: "Answer", guessed: "Solved", wrong: "Not quite. Try again", tooFast: "Please wait a second before guessing again", wait: "Waiting for the others", word: "Write a starting word", nextDraw: "Draw the previous word", nextGuess: "Guess from this picture", previousWord: "Previous word", submit: "Pass it on", drawing: "Drawing", stage: "Stage", vote: "Does the ending match?", yes: "Matches", no: "Different", result: "Vote results", pick: "Pick your favorite drawing", picked: "Selected", finish: "Leaderboard", rematch: "Play again", history: "Past games", chain: "The story", system: "Auto-filled", match: "Matched", mismatch: "Changed", error: "That action did not complete. Please try again.", saved: "Saved", invalidWord: "Enter 2–12 characters.", noArtwork: "No eligible artwork", invitation: "Share the room code or link", loading: "Loading room", next: "Next turn soon", submitted: "Submitted", score: "pts", draft: "Draft saves automatically", classicHint: "Choose a word, draw, and let everyone guess.", chainHint: "Everyone starts a word and passes drawings and guesses." },
  fr: { title: "Dessine et devine", back: "Jeux de table", room: "Salle", copy: "Copier le lien", copied: "Copié", players: "Joueurs", waiting: "En attente des joueurs", start: "Commencer", ready: "Tout le monde est là", host: "Hôte", you: "Vous", seat: "place", minute: "s", modeClassic: "Deviner vite", modeChain: "Chaîne de dessins", select: "Choisissez un mot", choose: "Choisir", draw: "À vous de dessiner", guessing: "Qu'est-ce que c'est ?", submitGuess: "Envoyer", answer: "Réponse", guessed: "Trouvé", wrong: "Pas encore. Réessayez", tooFast: "Attendez une seconde avant de réessayer", wait: "En attente des autres", word: "Écrivez un mot de départ", nextDraw: "Dessinez le mot reçu", nextGuess: "Devinez ce dessin", previousWord: "Mot précédent", submit: "Transmettre", drawing: "Dessin", stage: "Étape", vote: "La fin correspond-elle ?", yes: "Oui", no: "Non", result: "Votes", pick: "Choisissez le meilleur dessin", picked: "Choisi", finish: "Classement", rematch: "Rejouer", history: "Parties précédentes", chain: "L'histoire", system: "Automatique", match: "Correspond", mismatch: "Différent", error: "Action non terminée. Réessayez.", saved: "Enregistré", invalidWord: "Saisissez 2 à 12 caractères.", noArtwork: "Aucun dessin éligible", invitation: "Partagez le code ou le lien", loading: "Chargement", next: "Prochain tour", submitted: "Envoyé", score: "pts", draft: "Brouillon enregistré automatiquement", classicHint: "Choisissez un mot, dessinez et faites deviner les autres.", chainHint: "Chacun part d'un mot et transmet dessins et réponses." },
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
  const [room, setRoom] = useState(initialRoom);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [guessFeedback, setGuessFeedback] = useState("");
  const [copied, setCopied] = useState(false);
  const [strokes, setStrokes] = useState<DrawStroke[]>(initialRoom.view.drawing ?? []);
  const refreshRunning = useRef(false);
  const mutationQueue = useRef<Promise<unknown>>(Promise.resolve());
  const previousTask = useRef("");
  const latestRoom = useRef(room);
  latestRoom.current = room;

  const refresh = useCallback(async () => {
    if (refreshRunning.current) return;
    refreshRunning.current = true;
    try {
      const response = await fetch(`/api/game-tools/draw-guess/rooms/${initialRoom.id}`, { cache: "no-store" });
      if (response.ok) {
        const result = await response.json() as { room: DrawGuessRoomView };
        if (result.room && result.room.revision >= latestRoom.current.revision) setRoom(result.room);
      }
    } catch { /* The next poll retries after a temporary connection failure. */ }
    finally { refreshRunning.current = false; }
  }, [initialRoom.id]);

  useEffect(() => {
    const id = window.setInterval(() => { setNow(Date.now()); if (!document.hidden) void refresh(); }, 2_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  useEffect(() => {
    const config = getDrawGuessRealtimeBrowserConfig();
    if (!config) return;
    const client = createClient(config.url, config.publishableKey, { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } });
    const channel = client.channel(getDrawGuessRoomTopic(initialRoom.id)).on("broadcast", { event: DRAW_GUESS_ROOM_EVENT }, () => { void refresh(); }).subscribe();
    return () => { void client.removeChannel(channel).finally(() => client.realtime.disconnect()); };
  }, [initialRoom.id, refresh]);

  useEffect(() => {
    const taskKey = `${room.view.phase}:${room.view.turnIndex}:${room.view.chainStage}`;
    if (taskKey === previousTask.current) return;
    previousTask.current = taskKey;
    setInput("");
    setGuessFeedback("");
    setStrokes(room.view.phase === "CHAIN_STEP" ? room.view.task?.draft ?? [] : room.view.drawing ?? []);
  }, [room.view]);

  useEffect(() => {
    if (room.mode !== "CLASSIC" || room.view.phase !== "DRAW_GUESS" || room.view.turnIndex !== room.viewerSeat) return;
    setStrokes((current) => (room.view.drawing?.length ?? 0) >= current.length ? room.view.drawing ?? [] : current);
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
        await refresh();
        return result as { correct?: boolean; points?: number };
      } catch (cause) { setError(cause instanceof Error && cause.message === "TOO_FAST" ? t.tooFast : t.error); await refresh(); return null; }
      finally { setBusy(false); }
    };
    const queued = mutationQueue.current.then(run, run);
    mutationQueue.current = queued.then(() => undefined, () => undefined);
    return queued;
  }, [refresh, room.id, room.view.chainStage, room.view.gameNumber, room.view.phase, room.view.turnIndex, t.error, t.tooFast]);

  useEffect(() => {
    if (room.view.phase !== "CHAIN_STEP" || room.view.task?.kind !== "DRAWING" || room.view.task.submitted || !strokes.length) return;
    const id = window.setTimeout(() => { void send({ type: "SAVE_DRAFT", strokes }); }, 5_000);
    return () => window.clearTimeout(id);
  }, [room.view.phase, room.view.chainStage, room.view.task?.kind, room.view.task?.submitted, strokes, send]);

  const timer = formatTimer(room.view.deadlineAt, now);
  const currentArtist = room.seats.find((seat) => seat.number === room.view.turnIndex + 1);
  const amArtist = room.viewerSeat === room.view.turnIndex;
  const guessed = Boolean(room.view.guesses?.[String(room.viewerSeat)]);

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
    if (strokes.length >= 120) return;
    setStrokes((current) => [...current, stroke]);
    if (room.mode === "CLASSIC") void send({ type: "ADD_STROKE", stroke });
  }

  const inputForm = (placeholder: string, action: string, disabled = false) => <form onSubmit={submitText} className="flex gap-2"><input aria-label={placeholder} maxLength={room.view.phase === "CHAIN_WORD" ? 12 : room.view.phase === "DRAW_GUESS" ? 20 : 40} value={input} onChange={(event) => setInput(event.target.value)} placeholder={placeholder} disabled={disabled} className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#C9D9C9] bg-white px-4 text-base outline-none focus:border-[#156240] disabled:opacity-50" /><button type="submit" disabled={disabled || busy || !input.trim()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#156240] px-4 font-bold text-white disabled:opacity-45"><Send className="h-4 w-4" />{action}</button></form>;

  return <div className="min-h-[80vh] pb-24 text-[#173D32]">
    <Link href={withLocale(locale, "/game-tools")} className="inline-flex items-center gap-2 text-sm font-semibold text-[#156240] hover:underline"><ArrowLeft className="h-4 w-4" />{t.back}</Link>
    <header className="relative mt-5 overflow-hidden rounded-[2rem] bg-[#F6F3E8] p-6 shadow-[0_18px_55px_rgba(20,57,42,0.09)] sm:p-8">
      <div className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-[#E8A184]/50 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A75B48]">Friemi · {room.mode === "CLASSIC" ? t.modeClassic : t.modeChain} · #{room.view.gameNumber}</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">{t.title}</h1><p className="mt-2 text-sm text-[#5D7369]">{room.mode === "CLASSIC" ? t.classicHint : t.chainHint}</p></div><div className="rounded-2xl bg-white/80 px-5 py-3 text-center shadow-sm"><span className="block text-[11px] font-bold uppercase tracking-widest text-[#718679]">{t.room}</span><strong className="text-2xl tracking-[0.18em]">{room.code}</strong></div></div>
      <div className="relative mt-5 flex flex-wrap items-center gap-3"><ActionButton tone="peach" onClick={copyInvite}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? t.copied : t.copy}</ActionButton><span className="text-sm text-[#62756A]">{t.invitation}</span>{room.view.gameNumber > 1 || room.view.phase === "FINISHED" ? <Link className="text-sm font-bold text-[#156240] underline" href={withLocale(locale, `/game-tools/draw-guess/rooms/${room.id}/history`)}>{t.history}</Link> : null}{timer ? <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-mono text-lg font-bold tabular-nums"><Clock3 className="h-4 w-4 text-[#D07153]" />{timer}</span> : null}</div>
    </header>

    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
      <section className="min-w-0 space-y-5">
        {room.view.phase === "LOBBY" ? <div className="rounded-[1.6rem] border border-[#DCE6D7] bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#EAF3E9]"><UsersRound className="h-6 w-6" /></span><div><h2 className="text-xl font-bold">{room.seats.length === room.playerCount ? t.ready : t.waiting}</h2><p className="text-sm text-[#607268]">{room.seats.length} / {room.playerCount} {t.players}</p></div></div>{room.isHost ? <div className="mt-5"><ActionButton disabled={busy || room.seats.length !== room.playerCount} onClick={() => void send({ type: "START" })}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{t.start}</ActionButton></div> : null}</div> : null}

        {room.mode === "CLASSIC" && room.view.phase === "WORD_SELECT" ? <div className="rounded-[1.6rem] bg-white p-6"><h2 className="text-xl font-bold">{amArtist ? t.select : `${currentArtist?.name ?? ""} · ${t.select}`}</h2>{amArtist ? <div className="mt-5 flex flex-wrap gap-3">{room.view.options?.map((word) => <ActionButton key={word} disabled={busy} onClick={() => void send({ type: "CHOOSE_WORD", value: word })}>{word}</ActionButton>)}</div> : <p className="mt-4 text-[#607268]">{t.wait}</p>}</div> : null}

        {room.mode === "CLASSIC" && (room.view.phase === "DRAW_GUESS" || room.view.phase === "TURN_REVEAL") ? <div className="rounded-[1.6rem] bg-[#FFFDF9] p-4 sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#A75B48]">{room.view.turnIndex + 1} / {room.playerCount}</p><h2 className="mt-1 text-xl font-bold">{amArtist ? t.draw : `${currentArtist?.name ?? ""} · ${t.guessing}`}</h2></div>{room.view.answer ? <span className="rounded-xl bg-[#EAF3E9] px-4 py-2 font-bold">{t.answer}: {room.view.answer}</span> : null}</div>
          {amArtist && room.view.phase === "DRAW_GUESS" ? <DrawGuessCanvas strokes={strokes} onStroke={addStroke} onUndo={() => { setStrokes((current) => current.slice(0, -1)); void send({ type: "UNDO_STROKE" }); }} /> : <div className="aspect-[10/7] overflow-hidden rounded-2xl border border-[#DCE6D7]"><DrawGuessArtwork strokes={room.view.drawing ?? []} /></div>}
          {!amArtist && room.view.phase === "DRAW_GUESS" ? <div className="mt-5">{guessed ? <p className="rounded-xl bg-[#EAF3E9] p-4 font-bold text-[#156240]"><Check className="mr-2 inline h-5 w-5" />{t.guessed} · +{room.view.guesses?.[String(room.viewerSeat)]?.points}</p> : <>{inputForm(t.guessing, t.submitGuess)}{guessFeedback ? <p role="status" className="mt-2 text-sm font-semibold text-[#B05D49]">{guessFeedback}</p> : null}</>}</div> : null}
          {room.view.phase === "TURN_REVEAL" ? <p className="mt-4 text-sm text-[#607268]">{t.next}</p> : null}
        </div> : null}

        {room.mode === "CHAIN" && room.view.phase === "CHAIN_WORD" ? <div className="rounded-[1.6rem] bg-white p-6"><h2 className="text-xl font-bold">{t.word}</h2><p className="mt-2 text-sm text-[#607268]">{t.chainHint}</p><div className="mt-5">{room.view.task?.submitted ? <p className="rounded-xl bg-[#EAF3E9] p-4 font-bold text-[#156240]"><Check className="mr-2 inline h-5 w-5" />{t.submitted} · {t.wait}</p> : inputForm(t.word, t.submit)}</div></div> : null}

        {room.mode === "CHAIN" && room.view.phase === "CHAIN_STEP" ? <div className="rounded-[1.6rem] bg-[#FFFDF9] p-4 sm:p-6"><p className="text-xs font-bold uppercase tracking-widest text-[#A75B48]">{t.stage} {room.view.chainStage}</p><h2 className="mt-1 text-xl font-bold">{room.view.task?.kind === "DRAWING" ? t.nextDraw : t.nextGuess}</h2>
          {room.view.task?.previous?.kind === "WORD" ? <div className="my-5 rounded-2xl bg-[#F2EDE1] px-5 py-6 text-center text-2xl font-bold">{room.view.task.previous.value}</div> : null}
          {room.view.task?.previous?.kind === "DRAWING" ? <div className="my-5 aspect-[10/7] overflow-hidden rounded-2xl border border-[#DCE6D7]"><DrawGuessArtwork strokes={room.view.task.previous.value} /></div> : null}
          {room.view.task?.submitted ? <p className="rounded-xl bg-[#EAF3E9] p-4 font-bold text-[#156240]"><Check className="mr-2 inline h-5 w-5" />{t.submitted} · {t.wait}</p> : room.view.task?.kind === "DRAWING" ? <div className="mt-4 space-y-3"><DrawGuessCanvas strokes={strokes} onStroke={addStroke} onUndo={() => setStrokes((current) => current.slice(0, -1))} /><p className="text-xs text-[#738477]">{t.draft}</p><ActionButton disabled={busy || !strokes.length} onClick={() => void send({ type: "SUBMIT_STEP", strokes })}>{t.submit}</ActionButton></div> : <div className="mt-5">{inputForm(t.nextGuess, t.submit)}</div>}
        </div> : null}

        {room.mode === "CHAIN" && ["REVEAL_VOTE", "AUTHOR_PICK", "FINISHED"].includes(room.view.phase) ? <div className="space-y-5">{room.view.chains?.map((chain, owner) => <article key={owner} className="rounded-[1.6rem] border border-[#DFE7D9] bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{room.seats[owner]?.name ?? `#${owner + 1}`} · {t.chain}</h2>{room.view.matchResults ? <span className={`rounded-full px-3 py-1 text-xs font-bold ${room.view.matchResults[String(owner)] ? "bg-[#EAF3E9] text-[#156240]" : "bg-[#FBECE5] text-[#B05D49]"}`}>{room.view.matchResults[String(owner)] ? t.match : t.mismatch}</span> : null}</div><div className="mt-4 space-y-3">{chain.map((step, index) => <div key={index} className="rounded-2xl bg-[#F7F6F0] p-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#6A7D70]"><span className="rounded-full bg-white px-2 py-1">{index + 1}</span>{room.seats[step.seat]?.name}{step.system ? ` · ${t.system}` : ""}{room.view.picks?.[String(owner)] === index ? <span className="ml-auto text-[#C4734F]">★ {t.picked}</span> : null}</div>{step.kind === "WORD" ? <p className="py-2 text-center text-xl font-bold">{step.value}</p> : <div className="aspect-[10/7] max-w-xl overflow-hidden rounded-xl border border-[#E3E6DE]"><DrawGuessArtwork strokes={step.value} /></div>}{room.view.phase === "AUTHOR_PICK" && owner === room.viewerSeat && step.kind === "DRAWING" && !step.system ? <button type="button" disabled={busy || room.view.picks?.[String(owner)] !== undefined} onClick={() => void send({ type: "PICK", owner, step: index })} className="mt-2 rounded-lg bg-[#E8A184] px-3 py-2 text-xs font-bold text-[#472A21] disabled:opacity-50">★ {t.pick}</button> : null}</div>)}</div>
          {room.view.phase === "REVEAL_VOTE" ? <div className="mt-4 border-t border-[#E6EBE1] pt-4"><p className="mb-3 text-sm font-bold">{t.vote}</p><div className="flex flex-wrap gap-2"><ActionButton disabled={busy} onClick={() => void send({ type: "VOTE", owner, value: true })}>{t.yes}</ActionButton><ActionButton tone="peach" disabled={busy} onClick={() => void send({ type: "VOTE", owner, value: false })}>{t.no}</ActionButton>{room.view.votedOwners?.includes(owner) ? <span className="self-center text-xs text-[#5B7E62]">✓ {t.saved}</span> : null}</div></div> : null}
          {room.view.voteCounts?.[owner] ? <p className="mt-4 text-xs text-[#607268]">{t.result}: {t.yes} {room.view.voteCounts[owner].yes} · {t.no} {room.view.voteCounts[owner].no} · — {room.view.voteCounts[owner].abstain}</p> : null}
          {room.view.phase === "AUTHOR_PICK" && owner === room.viewerSeat && !chain.some((step) => step.kind === "DRAWING" && !step.system) ? <p className="mt-4 text-sm text-[#607268]">{t.noArtwork}</p> : null}
        </article>)}</div> : null}

        {room.view.phase === "FINISHED" ? <section className="rounded-[1.6rem] bg-[#173D32] p-6 text-white"><h2 className="text-2xl font-bold">{t.finish}</h2>{getDrawGuessRankings(room.view.scores).map((item) => <div key={item.seat} className="mt-3 flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3"><span className="w-7 text-xl font-bold text-[#F1BD8D]">{item.rank}</span><span className="flex-1 font-semibold">{room.seats[item.seat]?.name}</span><strong>{item.score} {t.score}</strong></div>)}{room.isHost ? <button type="button" disabled={busy} onClick={() => void send({ type: "REMATCH" })} className="mt-5 min-h-11 rounded-xl bg-[#E8A184] px-5 text-sm font-bold text-[#472A21] disabled:opacity-50">{t.rematch}</button> : null}</section> : null}
        {error ? <p role="alert" className="rounded-xl bg-[#FBE7E1] p-4 text-sm font-semibold text-[#9E4B3C]">{error}</p> : null}
      </section>

      <aside className="h-fit rounded-[1.6rem] border border-[#DCE6D7] bg-white p-5"><h2 className="flex items-center gap-2 font-bold"><UsersRound className="h-5 w-5 text-[#156240]" />{t.players} <span className="ml-auto text-xs text-[#708579]">{room.seats.length}/{room.playerCount}</span></h2><ol className="mt-4 space-y-2">{Array.from({ length: room.playerCount }, (_, index) => { const seat = room.seats.find((item) => item.number === index + 1); return <li key={index} className={`flex items-center gap-3 rounded-xl p-2.5 ${index === room.viewerSeat ? "bg-[#EAF3E9]" : "bg-[#F8F8F3]"}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-bold text-[#156240]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{seat?.name ?? "—"}{index === room.viewerSeat ? ` · ${t.you}` : ""}</span>{seat?.isHost ? <Crown className="h-4 w-4 text-[#C98759]" /> : null}{room.view.phase !== "LOBBY" ? <span className="text-xs font-bold tabular-nums text-[#61796A]">{room.view.scores[index]}</span> : null}</li>; })}</ol></aside>
    </div>
  </div>;
}
