"use client";

import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, BookOpen, Check, Clock3, Copy, LoaderCircle, Play, QrCode, Settings2, Sparkles, UsersRound, X } from "lucide-react";
import { DRAW_GUESS_DRAW_SECONDS, DRAW_GUESS_GUESS_SECONDS, type DrawGuessTiming, type DrawGuessWordBankSnapshot } from "@/features/game-tools/drawGuessEngine";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import { withLocale } from "@/lib/routes";

type SettingsTab = "bank" | "time" | "invite";
const READY_SPARKS = [
  ["-116px", "-62px", "#E99563"], ["-74px", "-91px", "#7DBE91"], ["-21px", "-106px", "#F1BC57"],
  ["57px", "-91px", "#E99563"], ["111px", "-52px", "#7DBE91"], ["122px", "23px", "#F1BC57"],
  ["76px", "79px", "#E99563"], ["9px", "105px", "#7DBE91"], ["-66px", "83px", "#F1BC57"], ["-121px", "30px", "#E99563"],
] as const;

function copyFor(locale: string) {
  if (locale === "en") return { back: "Table games", title: "Waiting room", classic: "Speed round", chain: "Picture chain", players: "Players", ready: "Ready", notReady: "Not ready", meReady: "I'm ready", cancelReady: "Cancel ready", start: "Start game", launching: "Here we go!", allReady: "Everyone's ready!", settings: "Room settings", bank: "Word pack", time: "Timers", invite: "Invite", preview: "Preview words", search: "Search packs", draw: "Drawing", guess: "Guessing", seconds: "s", save: "Save settings", saving: "Saving", code: "Room code", copy: "Copy invite link", copied: "Copied", scan: "Scan to join", close: "Close", retry: "Please try again.", practice: "Two-player round: one automatic helper." };
  if (locale === "fr") return { back: "Jeux de table", title: "Salle d'attente", classic: "Devine vite", chain: "Chaîne de dessins", players: "Joueurs", ready: "Prêt", notReady: "Pas prêt", meReady: "Je suis prêt", cancelReady: "Annuler", start: "Commencer", launching: "C'est parti !", allReady: "Tout le monde est prêt !", settings: "Paramètres", bank: "Thème", time: "Durées", invite: "Inviter", preview: "Voir les mots", search: "Rechercher", draw: "Dessin", guess: "Réponse", seconds: "s", save: "Enregistrer", saving: "Enregistrement", code: "Code", copy: "Copier le lien", copied: "Copié", scan: "Scanner pour rejoindre", close: "Fermer", retry: "Veuillez réessayer.", practice: "À deux : un joueur automatique." };
  return { back: "桌游工具", title: "等待开局", classic: "抢答模式", chain: "画画接龙", players: "玩家", ready: "已准备", notReady: "未准备", meReady: "我已准备", cancelReady: "取消准备", start: "开始游戏", launching: "开画啦！", allReady: "全员就绪！", settings: "房间设置", bank: "词库", time: "计时", invite: "邀请", preview: "预览词语", search: "搜索词库", draw: "作画", guess: "答题", seconds: "秒", save: "保存设置", saving: "保存中", code: "房间号", copy: "复制邀请链接", copied: "已复制", scan: "扫码加入", close: "关闭", retry: "操作未完成，请重试。", practice: "双人局自动补位" };
}

