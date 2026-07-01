"use client";

import Image from "next/image";
import { useActionState, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { ArrowRight, Check, Dice5, Sparkles, Users, X } from "lucide-react";
import {
  createAvalonRoomAction,
  type AvalonRoomActionState,
} from "@/features/game-tools/actions/avalonRoomActions";
import { avalonPlayerCounts } from "@/features/game-tools/avalonConfig";

type AvalonCreateRoomPanelProps = {
  locale: string;
};

type Copy = {
  choose: string;
  close: string;
  create: string;
  eyebrow: string;
  helper: string;
  modeLabel: string;
  modeFull: string;
  modeFullHint: string;
  modeIdentity: string;
  modeIdentityHint: string;
  modePublic: string;
  modePublicHint: string;
  players: string;
  playersHint: string;
  title: string;
  titleLabel: string;
  titlePlaceholder: string;
};

const copies: Record<string, Copy> = {
  "zh-CN": {
    choose: "选择",
    close: "关闭",
    create: "开局建房",
    eyebrow: "5-10 人 · 约 30 分钟",
    helper: "开好房间后，朋友扫码入座；每个人只看自己的身份，后面按轮次选队伍、投票、做任务。",
    modeLabel: "玩法模式",
    modeFull: "手机全流程",
    modeFullHint: "身份、投票、任务牌都在手机完成",
    modeIdentity: "手机发身份",
    modeIdentityHint: "推荐：手机发身份，讨论和现场节奏照旧",
    modePublic: "只记流程",
    modePublicHint: "有实体牌时使用，手机只记座位和结果",
    players: "人数",
    playersHint: "人数越多，局面越乱也越好笑",
    title: "想玩阿瓦隆？先开桌，朋友扫码就能入座。",
    titleLabel: "房间名",
    titlePlaceholder: "今晚的阿瓦隆小局",
  },
  en: {
    choose: "Choose",
    close: "Close",
    create: "Create room",
    eyebrow: "5-10 players · about 30 min",
    helper:
      "Open a table, let friends join by code, then deal private roles and move through teams, votes, and quests.",
    modeLabel: "Mode",
    modeFull: "Phone-led game",
    modeFullHint: "Roles, votes, and quest cards all happen on phones",
    modeIdentity: "Phone roles",
    modeIdentityHint: "Recommended: phones deal roles, the table still talks",
    modePublic: "Track only",
    modePublicHint: "Use physical cards; Friemi only tracks the flow",
    players: "Players",
    playersHint: "More players means more chaos and table reads",
    title: "Starting Avalon? Open a table and let friends join.",
    titleLabel: "Room title",
    titlePlaceholder: "Tonight's Avalon table",
  },
  fr: {
    choose: "Choisir",
    close: "Fermer",
    create: "Créer une table",
    eyebrow: "5-10 joueurs · environ 30 min",
    helper:
      "Ouvre une table, laisse les amis entrer par code, puis distribue les rôles privés et suis équipes, votes et quêtes.",
    modeLabel: "Mode",
    modeFull: "Tout sur téléphone",
    modeFullHint: "Rôles, votes et quêtes passent par les téléphones",
    modeIdentity: "Rôles téléphone",
    modeIdentityHint: "Recommandé : téléphone pour les rôles, discussion à table",
    modePublic: "Suivi simple",
    modePublicHint: "Avec cartes physiques, Friemi suit seulement le fil",
    players: "Joueurs",
    playersHint: "Plus de joueurs, plus de chaos et de lecture de table",
    title: "Envie d'Avalon ? Ouvre une table et invite les amis.",
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
  const [playerCount, setPlayerCount] = useState(7);
  const [mode, setMode] = useState<"full" | "identity" | "public">("identity");
  const [openPicker, setOpenPicker] = useState<"mode" | "players" | null>(null);
  const t = copies[locale] ?? copies.en;
  const modeOptions = useMemo(
    () => [
      {
        hint: t.modeIdentityHint,
        icon: "/game-tools/avalon/roles/private-card-back.svg",
        label: t.modeIdentity,
        value: "identity" as const,
      },
      {
        hint: t.modePublicHint,
        icon: "/game-tools/avalon/states/public-screen-token.svg",
        label: t.modePublic,
        value: "public" as const,
      },
      {
        hint: t.modeFullHint,
        icon: "/game-tools/avalon/states/player-console-token.svg",
        label: t.modeFull,
        value: "full" as const,
      },
    ],
    [t],
  );
  const selectedMode = modeOptions.find((option) => option.value === mode) ?? modeOptions[0];

  return (
    <section className="relative isolate min-w-0 overflow-hidden rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] p-4 shadow-xl shadow-[#156240]/10 sm:p-6 lg:p-7">
      <div className="absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#F09182]/20 blur-3xl" />
      <div className="absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-[#8AB68E]/20 blur-3xl" />

      <div className="relative grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
        <div className="min-w-0 space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#8AB68E]/45 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#156240]">
            <Sparkles className="h-3.5 w-3.5" />
            {t.eyebrow}
          </span>
          <div className="grid min-w-0 gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
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
            <div className="min-w-0">
              <h2 className="max-w-xl break-words text-2xl font-semibold leading-tight tracking-normal text-[#0E2A5A] sm:text-3xl">
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
          className="relative grid min-w-0 gap-3 rounded-[1.5rem] border border-[#D6D5B2] bg-white/80 p-3 shadow-lg shadow-[#156240]/5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-4"
        >
          <input name="locale" type="hidden" value={locale} />
          <input name="mode" type="hidden" value={mode} />
          <input name="playerCount" type="hidden" value={playerCount} />
          <label className="grid gap-1.5 sm:col-span-2">
            <span className="text-xs font-bold text-[#156240]">
              {t.titleLabel}
            </span>
            <input
              className="h-11 min-w-0 rounded-2xl border border-[#D6D5B2] bg-[#FEFFF9] px-4 text-sm font-semibold text-[#1D1D1B] outline-none transition focus:border-[#369758] focus:ring-2 focus:ring-[#8AB68E]/20"
              maxLength={80}
              name="title"
              placeholder={t.titlePlaceholder}
            />
          </label>

          <div className="grid min-w-0 grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#156240]">
                <Users className="h-3.5 w-3.5" />
                {t.players}
              </span>
              <PickerButton
                icon={<Users className="h-4 w-4" />}
                label={t.players}
                onClick={() => setOpenPicker("players")}
                value={String(playerCount)}
              />
            </div>

            <div className="grid gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#156240]">
                <Dice5 className="h-3.5 w-3.5" />
                {t.modeLabel}
              </span>
              <PickerButton
                image={selectedMode.icon}
                label={t.modeLabel}
                onClick={() => setOpenPicker("mode")}
                value={selectedMode.label}
              />
            </div>
          </div>

          <CreateRoomSubmitButton label={t.create} />

          {state.formError ? (
            <p className="rounded-2xl bg-[#F09182]/12 px-3 py-2 text-sm font-semibold text-[#B5301F] sm:col-span-2">
              {state.formError}
            </p>
          ) : null}
        </form>
      </div>

      {openPicker === "players" ? (
        <ChoiceSheet
          description={t.playersHint}
          icon={<Users className="h-5 w-5" />}
          onClose={() => setOpenPicker(null)}
          title={t.players}
          t={t}
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {avalonPlayerCounts.map((count) => (
              <button
                className={
                  count === playerCount
                    ? "relative min-h-20 rounded-[1.35rem] border border-[#156240] bg-[#156240] p-3 text-white shadow-xl shadow-[#156240]/18"
                    : "relative min-h-20 rounded-[1.35rem] border border-[#D6D5B2] bg-[#FEFFF9] p-3 text-[#156240] shadow-sm transition hover:-translate-y-0.5 hover:border-[#8AB68E]"
                }
                key={count}
                onClick={() => {
                  setPlayerCount(count);
                  setOpenPicker(null);
                }}
                type="button"
              >
                <span className="block text-2xl font-black leading-none">{count}</span>
                <span className="mt-1 block text-[0.64rem] font-black uppercase tracking-[0.12em] opacity-75">
                  {t.players}
                </span>
                {count === playerCount ? (
                  <Check className="absolute right-2 top-2 h-4 w-4" />
                ) : null}
              </button>
            ))}
          </div>
        </ChoiceSheet>
      ) : null}

      {openPicker === "mode" ? (
        <ChoiceSheet
          description={selectedMode.hint}
          icon={<Dice5 className="h-5 w-5" />}
          onClose={() => setOpenPicker(null)}
          title={t.modeLabel}
          t={t}
        >
          <div className="grid gap-2">
            {modeOptions.map((option) => (
              <button
                className={
                  option.value === mode
                    ? "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.35rem] border border-[#156240] bg-[#156240] p-3 text-left text-white shadow-xl shadow-[#156240]/18"
                    : "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.35rem] border border-[#D6D5B2] bg-[#FEFFF9] p-3 text-left text-[#156240] shadow-sm transition hover:-translate-y-0.5 hover:border-[#8AB68E]"
                }
                key={option.value}
                onClick={() => {
                  setMode(option.value);
                  setOpenPicker(null);
                }}
                type="button"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/90 shadow-inner">
                  <Image alt="" height={34} src={option.icon} width={34} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">{option.label}</span>
                  <span className="mt-0.5 block text-xs font-semibold leading-5 opacity-75">
                    {option.hint}
                  </span>
                </span>
                {option.value === mode ? <Check className="h-5 w-5" /> : null}
              </button>
            ))}
          </div>
        </ChoiceSheet>
      ) : null}
    </section>
  );
}

function PickerButton({
  icon,
  image,
  label,
  onClick,
  value,
}: {
  icon?: ReactNode;
  image?: string;
  label: string;
  onClick: () => void;
  value: string;
}) {
  return (
    <button
      aria-label={`${label}: ${value}`}
      className="group grid h-12 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-[#D6D5B2] bg-[#FEFFF9] px-3 text-left shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-[#8AB68E] hover:bg-white focus:border-[#369758] focus:ring-2 focus:ring-[#8AB68E]/20"
      onClick={onClick}
      type="button"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#F1F2EC] text-[#156240] shadow-inner">
        {image ? <Image alt="" height={24} src={image} width={24} /> : icon}
      </span>
      <span className="truncate text-sm font-black text-[#0E2A5A]">{value}</span>
      <ArrowRight className="h-3.5 w-3.5 text-[#156240]/55 transition group-hover:text-[#156240]" />
    </button>
  );
}

function ChoiceSheet({
  children,
  description,
  icon,
  onClose,
  t,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  onClose: () => void;
  t: Copy;
  title: string;
}) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] grid place-items-end bg-[#1D1D1B]/28 p-2 pb-[calc(env(safe-area-inset-bottom)+5.8rem)] backdrop-blur-sm sm:place-items-center sm:p-4">
      <button
        aria-label={t.close}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div className="avalon-rise relative flex max-h-[calc(100svh-7.25rem)] w-full max-w-xl flex-col overflow-hidden rounded-[1.8rem] border border-[#8AB68E]/55 bg-[#FEFFF9] p-3 shadow-2xl shadow-[#156240]/18 sm:max-h-[calc(100svh-2rem)] sm:p-4">
        <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-[#F09182]/18 blur-3xl" />
        <div className="absolute -bottom-16 left-8 h-32 w-32 rounded-full bg-[#8AB68E]/20 blur-3xl" />
        <div className="relative mb-3 flex items-start justify-between gap-3 rounded-[1.35rem] border border-[#D6D5B2] bg-white/76 px-3 py-3 shadow-sm">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#156240] text-white shadow-lg shadow-[#156240]/18">
              {icon}
            </span>
            <div className="min-w-0">
              <p className="text-[0.64rem] font-black uppercase tracking-[0.18em] text-[#156240]/65">
                {t.choose}
              </p>
              <h3 className="text-lg font-black leading-tight text-[#0E2A5A]">
                {title}
              </h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#156240]/72">
                {description}
              </p>
            </div>
          </div>
          <button
            aria-label={t.close}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#D6D5B2] bg-[#FEFFF9] text-[#156240] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative min-h-0 overflow-y-auto overscroll-contain pr-0.5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
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
