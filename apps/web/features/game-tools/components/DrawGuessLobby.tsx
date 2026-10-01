"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, BookOpen, Check, ChevronDown, Clock3, Copy, LoaderCircle, Play, QrCode, RotateCw, Search, Settings2, Sparkles, UserMinus, UsersRound, X } from "lucide-react";
import { DrawGuessCatSprite } from "@/features/game-tools/components/DrawGuessCatSprite";
import { DRAW_GUESS_CATS, getDrawGuessCatName, type DrawGuessCatDirection } from "@/features/game-tools/drawGuessCats";
import { DRAW_GUESS_DRAW_SECONDS, DRAW_GUESS_GUESS_SECONDS, DRAW_GUESS_ROUND_COUNTS, estimateDrawGuessDurationSeconds, type DrawGuessRoundCount, type DrawGuessTiming, type DrawGuessWordBankSnapshot } from "@/features/game-tools/drawGuessEngine";
import type { DrawGuessRoomView } from "@/features/game-tools/components/DrawGuessRoomClient";
import { withLocale } from "@/lib/routes";

type SettingsTab = "time" | "invite";
const CAT_DIRECTIONS: DrawGuessCatDirection[] = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
const READY_SPARKS = [
  ["-116px", "-62px", "#3C73B0"], ["-74px", "-91px", "#B4D0EA"], ["-21px", "-106px", "#F2C56D"],
  ["57px", "-91px", "#3C73B0"], ["111px", "-52px", "#B4D0EA"], ["122px", "23px", "#F2C56D"],
  ["76px", "79px", "#3C73B0"], ["9px", "105px", "#B4D0EA"], ["-66px", "83px", "#F2C56D"], ["-121px", "30px", "#3C73B0"],
] as const;

function copyFor(locale: string) {
  if (locale === "en") return { back: "Leave room", title: "Waiting room", classic: "Speed round", chain: "Picture chain", players: "Players", ready: "Ready", notReady: "Not ready", meReady: "I'm ready", cancelReady: "Cancel ready", start: "Start game", launching: "Here we go!", allReady: "Everyone's ready!", settings: "Room settings", bank: "Word pack", selectedBank: "This round's pack", saveBank: "Save word pack", loadingBanks: "Loading packs...", noBanks: "No packs found", type: "Type", allTypes: "All types", otherType: "Other", words: "words", time: "Timers", invite: "Invite", preview: "Preview words", search: "Search packs or words", draw: "Drawing", guess: "Guessing", seconds: "s", save: "Save settings", saving: "Saving", code: "Room code", copy: "Copy invite link", copied: "Copied", scan: "Scan to join", close: "Close", retry: "Please try again.", practice: "Two-player round: one automatic helper.", character: "Choose your cat", turnCat: "Turn cat", saveCat: "Use this cat", kick: "Remove", kickTitle: "Remove this player?", kickHint: "They won't be able to rejoin this room.", kickConfirm: "Remove player", cancel: "Keep player" };
  if (locale === "fr") return { back: "Quitter la salle", title: "Salle d'attente", classic: "Devine vite", chain: "Chaîne de dessins", players: "Joueurs", ready: "Prêt", notReady: "Pas prêt", meReady: "Je suis prêt", cancelReady: "Annuler", start: "Commencer", launching: "C'est parti !", allReady: "Tout le monde est prêt !", settings: "Paramètres", bank: "Thème", selectedBank: "Thème choisi", saveBank: "Enregistrer le thème", loadingBanks: "Chargement...", noBanks: "Aucun thème trouvé", type: "Type", allTypes: "Tous les types", otherType: "Autre", words: "mots", time: "Durées", invite: "Inviter", preview: "Voir les mots", search: "Chercher thème ou mot", draw: "Dessin", guess: "Réponse", seconds: "s", save: "Enregistrer", saving: "Enregistrement", code: "Code", copy: "Copier le lien", copied: "Copié", scan: "Scanner pour rejoindre", close: "Fermer", retry: "Veuillez réessayer.", practice: "À deux : un joueur automatique.", character: "Choisir un chat", turnCat: "Tourner le chat", saveCat: "Choisir ce chat", kick: "Retirer", kickTitle: "Retirer ce joueur ?", kickHint: "Il ne pourra plus rejoindre cette salle.", kickConfirm: "Retirer", cancel: "Garder" };
  return { back: "退出房间", title: "等待开局", classic: "抢答模式", chain: "画画接龙", players: "玩家", ready: "已准备", notReady: "准备", meReady: "准备", cancelReady: "取消准备", start: "开始游戏", launching: "开画啦！", allReady: "全员就绪！", settings: "房间设置", bank: "词库", selectedBank: "本局词库", saveBank: "保存词库", loadingBanks: "正在加载词库…", noBanks: "没有找到词库", type: "词库类型", allTypes: "全部类型", otherType: "其他", words: "个词", time: "计时", invite: "邀请", preview: "预览词语", search: "搜词库或词语", draw: "作画", guess: "答题", seconds: "秒", save: "保存设置", saving: "保存中", code: "房间号", copy: "复制邀请链接", copied: "已复制", scan: "扫码加入", close: "关闭", retry: "操作未完成，请重试。", practice: "双人局自动补位", character: "选择猫咪", turnCat: "转个身", saveCat: "选这只猫", kick: "移出", kickTitle: "移出这位玩家？", kickHint: "移出后，对方不能再加入这个房间。", kickConfirm: "确认移出", cancel: "留下玩家" };
}

