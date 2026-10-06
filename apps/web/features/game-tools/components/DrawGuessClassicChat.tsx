"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Check, LoaderCircle, Send, SmilePlus, Sparkles, X } from "lucide-react";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import { DrawGuessPet } from "@/features/game-tools/components/DrawGuessPet";
import type { DrawGuessCatMood } from "@/features/game-tools/drawGuessCats";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import { DRAW_GUESS_REACTIONS, getDrawGuessMessageReactorSeats, type DrawGuessChatMessage, type DrawGuessReactionKind } from "@/features/game-tools/drawGuessEngine";

const COPY = {
  "zh-CN": { title: "猜词聊天室", hint: "在聊天框里输入答案", empty: "大家的猜词会出现在这里", placeholder: "在这里输入答案", send: "发送", correct: "已答对", artist: "大家正在猜你的画", spectator: "正在观战", solved: "你已答对，等其他人猜", reveal: "下一轮即将开始", pending: "发送中", react: "给画作表情", received: "收到表情", laugh: "好笑", comment: "猜词回应", noLaughs: "还没有人回应", close: "关闭", reactions: { "😂": "好笑", "👏": "画得妙", "👀": "猜不到", "❓": "看不懂" } },
  en: { title: "Guess chat", hint: "Enter your answer in the chat", empty: "Guesses will appear here", placeholder: "Type your answer here", send: "Send", correct: "guessed it!", artist: "Everyone is guessing your drawing", spectator: "Watching the game", solved: "You got it! Waiting for the others", reveal: "Next turn soon", pending: "Sending", react: "React to art", received: "Reactions", laugh: "Funny", comment: "Guess reactions", noLaughs: "No reactions yet", close: "Close", reactions: { "😂": "Funny", "👏": "Great art", "👀": "Stumped", "❓": "What is it?" } },
  fr: { title: "Salon des réponses", hint: "Saisissez votre réponse ici", empty: "Les réponses apparaîtront ici", placeholder: "Votre réponse ici", send: "Envoyer", correct: "a trouvé !", artist: "On devine votre dessin", spectator: "En observation", solved: "Bravo ! Attendons les autres", reveal: "Prochain tour bientôt", pending: "Envoi", react: "Réagir au dessin", received: "Réactions", laugh: "Drôle", comment: "Réactions au mot", noLaughs: "Pas encore de réactions", close: "Fermer", reactions: { "😂": "Drôle", "👏": "Bien dessiné", "👀": "Intrigant", "❓": "Qu'est-ce que c'est ?" } },
};

