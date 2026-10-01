import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Crown } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { DrawGuessArtwork } from "@/features/game-tools/components/DrawGuessCanvas";
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
  const seatName = (seat: number) => result.room.seats.find((item) => item.number === seat + 1)?.name ?? `#${seat + 1}`;

  return <PageContainer className="max-w-[900px] pb-24 pt-5" mobileSafeBottom mobileSafeTop>
    <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[#156240]" href={withLocale(locale, `/game-tools/draw-guess/rooms/${roomId}`)}><ArrowLeft className="h-4 w-4" />{zh ? "返回房间" : "Back to room"}</Link>
    <header className="mt-5 rounded-[2rem] bg-[#F6F3E8] p-6 text-[#173D32] sm:p-8"><p className="text-xs font-bold uppercase tracking-widest text-[#A75B48]">{result.room.code}</p><h1 className="mt-2 text-3xl font-bold">{zh ? "往期作品与排行" : "Past games and artwork"}</h1><p className="mt-2 text-sm text-[#65766A]">{zh ? "每局结束后保存，最多保留 1 年。" : "Finished games remain read-only for up to one year."}</p></header>
    {result.rounds.length ? <div className="mt-6 space-y-8">{result.rounds.map((round) => <section key={round.roundNumber} className="rounded-[1.6rem] border border-[#DCE6D7] bg-white p-5 text-[#173D32] sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-2"><h2 className="text-xl font-bold">{zh ? `第 ${round.roundNumber} 局` : `Game ${round.roundNumber}`}</h2><time className="text-xs text-[#718276]" dateTime={round.finishedAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(round.finishedAt))}</time></div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2">{getDrawGuessRankings(result.room.practiceBotSeat === undefined ? round.scores : round.scores.slice(0, -1)).map((item) => <li key={item.seat} className="flex items-center gap-3 rounded-xl bg-[#F3F5EE] px-4 py-2 text-sm"><span className="w-6 font-bold text-[#C4734F]">{item.rank}</span><span className="flex-1 truncate font-semibold">{seatName(item.seat)}</span><strong>{item.score}</strong></li>)}</ol>
      {round.chains ? <div className="mt-6 space-y-5">{round.chains.map((chain, owner) => <article key={owner} className="rounded-2xl bg-[#F8F7F1] p-4"><h3 className="font-bold">{seatName(owner)} · {round.matchResults?.[String(owner)] ? zh ? "首尾吻合" : "Matched" : zh ? "首尾不同" : "Changed"}</h3>{round.voteCounts?.[owner] ? <p className="mt-1 text-xs text-[#66776C]">{zh ? "投票" : "Votes"}: {zh ? "吻合" : "Yes"} {round.voteCounts[owner].yes} · {zh ? "不同" : "No"} {round.voteCounts[owner].no} · {zh ? "弃权" : "Abstain"} {round.voteCounts[owner].abstain}</p> : null}<div className="mt-3 space-y-3">{chain.map((step, index) => <div key={index} className="rounded-xl bg-white p-3"><div className="mb-2 flex items-center gap-2 text-xs text-[#66776C]"><span>{index + 1}. {seatName(step.seat)}</span>{step.system ? <span>{zh ? "系统补位" : "Auto-filled"}</span> : null}{round.picks?.[String(owner)] === index ? <Crown aria-label="Best artwork" className="ml-auto h-4 w-4 text-[#C4734F]" /> : null}</div>{step.kind === "WORD" ? <p className="text-lg font-bold">{step.value}</p> : <div className="aspect-[10/7] max-w-lg overflow-hidden rounded-xl border border-[#E1E7DD]">{round.artworkUrls[`${owner}:${index}`] ? <img alt={zh ? `${seatName(step.seat)} 的作品` : `Drawing by ${seatName(step.seat)}`} className="h-full w-full object-contain" src={round.artworkUrls[`${owner}:${index}`]} /> : <DrawGuessArtwork strokes={step.value} />}</div>}{!step.system ? <DrawGuessReportButton kind={step.kind} locale={locale} ownerSeat={owner} roomId={roomId} roundNumber={round.roundNumber} stage={index} /> : null}</div>)}</div></article>)}</div> : null}
      {round.classicTurns ? <div className="mt-6 space-y-4">{round.classicTurns.map((turn, index) => <article key={index} className="rounded-2xl bg-[#F8F7F1] p-4"><h3 className="font-bold">{zh ? `第 ${index + 1} 轮` : `Turn ${index + 1}`} · {seatName(index)} · {turn.answer}</h3><div className="mt-3 aspect-[10/7] max-w-lg overflow-hidden rounded-xl border border-[#E1E7DD]"><DrawGuessArtwork strokes={turn.drawing} /></div><p className="mt-2 text-xs text-[#66776C]">{zh ? "猜中人数" : "Solved"}: {Object.keys(turn.guesses).length}</p></article>)}</div> : null}
    </section>)}</div> : <p className="mt-6 rounded-xl bg-[#F6F3E8] p-5 text-[#607268]">{zh ? "还没有结束的对局。" : "No finished games yet."}</p>}
  </PageContainer>;
}
