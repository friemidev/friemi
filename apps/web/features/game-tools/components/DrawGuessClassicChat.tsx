"use client";

import { useEffect, useLayoutEffect, useRef, type FormEvent } from "react";
import { Check, LoaderCircle, Send, Sparkles } from "lucide-react";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import type { DrawGuessCatMood } from "@/features/game-tools/drawGuessCats";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";

const COPY = {
  "zh-CN": { title: "猜词聊天室", hint: "在聊天框里输入答案", empty: "大家的猜词会出现在这里", placeholder: "在这里输入答案", send: "发送", correct: "已答对", artist: "大家正在猜你的画", solved: "你已答对，等其他人猜", reveal: "下一轮即将开始", pending: "发送中" },
  en: { title: "Guess chat", hint: "Enter your answer in the chat", empty: "Guesses will appear here", placeholder: "Type your answer here", send: "Send", correct: "guessed it!", artist: "Everyone is guessing your drawing", solved: "You got it! Waiting for the others", reveal: "Next turn soon", pending: "Sending" },
  fr: { title: "Salon des réponses", hint: "Saisissez votre réponse ici", empty: "Les réponses apparaîtront ici", placeholder: "Votre réponse ici", send: "Envoyer", correct: "a trouvé !", artist: "On devine votre dessin", solved: "Bravo ! Attendons les autres", reveal: "Prochain tour bientôt", pending: "Envoi" },
};

export function DrawGuessClassicChat({ busy, error, guessed, input, locale, mood, onInputChange, onSubmit, pending, room, status }: {
  busy: boolean;
  error: string;
  guessed: boolean;
  input: string;
  locale: string;
  mood: DrawGuessCatMood;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: { id: string; text: string } | null;
  room: DrawGuessRoomView;
  status?: string;
}) {
  const t = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const listRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const lastTurn = useRef(room.view.turnIndex);
  const messages = room.view.chat ?? [];
  const isArtist = room.viewerSeat === room.view.turnIndex;
  const canGuess = room.view.phase === "DRAW_GUESS" && !isArtist && !guessed;

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

  return <section aria-label={t.title} className="draw-guess-stage-card flex h-[clamp(11rem,33dvh,18rem)] min-h-0 shrink-0 flex-col overflow-hidden rounded-[1.5rem] bg-[#F7FAFE] text-[#30425C] shadow-[0_8px_24px_rgba(48,66,92,0.1)]">
    <header className="flex shrink-0 items-center gap-2 px-3 pb-1.5 pt-2.5 sm:px-4">
      <DrawGuessCatSprite animated catId={room.seats.find((seat) => seat.number === room.viewerSeat + 1)?.catId} mood={mood} size={39} />
      <div className="min-w-0 flex-1"><h2 className="text-sm font-black leading-tight">{t.title}</h2><p className="text-[11px] font-semibold text-[#65748A]">{isArtist ? t.empty : t.hint}</p></div>
      {status ? <span role="status" className="max-w-24 truncate rounded-full bg-[#FFF0C9] px-2 py-1 text-[10px] font-bold text-[#765A35]">{status}</span> : null}
    </header>
    <div ref={listRef} role="log" aria-label={t.title} aria-live="polite" aria-relevant="additions" onScroll={(event) => {
      const element = event.currentTarget;
      followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
    }} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-2 [scrollbar-width:thin] sm:px-4">
      {!messages.length && !pending ? <div className="flex h-full min-h-12 items-center justify-center gap-2 text-xs font-semibold text-[#8390A1]"><Sparkles className="h-4 w-4" />{t.empty}</div> : null}
      {messages.map((message) => {
        const name = room.seats.find((seat) => seat.number === message.seat + 1)?.name ?? `#${message.seat + 1}`;
        const own = message.seat === room.viewerSeat;
        return <div key={message.id} className={`draw-guess-chat-bubble flex ${own ? "justify-end" : "justify-start"}`}>
          <div className="max-w-[85%] min-w-0">
            {!message.correct ? <p className={`mb-0.5 truncate px-2 text-[10px] font-bold text-[#65748A] ${own ? "text-right" : ""}`}>{name}</p> : null}
            <div className={`w-fit max-w-full rounded-[1.2rem] px-3 py-1.5 text-sm font-semibold leading-snug break-words ${own ? "ml-auto" : ""} ${message.correct ? "bg-[#C9EED5] text-[#205D40] shadow-[0_3px_0_#9ED3AB]" : "bg-white text-[#30425C] shadow-[0_3px_0_#DCE7EF]"}`}>
              {message.correct ? <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 shrink-0 stroke-[3]" />{name} {t.correct}</span> : message.text}
            </div>
          </div>
        </div>;
      })}
      {pending ? <div className="draw-guess-chat-bubble flex justify-end"><div className="max-w-[85%]"><p className="mb-0.5 px-2 text-right text-[10px] font-bold text-[#65748A]">{room.seats.find((seat) => seat.number === room.viewerSeat + 1)?.name ?? "—"}</p><div className="rounded-[1.2rem] bg-white px-3 py-1.5 text-sm font-semibold text-[#30425C] opacity-70 shadow-[0_3px_0_#DCE7EF]">{pending.text}<LoaderCircle aria-label={t.pending} className="ml-2 inline h-3.5 w-3.5 animate-spin" /></div></div></div> : null}
    </div>
    <div className="shrink-0 bg-white/85 px-2.5 pb-2.5 pt-2 sm:px-3">
      {canGuess ? <form onSubmit={onSubmit} className="flex items-center gap-2"><input aria-label={t.hint} autoComplete="off" enterKeyHint="send" maxLength={20} value={input} onChange={(event) => onInputChange(event.target.value)} placeholder={t.placeholder} className="min-h-11 min-w-0 flex-1 rounded-full border border-[#D5E4F2] bg-[#FFFCF5] px-4 text-base outline-none focus:border-[#3F74AE]" /><button type="submit" disabled={busy || !input.trim()} className="draw-guess-btn draw-guess-btn--candy min-h-11 shrink-0 px-4 text-sm"><Send className="h-4 w-4" />{t.send}</button></form>
        : <div role="status" className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[#ECF4FB] px-3 text-xs font-bold text-[#63758D]"><Check className="h-4 w-4" />{room.view.phase === "TURN_REVEAL" ? t.reveal : guessed ? t.solved : t.artist}</div>}
      {error ? <p role="alert" className="mt-2 rounded-xl bg-[#FFF0D2] px-3 py-1.5 text-xs font-semibold text-[#865731]">{error}</p> : null}
    </div>
  </section>;
}