export function DrawGuessClassicChat({ busy, error, guessed, input, locale, mood, onInputChange, onReactGuess, onReact, onSubmit, pending, room, status }: {
  busy: boolean;
  error: string;
  guessed: boolean;
  input: string;
  locale: string;
  mood: DrawGuessCatMood;
  onInputChange: (value: string) => void;
  onReactGuess: (messageId: string, kind: DrawGuessReactionKind) => Promise<boolean>;
  onReact: (kind: DrawGuessReactionKind) => Promise<boolean>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: { id: string; text: string } | null;
  room: DrawGuessRoomView;
  status?: string;
}) {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const reactionMenuId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const reactionRef = useRef<HTMLDivElement>(null);
  const reactionToggleRef = useRef<HTMLButtonElement>(null);
  const followLatest = useRef(true);
  const lastTurn = useRef(room.view.turnIndex);
  const messages = room.view.chat ?? [];
  const isArtist = room.viewerSeat === room.view.turnIndex;
  const canGuess = room.view.phase === "DRAW_GUESS" && room.viewerSeat >= 0 && !isArtist && !guessed;
  const lastOwnMessage = [...messages].reverse().find((message) => message.seat === room.viewerSeat);
  const lastReaction = room.view.reactions?.at(-1);
  const [reactionPending, setReactionPending] = useState<DrawGuessReactionKind | null>(null);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [localReactions, setLocalReactions] = useState<DrawGuessReactionKind[]>([]);
  const [localCommentReactions, setLocalCommentReactions] = useState<{ id: string; kind: DrawGuessReactionKind }[]>([]);
  const [commentPending, setCommentPending] = useState<string | null>(null);
  const [reactionCooldown, setReactionCooldown] = useState(false);
  const cooldownTimer = useRef<number | null>(null);
  const reactionCountFor = (kind: DrawGuessReactionKind) => (room.view.reactionCounts?.[kind] ?? 0) +
    (localReactions.includes(kind) && !room.view.myReactions?.includes(kind) ? 1 : 0);
  const reactionTotal = DRAW_GUESS_REACTIONS.reduce((total, kind) => total + reactionCountFor(kind), 0);
  useEffect(() => () => { if (cooldownTimer.current !== null) window.clearTimeout(cooldownTimer.current); }, []);
  useEffect(() => { setLocalReactions([]); setLocalCommentReactions([]); setReactionOpen(false); setSelectedMessageId(null); }, [room.view.gameNumber, room.view.turnIndex]);
  useEffect(() => {
    if (!selectedMessageId) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedMessageId(null); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedMessageId]);
  useEffect(() => {
    if (!reactionOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!reactionRef.current?.contains(event.target as Node)) setReactionOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setReactionOpen(false);
      reactionToggleRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [reactionOpen]);
  const selectedMessage = messages.find((message) => message.id === selectedMessageId);
  const nameFor = (seat: number) => room.seats.find((player) => player.number === seat + 1)?.name ?? `#${seat + 1}`;
  const commentReactorSeats = (message: DrawGuessChatMessage, kind: DrawGuessReactionKind) => [...new Set([
    ...getDrawGuessMessageReactorSeats(message, kind),
    ...(localCommentReactions.some((item) => item.id === message.id && item.kind === kind) ? [room.viewerSeat] : []),
  ])];
  const commentReactionUsed = (message: DrawGuessChatMessage, kind: DrawGuessReactionKind) => commentReactorSeats(message, kind).includes(room.viewerSeat);
  const myCommentReactionCount = messages.reduce((total, message) => total + DRAW_GUESS_REACTIONS.reduce((count, kind) =>
    count + (commentReactionUsed(message, kind) ? 1 : 0), 0), 0);

  async function reactGuess(messageId: string, kind: DrawGuessReactionKind) {
    const message = messages.find((item) => item.id === messageId);
    if (!message || message.seat === room.viewerSeat || room.viewerSeat < 0 || room.view.phase !== "DRAW_GUESS" ||
      commentPending || commentReactionUsed(message, kind) || myCommentReactionCount >= 8) return;
    setCommentPending(`${messageId}:${kind}`);
    setLocalCommentReactions((current) => [...current, { id: messageId, kind }]);
    try {
      if (!await onReactGuess(messageId, kind)) setLocalCommentReactions((current) => current.filter((item) => item.id !== messageId || item.kind !== kind));
    } finally { setCommentPending(null); }
  }

  async function react(kind: DrawGuessReactionKind) {
    if (reactionPending || reactionCooldown || room.view.myReactions?.includes(kind) || localReactions.includes(kind)) return;
    setReactionPending(kind);
    setLocalReactions((current) => [...current, kind]);
    setReactionCooldown(true);
    if (cooldownTimer.current !== null) window.clearTimeout(cooldownTimer.current);
    cooldownTimer.current = window.setTimeout(() => setReactionCooldown(false), 1_550);
    try {
      if (!await onReact(kind)) setLocalReactions((current) => current.filter((item) => item !== kind));
    }
    finally { setReactionPending(null); }
  }

  useLayoutEffect(() => {
    if (lastTurn.current !== room.view.turnIndex) {
      lastTurn.current = room.view.turnIndex;
      followLatest.current = true;
    }
    if (followLatest.current && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, pending?.id, room.view.turnIndex]);

  useEffect(() => {
    const keepLatestVisible = () => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      followLatest.current = true;
    };
    window.addEventListener("resize", keepLatestVisible);
    window.visualViewport?.addEventListener("resize", keepLatestVisible);
    return () => {
      window.removeEventListener("resize", keepLatestVisible);
      window.visualViewport?.removeEventListener("resize", keepLatestVisible);
    };
  }, []);

  return <><section aria-label={t.title} className="draw-guess-classic-chat draw-guess-stage-card flex h-[clamp(11rem,33dvh,18rem)] min-h-0 shrink-0 flex-col overflow-hidden rounded-[1.5rem] bg-[#F7FAFE] text-[#30425C] shadow-[0_8px_24px_rgba(48,66,92,0.1)]">
    <header className="flex shrink-0 items-center gap-2 px-3 pb-1.5 pt-2.5 sm:px-4">
      <DrawGuessPet bubbleSide="compact" catId={room.seats.find((seat) => seat.number === room.viewerSeat + 1)?.catId} locale={locale} mood={mood} reactionKey={isArtist && lastReaction ? `${lastReaction.seat}:${lastReaction.kind}:${lastReaction.at}` : lastOwnMessage?.id} reactionKind={isArtist && lastReaction ? "cheer" : lastOwnMessage?.correct ? "cheer" : "oops"} size={39} />
      <div className="min-w-0 flex-1"><h2 className="text-sm font-black leading-tight">{t.title}</h2>{status ? <span role="status" className="block max-w-full truncate text-[11px] font-bold text-[#866632]">{status}</span> : <p className="truncate text-[11px] font-semibold text-[#65748A]">{room.viewerSeat < 0 ? t.spectator : isArtist ? t.empty : t.hint}</p>}</div>
      {room.view.phase === "DRAW_GUESS" && room.viewerSeat >= 0 && (!isArtist || reactionTotal > 0) ? <div ref={reactionRef} className="relative shrink-0">
        <button ref={reactionToggleRef} type="button" aria-controls={reactionMenuId} aria-expanded={reactionOpen} aria-label={isArtist ? t.received : t.react} onClick={() => setReactionOpen((open) => !open)} className={`inline-flex min-h-9 items-center gap-1 rounded-full px-2.5 text-[11px] font-black outline-none transition-[transform,background-color] focus-visible:ring-2 focus-visible:ring-[#3F74AE] motion-safe:active:scale-95 ${reactionOpen ? "bg-[#DCEBFA] text-[#315F95]" : "bg-white text-[#3E70AA] shadow-[0_2px_0_#DCE7EF]"}`}>
          <SmilePlus aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="whitespace-nowrap">{isArtist ? t.received : t.react}</span>{reactionTotal > 0 ? <span className="grid min-w-4 place-items-center rounded-full bg-[#DCEBFA] px-1 text-[10px] tabular-nums">{reactionTotal}</span> : null}
        </button>
        {reactionOpen ? <div id={reactionMenuId} role="group" aria-label={isArtist ? t.received : t.react} className="draw-guess-chain-reaction-in absolute right-0 top-full z-30 mt-2 grid w-[18rem] max-w-[calc(100vw-2.5rem)] grid-cols-4 gap-1 rounded-[1.25rem] border border-[#D5E4F2] bg-[#FFFCF5] p-2 shadow-[0_12px_28px_rgba(48,66,92,0.2)]">
          {DRAW_GUESS_REACTIONS.map((kind) => {
            const count = reactionCountFor(kind);
            const used = room.view.myReactions?.includes(kind) || localReactions.includes(kind);
            const label = t.reactions[kind];
            return isArtist ? <span key={kind} className="relative flex min-h-14 flex-col items-center justify-center rounded-2xl bg-[#EEF5FC] px-1 text-center"><span aria-hidden="true" className="text-xl leading-none">{kind}</span><span className="mt-0.5 text-[10px] font-bold text-[#405875]">{label}</span>{count > 0 ? <span className="absolute -bottom-1 -right-1 rounded-full bg-[#3E70AA] px-1.5 py-0.5 text-[9px] font-black leading-none text-white">×{count}</span> : null}</span>
              : <button key={kind} type="button" disabled={Boolean(used || reactionPending || reactionCooldown)} onClick={() => void react(kind)} aria-label={`${t.react}：${label}`} aria-pressed={Boolean(used)} className={`relative flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 text-center outline-none transition-[transform,background-color] focus-visible:ring-2 focus-visible:ring-[#3F74AE] motion-safe:enabled:hover:-translate-y-0.5 motion-safe:enabled:active:scale-95 ${used ? "bg-[#DCEBFA] text-[#315F95]" : "bg-[#F1F6FB] text-[#405875] hover:bg-[#E4F0FA]"} disabled:cursor-default`}><span aria-hidden="true" className={`text-xl leading-none ${reactionPending === kind ? "motion-safe:animate-bounce" : ""}`}>{kind}</span><span className="mt-0.5 text-[10px] font-black">{label}</span>{count > 0 ? <span className="absolute -bottom-1 -right-1 rounded-full bg-[#3E70AA] px-1.5 py-0.5 text-[9px] font-black leading-none text-white">×{count}</span> : null}{used ? <Check aria-hidden="true" className="absolute right-1 top-1 h-3 w-3 stroke-[3]" /> : null}</button>;
          })}
        </div> : null}
      </div> : null}
    </header>
    <div ref={listRef} role="log" aria-label={t.title} aria-live="polite" aria-relevant="additions" onScroll={(event) => {
      const element = event.currentTarget;
      followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
    }} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-2 [scrollbar-width:thin] sm:px-4">
      {!messages.length && !pending ? <div className="flex h-full min-h-12 items-center justify-center gap-2 text-xs font-semibold text-[#8390A1]"><Sparkles className="h-4 w-4" />{t.empty}</div> : null}
      {messages.map((message) => {
        const name = room.seats.find((seat) => seat.number === message.seat + 1)?.name ?? `#${message.seat + 1}`;
        const own = message.seat === room.viewerSeat;
        const activeKinds = DRAW_GUESS_REACTIONS.filter((kind) => commentReactorSeats(message, kind).length > 0);
        return <div key={message.id} className={`draw-guess-chat-bubble flex ${own ? "justify-end" : "justify-start"}`}>
          <div className="max-w-[85%] min-w-0">
            {!message.correct ? <p className={`mb-0.5 truncate px-2 text-[10px] font-bold text-[#65748A] ${own ? "text-right" : ""}`}>{name}</p> : null}
            <div className={`relative flex w-fit max-w-full items-end gap-1 rounded-[1.2rem] px-3 py-1.5 text-sm font-semibold leading-snug break-words ${own ? "ml-auto" : ""} ${message.correct ? "bg-[#C9EED5] text-[#205D40] shadow-[0_3px_0_#9ED3AB]" : "bg-white text-[#30425C] shadow-[0_3px_0_#DCE7EF]"}`}>
              {message.correct ? <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 shrink-0 stroke-[3]" />{name} {t.correct}</span> : <>
                <button type="button" onClick={() => setSelectedMessageId(message.id)} aria-label={`${t.comment}：${name}，${message.text}`} className="min-w-0 break-words text-left outline-none focus-visible:underline">{message.text}</button>
                {room.viewerSeat >= 0 ? <button type="button" onClick={() => setSelectedMessageId(message.id)} aria-label={`${t.comment}：${message.text}`} className="inline-flex min-h-6 shrink-0 items-center gap-0.5 rounded-full bg-[#F0F5FA] px-1.5 text-[11px] font-black outline-none focus-visible:ring-2 focus-visible:ring-[#3F74AE]">{activeKinds.length ? activeKinds.map((kind) => <span key={kind} className="relative inline-flex items-center px-0.5">{kind}<span className="absolute -bottom-1.5 -right-1 rounded-full bg-[#3E70AA] px-0.5 text-[8px] leading-none text-white">×{commentReactorSeats(message, kind).length}</span></span>) : <SmilePlus aria-hidden="true" className="h-3.5 w-3.5 text-[#3E70AA]" />}</button> : null}
              </>}
            </div>
          </div>
        </div>;
      })}
      {pending ? <div className="draw-guess-chat-bubble flex justify-end"><div className="max-w-[85%]"><p className="mb-0.5 px-2 text-right text-[10px] font-bold text-[#65748A]">{room.seats.find((seat) => seat.number === room.viewerSeat + 1)?.name ?? "—"}</p><div className="rounded-[1.2rem] bg-white px-3 py-1.5 text-sm font-semibold text-[#30425C] opacity-70 shadow-[0_3px_0_#DCE7EF]">{pending.text}<LoaderCircle aria-label={t.pending} className="ml-2 inline h-3.5 w-3.5 animate-spin" /></div></div></div> : null}
    </div>
    <div className="shrink-0 bg-white/85 px-2.5 pb-2.5 pt-2 sm:px-3">
      {canGuess ? <form onSubmit={onSubmit} className="flex items-center gap-2"><input aria-label={t.hint} autoComplete="off" enterKeyHint="send" maxLength={20} value={input} onChange={(event) => onInputChange(event.target.value)} placeholder={t.placeholder} className="min-h-11 min-w-0 flex-1 rounded-full border border-[#D5E4F2] bg-[#FFFCF5] px-4 text-base outline-none focus:border-[#3F74AE]" /><button type="submit" disabled={busy || !input.trim()} className="draw-guess-btn draw-guess-btn--candy min-h-11 shrink-0 px-4 text-sm"><Send className="h-4 w-4" />{t.send}</button></form>
        : <div role="status" className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[#ECF4FB] px-3 text-xs font-bold text-[#63758D]"><Check className="h-4 w-4" />{room.view.phase === "TURN_REVEAL" ? t.reveal : room.viewerSeat < 0 ? t.spectator : guessed ? t.solved : t.artist}</div>}
      {error ? <p role="alert" className="mt-2 rounded-xl bg-[#FFF0D2] px-3 py-1.5 text-xs font-semibold text-[#865731]">{error}</p> : null}
    </div>
  </section>
    {selectedMessage && !selectedMessage.correct ? <div className="fixed inset-0 z-[130] grid place-items-center bg-[#273A53]/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedMessageId(null); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="draw-guess-comment-title" className="draw-guess-dialog w-full max-w-sm rounded-[1.8rem] bg-[#FFFCF5] p-5 text-[#30425C] shadow-[0_24px_70px_rgba(48,66,92,0.3)]">
        <div className="flex items-center justify-between gap-3"><h3 id="draw-guess-comment-title" className="text-base font-black">{t.comment}</h3><button type="button" autoFocus aria-label={t.close} onClick={() => setSelectedMessageId(null)} className="grid h-9 w-9 place-items-center rounded-full bg-[#E8F2FB] text-[#405875]"><X className="h-4 w-4" /></button></div>
        <div className="mt-4 flex items-start gap-2"><DrawGuessCatSprite catId={room.seats.find((seat) => seat.number === selectedMessage.seat + 1)?.catId} size={40} /><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#63758D]">{nameFor(selectedMessage.seat)}</p><p className="mt-1 break-words rounded-2xl bg-white px-3 py-2 text-sm font-semibold shadow-[0_3px_0_#DCE7EF]">{selectedMessage.text}</p></div></div>
        <div role="group" aria-label={t.comment} className="mt-4 grid grid-cols-4 gap-1.5">{DRAW_GUESS_REACTIONS.map((kind) => {
          const seats = commentReactorSeats(selectedMessage, kind);
          const used = seats.includes(room.viewerSeat);
          const canReact = room.view.phase === "DRAW_GUESS" && room.viewerSeat >= 0 && selectedMessage.seat !== room.viewerSeat;
          return <button key={kind} type="button" disabled={!canReact || used || Boolean(commentPending) || myCommentReactionCount >= 8} onClick={() => void reactGuess(selectedMessage.id, kind)} aria-label={`${t.comment}：${t.reactions[kind]}`} aria-pressed={used} className={`relative flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 text-[11px] font-black outline-none focus-visible:ring-2 focus-visible:ring-[#3F74AE] ${used ? "bg-[#DCEBFA] text-[#315F95]" : "bg-[#F1F6FB] text-[#405875]"} disabled:cursor-default`}><span aria-hidden="true" className="text-xl">{kind}</span><span className="truncate text-[10px]">{t.reactions[kind]}</span>{seats.length ? <span className="absolute -bottom-1 -right-1 rounded-full bg-[#3E70AA] px-1.5 py-0.5 text-[9px] leading-none text-white">×{seats.length}</span> : null}{used ? <Check aria-hidden="true" className="absolute right-1 top-1 h-3 w-3 stroke-[3]" /> : null}</button>;
        })}</div>
        <div className="mt-4 max-h-[min(32vh,12rem)] space-y-2 overflow-y-auto">{DRAW_GUESS_REACTIONS.map((kind) => {
          const seats = commentReactorSeats(selectedMessage, kind);
          return seats.length ? <div key={kind} className="flex flex-wrap items-center gap-1.5"><span className="mr-1 text-sm">{kind}</span>{seats.map((seat) => <span key={seat} className="inline-flex items-center gap-1 rounded-full bg-[#EEF5FC] py-1 pl-1 pr-2 text-xs font-bold"><DrawGuessCatSprite catId={room.seats.find((player) => player.number === seat + 1)?.catId} size={24} />{nameFor(seat)}</span>)}</div> : null;
        })}{!DRAW_GUESS_REACTIONS.some((kind) => commentReactorSeats(selectedMessage, kind).length) ? <p className="text-xs font-semibold text-[#8390A1]">{t.noLaughs}</p> : null}</div>
      </div>
    </div> : null}</>;
}