export function DrawGuessLobby({ locale, room, onRefresh }: { locale: string; room: DrawGuessRoomView; onRefresh: () => Promise<void> }) {
  const t = copyFor(locale);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState<SettingsTab>("bank");
  const [banks, setBanks] = useState<DrawGuessWordBankSnapshot[] | null>(null);
  const [bankSearch, setBankSearch] = useState("");
  const [selectedBankId, setSelectedBankId] = useState(room.wordBank?.id ?? "");
  const [timing, setTiming] = useState<DrawGuessTiming>(room.view.timing ?? { drawSeconds: 60, guessSeconds: 20 });
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const wasStartable = useRef(Boolean(room.canStart));
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const currentTiming = room.view.timing ?? { drawSeconds: 60, guessSeconds: 20 };
  const me = room.seats.find((seat) => seat.number === room.viewerSeat + 1);
  const humanSeats = room.seats.filter((seat) => !seat.isSystem);
  const selectedBank = banks?.find((bank) => bank.id === selectedBankId) ?? (room.wordBank?.id === selectedBankId ? room.wordBank : null);
  const settingsChanged = selectedBankId !== (room.wordBank?.id ?? "") || timing.drawSeconds !== currentTiming.drawSeconds || timing.guessSeconds !== currentTiming.guessSeconds;
  const shownBanks = (banks ?? []).filter((bank) => `${bank.title} ${bank.category ?? ""} ${bank.description ?? ""}`.toLocaleLowerCase().includes(bankSearch.trim().toLocaleLowerCase()));
  const inviteUrl = typeof window === "undefined" ? "" : new URL(withLocale(locale, `/game-tools/draw-guess/join/${room.code}`), window.location.origin).toString();
  const readyCount = humanSeats.filter((seat) => seat.ready).length;
  const minimum = room.requiredPlayers ?? room.playerCount;
  const enoughPlayers = room.autoSize ? humanSeats.length >= minimum : humanSeats.length === room.playerCount - (room.practiceBotSeat === undefined ? 0 : 1);
  const status = !enoughPlayers
    ? locale === "zh-CN" ? `还需 ${minimum - humanSeats.length} 人` : locale === "fr" ? `Encore ${minimum - humanSeats.length}` : `Need ${minimum - humanSeats.length} more`
    : `${readyCount}/${humanSeats.length} ${t.ready}`;

  useEffect(() => {
    const startable = Boolean(room.canStart);
    const justReady = !wasStartable.current && startable;
    wasStartable.current = startable;
    if (!startable) { setCelebrate(false); return; }
    if (!justReady) return;
    setCelebrate(true);
    const timeout = window.setTimeout(() => setCelebrate(false), 1300);
    return () => window.clearTimeout(timeout);
  }, [room.canStart]);

  useEffect(() => {
    if (!settingsOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), summary, a[href]"));
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
      if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKeyDown); settingsTrigger.current?.focus(); };
  }, [settingsOpen]);

  useEffect(() => {
    if (!settingsOpen || tab !== "invite" || !inviteUrl) return;
    void QRCode.toDataURL(inviteUrl, { width: 240, margin: 1, color: { dark: "#173D32", light: "#FFFFFF" } }).then(setQr).catch(() => setQr(""));
  }, [settingsOpen, tab, inviteUrl]);

  async function openSettings() {
    setSelectedBankId(room.wordBank?.id ?? "");
    setTiming(room.view.timing ?? { drawSeconds: 60, guessSeconds: 20 });
    setError("");
    setSettingsOpen(true);
    if (banks) return;
    try {
      const response = await fetch(`/api/game-tools/draw-guess/word-banks?locale=${encodeURIComponent(locale)}`);
      if (!response.ok) throw new Error("BANKS");
      const result = await response.json() as { wordBanks: DrawGuessWordBankSnapshot[] };
      setBanks(result.wordBanks);
    } catch { setError(t.retry); }
  }

  async function mutate(path: string, method: "POST" | "PATCH", body: unknown, close = false) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "UNKNOWN");
      await onRefresh();
      if (close) setSettingsOpen(false);
    } catch { setError(t.retry); }
    finally { setBusy(false); }
  }

  async function copyInvite() {
    try { await navigator.clipboard.writeText(inviteUrl); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setError(inviteUrl); }
  }

  return <div className="mx-auto w-full max-w-3xl space-y-5 pb-8 text-[#173D32]">
    <div className="flex items-center justify-between gap-3">
      <Link href={withLocale(locale, "/game-tools")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#537064] transition-colors hover:text-[#156240]"><ArrowLeft className="h-4 w-4" />{t.back}</Link>
      <button ref={settingsTrigger} type="button" onClick={() => void openSettings()} className="group inline-flex min-h-10 items-center gap-2 rounded-full bg-[#EDF5EA] px-4 text-sm font-bold text-[#246247] outline-none transition-[transform,background-color] hover:bg-[#DCEEDC] focus-visible:ring-2 focus-visible:ring-[#176344] focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none"><Settings2 className="h-4 w-4 transition-transform motion-safe:group-hover:rotate-12" />{t.settings}</button>
    </div>
    <header className="draw-guess-lobby-in flex items-center justify-between gap-3 px-1">
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[11px] font-extrabold text-[#B36A4D]"><Sparkles className="h-3.5 w-3.5" />{room.mode === "CHAIN" ? t.chain : t.classic}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{t.title}</h1>
      </div>
      <button type="button" aria-label={t.copy} onClick={() => void copyInvite()} className="group shrink-0 rounded-[1.1rem] bg-[#FFF0CF] px-3 py-2 text-center shadow-[0_4px_0_#EAD5A8] outline-none transition-[transform,box-shadow,background-color] hover:bg-[#FFE9B8] focus-visible:ring-2 focus-visible:ring-[#9D773B] focus-visible:ring-offset-2 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0.5 motion-safe:active:shadow-[0_2px_0_#EAD5A8] motion-reduce:transition-none"><span className="block text-[10px] font-bold text-[#8C7248]">{t.code}</span><strong className="font-mono text-base tracking-widest text-[#4B4932]">{room.code}</strong></button>
    </header>
    <main className="draw-guess-lobby-in relative overflow-hidden rounded-[1.8rem] bg-[#F8F8F0] px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 text-base font-black"><UsersRound className="h-4 w-4 text-[#2B7755]" />{t.players} {humanSeats.length}</h2><p role="status" className="mt-1 text-xs font-semibold text-[#6C7C71]">{status}</p></div>
        <span className="max-w-[42%] truncate rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#397054]">{room.wordBank?.title ?? t.bank}</span>
      </div>
      <div className={`mx-auto mt-4 grid justify-items-center gap-x-2 gap-y-3 ${humanSeats.length === 1 ? "max-w-28 grid-cols-1" : humanSeats.length === 2 ? "max-w-xs grid-cols-2" : "max-w-xl grid-cols-3"}`}>
        {humanSeats.map((seat, index) => <div key={seat.number} className="draw-guess-seat-in flex min-w-0 w-full flex-col items-center px-1 py-1 text-center" style={{ animationDelay: `${index * 65}ms` }}>
          <div className={`relative grid h-14 w-14 place-items-center rounded-full ring-4 ring-white sm:h-16 sm:w-16 ${seat.ready ? "draw-guess-avatar-ready bg-[#CDEBD6] shadow-[0_4px_0_#9ECEAB]" : "bg-[#FDE2D1] shadow-[0_4px_0_#ECC6B0]"}`}>
            {seat.avatarUrl ? <Image alt="" className="rounded-full object-cover" fill sizes="64px" src={seat.avatarUrl} unoptimized /> : <span className={`text-xl font-black ${seat.ready ? "text-[#276B4A]" : "text-[#A7674C]"}`}>{Array.from(seat.name)[0] ?? "?"}</span>}
          </div>
          <strong className="mt-2 max-w-full truncate text-xs font-extrabold sm:text-sm" title={seat.name}>{seat.name}</strong>
          <span className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold ${seat.ready ? "text-[#24734E]" : "text-[#9B7764]"}`}>{seat.ready ? <Check className="h-3 w-3 stroke-[3]" /> : <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}{seat.ready ? t.ready : t.notReady}</span>
        </div>)}
      </div>
      <div className="mt-5 flex gap-2.5">
        <button type="button" disabled={busy} onClick={() => void mutate(`/api/game-tools/draw-guess/rooms/${room.id}/ready`, "POST", { ready: !me?.ready })} className={`group inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-black outline-none transition-[transform,box-shadow,background-color] focus-visible:ring-2 focus-visible:ring-[#176344] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0.5 motion-reduce:transition-none ${me?.ready ? "bg-white text-[#3E7455] shadow-[0_4px_0_#DEE8DA] motion-safe:active:shadow-[0_2px_0_#DEE8DA]" : "bg-[#BDEACB] text-[#174B35] shadow-[0_5px_0_#85C59A] hover:bg-[#ACDFBD] motion-safe:active:shadow-[0_2px_0_#85C59A]"}`}>{me?.ready ? <Check className="h-4 w-4 stroke-[3]" /> : <Sparkles className="h-4 w-4 transition-transform motion-safe:group-hover:rotate-12" />}{me?.ready ? t.cancelReady : t.meReady}</button>
        {room.isHost ? <button type="button" disabled={busy || !room.canStart} onClick={() => { setLaunching(true); void mutate(`/api/game-tools/draw-guess/rooms/${room.id}/actions`, "POST", { action: { type: "START" } }).finally(() => setLaunching(false)); }} className={`group relative inline-flex min-h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-[#FFB578] px-3 text-sm font-black text-[#563721] shadow-[0_5px_0_#D77C56] outline-none transition-[transform,box-shadow,background-color] hover:bg-[#FFC48E] focus-visible:ring-2 focus-visible:ring-[#9D573F] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#E8EDE6] disabled:text-[#728779] disabled:shadow-none motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0.5 motion-safe:active:shadow-[0_2px_0_#D77C56] motion-safe:disabled:hover:translate-y-0 motion-reduce:transition-none ${room.canStart ? "draw-guess-start-ready" : ""}`}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current transition-transform motion-safe:group-hover:translate-x-0.5" />}{t.start}</button> : null}
      </div>
      {room.mode === "CHAIN" && humanSeats.length === 2 && minimum === 2 ? <p className="mt-3 text-center text-xs text-[#8A684F]">{t.practice}</p> : null}
      {celebrate ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
        <div className="draw-guess-ready-toast absolute left-1/2 top-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#FFE5A8] px-4 py-2 text-sm font-black text-[#734B28] shadow-[0_5px_0_#EAB976]"><Sparkles className="h-4 w-4" />{t.allReady}</div>
        {READY_SPARKS.map(([x, y, color], index) => <span key={index} className="draw-guess-ready-spark absolute left-1/2 top-1/2 text-xl leading-none" style={{ "--spark-x": x, "--spark-y": y, "--spark-rotate": `${index * 41}deg`, "--spark-delay": `${index * 18}ms`, color } as CSSProperties}>{index % 3 === 0 ? "●" : "✦"}</span>)}
      </div> : null}
    </main>
    {error && !settingsOpen ? <p role="alert" className="rounded-xl bg-[#FFE8E5] px-4 py-3 text-sm text-[#9A3B32]">{error}</p> : null}

    {settingsOpen && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#102C27]/50 p-2 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t.settings} className="draw-guess-dialog flex max-h-[92dvh] w-full max-w-xl flex-col rounded-[1.8rem] bg-[#FFFDF8] shadow-[0_25px_70px_rgba(16,44,39,0.28)] sm:max-h-[85dvh]">
        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-4"><h2 className="flex items-center gap-2 text-lg font-black"><Settings2 className="h-5 w-5 text-[#2A7653]" />{t.settings}</h2><button autoFocus type="button" aria-label={t.close} onClick={() => setSettingsOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-[#F0F4EC] text-[#496455] outline-none transition-colors hover:bg-[#E4EDE3] focus-visible:ring-2 focus-visible:ring-[#176344]"><X className="h-4 w-4" /></button></div>
        <div className="mx-4 mt-2 grid shrink-0 grid-cols-3 gap-1 rounded-full bg-[#F0F4EC] p-1">{([["bank", t.bank, BookOpen], ["time", t.time, Clock3], ["invite", t.invite, QrCode]] as const).map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={tab === key} className={`flex min-h-10 items-center justify-center gap-1 rounded-full text-sm font-bold outline-none transition-[transform,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-[#176344] ${tab === key ? "bg-white text-[#246247] shadow-[0_2px_6px_rgba(41,92,62,0.1)]" : "text-[#718276] hover:bg-white/60"}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === "bank" ? <div><input aria-label={t.search} className="min-h-11 w-full rounded-full border border-[#DCE8D9] bg-[#F7FAF4] px-4 text-sm outline-none focus:border-[#4E9A68]" placeholder={t.search} value={bankSearch} onChange={(event) => setBankSearch(event.target.value)} /><div className="mt-3 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pb-1 pr-1">{shownBanks.map((bank) => <button key={bank.id} type="button" disabled={!room.isHost} onClick={() => setSelectedBankId(bank.id)} aria-pressed={selectedBankId === bank.id} className={`rounded-2xl p-3 text-left outline-none transition-[transform,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-[#176344] disabled:cursor-default motion-safe:enabled:hover:-translate-y-0.5 ${selectedBankId === bank.id ? "bg-[#DDF2E3] shadow-[0_3px_0_#ADD4B8]" : "bg-[#F4F6EF] hover:bg-[#EAF2E8]"}`}><strong className="block truncate text-sm">{bank.title}</strong><span className="mt-1 block truncate text-xs text-[#6F8074]">{bank.category ?? ""} · {bank.words.length}</span></button>)}</div>{selectedBank ? <details className="mt-3 rounded-2xl bg-[#F2F6F0] p-3"><summary className="cursor-pointer text-sm font-bold text-[#315548]">{t.preview} · {selectedBank.title}</summary><ul className="mt-3 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">{selectedBank.words.map((word) => <li key={word} className="rounded-full bg-white px-2.5 py-1 text-xs">{word}</li>)}</ul></details> : null}</div> : null}
          {tab === "time" ? <div className="space-y-5">{([{ key: "drawSeconds", label: t.draw, options: DRAW_GUESS_DRAW_SECONDS }, { key: "guessSeconds", label: t.guess, options: DRAW_GUESS_GUESS_SECONDS }] as const).map(({ key, label, options }) => <fieldset key={key}><legend className="text-sm font-bold">{label}</legend><div className="mt-2 grid grid-cols-3 gap-2">{options.map((seconds) => <button key={seconds} type="button" disabled={!room.isHost} onClick={() => setTiming((value) => ({ ...value, [key]: seconds }))} aria-pressed={timing[key] === seconds} className={`min-h-11 rounded-full text-sm font-bold outline-none transition-[transform,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-[#176344] disabled:cursor-default motion-safe:enabled:hover:-translate-y-0.5 ${timing[key] === seconds ? "bg-[#DDF2E3] text-[#246247] shadow-[0_3px_0_#ADD4B8]" : "bg-[#F4F6EF] text-[#607268] hover:bg-[#EAF2E8]"}`}>{seconds} {t.seconds}</button>)}</div></fieldset>)}</div> : null}
          {tab === "invite" ? <div className="flex flex-col items-center text-center"><p className="text-sm font-semibold text-[#607268]">{t.scan}</p>{qr ? <Image alt={t.scan} className="mt-3 h-44 w-44 rounded-2xl bg-white p-2" height={176} src={qr} unoptimized width={176} /> : <div className="mt-3 grid h-44 w-44 place-items-center rounded-2xl bg-[#F3F6F1]"><QrCode className="h-8 w-8 text-[#7A9B83]" /></div>}<strong className="mt-3 font-mono text-xl tracking-[0.2em]">{room.code}</strong><button type="button" onClick={() => void copyInvite()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#D9F0E0] px-5 text-sm font-black text-[#21553C] shadow-[0_4px_0_#ABD4B7] outline-none transition-[transform,box-shadow,background-color] hover:bg-[#C9EAD4] focus-visible:ring-2 focus-visible:ring-[#176344] motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0.5 motion-safe:active:shadow-[0_2px_0_#ABD4B7] motion-reduce:transition-none"><Copy className="h-4 w-4" />{copied ? t.copied : t.copy}</button></div> : null}
        </div>
        {error ? <p role="alert" className="mx-5 mb-2 rounded-xl bg-[#FFE8E5] px-3 py-2 text-xs text-[#9A3B32]">{error}</p> : null}
        {room.isHost && tab !== "invite" ? <div className="shrink-0 px-4 pb-5 pt-2"><button type="button" disabled={busy || !selectedBankId || !settingsChanged} onClick={() => void mutate(`/api/game-tools/draw-guess/rooms/${room.id}`, "PATCH", { timing, wordBankId: selectedBankId }, true)} className="min-h-12 w-full rounded-full bg-[#FFB578] px-4 text-sm font-black text-[#563721] shadow-[0_5px_0_#D77C56] outline-none transition-[transform,box-shadow,background-color] hover:bg-[#FFC48E] focus-visible:ring-2 focus-visible:ring-[#9D573F] disabled:cursor-not-allowed disabled:bg-[#E8EDE6] disabled:text-[#728779] disabled:shadow-none motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0.5 motion-safe:active:shadow-[0_2px_0_#D77C56] motion-safe:disabled:hover:translate-y-0 motion-reduce:transition-none">{busy ? t.saving : t.save}</button></div> : null}
      </div>
    </div>, document.body) : null}
    {launching && typeof document !== "undefined" ? createPortal(<div role="status" className="draw-guess-launch-overlay fixed inset-0 z-[120] grid place-items-center bg-[#173D32]/90 text-center text-white"><div><span aria-hidden="true" className="draw-guess-launch-mark mx-auto grid h-24 w-24 place-items-center rounded-[2rem] bg-[#FFE2A1] text-5xl shadow-[0_9px_0_#D9A968]">✏️</span><strong className="mt-6 block text-3xl font-black tracking-wide">{t.launching}</strong><span className="mx-auto mt-5 block h-1 w-24 overflow-hidden rounded-full bg-white/30"><span className="block h-full w-full origin-left animate-pulse rounded-full bg-[#FFB578]" /></span></div></div>, document.body) : null}
  </div>;
}
