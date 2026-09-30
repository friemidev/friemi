"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, BookOpen, Brush, Check, Clock3, Eye, LoaderCircle, Sparkles, UsersRound, X } from "lucide-react";
import { DRAW_GUESS_DRAW_SECONDS, DRAW_GUESS_GUESS_SECONDS, type DrawGuessMode, type DrawGuessTiming, type DrawGuessWordBankSnapshot } from "@/features/game-tools/drawGuessEngine";
import { withLocale } from "@/lib/routes";

function copyFor(locale: string) {
  if (locale === "en") return {
    back: "Table tools", chain: "Picture chain", chainBody: "Everyone starts with a word. Pass drawings and guesses around, then vote on the ending.",
    classic: "Speed guessing · Preview", classicBody: "Take turns drawing while friends watch each stroke unfold live. Latency testing is still in progress.", classicClosed: "Invite-only preview",
    code: "Room code", create: "Create room", error: "Could not open the room. Please try again.", full: "This room is full.", started: "This game has already started.", unavailable: "New picture-chain rooms are temporarily paused.", join: "Join a room", joinAction: "Join", players: "Players", subtitle: "One canvas, two ways to laugh together.", title: "Draw & Guess", signedOut: "Sign in to create or join a room.",
    bankTitle: "Choose a word pack", bankHint: "Both game modes use the selected pack.", bankPreview: "Preview all words", bankSelected: "Selected", bankWords: "words", bankMissing: "No word packs are available yet.", bankInvalid: "This word pack is unavailable. Choose another pack.", bankClose: "Close preview",
  };
  if (locale === "fr") return {
    back: "Jeux de table", chain: "Chaîne de dessins", chainBody: "Chacun commence par un mot. Faites circuler dessins et réponses, puis votez sur la fin.",
    classic: "Deviner vite · Essai", classicBody: "Dessinez à tour de rôle : vos amis voient les traits se former en direct. Les tests de latence continuent.", classicClosed: "Essai sur invitation",
    code: "Code de salle", create: "Créer une salle", error: "Impossible d'ouvrir la salle. Réessayez.", full: "Cette salle est complète.", started: "La partie a déjà commencé.", unavailable: "La création de salles est temporairement suspendue.", join: "Rejoindre une salle", joinAction: "Entrer", players: "Joueurs", subtitle: "Une toile, deux façons de rire ensemble.", title: "Dessine et devine", signedOut: "Connectez-vous pour créer ou rejoindre une salle.",
    bankTitle: "Choisir un thème", bankHint: "Les deux modes utilisent le thème choisi.", bankPreview: "Voir tous les mots", bankSelected: "Choisi", bankWords: "mots", bankMissing: "Aucun thème disponible pour le moment.", bankInvalid: "Ce thème n'est plus disponible. Choisissez-en un autre.", bankClose: "Fermer l'aperçu",
  };
  return {
    back: "桌游工具", chain: "画画接龙", chainBody: "每人出一个词，画和猜轮流传下去。最后揭晓全链、投票并选最佳作品。",
    classic: "抢猜模式 · 体验版", classicBody: "轮流作画、边看边猜，朋友能实时看到笔画形成。延迟压测仍在进行。", classicClosed: "仅限内测",
    code: "房间号", create: "创建房间", error: "房间暂时无法打开，请重试。", full: "房间已满。", started: "这局已经开始，暂时不能加入。", unavailable: "接龙新房间暂时暂停创建。", join: "加入朋友的房间", joinAction: "加入房间", players: "人数", subtitle: "一张画布，两种热闹。", title: "你画我猜", signedOut: "请先登录 Friemi，再创建或加入房间。",
    bankTitle: "选择本局词库", bankHint: "抢猜和画画接龙都会使用这组词。", bankPreview: "预览全部词语", bankSelected: "已选择", bankWords: "个词", bankMissing: "暂时没有可用词库。", bankInvalid: "这个词库已不可用，请换一个。", bankClose: "关闭预览",
  };
}

function practiceCopyFor(locale: string) {
  return locale === "en" ? "Two-person Preview practice adds one automatic helper. Both people can start; the helper's drawing and guess are placeholders."
    : locale === "fr" ? "L'essai à deux ajoute un joueur automatique. Vous pouvez commencer à deux ; son dessin et sa réponse sont des substituts."
    : "预览双人练习会自动补一位系统玩家。两位真人即可开局；系统的画和猜仅作测试占位。";
}

