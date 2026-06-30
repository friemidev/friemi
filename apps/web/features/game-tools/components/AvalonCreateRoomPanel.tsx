"use client";

import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Dice5, Sparkles, Users } from "lucide-react";
import {
  createAvalonRoomAction,
  type AvalonRoomActionState,
} from "@/features/game-tools/actions/avalonRoomActions";
import { avalonPlayerCounts } from "@/features/game-tools/avalonConfig";

type AvalonCreateRoomPanelProps = {
  locale: string;
};

type Copy = {
  create: string;
  eyebrow: string;
  helper: string;
  modeFull: string;
  modeIdentity: string;
  modePublic: string;
  players: string;
  title: string;
  titleLabel: string;
  titlePlaceholder: string;
};

const copies: Record<string, Copy> = {
  "zh-CN": {
    create: "创建多人房间",
    eyebrow: "v0.2 多人基础",
    helper: "先生成房间、座位和每位玩家的私密身份链接。投票和任务提交会在后续版本继续接上。",
    modeFull: "全数字",
    modeIdentity: "数字身份",
    modePublic: "公共辅助",
    players: "人数",
    title: "让这一局先有一个真正的房间。",
    titleLabel: "房间名",
    titlePlaceholder: "今晚的阿瓦隆小局",
  },
  en: {
    create: "Create room",
    eyebrow: "v0.2 room foundation",
    helper:
      "Generate a room, seats, and private identity links first. Voting and quest submission will come next.",
    modeFull: "Full digital",
    modeIdentity: "Digital roles",
    modePublic: "Public assist",
    players: "Players",
    title: "Give this table a real room first.",
    titleLabel: "Room title",
    titlePlaceholder: "Tonight's Avalon table",
  },
  fr: {
    create: "Créer une table",
    eyebrow: "v0.2 base multijoueur",
    helper:
      "Crée d'abord une table, les places et les liens privés d'identité. Les votes et les quêtes suivront.",
    modeFull: "Tout numérique",
    modeIdentity: "Identités numériques",
    modePublic: "Assistance publique",
    players: "Joueurs",
    title: "Donne d'abord une vraie table à cette partie.",
    titleLabel: "Nom de la table",
    titlePlaceholder: "Table Avalon de ce soir",
  },
};

const initialState: AvalonRoomActionState = {};

export function AvalonCreateRoomPanel({ locale }: AvalonCreateRoomPanelProps) {
  const [state, formAction] = useActionState(
    createAvalonRoomAction,
    initialState,
  );
  const t = copies[locale] ?? copies.en;

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] p-4 shadow-xl shadow-[#156240]/10 sm:p-6 lg:p-7">
      <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#F09182]/20 blur-3xl" />
      <div className="absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-[#8AB68E]/20 blur-3xl" />

      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#8AB68E]/45 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#156240]">
            <Sparkles className="h-3.5 w-3.5" />
            {t.eyebrow}
          </span>
          <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <div className="relative grid h-24 w-24 place-items-center rounded-[2rem] border border-[#8AB68E]/40 bg-white shadow-xl shadow-[#156240]/10">
              <Image
                alt=""
                className="h-16 w-16"
                height={72}
                src="/game-tools/avalon/avalon-tool-icon.svg"
                width={72}
              />
              <span className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-[#F09182] text-xs font-black text-white shadow-lg">
                v2
              </span>
            </div>
            <div>
              <h2 className="max-w-xl text-2xl font-semibold leading-tight tracking-normal text-[#0E2A5A] sm:text-3xl">
                {t.title}
              </h2>
              <div className="mt-3 flex items-center gap-2">
                {[
                  "/game-tools/avalon/roles/role-merlin.svg",
                  "/game-tools/avalon/roles/role-assassin.svg",
                  "/game-tools/avalon/states/mission-success-token.svg",
                ].map((src) => (
                  <span
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-[#D6D5B2] bg-white shadow-sm"
                    key={src}
                  >
                    <Image alt="" height={30} src={src} width={30} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <form
          action={formAction}
          className="relative grid gap-3 rounded-[1.5rem] border border-[#D6D5B2] bg-white/80 p-3 shadow-lg shadow-[#156240]/5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-4"
        >
          <input name="locale" type="hidden" value={locale} />
          <label className="grid gap-1.5 sm:col-span-2">
            <span className="text-xs font-bold text-[#156240]">
              {t.titleLabel}
            </span>
            <input
              className="h-11 rounded-2xl border border-[#D6D5B2] bg-[#FEFFF9] px-4 text-sm font-semibold text-[#1D1D1B] outline-none transition focus:border-[#369758] focus:ring-2 focus:ring-[#8AB68E]/20"
              maxLength={80}
              name="title"
              placeholder={t.titlePlaceholder}
            />
          </label>

          <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2">
            <label className="grid gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#156240]">
                <Users className="h-3.5 w-3.5" />
                {t.players}
              </span>
              <select
                className="h-11 rounded-2xl border border-[#D6D5B2] bg-[#FEFFF9] px-3 text-sm font-bold text-[#0E2A5A] outline-none transition focus:border-[#369758] focus:ring-2 focus:ring-[#8AB68E]/20"
                defaultValue="7"
                name="playerCount"
              >
                {avalonPlayerCounts.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#156240]">
                <Dice5 className="h-3.5 w-3.5" />
                Mode
              </span>
              <select
                className="h-11 rounded-2xl border border-[#D6D5B2] bg-[#FEFFF9] px-3 text-sm font-bold text-[#0E2A5A] outline-none transition focus:border-[#369758] focus:ring-2 focus:ring-[#8AB68E]/20"
                defaultValue="identity"
                name="mode"
              >
                <option value="identity">{t.modeIdentity}</option>
                <option value="public">{t.modePublic}</option>
                <option value="full">{t.modeFull}</option>
              </select>
            </label>
          </div>

          <CreateRoomSubmitButton label={t.create} />

          {state.formError ? (
            <p className="rounded-2xl bg-[#F09182]/12 px-3 py-2 text-sm font-semibold text-[#B5301F] sm:col-span-2">
              {state.formError}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}

function CreateRoomSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#156240] px-5 text-sm font-bold text-white shadow-lg shadow-[#156240]/20 transition hover:-translate-y-0.5 hover:bg-[#0f5133] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}
