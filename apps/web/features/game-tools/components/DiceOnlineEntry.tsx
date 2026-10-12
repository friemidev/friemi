"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, UsersRound } from "lucide-react";
import { GameToolBrand } from "./GameToolBrand";
import { DrawGuessCatSprite } from "./DrawGuessCatSprite";
import { withLocale } from "@/lib/routes";

const texts = {
  "zh-CN": { back: "游戏房间", title: "和朋友吹牛", people: "几个人玩", create: "创建房间", join: "加入房间", code: "房间号", enter: "加入", solo: "自由摇骰 / 单机练习", signin: "登录后就能开房或加入。", error: "房间暂时打不开，再试一次。", missing: "房间号不对，检查一下。", full: "房间满了。", started: "这局已经开始。", sub: "每人 5 颗骰子。自己的点数自己看。" },
  en: { back: "Table games", title: "Bluff with friends", people: "Players", create: "Create room", join: "Join room", code: "Room code", enter: "Join", solo: "Free roll / solo practice", signin: "Sign in to create or join a room.", error: "Could not open the room. Try again.", missing: "Check the room code.", full: "Room is full.", started: "This game has started.", sub: "Five dice each. Only you see your hand." },
  fr: { back: "Jeux de table", title: "Bluffez entre amis", people: "Joueurs", create: "Créer une salle", join: "Rejoindre une salle", code: "Code de salle", enter: "Entrer", solo: "Lancer libre / solo", signin: "Connectez-vous pour créer ou rejoindre une salle.", error: "Impossible d'ouvrir la salle. Réessayez.", missing: "Vérifiez le code de la salle.", full: "La salle est pleine.", started: "La partie a déjà commencé.", sub: "Cinq dés chacun. Votre main reste privée." },
} as const;
export function DiceOnlineEntry({ locale, profileId, initialCode }: { locale: string; profileId: string | null; initialCode: string }) {
  const t = texts[locale as keyof typeof texts] ?? texts.en;
  const router = useRouter();
  const [players, setPlayers] = useState(4);
  const [code, setCode] = useState(initialCode.trim().toUpperCase());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(kind: "create" | "join") {
    if (busy || !profileId) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/game-tools/dice/rooms", {
        method: kind === "create" ? "POST" : "PUT", headers: { "content-type": "application/json" }, cache: "no-store",
        body: JSON.stringify(kind === "create" ? { locale, maxPlayers: players } : { code: code.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.roomId) {
        setError(data.error === "ROOM_NOT_FOUND" ? t.missing : data.error === "ROOM_FULL" ? t.full : data.error === "GAME_STARTED" ? t.started : t.error);
        return;
      }
      router.push(withLocale(locale, `/game-tools/dice/online/rooms/${data.roomId}`));
    } catch { setError(t.error); }
    finally { setBusy(false); }
  }
  return <main className="dice-online">
    <nav className="dice-online-nav" aria-label={locale === "zh-CN" ? "游戏导航" : "Game navigation"}><Link className="dice-online-back" aria-label={t.back} href={withLocale(locale, "/game-tools")}><ArrowLeft size={20} /></Link><GameToolBrand game={locale === "zh-CN" ? "骰子" : locale === "fr" ? "Dés" : "Dice"} href={withLocale(locale, "/game-tools/dice/online")} /></nav>
    <header className="dice-online-hero"><div><h1>{t.title}</h1><p>{t.sub}</p></div><Image src="/game-tools/dice/logo.webp" alt="" width={128} height={128} priority /></header>
    <section className="dice-online-entry-grid">
      <div className="dice-online-paper dice-online-entry-card"><div className="dice-online-card-icon"><DrawGuessCatSprite catId="baker" mood="happy" size={62} /></div><h2>{t.create}</h2><label htmlFor="dice-players">{t.people}</label><select id="dice-players" value={players} onChange={(event) => setPlayers(Number(event.target.value))}>{[2,3,4,5,6].map((count) => <option key={count} value={count}>{count}</option>)}</select><button className="dice-online-primary" disabled={busy || !profileId} onClick={() => void submit("create")}>{busy ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight size={18} />}{t.create}</button></div>
      <div className="dice-online-paper dice-online-entry-card"><div className="dice-online-card-icon"><DrawGuessCatSprite catId="scholar" mood="idle" size={62} /></div><h2>{t.join}</h2><label htmlFor="dice-code">{t.code}</label><input id="dice-code" autoComplete="off" inputMode="text" maxLength={8} value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} onKeyDown={(event) => { if (event.key === "Enter") void submit("join"); }} placeholder="A1B2C3" /><button className="dice-online-secondary" disabled={busy || !profileId || code.length < 6} onClick={() => void submit("join")}>{busy ? <LoaderCircle className="animate-spin" size={18} /> : <UsersRound size={18} />}{t.enter}</button></div>
    </section>
    {error ? <p className="dice-online-error" role="alert">{error}</p> : null}
    {!profileId ? <p className="dice-online-note">{t.signin}</p> : null}
    <Link className="dice-online-solo" href={withLocale(locale, "/game-tools/dice")}>{t.solo}<ArrowRight size={16} /></Link>
  </main>;
}
