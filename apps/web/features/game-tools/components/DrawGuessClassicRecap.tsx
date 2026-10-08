"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Images, Sparkles } from "lucide-react";
import { DrawGuessArtwork } from "@/features/game-tools/components/DrawGuessCanvas";
import { DrawGuessReportButton } from "@/features/game-tools/components/DrawGuessReportButton";
import type { DrawGuessClassicHighlight } from "@/features/game-tools/drawGuessEngine";

export function DrawGuessClassicRecap({ code, highlight, historyHref, locale, preview = false, roomId, roundNumber, seats }: {
  code: string;
  highlight: DrawGuessClassicHighlight | null | undefined;
  historyHref?: string;
  locale: string;
  preview?: boolean;
  roomId: string;
  roundNumber: number;
  seats: { name: string; number: number }[];
}) {
  const [imageError, setImageError] = useState(false);
  if (!highlight) return null;
  const zh = locale === "zh-CN";
  const fr = locale === "fr";
  const nameFor = (seat: number) => seats.find((player) => player.number === seat % Math.max(1, seats.length) + 1)?.name ?? `#${seat % Math.max(1, seats.length) + 1}`;
  const title = zh ? "这局的趣味回放" : fr ? "Les moments de la partie" : "The fun moments";
  const artworkLabel = highlight.laughCount ? zh ? "😂 最多笑声的画" : fr ? "😂 Le dessin le plus drôle" : "😂 Most laughs" : zh ? "这一轮的画" : fr ? "Dessin de la manche" : "Drawing of the round";
  const hasGuessLaughs = highlight.wrongGuesses.some((guess) => guess.laughs > 0);
  const guessesLabel = hasGuessLaughs ? zh ? "全场笑点" : fr ? "Les réponses qui ont fait rire" : "Crowd favorites" : zh ? "本局脑洞猜词" : fr ? "Réponses inattendues" : "Wild guesses";

  function makeImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1400;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setImageError(true); return null; }
    ctx.fillStyle = "#EDF5FC";
    ctx.fillRect(0, 0, 1080, 1400);
    ctx.fillStyle = "#30425C";
    ctx.font = "bold 52px sans-serif";
    ctx.fillText(title, 64, 104);
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "#63758D";
    ctx.fillText(`${code}  ·  ${roundNumber}`, 880, 102, 150);
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(56, 145, 968, 686, 36);
    ctx.fill();
    for (const stroke of highlight!.drawing) {
      if (!stroke.points.length) continue;
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = Math.max(2, stroke.width * 0.96);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const [first, ...rest] = stroke.points;
      const x = (point: [number, number]) => 60 + point[0] * 960;
      const y = (point: [number, number]) => 152 + point[1] * 672;
      ctx.beginPath();
      if (!rest.length) { ctx.arc(x(first), y(first), ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.moveTo(x(first), y(first)); for (const point of rest) ctx.lineTo(x(point), y(point)); ctx.stroke(); }
    }
    ctx.fillStyle = "#30425C";
    ctx.font = "bold 38px sans-serif";
    ctx.fillText(`${nameFor(highlight!.artistSeat)} · ${highlight!.answer}`, 64, 905, 950);
    ctx.fillStyle = "#3E6FA8";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(guessesLabel, 64, 969);
    highlight!.wrongGuesses.forEach((guess, index) => {
      const top = 995 + index * 148;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(64, top, 952, 128, 20);
      ctx.fill();
      ctx.fillStyle = "#30425C";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText(`“${guess.text}”`, 90, top + 51, 800);
      ctx.fillStyle = "#63758D";
      ctx.font = "bold 23px sans-serif";
      ctx.fillText(`${nameFor(guess.seat)} · ${guess.answer}${guess.laughs ? `  😂 ${guess.laughs}` : ""}`, 90, top + 96, 870);
    });
    ctx.fillStyle = "#63758D";
    ctx.font = "bold 23px sans-serif";
    ctx.fillText("Friemi · Draw & Guess", 64, 1368);
    try {
      const url = canvas.toDataURL("image/png");
      setImageError(false);
      return url;
    } catch { setImageError(true); return null; }
  }

  return <section id={historyHref ? "draw-guess-classic-recap" : undefined} aria-label={title} className="draw-guess-theme scroll-mt-4 rounded-[1.8rem] bg-[#EDF5FC] p-4 text-[#30425C] shadow-[0_10px_30px_rgba(48,66,92,.08)] sm:p-6">
    <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#D9A447]" /><h2 className="text-lg font-black sm:text-xl">{title}</h2></div>
    <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="aspect-[10/7] overflow-hidden rounded-[1.25rem] border-[3px] border-white bg-white shadow-[0_4px_0_#D7E6F2]"><DrawGuessArtwork strokes={highlight.drawing} /></div>
        <div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-[#3E6FA8]">{artworkLabel}</span><strong className="text-sm">{nameFor(highlight.artistSeat)} · {highlight.answer}</strong></div>
        {historyHref && !preview ? <DrawGuessReportButton kind="DRAWING" locale={locale} ownerSeat={highlight.artistSeat} roomId={roomId} roundNumber={roundNumber} stage={0} /> : null}
      </div>
      <div className="flex min-w-0 flex-col"><h3 className="text-sm font-black">{guessesLabel}</h3>
        {highlight.wrongGuesses.length ? <ol className="mt-2 grid gap-2">{highlight.wrongGuesses.map((guess, index) => <li key={`${index}:${guess.seat}`} className={`min-w-0 rounded-2xl px-3 py-2.5 shadow-[0_2px_0_#DDE9F2] ${index === 0 && guess.laughs ? "bg-[#FFECC0]" : "bg-white"}`}><div className="flex items-start justify-between gap-2"><strong className="min-w-0 break-words text-sm leading-snug">“{guess.text}”</strong>{guess.laughs ? <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-xs font-black text-[#765A35]">😂 {guess.laughs}</span> : null}</div><p className="mt-1 text-[11px] font-semibold text-[#63758D]">{nameFor(guess.seat)} · {zh ? "答案" : fr ? "Réponse" : "Answer"} {guess.answer}</p></li>)}</ol>
          : <p className="mt-2 text-xs font-semibold text-[#63758D]">{zh ? "大家猜得太快，还没有离谱答案。" : fr ? "Trop vite deviné pour des réponses folles." : "Guessed too quickly for wild guesses."}</p>}
        <div className="mt-auto flex flex-wrap gap-2 pt-5"><a href="#" download={`friemi-draw-guess-${code}-${roundNumber}.png`} onClick={(event) => { const url = makeImage(); if (url) event.currentTarget.href = url; else event.preventDefault(); }} className="draw-guess-btn draw-guess-btn--butter min-h-10 px-3 text-xs"><Download className="h-4 w-4" />{zh ? "保存图片" : fr ? "Enregistrer l’image" : "Save image"}</a>{historyHref ? <Link href={historyHref} className="draw-guess-btn draw-guess-btn--milk min-h-10 px-3 text-xs"><Images className="h-4 w-4" />{zh ? "全部作品" : fr ? "Tous les dessins" : "All artwork"}</Link> : null}</div>
        {imageError ? <p role="status" className="mt-2 text-xs font-semibold text-[#9A3B32]">{zh ? "图片保存失败，请重试" : fr ? "Impossible d’enregistrer l’image" : "Could not save image"}</p> : null}
      </div>
    </div>
  </section>;
}
