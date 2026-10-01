"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Brush, Check, LoaderCircle, Sparkles } from "lucide-react";
import type { DrawGuessMode } from "@/features/game-tools/drawGuessEngine";
import { withLocale } from "@/lib/routes";

function copyFor(locale: string) {
  if (locale === "en") return { back: "Table games", title: "Draw & Guess", chain: "Picture chain", chainBody: "Draw, pass, guess", classic: "Speed round", classicBody: "Draw and guess live", create: "Create room", join: "Join room", code: "Room code", enter: "Join", closed: "Coming soon", signedOut: "Sign in to create or join a room.", error: "Could not open the room. Try again.", full: "This room is full.", started: "This game has already started." };
  if (locale === "fr") return { back: "Jeux de table", title: "Dessine et devine", chain: "Chaîne de dessins", chainBody: "Dessiner et transmettre", classic: "Devine vite", classicBody: "Dessiner et deviner", create: "Créer une salle", join: "Rejoindre une salle", code: "Code de salle", enter: "Rejoindre", closed: "Bientôt", signedOut: "Connectez-vous pour créer ou rejoindre une salle.", error: "Impossible d'ouvrir la salle. Réessayez.", full: "Cette salle est complète.", started: "La partie a déjà commencé." };
  return { back: "桌游工具", title: "你画我猜", chain: "画画接龙", chainBody: "轮流画猜", classic: "抢答模式", classicBody: "边画边猜", create: "创建房间", join: "加入房间", code: "房间号", enter: "加入", closed: "暂未开放", signedOut: "请先登录 Friemi，再创建或加入房间。", error: "房间暂时无法打开，请重试。", full: "房间已满。", started: "这局已经开始，暂时不能加入。" };
}