function timingCopyFor(locale: string) {
  if (locale === "en") return { title: "Round timers", draw: "Drawing time", guess: "Guessing time", seconds: "sec", classic: "Speed guessing starts while drawing. After drawing ends, guesses stay open for the chosen guessing time.", chain: "Each drawing and guessing step uses its own timer. Finishing early passes the turn on." };
  if (locale === "fr") return { title: "Durées des tours", draw: "Temps de dessin", guess: "Temps de réponse", seconds: "s", classic: "On devine pendant le dessin. Une fois le dessin terminé, les réponses restent ouvertes pendant la durée choisie.", chain: "Chaque étape de dessin et de réponse a sa propre durée. Une réponse anticipée passe à la suite." };
  return { title: "本局计时", draw: "作画时间", guess: "答题时间", seconds: "秒", classic: "抢猜可以边画边答；作画结束后，仍保留所选答题时间。", chain: "接龙的作画和猜词各自计时；所有人提前完成就会直接传递。" };
}

export function DrawGuessEntryClient({ chainEnabled, classicEnabled, classicMinPlayers, chainMinPlayers, locale, wordBanks }: { chainEnabled: boolean; classicEnabled: boolean; classicMinPlayers: 2 | 3; chainMinPlayers: 2 | 5; locale: string; wordBanks: DrawGuessWordBankSnapshot[] }) {
  const router = useRouter();
  const copy = copyFor(locale);
  const timingCopy = timingCopyFor(locale);
  const [mode, setMode] = useState<DrawGuessMode>("CHAIN");
  const [playerCount, setPlayerCount] = useState<number>(chainMinPlayers);
  const [timing, setTiming] = useState<DrawGuessTiming>({ drawSeconds: 60, guessSeconds: 20 });
  const [code, setCode] = useState("");
  const [selectedBankId, setSelectedBankId] = useState(wordBanks[0]?.id ?? "");
  const [previewBankId, setPreviewBankId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previewBank = wordBanks.find((bank) => bank.id === previewBankId);

  useEffect(() => {
    if (!previewBank) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewBankId(null);
      if (event.key === "Tab") {
        event.preventDefault();
        document.querySelector<HTMLButtonElement>("[data-draw-guess-preview-close]")?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previewTriggerRef.current?.focus();
    };
  }, [previewBank]);

  async function createRoom() {
    if (!selectedBankId) { setError(copy.bankMissing); return; }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/game-tools/draw-guess/rooms", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, mode, playerCount, timing, wordBankId: selectedBankId }),
      });
      const result = await response.json();
      if (!response.ok || !result.room?.id) throw new Error(result.error ?? "UNKNOWN");
      router.push(withLocale(locale, `/game-tools/draw-guess/rooms/${result.room.id}`));
    } catch (cause) {
      setError(cause instanceof Error && cause.message === "SIGN_IN_REQUIRED" ? copy.signedOut : cause instanceof Error && cause.message === "CHAIN_NOT_ENABLED" ? copy.unavailable : cause instanceof Error && cause.message === "INVALID_WORD_BANK" ? copy.bankInvalid : copy.error);
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
      setError(cause instanceof Error && cause.message === "SIGN_IN_REQUIRED" ? copy.signedOut : cause instanceof Error && cause.message === "ROOM_FULL" ? copy.full : cause instanceof Error && cause.message === "ALREADY_STARTED" ? copy.started : copy.error);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6 text-[#173D32]">
      <Link href={withLocale(locale, "/game-tools")} className="inline-flex items-center gap-2 text-sm font-semibold text-[#156240] hover:underline"><ArrowLeft className="h-4 w-4" />{copy.back}</Link>
      <section className="relative overflow-hidden rounded-[2rem] bg-[#F6F3E8] px-6 pb-7 pt-8 shadow-[0_18px_55px_rgba(20,57,42,0.1)] sm:px-9">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#F2AA89]/50 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A75B48]">Friemi · Table Games</p><h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{copy.title}</h1><p className="mt-3 text-base text-[#45675B]">{copy.subtitle}</p></div>
          <Image alt="" className="h-20 w-20 shrink-0 object-contain drop-shadow-[0_12px_20px_rgba(21,98,64,0.15)]" height={80} src="/game-tools/draw-guess/logo.png" width={80} />
        </div>
      </section>

      <section aria-label={copy.title} className="grid gap-3 sm:grid-cols-2">
        {(["CHAIN", "CLASSIC"] as const).map((value) => {
          const selected = mode === value;
          const isChain = value === "CHAIN";
          const enabled = isChain ? chainEnabled : classicEnabled;
          return <button key={value} type="button" disabled={!enabled} onClick={() => { setMode(value); setPlayerCount(isChain ? chainMinPlayers : classicMinPlayers); }} aria-pressed={selected}
            className={`rounded-[1.6rem] border p-5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#156240] ${selected ? "border-[#156240] bg-[#EAF3E9] shadow-[0_12px_28px_rgba(21,98,64,0.12)]" : "border-[#D9DDCE] bg-white hover:border-[#8AB68E]"} ${!enabled ? "cursor-not-allowed opacity-65" : ""}`}>
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${selected ? "bg-[#156240] text-white" : "bg-[#F4E9D9] text-[#A85E48]"}`}>{isChain ? <Sparkles className="h-5 w-5" /> : <Brush className="h-5 w-5" />}</span>
            <strong className="mt-4 block text-lg">{isChain ? copy.chain : copy.classic}</strong>
            <span className="mt-2 block text-sm leading-6 text-[#5D7369]">{isChain ? copy.chainBody : copy.classicBody}</span>
            {!isChain && !classicEnabled ? <span className="mt-3 inline-flex rounded-full bg-[#F4E9D9] px-2.5 py-1 text-xs font-bold text-[#9A5A43]">{copy.classicClosed}</span> : null}
            {isChain && !chainEnabled ? <span className="mt-3 inline-flex rounded-full bg-[#F4E9D9] px-2.5 py-1 text-xs font-bold text-[#9A5A43]">{copy.unavailable}</span> : null}
          </button>;
        })}
      </section>

      <section className="rounded-[1.6rem] border border-[#D9DDCE] bg-[#FFFDF8] p-5 sm:p-6">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#E7EFF9] text-[#0E5296]"><BookOpen className="h-5 w-5" /></span><div><h2 className="font-bold">{copy.bankTitle}</h2><p className="mt-1 text-sm text-[#62756A]">{copy.bankHint}</p></div></div>
        {wordBanks.length ? <div role="radiogroup" aria-label={copy.bankTitle} className="mt-4 grid gap-2.5">
          {wordBanks.map((bank) => { const selected = selectedBankId === bank.id; return <div key={bank.id} className={`flex items-center gap-2 rounded-2xl border p-2 transition ${selected ? "border-[#1780C5] bg-[#EFF8FF] shadow-[0_8px_20px_rgba(23,128,197,0.08)]" : "border-[#DFE4DD] bg-white"}`}><button type="button" role="radio" aria-checked={selected} onClick={() => setSelectedBankId(bank.id)} className="min-w-0 flex-1 rounded-xl px-2 py-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1780C5]"><span className="flex items-center gap-2"><strong className="min-w-0 truncate text-sm">{bank.title}</strong>{selected ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#DAF1DE] px-2 py-0.5 text-[10px] font-bold text-[#156240]"><Check className="h-3 w-3" />{copy.bankSelected}</span> : null}</span><span className="mt-1 block text-xs text-[#62756A]">{bank.category ? `${bank.category} · ` : ""}{bank.words.length} {copy.bankWords}</span>{bank.description ? <span className="mt-1 block line-clamp-1 text-xs text-[#738477]">{bank.description}</span> : null}</button><button type="button" aria-label={`${copy.bankPreview}：${bank.title}`} onClick={(event) => { previewTriggerRef.current = event.currentTarget; setPreviewBankId(bank.id); }} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl bg-white px-3 text-xs font-bold text-[#0E5296] ring-1 ring-[#CFDEEC] transition hover:bg-[#E7F3FF]"><Eye className="h-4 w-4" /><span className="hidden sm:inline">{copy.bankPreview}</span></button></div>; })}
        </div> : <p role="status" className="mt-4 rounded-xl bg-[#FFF1E6] px-4 py-3 text-sm text-[#9A5A43]">{copy.bankMissing}</p>}
      </section>

      <section className="rounded-[1.6rem] border border-[#D9DDCE] bg-white p-5 sm:p-6">
        <label htmlFor="draw-guess-count" className="flex items-center gap-2 text-sm font-bold"><UsersRound className="h-4 w-4" />{copy.players}: <span className="text-[#C46D50]">{playerCount}</span></label>
        {mode === "CHAIN" && chainMinPlayers === 2
          ? <select id="draw-guess-count" className="mt-4 min-h-12 w-full rounded-xl border border-[#D9DDCE] bg-white px-4 text-base outline-none focus:border-[#156240]" value={playerCount} onChange={(event) => setPlayerCount(Number(event.target.value))}>{[2, 5, 6, 7, 8].map((count) => <option key={count} value={count}>{count} {locale === "zh-CN" ? "人" : copy.players.toLowerCase()}</option>)}</select>
          : <input id="draw-guess-count" className="mt-4 w-full accent-[#156240]" type="range" min={mode === "CHAIN" ? chainMinPlayers : classicMinPlayers} max={mode === "CHAIN" ? 8 : 10} value={playerCount} onChange={(event) => setPlayerCount(Number(event.target.value))} />}
        {mode === "CHAIN" && chainMinPlayers === 2 && playerCount === 2 ? <p className="mt-3 rounded-xl bg-[#FFF5E7] px-4 py-3 text-sm leading-6 text-[#815633]">{practiceCopyFor(locale)}</p> : null}
        <div className="mt-5 border-t border-[#E2E7DC] pt-5">
          <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#156240]" /><h2 className="text-sm font-bold">{timingCopy.title}</h2></div>
          <p className="mt-1 text-xs leading-5 text-[#62756A]">{mode === "CLASSIC" ? timingCopy.classic : timingCopy.chain}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {([{ key: "drawSeconds", label: timingCopy.draw, options: DRAW_GUESS_DRAW_SECONDS }, { key: "guessSeconds", label: timingCopy.guess, options: DRAW_GUESS_GUESS_SECONDS }] as const).map(({ key, label, options }) => <fieldset key={key}>
              <legend className="mb-2 text-sm font-semibold text-[#315548]">{label}</legend>
              <div className="grid grid-cols-3 gap-2">{options.map((seconds) => <label key={seconds} className="block cursor-pointer rounded-xl focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#156240]"><input type="radio" name={`draw-guess-${key}`} className="sr-only" checked={timing[key] === seconds} onChange={() => setTiming((current) => ({ ...current, [key]: seconds }))} /><span className={`flex min-h-11 items-center justify-center rounded-xl border px-2 text-sm font-bold transition ${timing[key] === seconds ? "border-[#156240] bg-[#E7F3E8] text-[#15573B] shadow-sm" : "border-[#D9E2D6] bg-white text-[#53695D] hover:border-[#8AB68E]"}`}>{seconds} {timingCopy.seconds}</span></label>)}</div>
            </fieldset>)}
          </div>
        </div>
        <button disabled={busy || !selectedBankId || mode === "CHAIN" && !chainEnabled || mode === "CLASSIC" && !classicEnabled} onClick={createRoom} type="button" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#156240] px-5 font-bold text-white transition hover:bg-[#0B4E33] disabled:opacity-50">{busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}{copy.create}</button>
      </section>

      <section className="rounded-[1.6rem] border border-[#E8D6C8] bg-[#FFF9F5] p-5 sm:p-6">
        <h2 className="font-bold">{copy.join}</h2>
        <div className="mt-3 flex gap-2"><input aria-label={copy.code} className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#D9DDCE] bg-white px-4 text-base font-semibold uppercase tracking-widest outline-none focus:border-[#156240]" maxLength={8} placeholder={copy.code} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} /><button disabled={busy || !code.trim()} onClick={joinRoom} type="button" className="rounded-xl bg-[#E8A184] px-5 text-sm font-bold text-[#422919] disabled:opacity-50">{copy.joinAction}</button></div>
      </section>
      {error ? <p role="alert" className="rounded-xl bg-[#FFE8E5] px-4 py-3 text-sm font-semibold text-[#9A3B32]">{error}</p> : null}
      {previewBank && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#102C39]/55 p-3 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewBankId(null); }}><div role="dialog" aria-modal="true" aria-label={`${copy.bankPreview}：${previewBank.title}`} className="draw-guess-dialog flex max-h-[85dvh] w-full max-w-xl flex-col rounded-[1.8rem] bg-[#FFFDF8] p-5 shadow-[0_25px_70px_rgba(16,44,57,0.3)] sm:p-6"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#E7EFF9] text-[#0E5296]"><BookOpen className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#0E5296]">{previewBank.category ?? copy.bankTitle} · {previewBank.words.length} {copy.bankWords}</p><h2 className="mt-1 text-xl font-bold">{previewBank.title}</h2>{previewBank.description ? <p className="mt-1 text-sm text-[#62756A]">{previewBank.description}</p> : null}</div><button autoFocus type="button" aria-label={copy.bankClose} data-draw-guess-preview-close onClick={() => setPreviewBankId(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F0F2E9]"><X className="h-4 w-4" /></button></div><div className="mt-5 min-h-0 overflow-y-auto rounded-2xl bg-[#F3F7F7] p-3"><ul className="flex flex-wrap gap-2">{previewBank.words.map((word) => <li key={word} className="rounded-full border border-[#D7E6E7] bg-white px-3 py-1.5 text-sm font-semibold text-[#173D32]">{word}</li>)}</ul></div></div></div>, document.body) : null}
    </div>
  );
}
