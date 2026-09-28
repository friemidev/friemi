"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { withLocale } from "@/lib/routes";

export function DrawGuessJoinClient({ code, locale }: { code: string; locale: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    fetch("/api/game-tools/draw-guess/join", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: code.toUpperCase() }) })
      .then(async (response) => { const result = await response.json(); if (!response.ok || !result.roomId) throw new Error(result.error ?? "UNKNOWN"); return result.roomId as string; })
      .then((roomId) => { if (mounted) router.replace(withLocale(locale, `/game-tools/draw-guess/rooms/${roomId}`)); })
      .catch((cause) => { if (mounted) setError(cause instanceof Error ? cause.message : "UNKNOWN"); });
    return () => { mounted = false; };
  }, [code, locale, router]);
  return <div className="rounded-[2rem] bg-[#F6F3E8] p-8 text-center text-[#173D32]"><h1 className="text-2xl font-bold">{locale === "zh-CN" ? "加入你画我猜" : locale === "fr" ? "Rejoindre la salle" : "Join Draw & Guess"}</h1><p className="mt-3 font-mono text-xl tracking-widest">{code.toUpperCase()}</p>{error ? <><p role="alert" className="mt-5 text-[#A14339]">{error === "SIGN_IN_REQUIRED" ? locale === "zh-CN" ? "请先登录，再打开邀请链接。" : "Please sign in first." : locale === "zh-CN" ? "无法加入这个房间，可能已开局或人数已满。" : "This room could not be joined."}</p><Link className="mt-5 inline-block rounded-xl bg-[#156240] px-5 py-3 font-bold text-white" href={withLocale(locale, "/game-tools/draw-guess")}>{locale === "zh-CN" ? "返回游戏入口" : "Back to game"}</Link></> : <LoaderCircle className="mx-auto mt-6 h-6 w-6 animate-spin" />}</div>;
}
