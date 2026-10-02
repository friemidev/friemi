"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Pause, Play, Sparkles } from "lucide-react";
import { DrawGuessArtwork } from "@/features/game-tools/components/DrawGuessCanvas";
import type { DrawGuessChatMessage, DrawStroke } from "@/features/game-tools/drawGuessEngine";

export type DrawGuessCarouselTurn = {
  answer: string;
  artistSeat: number;
  chat: DrawGuessChatMessage[];
  drawing: DrawStroke[];
};

export function DrawGuessArtworkCarousel({ locale, seats, turns }: {
  locale: string;
  seats: { name: string; number: number }[];
  turns: DrawGuessCarouselTurn[];
}) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [readingComments, setReadingComments] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const touchStart = useRef<number | null>(null);
  const zh = locale === "zh-CN";
  const fr = locale === "fr";

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!sectionRef.current || typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || hovered || readingComments || !inView || reducedMotion || turns.length < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((index) => (index + 1) % turns.length);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [active, hovered, inView, playing, readingComments, reducedMotion, turns.length]);

  const index = Math.min(active, Math.max(0, turns.length - 1));
  const turn = turns[index];
  const nameFor = (seat: number) => seats.find((player) => player.number === seat + 1)?.name ?? `#${seat + 1}`;
  const comments = useMemo(() => {
    if (!turn) return [];
    return turn.chat.filter((message) => message.correct || message.text?.trim())
      .map((message, position) => ({ message, position }))
      .sort((a, b) => Date.parse(a.message.at) - Date.parse(b.message.at) || a.position - b.position)
      .map(({ message }) => message);
  }, [turn]);
  const featured = useMemo(() => comments.slice(0, 8), [comments]);

  if (!turn) return null;
  const commentText = (message: DrawGuessChatMessage) => message.correct
    ? zh ? `${nameFor(message.seat)} 已答对` : fr ? `${nameFor(message.seat)} a trouvé !` : `${nameFor(message.seat)} got it!`
    : `${nameFor(message.seat)}：${message.text}`;
  const move = (direction: number) => setActive((current) => (current + direction + turns.length) % turns.length);
  const title = zh ? "全部作品" : fr ? "Tous les dessins" : "All artwork";

  return <section ref={sectionRef} aria-label={title} aria-roledescription={zh ? "作品轮播" : fr ? "Carrousel de dessins" : "Artwork carousel"} className="draw-guess-theme mx-auto min-w-0 max-w-[820px] rounded-[1.7rem] bg-[#EDF5FC] p-3 text-[#30425C] shadow-[0_10px_30px_rgba(48,66,92,.08)] sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-3">
      <h3 className="flex items-center gap-2 text-base font-black sm:text-lg"><Sparkles className="h-5 w-5 text-[#D9A447]" />{title}</h3>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label={showComments ? zh ? "隐藏弹幕" : fr ? "Masquer les commentaires" : "Hide comments" : zh ? "显示弹幕" : fr ? "Afficher les commentaires" : "Show comments"} aria-pressed={showComments} onClick={() => setShowComments((value) => !value)} className={`inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-xs font-bold transition-colors ${showComments ? "bg-white text-[#3E70AA]" : "bg-[#DCE8F2] text-[#63758D]"}`}><MessageCircle className="h-4 w-4" />{zh ? "弹幕" : fr ? "Messages" : "Comments"}</button>
        {turns.length > 1 && !reducedMotion ? <button type="button" aria-label={playing ? zh ? "暂停轮播" : fr ? "Mettre en pause" : "Pause carousel" : zh ? "播放轮播" : fr ? "Reprendre" : "Play carousel"} aria-pressed={playing} onClick={() => setPlaying((value) => !value)} className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#3E70AA] transition-colors hover:bg-[#DCE8F2]">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button> : null}
      </div>
    </div>

    <div className="relative touch-pan-y overflow-hidden rounded-[1.3rem] bg-white shadow-[0_4px_0_#D7E6F2]" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { if (touchStart.current !== null && turns.length > 1) { const distance = event.changedTouches[0]?.clientX - touchStart.current; if (distance && Math.abs(distance) > 45) move(distance < 0 ? 1 : -1); } touchStart.current = null; }} onTouchCancel={() => { touchStart.current = null; }}>
      <div key={index} className="relative aspect-[10/7] min-w-0 overflow-hidden bg-white">
        {turn.drawing.length ? <DrawGuessArtwork strokes={turn.drawing} /> : <div className="grid h-full place-items-center text-sm font-semibold text-[#63758D]">{zh ? "这一轮没有画作" : fr ? "Pas de dessin" : "No drawing this turn"}</div>}
        {showComments && !reducedMotion ? <div aria-hidden="true" data-paused={!playing || hovered || readingComments || !inView} className="draw-guess-danmaku-layer pointer-events-none absolute inset-0 overflow-hidden">
          {featured.map((message, position) => <span key={message.id} className={`draw-guess-danmaku-item absolute inline-block max-w-[72%] truncate rounded-full px-3 py-1.5 text-[11px] font-bold shadow-[0_2px_8px_rgba(48,66,92,.12)] sm:text-xs ${message.correct ? "bg-[#E2F5E7]/95 text-[#246847]" : "bg-white/95 text-[#30425C]"}`} style={{ top: `${9 + (position % 4) * 19}%`, animationDelay: `${position * 1.4}s`, animationDuration: "18s" }}>{commentText(message)}</span>)}
        </div> : null}
      </div>
      {turns.length > 1 ? <><button type="button" onClick={() => move(-1)} aria-label={zh ? "上一幅画" : fr ? "Dessin précédent" : "Previous drawing"} className="absolute left-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[#BED6EC] bg-[#EDF5FC]/95 text-[#3E70AA] shadow-md transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3E70AA]"><ChevronLeft className="h-5 w-5" /></button><button type="button" onClick={() => move(1)} aria-label={zh ? "下一幅画" : fr ? "Dessin suivant" : "Next drawing"} className="absolute right-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-[#BED6EC] bg-[#EDF5FC]/95 text-[#3E70AA] shadow-md transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3E70AA]"><ChevronRight className="h-5 w-5" /></button></> : null}
    </div>

    <div className="flex min-w-0 items-center justify-between gap-3 px-1 pt-3">
      <div className="min-w-0"><p className="text-xs font-bold text-[#63758D]">{zh ? `第 ${index + 1} 幅 · ${nameFor(turn.artistSeat)}` : fr ? `Dessin ${index + 1} · ${nameFor(turn.artistSeat)}` : `Drawing ${index + 1} · ${nameFor(turn.artistSeat)}`}</p><p className="mt-0.5 truncate text-base font-black" title={turn.answer}>{turn.answer || (zh ? "未选词" : fr ? "Sans mot" : "No word")}</p></div><span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-black tabular-nums text-[#3E70AA]">{index + 1} / {turns.length}</span>
    </div>
    {turns.length > 1 ? <div className="mt-3 flex justify-center gap-2" aria-label={zh ? "选择作品" : fr ? "Choisir un dessin" : "Choose drawing"}>{turns.map((_, item) => <button key={item} type="button" onClick={() => setActive(item)} aria-label={zh ? `第 ${item + 1} 幅` : fr ? `Dessin ${item + 1}` : `Drawing ${item + 1}`} aria-current={item === index ? "true" : undefined} className={`h-2.5 rounded-full transition-all ${item === index ? "w-6 bg-[#3E70AA]" : "w-2.5 bg-[#BED6EC] hover:bg-[#7DAAD2]"}`} />)}</div> : null}
    {comments.length ? <details className="mt-3 rounded-xl bg-white/75 px-3 py-2 text-xs text-[#405875]" onToggle={(event) => setReadingComments(event.currentTarget.open)}><summary className="cursor-pointer font-bold">{zh ? `猜词 ${comments.length} 条` : fr ? `${comments.length} réponses` : `${comments.length} guesses`}</summary><ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">{comments.map((message) => <li key={message.id} className="break-words">{commentText(message)}{message.laughedBy?.length ? ` 😂 ${message.laughedBy.length}` : ""}</li>)}</ul></details> : null}
  </section>;
}
