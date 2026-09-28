"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Brush, LoaderCircle, Sparkles, UsersRound } from "lucide-react";
import type { DrawGuessMode } from "@/features/game-tools/drawGuessEngine";
import { withLocale } from "@/lib/routes";

function copyFor(locale: string) {
  if (locale === "en") return {
    back: "Table tools", chain: "Picture chain", chainBody: "Everyone starts with a word. Pass drawings and guesses around, then vote on the ending.",
    classic: "Speed guessing · Preview", classicBody: "Take turns drawing. Strokes appear as they finish; latency testing is still in progress.", classicClosed: "Invite-only preview",
    code: "Room code", create: "Create room", error: "Could not open the room. Please try again.", join: "Join a room", joinAction: "Join", players: "Players", subtitle: "One canvas, two ways to laugh together.", title: "Draw & Guess", signedOut: "Sign in to create or join a room.",
  };
  if (locale === "fr") return {
    back: "Jeux de table", chain: "Chaîne de dessins", chainBody: "Chacun commence par un mot. Faites circuler dessins et réponses, puis votez sur la fin.",
    classic: "Deviner vite · Essai", classicBody: "Dessinez à tour de rôle. Les traits apparaissent une fois terminés ; les tests de latence continuent.", classicClosed: "Essai sur invitation",
    code: "Code de salle", create: "Créer une salle", error: "Impossible d'ouvrir la salle. Réessayez.", join: "Rejoindre une salle", joinAction: "Entrer", players: "Joueurs", subtitle: "Une toile, deux façons de rire ensemble.", title: "Dessine et devine", signedOut: "Connectez-vous pour créer ou rejoindre une salle.",
  };
  return {
    back: "桌游工具", chain: "画画接龙", chainBody: "每人出一个词，画和猜轮流传下去。最后揭晓全链、投票并选最佳作品。",
    classic: "抢猜模式 · 体验版", classicBody: "轮流作画、边看边猜。笔画完成后同步；正式实时版仍待延迟压测。", classicClosed: "仅限内测",
    code: "房间号", create: "创建房间", error: "房间暂时无法打开，请重试。", join: "加入朋友的房间", joinAction: "加入房间", players: "人数", subtitle: "一张画布，两种热闹。", title: "你画我猜", signedOut: "请先登录 Friemi，再创建或加入房间。",
  };
}

export function DrawGuessEntryClient({ classicEnabled, locale }: { classicEnabled: boolean; locale: string }) {
  const router = useRouter();
  const copy = copyFor(locale);
  const [mode, setMode] = useState<DrawGuessMode>("CHAIN");
  const [playerCount, setPlayerCount] = useState(5);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createRoom() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/game-tools/draw-guess/rooms", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, mode, playerCount }),
      });
      const result = await response.json();
      if (!response.ok || !result.room?.id) throw new Error(result.error ?? "UNKNOWN");
      router.push(withLocale(locale, `/game-tools/draw-guess/rooms/${result.room.id}`));
    } catch (cause) {
      setError(cause instanceof Error && cause.message === "SIGN_IN_REQUIRED" ? copy.signedOut : copy.error);
    } finally { setBusy(false); }
  }

  async function joinRoom() {
    if (!code.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/game-tools/draw-guess/join", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const result = await response.json();
      if (!response.ok || !result.roomId) throw new Error(result.error ?? "UNKNOWN");
      router.push(withLocale(locale, `/game-tools/draw-guess/rooms/${result.roomId}`));
    } catch (cause) {
      setError(cause instanceof Error && cause.message === "SIGN_IN_REQUIRED" ? copy.signedOut : copy.error);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6 text-[#173D32]">
      <Link href={withLocale(locale, "/game-tools")} className="inline-flex items-center gap-2 text-sm font-semibold text-[#156240] hover:underline"><ArrowLeft className="h-4 w-4" />{copy.back}</Link>
      <section className="relative overflow-hidden rounded-[2rem] bg-[#F6F3E8] px-6 pb-7 pt-8 shadow-[0_18px_55px_rgba(20,57,42,0.1)] sm:px-9">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#F2AA89]/50 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A75B48]">Friemi · Table Games</p><h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{copy.title}</h1><p className="mt-3 text-base text-[#45675B]">{copy.subtitle}</p></div>
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[1.4rem] bg-[#E8A184] text-white shadow-[0_12px_25px_rgba(210,117,84,0.24)]"><Brush className="h-8 w-8" /></span>
        </div>
      </section>

      <section aria-label={copy.title} className="grid gap-3 sm:grid-cols-2">
        {(["CHAIN", "CLASSIC"] as const).map((value) => {
          const selected = mode === value;
          const isChain = value === "CHAIN";
          return <button key={value} type="button" disabled={!isChain && !classicEnabled} onClick={() => { setMode(value); setPlayerCount(isChain ? 5 : 3); }} aria-pressed={selected}
            className={`rounded-[1.6rem] border p-5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#156240] ${selected ? "border-[#156240] bg-[#EAF3E9] shadow-[0_12px_28px_rgba(21,98,64,0.12)]" : "border-[#D9DDCE] bg-white hover:border-[#8AB68E]"} ${!isChain && !classicEnabled ? "cursor-not-allowed opacity-65" : ""}`}>
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${selected ? "bg-[#156240] text-white" : "bg-[#F4E9D9] text-[#A85E48]"}`}>{isChain ? <Sparkles className="h-5 w-5" /> : <Brush className="h-5 w-5" />}</span>
            <strong className="mt-4 block text-lg">{isChain ? copy.chain : copy.classic}</strong>
            <span className="mt-2 block text-sm leading-6 text-[#5D7369]">{isChain ? copy.chainBody : copy.classicBody}</span>
            {!isChain && !classicEnabled ? <span className="mt-3 inline-flex rounded-full bg-[#F4E9D9] px-2.5 py-1 text-xs font-bold text-[#9A5A43]">{copy.classicClosed}</span> : null}
          </button>;
        })}
      </section>

      <section className="rounded-[1.6rem] border border-[#D9DDCE] bg-white p-5 sm:p-6">
        <label htmlFor="draw-guess-count" className="flex items-center gap-2 text-sm font-bold"><UsersRound className="h-4 w-4" />{copy.players}: <span className="text-[#C46D50]">{playerCount}</span></label>
        <input id="draw-guess-count" className="mt-4 w-full accent-[#156240]" type="range" min={mode === "CHAIN" ? 5 : 3} max={mode === "CHAIN" ? 8 : 10} value={playerCount} onChange={(event) => setPlayerCount(Number(event.target.value))} />
        <button disabled={busy} onClick={createRoom} type="button" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#156240] px-5 font-bold text-white transition hover:bg-[#0B4E33] disabled:opacity-50">{busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}{copy.create}</button>
      </section>

      <section className="rounded-[1.6rem] border border-[#E8D6C8] bg-[#FFF9F5] p-5 sm:p-6">
        <h2 className="font-bold">{copy.join}</h2>
        <div className="mt-3 flex gap-2"><input aria-label={copy.code} className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#D9DDCE] bg-white px-4 text-base font-semibold uppercase tracking-widest outline-none focus:border-[#156240]" maxLength={8} placeholder={copy.code} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /><button disabled={busy || !code.trim()} onClick={joinRoom} type="button" className="rounded-xl bg-[#E8A184] px-5 text-sm font-bold text-[#422919] disabled:opacity-50">{copy.joinAction}</button></div>
      </section>
      {error ? <p role="alert" className="rounded-xl bg-[#FFE8E5] px-4 py-3 text-sm font-semibold text-[#9A3B32]">{error}</p> : null}
    </div>
  );
}
