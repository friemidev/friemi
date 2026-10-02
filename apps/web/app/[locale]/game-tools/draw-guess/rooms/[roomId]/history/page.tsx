import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Crown } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { DrawGuessArtworkCarousel } from "@/features/game-tools/components/DrawGuessArtworkCarousel";
import { DrawGuessArtwork } from "@/features/game-tools/components/DrawGuessCanvas";
import { DrawGuessClassicRecap } from "@/features/game-tools/components/DrawGuessClassicRecap";
import { DrawGuessReportButton } from "@/features/game-tools/components/DrawGuessReportButton";
import { getDrawGuessRankings } from "@/features/game-tools/drawGuessEngine";
import { getDrawGuessHistory } from "@/features/game-tools/drawGuessRoomServer";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

export default async function DrawGuessHistoryPage({ params }: { params: Promise<{ locale: string; roomId: string }> }) {
  const { locale, roomId } = await params;
  const profile = await getOptionalCurrentUserProfile();
  if (!profile) redirect(withLocale(locale, "/game-tools/draw-guess"));
  const result = await getDrawGuessHistory(roomId, profile.id);
  if ("error" in result) notFound();
  const zh = locale === "zh-CN";
  const seatName = (seats: { name: string; number: number }[], seat: number) => seats.find((item) => item.number === seat + 1)?.name ?? `#${seat + 1}`;

  return <PageContainer className="draw-guess-theme max-w-[900px] pb-24 pt-5" mobileSafeBottom mobileSafeTop>
    <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[#3E6FA8]" href={withLocale(locale, `/game-tools/draw-guess/join/${result.room.code}`)}><ArrowLeft className="h-4 w-4" />{zh ? "返回房间" : "Back to room"}</Link>
    <header className="mt-5 rounded-[2rem] bg-[#F1F6FC] p-6 text-[#30425C] sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-[#3E70AA]">{result.room.code}</p><h1 className="mt-2 text-3xl font-bold">{zh ? "往期作品与排行" : "Past games and artwork"}</h1><p className="mt-2 text-sm text-[#63758D]">{zh ? "每局结束后保存，最多保留 1 年。" : "Finished games remain read-only for up to one year."}</p></header>
    {result.rounds.length ? <div className="mt-6 space-y-8">{result.rounds.map((round) => <section key={round.roundNumber} className="rounded-[1.6rem] border border-[#DCE8F2] bg-white p-5 text-[#30425C] sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-2"><h2 className="text-xl font-bold">{zh ? `第 ${round.roundNumber} 局` : `Game ${round.roundNumber}`}</h2><time className="text-xs text-[#7C8AA0]" dateTime={round.finishedAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(round.finishedAt))}</time></div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2">{getDrawGuessRankings(round.practiceBotSeat === undefined ? round.scores : round.scores.slice(0, -1)).map((item) => <li key={item.seat} className="flex items-center gap-3 rounded-xl bg-[#F7FAFE] px-4 py-2 text-sm"><span className="w-6 font-bold text-[#D9A447]">{item.rank}</span><span className="flex-1 truncate font-semibold">{seatName(round.seats, item.seat)}</span><strong>{item.score}</strong></li>)}</ol>
      {round.classicHighlight ? <div className="mt-5"><DrawGuessClassicRecap code={result.room.code} highlight={round.classicHighlight} locale={locale} roomId={roomId} roundNumber={round.roundNumber} seats={round.seats} /></div> : null}
      {round.chains ? <div className="mt-6 space-y-5">{round.chains.map((chain, owner) => <article key={owner} className="rounded-2xl bg-[#F7FAFE] p-4"><h3 className="font-bold">{seatName(round.seats, owner)} · {round.matchResults?.[String(owner)] ? zh ? "首尾吻合" : "Matched" : zh ? "首尾不同" : "Changed"}</h3>{round.voteCounts?.[owner] ? <p className="mt-1 text-xs text-[#63758D]">{zh ? "投票" : "Votes"}: {zh ? "吻合" : "Yes"} {round.voteCounts[owner].yes} · {zh ? "不同" : "No"} {round.voteCounts[owner].no} · {zh ? "弃权" : "Abstain"} {round.voteCounts[owner].abstain}</p> : null}<div className="mt-3 space-y-3">{chain.map((step, index) => <div key={index} className="rounded-xl bg-white p-3"><div className="mb-2 flex items-center gap-2 text-xs text-[#63758D]"><span>{index + 1}. {seatName(round.seats, step.seat)}</span>{step.system ? <span>{zh ? "系统补位" : "Auto-filled"}</span> : null}{round.picks?.[String(owner)] === index ? <Crown aria-label="Best artwork" className="ml-auto h-4 w-4 text-[#D9A447]" /> : null}</div>{step.kind === "WORD" ? <p className="text-lg font-bold">{step.value}</p> : <div className="aspect-[10/7] max-w-lg overflow-hidden rounded-xl border border-[#DCE8F2]">{round.artworkUrls[`${owner}:${index}`] ? <img alt={zh ? `${seatName(round.seats, step.seat)} 的作品` : `Drawing by ${seatName(round.seats, step.seat)}`} className="h-full w-full object-contain" src={round.artworkUrls[`${owner}:${index}`]} /> : <DrawGuessArtwork strokes={step.value} />}</div>}{!step.system ? <DrawGuessReportButton kind={step.kind} locale={locale} ownerSeat={owner} roomId={roomId} roundNumber={round.roundNumber} stage={index} /> : null}</div>)}</div></article>)}</div> : null}
      {round.classicTurns?.length ? <div id={`artwork-${round.roundNumber}`} className="mt-6 scroll-mt-24"><DrawGuessArtworkCarousel locale={locale} seats={round.seats} turns={round.classicTurns.map((turn, index) => ({ answer: turn.answer, artistSeat: index % Math.max(1, round.seats.length), chat: turn.chat, drawing: turn.drawing }))} /></div> : null}
    </section>)}</div> : <p className="mt-6 rounded-xl bg-[#F1F6FC] p-5 text-[#63758D]">{zh ? "还没有结束的对局。" : "No finished games yet."}</p>}
  </PageContainer>;
}