export function DrawGuessEntryClient({ chainEnabled, classicEnabled, locale }: { chainEnabled: boolean; classicEnabled: boolean; locale: string }) {
  const router = useRouter();
  const copy = copyFor(locale);
  const [mode, setMode] = useState<DrawGuessMode>(classicEnabled ? "CLASSIC" : "CHAIN");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function createRoom() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/game-tools/draw-guess/rooms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale, mode }) });
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
      const response = await fetch("/api/game-tools/draw-guess/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: code.trim().toUpperCase() }) });
      const result = await response.json();
      if (!response.ok || !result.roomId) throw new Error(result.error ?? "UNKNOWN");
      router.push(withLocale(locale, `/game-tools/draw-guess/rooms/${result.roomId}`));
    } catch (cause) {
      setError(cause instanceof Error && cause.message === "SIGN_IN_REQUIRED" ? copy.signedOut : cause instanceof Error && cause.message === "ROOM_FULL" ? copy.full : cause instanceof Error && cause.message === "ALREADY_STARTED" ? copy.started : copy.error);
    } finally { setBusy(false); }
  }

  return <div className="draw-guess-theme mx-auto flex w-full max-w-2xl flex-col gap-5">
    <Link href={withLocale(locale, "/game-tools")} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-[#63758D] transition-colors hover:text-[#3E6FA8]"><ArrowLeft className="h-4 w-4" />{copy.back}</Link>
    <header className="draw-guess-hero-in flex items-center justify-between gap-3 px-1 py-1">
      <div className="min-w-0">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{copy.title}</h1>
      </div>
      <div className="draw-guess-logo-in relative grid h-20 w-20 shrink-0 place-items-center sm:h-24 sm:w-24">
        <span aria-hidden="true" className="absolute inset-1 rotate-[-13deg] rounded-[2rem] bg-[#DCECF9] shadow-[0_5px_0_#B9D4EB]" />
        <Image alt="" className="relative h-[4.3rem] w-[4.3rem] object-contain sm:h-20 sm:w-20" height={80} src="/game-tools/draw-guess/logo.png" width={80} />
      </div>
    </header>
    <section aria-label={copy.title} className="grid grid-cols-2 gap-3">
      {(["CLASSIC", "CHAIN"] as const).map((value) => {
        const isChain = value === "CHAIN";
        const enabled = isChain ? chainEnabled : classicEnabled;
        const selected = mode === value;
        return <button
          key={value}
          type="button"
          disabled={!enabled}
          onClick={() => setMode(value)}
          aria-pressed={selected}
          className={`draw-guess-mode-tile group relative min-h-36 overflow-hidden rounded-[1.65rem] p-4 text-left outline-none transition-[transform,box-shadow,background-color] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[#3F74AE] focus-visible:ring-offset-2 motion-safe:hover:-translate-y-1 motion-safe:active:translate-y-0.5 motion-reduce:transition-none sm:min-h-40 sm:p-5 ${isChain ? selected ? "bg-[#E8E9F8] shadow-[0_6px_0_#C8CEEA]" : "bg-[#F4F5FC] shadow-[0_4px_0_#DFE4F2]" : selected ? "bg-[#DBEBF9] shadow-[0_6px_0_#B9D4EB]" : "bg-[#F3F8FC] shadow-[0_4px_0_#DDE7F2]"} ${enabled ? "" : "cursor-not-allowed opacity-80 motion-safe:hover:translate-y-0"}`}
          style={{ animationDelay: isChain ? "150ms" : "70ms" }}
        >
          <span aria-hidden="true" className="absolute -right-6 -top-7 h-20 w-20 rounded-full bg-white/35" />
          <span className={`relative inline-grid h-10 w-10 place-items-center rounded-2xl text-white shadow-[0_3px_0_rgba(48,66,92,0.16)] transition-transform duration-200 motion-safe:group-hover:rotate-12 ${isChain ? "bg-[#8099C8]" : "bg-[#3C73B0]"}`}>{isChain ? <Sparkles className="h-5 w-5" /> : <Brush className="h-5 w-5" />}</span>
          <strong className="relative mt-3 block text-base font-black leading-tight sm:text-lg">{isChain ? copy.chain : copy.classic}</strong>
          <span className="relative mt-1 block text-xs font-medium leading-5 text-[#63758D] sm:text-sm">{isChain ? copy.chainBody : copy.classicBody}</span>
          {selected ? <span aria-hidden="true" className="draw-guess-check-pop absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-[#3E70AA] shadow-sm"><Check className="h-4 w-4 stroke-[3]" /></span> : null}
          {!enabled ? <span className="absolute right-3 top-3 text-[10px] font-bold text-[#65748A]">{copy.closed}</span> : null}
        </button>;
      })}
    </section>
    <button
      disabled={busy || mode === "CHAIN" && !chainEnabled || mode === "CLASSIC" && !classicEnabled}
      onClick={() => void createRoom()}
      type="button"
      className="draw-guess-btn draw-guess-btn--candy draw-guess-primary-in group min-h-14 w-full px-5 text-base"
    >
      {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5 transition-transform motion-safe:group-hover:translate-x-1" />}{copy.create}
    </button>
    <section aria-label={copy.join} className="draw-guess-join-in pt-1">
      <div className="flex gap-2">
        <input id="draw-guess-room-code" aria-label={copy.code} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} className="min-h-12 min-w-0 flex-1 rounded-full border border-[#D5E4F2] bg-[#FFFCF5] px-5 text-base font-bold uppercase tracking-widest outline-none transition-colors focus:border-[#3F74AE]" maxLength={8} placeholder={copy.code} value={code} onChange={(event) => setCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void joinRoom(); }} />
        <button disabled={busy || !code.trim()} onClick={() => void joinRoom()} type="button" className="draw-guess-btn draw-guess-btn--blush min-h-12 px-5 text-sm">{copy.enter}</button>
      </div>
    </section>
    {error ? <p role="alert" className="rounded-2xl bg-[#FFE8E5] px-4 py-3 text-sm font-semibold text-[#9A3B32]">{error}</p> : null}
  </div>;
}