function roundCopyFor(locale: string) {
  if (locale === "en") return { rounds: "Rounds", estimate: "About", minutes: "min" };
  if (locale === "fr") return { rounds: "Manches", estimate: "Environ", minutes: "min" };
  return { rounds: "轮数", estimate: "预计约", minutes: "分钟" };
}

function roundUnit(locale: string, count: number) {
  return locale === "en" ? count === 1 ? "round" : "rounds" : locale === "fr" ? count === 1 ? "manche" : "manches" : "轮";
}

export function DrawGuessLobby({ locale, room, onRefresh, onLeave, preview }: { locale: string; room: DrawGuessRoomView; onRefresh: () => Promise<void>; onLeave: () => Promise<void>; preview?: { wordBanks: DrawGuessWordBankSnapshot[]; onChange: (room: DrawGuessRoomView) => void } }) {
  const t = copyFor(locale);
  const roundCopy = roundCopyFor(locale);
  const [bankOpen, setBankOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState(room.seats.find((seat) => seat.number === room.viewerSeat + 1)?.catId ?? DRAW_GUESS_CATS[0].id);
  const [catDirectionIndex, setCatDirectionIndex] = useState(0);
  const [tab, setTab] = useState<SettingsTab>("time");
  const [banks, setBanks] = useState<DrawGuessWordBankSnapshot[] | null>(null);
  const [bankSearch, setBankSearch] = useState("");
  const [bankCategory, setBankCategory] = useState("");
  const [selectedBankId, setSelectedBankId] = useState(room.wordBank?.id ?? "");
  const [timing, setTiming] = useState<DrawGuessTiming>(room.view.timing ?? { drawSeconds: 60, guessSeconds: 20 });
  const [roundCount, setRoundCount] = useState<DrawGuessRoundCount>(room.view.roundCount ?? 1);
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [kickTarget, setKickTarget] = useState<string | null>(null);
  const wasStartable = useRef(Boolean(room.canStart));
  const bankTrigger = useRef<HTMLButtonElement>(null);
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  const characterTrigger = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const currentTiming = room.view.timing ?? { drawSeconds: 60, guessSeconds: 20 };
  const me = room.seats.find((seat) => seat.number === room.viewerSeat + 1);
  const humanSeats = room.seats.filter((seat) => !seat.isSystem);
  const kickSeat = humanSeats.find((seat) => seat.id === kickTarget);
  const selectedBank = banks?.find((bank) => bank.id === selectedBankId) ?? (room.wordBank?.id === selectedBankId ? room.wordBank : null);
  const bankChanged = selectedBankId !== (room.wordBank?.id ?? "");
  const settingsChanged = timing.drawSeconds !== currentTiming.drawSeconds || timing.guessSeconds !== currentTiming.guessSeconds || roundCount !== (room.view.roundCount ?? 1);
  const bankCategories = Array.from(new Set((banks ?? []).map((bank) => bank.category?.trim() || t.otherType)));
  const bankQuery = bankSearch.trim().toLocaleLowerCase();
  const shownBanks = (banks ?? []).filter((bank) => {
    const category = bank.category?.trim() || t.otherType;
    return (!bankCategory || category === bankCategory)
      && (!bankQuery || `${bank.title} ${category} ${bank.description ?? ""} ${bank.words.join(" ")}`.toLocaleLowerCase().includes(bankQuery));
  });
  const inviteUrl = typeof window === "undefined" ? "" : preview ? window.location.href : new URL(withLocale(locale, `/game-tools/draw-guess/join/${room.code}`), window.location.origin).toString();
  const readyCount = humanSeats.filter((seat) => seat.ready).length;
  const minimum = room.requiredPlayers ?? room.playerCount;
  const estimatedPlayers = room.autoSize
    ? Math.max(humanSeats.length, minimum) + (room.mode === "CHAIN" && minimum === 2 && humanSeats.length <= 2 ? 1 : 0)
    : room.playerCount;
  const estimatedMinutes = Math.max(1, Math.ceil(estimateDrawGuessDurationSeconds(room.mode, estimatedPlayers, timing, roundCount) / 60));
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
    if (!bankOpen && !settingsOpen && !characterOpen && kickTarget === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setBankOpen(false); setSettingsOpen(false); setCharacterOpen(false); setKickTarget(null); setError(""); }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, a[href]"));
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
      if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKeyDown); (characterOpen ? characterTrigger : bankOpen ? bankTrigger : settingsTrigger).current?.focus(); };
  }, [bankOpen, settingsOpen, characterOpen, kickTarget]);

  useEffect(() => {
    if (!settingsOpen || tab !== "invite" || !inviteUrl) return;
    void QRCode.toDataURL(inviteUrl, { width: 240, margin: 1, color: { dark: "#30425C", light: "#FFFFFF" } }).then(setQr).catch(() => setQr(""));
  }, [settingsOpen, tab, inviteUrl]);

  async function openBank() {
    setSelectedBankId(room.wordBank?.id ?? "");
    setBankSearch("");
    setBankCategory("");
    setError("");
    setBankOpen(true);
    if (preview) { setBanks(preview.wordBanks); return; }
    if (banks) return;
    try {
      const response = await fetch(`/api/game-tools/draw-guess/word-banks?locale=${encodeURIComponent(locale)}`);
      if (!response.ok) throw new Error("BANKS");
      const result = await response.json() as { wordBanks: DrawGuessWordBankSnapshot[] };
      setBanks(result.wordBanks);
    } catch { setError(t.retry); }
  }

  function openSettings() {
    setTiming(room.view.timing ?? { drawSeconds: 60, guessSeconds: 20 });
    setRoundCount(room.view.roundCount ?? 1);
    setTab("time");
    setError("");
    setSettingsOpen(true);
  }

  function closeBank() { setBankOpen(false); setError(""); }
  function closeSettings() { setSettingsOpen(false); setError(""); }
  function openCharacter() { setSelectedCatId(me?.catId ?? DRAW_GUESS_CATS[0].id); setCatDirectionIndex(0); setError(""); setCharacterOpen(true); }
  function closeCharacter() { setCharacterOpen(false); setError(""); }

  async function mutate(path: string, method: "POST" | "PATCH", body: unknown, close?: "bank" | "settings" | "character" | "kick") {
    setBusy(true);
    setError("");
    try {
      if (preview) {
        const change = body as { ready?: boolean; catId?: string; wordBankId?: string; timing?: DrawGuessTiming; roundCount?: DrawGuessRoundCount; seatId?: string; action?: { type: string } };
        if (change.action?.type === "START") await new Promise((resolve) => window.setTimeout(resolve, 900));
        else {
          const seats = change.ready === undefined && !change.catId && !change.seatId ? room.seats : room.seats
            .filter((seat) => seat.id !== change.seatId)
            .map((seat) => seat.number === room.viewerSeat + 1 ? { ...seat, ready: change.ready ?? seat.ready, catId: change.catId ?? seat.catId } : seat);
          const humanSeats = seats.filter((seat) => !seat.isSystem);
          preview.onChange({
            ...room,
            seats,
            canStart: humanSeats.length >= (room.requiredPlayers ?? room.playerCount) && humanSeats.every((seat) => seat.ready),
            wordBank: preview.wordBanks.find((bank) => bank.id === change.wordBankId) ?? room.wordBank,
            view: { ...room.view, timing: change.timing ?? room.view.timing, roundCount: change.roundCount ?? room.view.roundCount },
          });
        }
        if (close === "bank") setBankOpen(false);
        if (close === "settings") setSettingsOpen(false);
        if (close === "character") setCharacterOpen(false);
        if (close === "kick") setKickTarget(null);
        return;
      }
      const response = await fetch(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "UNKNOWN");
      await onRefresh();
      if (close === "bank") setBankOpen(false);
      if (close === "settings") setSettingsOpen(false);
      if (close === "character") setCharacterOpen(false);
      if (close === "kick") setKickTarget(null);
    } catch { setError(t.retry); }
    finally { setBusy(false); }
  }

  async function copyInvite() {
    try { await navigator.clipboard.writeText(inviteUrl); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setError(inviteUrl); }
  }

  return <div className="draw-guess-theme mx-auto w-full max-w-3xl space-y-4 pb-8">
    <div className="flex items-center justify-between gap-2">
      <button disabled={leaving} type="button" aria-label={t.back} onClick={() => { setLeaving(true); void onLeave().catch(() => { setLeaving(false); setError(t.retry); }); }} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#63758D] transition-colors hover:text-[#3E6FA8] disabled:opacity-50 sm:gap-1.5 sm:text-sm"><ArrowLeft className="h-4 w-4" /><span>{t.back}</span></button>
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <button ref={bankTrigger} aria-label={t.bank} type="button" onClick={() => void openBank()} className="draw-guess-btn draw-guess-btn--blush group min-h-10 shrink-0 whitespace-nowrap px-3 text-xs max-[374px]:w-11 max-[374px]:px-0 sm:px-4 sm:text-sm"><BookOpen className="h-4 w-4 shrink-0 transition-transform motion-safe:group-hover:-rotate-12" /><span className="max-[374px]:sr-only">{t.bank}</span></button>
        <button ref={settingsTrigger} aria-label={t.settings} type="button" onClick={openSettings} className="draw-guess-btn draw-guess-btn--milk group min-h-10 shrink-0 whitespace-nowrap px-3 text-xs max-[374px]:w-11 max-[374px]:px-0 sm:px-4 sm:text-sm"><Settings2 className="h-4 w-4 shrink-0 transition-transform motion-safe:group-hover:rotate-12" /><span className="max-[374px]:sr-only">{t.settings}</span></button>
      </div>
    </div>
    <header className="draw-guess-lobby-in flex items-center justify-between gap-3 px-1">
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[11px] font-extrabold text-[#3E70AA]"><Sparkles className="h-3.5 w-3.5" />{room.mode === "CHAIN" ? t.chain : t.classic}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{t.title}</h1>
        <p className="mt-1 text-xs font-bold text-[#63758D]">{roundCopy.rounds} · {room.view.roundCount ?? 1} {roundUnit(locale, room.view.roundCount ?? 1)}</p>
      </div>
      <button type="button" aria-label={t.copy} onClick={() => void copyInvite()} className="draw-guess-btn draw-guess-btn--butter group shrink-0 flex-col gap-0 rounded-[1.1rem] px-3 py-1.5 motion-safe:-rotate-2 motion-safe:hover:rotate-0"><span className="text-[10px] font-bold text-[#765A35]">{t.code}</span><strong className="font-mono text-base tracking-widest text-[#30425C]">{room.code}</strong></button>
    </header>
    <main className="draw-guess-lobby-in draw-guess-lobby-card relative rounded-[2rem] px-4 pb-4 pt-3 sm:px-6 sm:pb-5">
      <div className="relative flex min-h-[76px] items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 text-base font-black"><UsersRound className="h-4 w-4 text-[#3F74AE]" />{t.players} {humanSeats.length}</h2><p role="status" className="mt-1 text-xs font-semibold text-[#63758D]">{status}</p></div>
        <button ref={characterTrigger} type="button" onClick={openCharacter} aria-label={t.character} className="group relative flex shrink-0 flex-col items-center rounded-2xl px-1 pb-1 outline-none focus-visible:ring-2 focus-visible:ring-[#3C73B0]">
          <DrawGuessCatSprite animated catId={me?.catId} mood={room.canStart ? "happy" : "idle"} size={78} />
          <span className="-mt-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-black text-[#3E6FA8] shadow-[0_2px_0_#C7D8E5] transition-transform group-hover:-translate-y-0.5">{t.character}</span>
        </button>
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-2 rounded-2xl bg-[#E8F2FB] px-3 py-2 text-[#405875]" title={room.wordBank?.title}>
        <BookOpen className="h-4 w-4 shrink-0" />
        <span className="shrink-0 text-xs font-bold">{t.selectedBank}</span>
        <span aria-hidden="true" className="h-3.5 w-px shrink-0 bg-[#BED5EA]" />
        <strong className="min-w-0 flex-1 truncate text-xs sm:text-sm">{room.wordBank?.title ?? "—"}</strong>
        {room.wordBank?.category ? <span className="hidden max-w-28 truncate rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-bold sm:block">{room.wordBank.category}</span> : null}
      </div>
      <div className={`mx-auto mt-4 grid justify-items-center gap-x-2 gap-y-3 ${humanSeats.length === 1 ? "max-w-28 grid-cols-1" : humanSeats.length === 2 ? "max-w-xs grid-cols-2" : "max-w-xl grid-cols-3"}`}>
        {humanSeats.map((seat, index) => <div key={seat.number} className="draw-guess-seat-in relative flex min-w-0 w-full flex-col items-center px-1 py-1 text-center" style={{ animationDelay: `${index * 65}ms` }}>
          {room.isHost && !seat.isHost ? <button type="button" disabled={busy} onClick={() => { setError(""); setKickTarget(seat.id); }} aria-label={`${t.kick} ${seat.name}`} className="absolute right-0 top-0 z-10 grid h-8 w-8 place-items-center rounded-full bg-white text-[#6B7890] shadow-[0_2px_0_#D7E3EF] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3E6FA8] disabled:opacity-50"><UserMinus className="h-4 w-4" /></button> : null}
          <div className={`relative grid h-16 w-16 place-items-center rounded-full ring-4 ring-white sm:h-[4.5rem] sm:w-[4.5rem] ${seat.ready ? "draw-guess-avatar-ready bg-[#DFECF8] shadow-[0_4px_0_#B8D3EA]" : "bg-[#E8ECF6] shadow-[0_4px_0_#DCE4EF]"}`}>
            <DrawGuessCatSprite catId={seat.catId} mood={seat.ready ? "happy" : "idle"} size={61} />
            <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center overflow-hidden rounded-full border-2 border-white bg-[#FFE7B1] text-[9px] font-black text-[#765A35]">
              {seat.avatarUrl ? <Image alt="" className="object-cover" fill sizes="20px" src={seat.avatarUrl} unoptimized /> : Array.from(seat.name)[0] ?? "?"}
            </span>
          </div>
          <strong className="mt-2 max-w-full truncate text-xs font-extrabold sm:text-sm" title={seat.name}>{seat.name}</strong>
          <span className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold ${seat.ready ? "text-[#3E6FA8]" : "text-[#65748A]"}`}>{seat.ready ? <Check className="h-3 w-3 stroke-[3]" /> : <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}{seat.ready ? t.ready : t.notReady}</span>
        </div>)}
      </div>
      <div className="mt-5 flex gap-2.5">
        <button type="button" disabled={busy} onClick={() => void mutate(`/api/game-tools/draw-guess/rooms/${room.id}/ready`, "POST", { ready: !me?.ready })} aria-pressed={Boolean(me?.ready)} aria-label={me?.ready ? t.cancelReady : t.meReady} className={`draw-guess-btn group min-h-12 min-w-0 flex-1 whitespace-nowrap px-3 text-sm ${me?.ready ? "draw-guess-btn--milk" : "draw-guess-btn--blush"}`}>{me?.ready ? <Check className="h-4 w-4 shrink-0 stroke-[3]" /> : <Sparkles className="h-4 w-4 shrink-0 transition-transform motion-safe:group-hover:rotate-12" />}{me?.ready ? locale === "zh-CN" ? t.ready : t.cancelReady : t.meReady}</button>
        {room.isHost ? <button type="button" disabled={busy || !room.canStart} onClick={() => { setLaunching(true); void mutate(`/api/game-tools/draw-guess/rooms/${room.id}/actions`, "POST", { action: { type: "START" } }).finally(() => setLaunching(false)); }} className={`draw-guess-btn draw-guess-btn--candy group relative min-h-12 min-w-0 flex-1 overflow-hidden whitespace-nowrap px-3 text-sm ${room.canStart ? "draw-guess-start-ready" : ""}`}>{busy ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" /> : <Play className="h-4 w-4 shrink-0 fill-current transition-transform motion-safe:group-hover:translate-x-0.5" />}{t.start}</button> : null}
      </div>
      {room.mode === "CHAIN" && humanSeats.length === 2 && minimum === 2 ? <p className="mt-3 text-center text-xs text-[#63758D]">{t.practice}</p> : null}
      {celebrate ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
        <div className="draw-guess-ready-toast absolute left-1/2 top-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#DCECF9] px-4 py-2 text-sm font-black text-[#3E6FA8] shadow-[0_5px_0_#B8D3EA]"><Sparkles className="h-4 w-4" />{t.allReady}</div>
        {READY_SPARKS.map(([x, y, color], index) => <span key={index} className="draw-guess-ready-spark absolute left-1/2 top-1/2 text-xl leading-none" style={{ "--spark-x": x, "--spark-y": y, "--spark-rotate": `${index * 41}deg`, "--spark-delay": `${index * 18}ms`, color } as CSSProperties}>{index % 3 === 0 ? "●" : "✦"}</span>)}
      </div> : null}
    </main>
    {error && !settingsOpen && !bankOpen && !characterOpen && kickTarget === null ? <p role="alert" className="rounded-xl bg-[#FFE8E5] px-4 py-3 text-sm text-[#9A3B32]">{error}</p> : null}

    {kickSeat && typeof document !== "undefined" ? createPortal(<div className="draw-guess-theme fixed inset-0 z-[110] grid place-items-center bg-[#273A53]/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setKickTarget(null); }}><div ref={dialogRef} role="alertdialog" aria-modal="true" aria-label={t.kickTitle} className="draw-guess-dialog w-full max-w-sm rounded-[1.8rem] bg-[#FFFCF5] p-6 text-center shadow-[0_25px_70px_rgba(48,66,92,0.28)]"><DrawGuessCatSprite animated catId={kickSeat.catId} mood="sad" size={78} /><h2 className="mt-2 text-xl font-black">{t.kickTitle}</h2><strong className="mt-1 block truncate text-sm text-[#3E6FA8]">{kickSeat.name}</strong><p className="mt-2 text-sm text-[#63758D]">{t.kickHint}</p>{error ? <p role="alert" className="mt-3 rounded-xl bg-[#FFE8E5] px-3 py-2 text-xs text-[#9A3B32]">{error}</p> : null}<div className="mt-5 flex gap-2"><button autoFocus type="button" disabled={busy} onClick={() => setKickTarget(null)} className="draw-guess-btn draw-guess-btn--milk min-h-11 flex-1 px-3 text-sm">{t.cancel}</button><button type="button" disabled={busy} onClick={() => void mutate(`/api/game-tools/draw-guess/rooms/${room.id}/kick`, "POST", { seatId: kickSeat.id }, "kick")} className="draw-guess-btn draw-guess-btn--candy min-h-11 flex-1 px-3 text-sm">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}{t.kickConfirm}</button></div></div></div>, document.body) : null}

    {characterOpen && typeof document !== "undefined" ? createPortal(<div className="draw-guess-theme fixed inset-0 z-[100] flex items-end justify-center bg-[#273A53]/50 p-2 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCharacter(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t.character} className="draw-guess-dialog flex max-h-[92dvh] w-full max-w-xl flex-col rounded-[1.8rem] bg-[#FFFCF5] shadow-[0_25px_70px_rgba(48,66,92,0.28)] sm:max-h-[85dvh]">
        <div className="flex shrink-0 items-center justify-between px-5 pb-1 pt-4"><h2 className="text-lg font-black">{t.character}</h2><button autoFocus type="button" aria-label={t.close} onClick={closeCharacter} className="grid h-9 w-9 place-items-center rounded-full bg-[#E6F1FB] text-[#405875] outline-none focus-visible:ring-2 focus-visible:ring-[#3E6FA8]"><X className="h-4 w-4" /></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 sm:px-5">
          <div className="flex items-center justify-center gap-4 rounded-2xl bg-[#E8F2FB] py-2">
            <DrawGuessCatSprite animated catId={selectedCatId} direction={CAT_DIRECTIONS[catDirectionIndex]} size={106} />
            <div className="flex flex-col items-start gap-2"><strong className="text-base font-black">{getDrawGuessCatName(selectedCatId, locale)}</strong><button type="button" onClick={() => setCatDirectionIndex((index) => (index + 1) % CAT_DIRECTIONS.length)} className="draw-guess-btn draw-guess-btn--milk min-h-9 px-3 text-xs"><RotateCw className="h-3.5 w-3.5" />{t.turnCat}</button></div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{DRAW_GUESS_CATS.map((cat) => <button key={cat.id} type="button" aria-pressed={selectedCatId === cat.id} onClick={() => { setSelectedCatId(cat.id); setCatDirectionIndex(0); }} className={`flex min-w-0 flex-col items-center rounded-2xl px-1 py-2 text-center outline-none transition-transform focus-visible:ring-2 focus-visible:ring-[#3E6FA8] motion-safe:hover:-translate-y-0.5 ${selectedCatId === cat.id ? "bg-[#DCECF9] shadow-[0_3px_0_#B6D3EB]" : "bg-[#F4F7FA]"}`}><DrawGuessCatSprite catId={cat.id} size={66} /><span className="mt-0.5 max-w-full truncate text-[11px] font-bold">{getDrawGuessCatName(cat.id, locale)}</span></button>)}</div>
        </div>
        {error ? <p role="alert" className="mx-4 mb-2 rounded-xl bg-[#FFE8E5] px-3 py-2 text-xs text-[#9A3B32]">{error}</p> : null}
        <div className="shrink-0 px-4 pb-5 pt-2"><button type="button" disabled={busy || selectedCatId === me?.catId} onClick={() => void mutate(`/api/game-tools/draw-guess/rooms/${room.id}/character`, "PATCH", { catId: selectedCatId }, "character")} className="draw-guess-btn draw-guess-btn--candy min-h-12 w-full px-4 text-sm">{busy ? t.saving : t.saveCat}</button></div>
      </div>
    </div>, document.body) : null}

    {bankOpen && typeof document !== "undefined" ? createPortal(<div className="draw-guess-theme fixed inset-0 z-[100] flex items-end justify-center bg-[#273A53]/50 p-2 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) closeBank(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t.bank} className="draw-guess-dialog flex max-h-[92dvh] w-full max-w-xl flex-col rounded-[1.8rem] bg-[#FFFCF5] shadow-[0_25px_70px_rgba(48,66,92,0.28)] sm:max-h-[85dvh]">
        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-4"><h2 className="flex items-center gap-2 text-lg font-black"><BookOpen className="h-5 w-5 text-[#3E6FA8]" />{t.bank}</h2><button autoFocus type="button" aria-label={t.close} onClick={closeBank} className="grid h-9 w-9 place-items-center rounded-full bg-[#E6F1FB] text-[#405875] outline-none transition-colors hover:bg-[#CFE3F4] focus-visible:ring-2 focus-visible:ring-[#3E6FA8]"><X className="h-4 w-4" /></button></div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-2">
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8EA9C5]" />
              <input aria-label={t.search} className="min-h-11 w-full rounded-full border border-[#D5E4F2] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#3E6FA8]" placeholder={t.search} value={bankSearch} onChange={(event) => setBankSearch(event.target.value)} />
            </label>
            <label className="relative w-32 shrink-0 sm:w-36">
              <select aria-label={t.type} className="min-h-11 w-full cursor-pointer appearance-none truncate rounded-full border border-[#D5E4F2] bg-white pl-3 pr-8 text-sm font-bold text-[#405875] outline-none focus:border-[#3E6FA8]" value={bankCategory} onChange={(event) => setBankCategory(event.target.value)}>
                <option value="">{t.allTypes}</option>
                {bankCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#63758D]" />
            </label>
          </div>
          {banks === null && !error ? <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm font-semibold text-[#63758D]"><LoaderCircle className="h-4 w-4 animate-spin" />{t.loadingBanks}</p> : null}
          {banks && shownBanks.length === 0 ? <p className="py-8 text-center text-sm font-semibold text-[#63758D]">{t.noBanks}</p> : null}
          <div className="mt-3 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pb-1 pr-1">{shownBanks.map((bank) => <button key={bank.id} type="button" disabled={!room.isHost} onClick={() => setSelectedBankId(bank.id)} aria-pressed={selectedBankId === bank.id} className={`min-w-0 rounded-2xl p-3 text-left outline-none transition-[transform,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-[#3E6FA8] disabled:cursor-default motion-safe:enabled:hover:-translate-y-0.5 ${selectedBankId === bank.id ? "bg-[#DCECF9] shadow-[0_3px_0_#C4D9EA]" : "bg-[#F1F6FC] hover:bg-[#EAF2FA]"}`}><strong className="block truncate text-sm" title={bank.title}>{bank.title}</strong><span className="mt-2 flex min-w-0 items-center gap-1.5"><span className="max-w-full truncate rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-bold text-[#405875]">{bank.category?.trim() || t.otherType}</span><span className="shrink-0 text-[11px] text-[#63758D]">{bank.words.length} {t.words}</span></span></button>)}</div>
          {selectedBank && shownBanks.some((bank) => bank.id === selectedBank.id) ? <details className="mt-3 rounded-2xl bg-[#F1F6FC] p-3"><summary className="cursor-pointer text-sm font-bold text-[#405875]">{t.preview} · {selectedBank.title}</summary><ul className="mt-3 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">{selectedBank.words.map((word) => <li key={word} className="rounded-full bg-white px-2.5 py-1 text-xs">{word}</li>)}</ul></details> : null}
        </div>
        {error ? <p role="alert" className="mx-5 mb-2 rounded-xl bg-[#FFE8E5] px-3 py-2 text-xs text-[#9A3B32]">{error}</p> : null}
        {room.isHost ? <div className="shrink-0 px-4 pb-5 pt-2"><button type="button" disabled={busy || !selectedBankId || !bankChanged} onClick={() => void mutate(`/api/game-tools/draw-guess/rooms/${room.id}`, "PATCH", { wordBankId: selectedBankId }, "bank")} className="draw-guess-btn draw-guess-btn--candy min-h-12 w-full px-4 text-sm">{busy ? t.saving : t.saveBank}</button></div> : null}
      </div>
    </div>, document.body) : null}

    {settingsOpen && typeof document !== "undefined" ? createPortal(<div className="draw-guess-theme fixed inset-0 z-[100] flex items-end justify-center bg-[#273A53]/50 p-2 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSettings(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={t.settings} className="draw-guess-dialog flex max-h-[92dvh] w-full max-w-xl flex-col rounded-[1.8rem] bg-[#FFFCF5] shadow-[0_25px_70px_rgba(48,66,92,0.28)] sm:max-h-[85dvh]">
        <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-4"><h2 className="flex items-center gap-2 text-lg font-black"><Settings2 className="h-5 w-5 text-[#3C70A9]" />{t.settings}</h2><button autoFocus type="button" aria-label={t.close} onClick={closeSettings} className="grid h-9 w-9 place-items-center rounded-full bg-[#EAF2FA] text-[#60758C] outline-none transition-colors hover:bg-[#DCE9F5] focus-visible:ring-2 focus-visible:ring-[#3F74AE]"><X className="h-4 w-4" /></button></div>
        <div className="mx-4 mt-2 grid shrink-0 grid-cols-2 gap-1 rounded-full bg-[#EAF2FA] p-1">{([["time", t.time, Clock3], ["invite", t.invite, QrCode]] as const).map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={tab === key} className={`flex min-h-10 items-center justify-center gap-1 rounded-full text-sm font-bold outline-none transition-[transform,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-[#3F74AE] ${tab === key ? "bg-white text-[#405875] shadow-[0_2px_6px_rgba(48,66,92,0.1)]" : "text-[#65748A] hover:bg-white/60"}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {tab === "time" ? <div className="space-y-5"><fieldset><legend className="text-sm font-bold">{roundCopy.rounds}</legend><div className="mt-2 grid grid-cols-3 gap-2">{DRAW_GUESS_ROUND_COUNTS.map((count) => <button key={count} type="button" disabled={!room.isHost} onClick={() => setRoundCount(count)} aria-pressed={roundCount === count} className={`draw-guess-btn min-h-11 px-2 text-sm disabled:cursor-default ${roundCount === count ? "draw-guess-btn--blush" : "draw-guess-btn--milk"}`}>{count} {roundUnit(locale, count)}</button>)}</div></fieldset>{([{ key: "drawSeconds", label: t.draw, options: DRAW_GUESS_DRAW_SECONDS }, { key: "guessSeconds", label: t.guess, options: DRAW_GUESS_GUESS_SECONDS }] as const).map(({ key, label, options }) => <fieldset key={key}><legend className="text-sm font-bold">{label}</legend><div className="mt-2 grid grid-cols-3 gap-2">{options.map((seconds) => <button key={seconds} type="button" disabled={!room.isHost} onClick={() => setTiming((value) => ({ ...value, [key]: seconds }))} aria-pressed={timing[key] === seconds} className={`draw-guess-btn min-h-11 px-2 text-sm disabled:cursor-default ${timing[key] === seconds ? "draw-guess-btn--blush" : "draw-guess-btn--milk"}`}>{seconds} {t.seconds}</button>)}</div></fieldset>)}<p aria-live="polite" className="rounded-2xl bg-[#E8F2FB] px-4 py-3 text-center text-sm font-black text-[#3E6FA8]">{roundCopy.estimate} {estimatedMinutes} {roundCopy.minutes}</p></div> : null}
          {tab === "invite" ? <div className="flex flex-col items-center text-center"><p className="text-sm font-semibold text-[#63758D]">{t.scan}</p>{qr ? <Image alt={t.scan} className="mt-3 h-44 w-44 rounded-2xl bg-white p-2" height={176} src={qr} unoptimized width={176} /> : <div className="mt-3 grid h-44 w-44 place-items-center rounded-2xl bg-[#F1F6FC]"><QrCode className="h-8 w-8 text-[#7CA5CC]" /></div>}<strong className="mt-3 font-mono text-xl tracking-[0.2em]">{room.code}</strong><button type="button" onClick={() => void copyInvite()} className="draw-guess-btn draw-guess-btn--blush mt-3 min-h-11 px-5 text-sm"><Copy className="h-4 w-4" />{copied ? t.copied : t.copy}</button></div> : null}
        </div>
        {error ? <p role="alert" className="mx-5 mb-2 rounded-xl bg-[#FFE8E5] px-3 py-2 text-xs text-[#9A3B32]">{error}</p> : null}
        {room.isHost && tab === "time" ? <div className="shrink-0 px-4 pb-5 pt-2"><button type="button" disabled={busy || !settingsChanged} onClick={() => void mutate(`/api/game-tools/draw-guess/rooms/${room.id}`, "PATCH", { timing, roundCount }, "settings")} className="draw-guess-btn draw-guess-btn--candy min-h-12 w-full px-4 text-sm">{busy ? t.saving : t.save}</button></div> : null}
      </div>
    </div>, document.body) : null}
    {launching && typeof document !== "undefined" ? createPortal(<div role="status" className="draw-guess-launch-overlay fixed inset-0 z-[120] grid place-items-center bg-[#30425C]/90 text-center text-white"><div><DrawGuessCatSprite animated catId={me?.catId} mood="happy" size={112} /><strong className="mt-4 block text-3xl font-black tracking-wide">{t.launching}</strong><span className="mx-auto mt-5 block h-1 w-24 overflow-hidden rounded-full bg-white/30"><span className="block h-full w-full origin-left animate-pulse rounded-full bg-[#6B99D0]" /></span></div></div>, document.body) : null}
  </div>;
}
