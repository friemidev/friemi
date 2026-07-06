"use client";

import Image from "next/image";
import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Lock, Moon, UsersRound } from "lucide-react";
import {
  createWerewolfRoomAction,
  type WerewolfRoomActionState,
} from "@/features/game-tools/actions/werewolfRoomActions";
import {
  defaultWerewolfVariantKey,
  getWerewolfVariantLabel,
  werewolfVariants,
} from "@/features/game-tools/werewolfConfig";

type WerewolfCreateRoomPanelProps = {
  locale: string;
};

type Copy = {
  boundary: string;
  create: string;
  disabled: string;
  enabled: string;
  eyebrow: string;
  helper: string;
  judge: string;
  players: string;
  title: string;
  titleLabel: string;
  titlePlaceholder: string;
  variants: string;
};

const copies: Record<string, Copy> = {
  "zh-CN": {
    boundary: "线下法官负责发言、投票、计时和夜晚流程；Friemi 只辅助身份、座位、死亡和结算记录。",
    create: "创建狼人杀房间",
    disabled: "后续支持",
    enabled: "MVP 支持",
    eyebrow: "线下法官辅助工具",
    helper:
      "选择人数后创建房间。所有版型都包含 1 名法官，系统只给玩家发身份。",
    judge: "含法官",
    players: "人数",
    title: "先开一张狼人杀桌，剩下的交给现场。",
    titleLabel: "房间名",
    titlePlaceholder: "今晚的狼人杀小局",
    variants: "选择版型",
  },
  en: {
    boundary:
      "The offline judge still handles speaking, votes, timing, and night actions. Friemi only helps with roles, seats, deaths, and records.",
    create: "Create Werewolf room",
    disabled: "Later",
    enabled: "MVP",
    eyebrow: "Offline judge helper",
    helper:
      "Choose a setup, then create the room. Every setup includes 1 judge and roles are dealt only to players.",
    judge: "with judge",
    players: "Seats",
    title: "Open a Werewolf table, then keep the game at the table.",
    titleLabel: "Room title",
    titlePlaceholder: "Tonight's Werewolf table",
    variants: "Choose setup",
  },
  fr: {
    boundary:
      "Le maître du jeu garde la parole, les votes, le rythme et la nuit. Friemi aide seulement les rôles, places, morts et résultats.",
    create: "Créer une table Loups-garous",
    disabled: "Plus tard",
    enabled: "MVP",
    eyebrow: "Assistant maître du jeu",
    helper:
      "Choisissez une configuration. Chaque table inclut 1 maître du jeu et les rôles sont distribués seulement aux joueurs.",
    judge: "avec maître",
    players: "Places",
    title: "Ouvrez une table Loups-garous, puis gardez le jeu autour de la table.",
    titleLabel: "Nom de la table",
    titlePlaceholder: "Table Loups-garous de ce soir",
    variants: "Choisir une configuration",
  },
};

const initialState: WerewolfRoomActionState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#7A1F2B] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(122,31,43,0.22)] transition hover:bg-[#9B2D3C] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

export function WerewolfCreateRoomPanel({
  locale,
}: WerewolfCreateRoomPanelProps) {
  const [state, formAction] = useActionState(
    createWerewolfRoomAction,
    initialState,
  );
  const [selectedVariantKey, setSelectedVariantKey] = useState(
    defaultWerewolfVariantKey,
  );
  const t = copies[locale] ?? copies.en;

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-stretch">
      <div className="overflow-hidden rounded-[1.6rem] border border-[#D9C7B4] bg-[#1E1718] text-white shadow-[0_24px_70px_rgba(30,23,24,0.18)]">
        <div className="relative min-h-[22rem]">
          <Image
            alt=""
            className="h-full min-h-[22rem] w-full object-cover opacity-78"
            height={720}
            priority={false}
            src="/game-tools/mafia/mafia.jpeg"
            width={960}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(30,23,24,0.08),rgba(30,23,24,0.78))]" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-white backdrop-blur">
              <Moon className="h-3.5 w-3.5" />
              {t.eyebrow}
            </span>
            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-[1.04] tracking-normal sm:text-5xl">
              {t.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-white/78 sm:text-base">
              {t.helper}
            </p>
          </div>
        </div>
      </div>

      <form
        action={formAction}
        className="grid content-between gap-5 rounded-[1.6rem] border border-[#D9C7B4] bg-[#FFFDF7] p-4 shadow-[0_18px_48px_rgba(30,23,24,0.08)] sm:p-5"
      >
        <input name="locale" type="hidden" value={locale} />
        <input name="variantKey" type="hidden" value={selectedVariantKey} />

        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-xs font-black text-[#7A1F2B]">
              {t.titleLabel}
            </span>
            <input
              className="h-12 rounded-2xl border border-[#D9C7B4] bg-white px-4 text-sm font-bold text-[#1E1718] outline-none transition focus:border-[#7A1F2B] focus:ring-2 focus:ring-[#7A1F2B]/15"
              maxLength={80}
              name="title"
              placeholder={t.titlePlaceholder}
            />
          </label>

          <div className="rounded-[1.2rem] border border-[#D9C7B4] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black text-[#1E1718]">
                {t.variants}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4ECE6] px-2.5 py-1 text-xs font-black text-[#7A1F2B]">
                <UsersRound className="h-3.5 w-3.5" />
                {t.judge}
              </span>
            </div>

            <div className="mt-3 grid gap-2">
              {werewolfVariants.map((variant) => (
                <label
                  className={`flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3 py-2 transition ${
                    selectedVariantKey === variant.key
                      ? "border-[#7A1F2B] bg-[#FFF7F1] shadow-sm"
                      : "border-[#D9C7B4] bg-[#F7F3EC] text-[#1E1718]/70 hover:bg-[#FFFDF7]"
                  } ${variant.enabled ? "" : "cursor-not-allowed opacity-60"}`}
                  key={variant.key}
                >
                  <input
                    checked={selectedVariantKey === variant.key}
                    className="sr-only"
                    disabled={!variant.enabled}
                    name="variantChoice"
                    onChange={() => setSelectedVariantKey(variant.key)}
                    type="radio"
                    value={variant.key}
                  />
                  <div>
                    <p className="text-sm font-black text-[#1E1718]">
                      {getWerewolfVariantLabel(locale, variant)}
                    </p>
                    <p className="text-xs font-bold text-[#7A1F2B]/70">
                      {variant.totalSeats} {t.players}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${
                      variant.enabled
                        ? "bg-[#7A1F2B] text-white"
                        : "bg-white text-[#1E1718]/52"
                    }`}
                  >
                    {!variant.enabled ? <Lock className="h-3 w-3" /> : null}
                    {variant.enabled ? t.enabled : t.disabled}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <p className="rounded-[1.2rem] border border-[#D9C7B4] bg-[#F7F3EC] p-3 text-sm font-bold leading-6 text-[#7A1F2B]">
            {t.boundary}
          </p>

          {state.formError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
              {state.formError}
            </p>
          ) : null}
        </div>

        <SubmitButton label={t.create} />
      </form>
    </section>
  );
}
