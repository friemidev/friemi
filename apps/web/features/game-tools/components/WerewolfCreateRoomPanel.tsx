"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowRight,
  Moon,
  Shield,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {
  createWerewolfRoomAction,
  type WerewolfRoomActionState,
} from "@/features/game-tools/actions/werewolfRoomActions";
import {
  defaultWerewolfVariantKey,
  getWerewolfVariantLabel,
  werewolfVariants,
  type WerewolfRoleKey,
  type WerewolfVariant,
} from "@/features/game-tools/werewolfConfig";
import { werewolfUiAssets } from "@/features/game-tools/werewolfCardAssets";
import { withLocale } from "@/lib/routes";

type WerewolfCreateRoomPanelProps = {
  locale: string;
};

type Copy = {
  boundary: string;
  chips: string[];
  create: string;
  eyebrow: string;
  helper: string;
  judge: string;
  players: string;
  preview: string;
  title: string;
  titleLabel: string;
  titlePlaceholder: string;
  variants: string;
};

const copies: Record<string, Copy> = {
  "zh-CN": {
    boundary: "手机发身份、记生死和结算，桌上照常发言、投票、走夜晚。",
    chips: ["扫码入座", "私密身份", "法官记生死"],
    create: "开一局",
    eyebrow: "狼人杀",
    helper: "选版型，朋友扫码入座。",
    judge: "含 1 位法官",
    players: "席",
    preview: "卡牌预览",
    title: "今晚开狼人杀",
    titleLabel: "这局叫什么",
    titlePlaceholder: "今晚的狼人杀",
    variants: "选版型",
  },
  en: {
    boundary:
      "Use phones for seats, private roles, deaths, and results. Keep speeches, votes, and night calls at the table.",
    chips: ["Scan seats", "Private roles", "Judge notes"],
    create: "Start a table",
    eyebrow: "Werewolf",
    helper: "Pick a setup. Friends scan in.",
    judge: "includes 1 judge",
    players: "Seats",
    preview: "Card preview",
    title: "Start tonight's Werewolf table",
    titleLabel: "Table name",
    titlePlaceholder: "Tonight's Werewolf",
    variants: "Setup",
  },
  fr: {
    boundary:
      "Le téléphone garde les places, rôles, morts et résultats. La parole, les votes et la nuit restent autour de la table.",
    chips: ["Places par QR", "Rôles privés", "Notes du maître"],
    create: "Ouvrir la table",
    eyebrow: "Loups-garous",
    helper: "Choisissez une configuration. Les amis scannent.",
    judge: "inclut 1 maître",
    players: "Places",
    preview: "Aperçu cartes",
    title: "Lancez la table Loups-garous de ce soir",
    titleLabel: "Nom de table",
    titlePlaceholder: "Loups-garous de ce soir",
    variants: "Configuration",
  },
};

const initialState: WerewolfRoomActionState = {};

function getRoleMix(roles: WerewolfRoleKey[]) {
  const wolves = roles.filter((role) => role === "werewolf").length;
  const villagers = roles.filter((role) => role === "villager").length;
  const specials = roles.length - wolves - villagers;

  return { specials, villagers, wolves };
}

function RoleMixBadges({
  locale,
  variant,
}: {
  locale: string;
  variant: WerewolfVariant;
}) {
  const mix = getRoleMix(variant.roles);
  const labels =
    locale === "zh-CN"
      ? {
          specials: "神",
          villagers: "民",
          wolves: "狼",
        }
      : {
          specials: "Power",
          villagers: "Villager",
          wolves: "Wolf",
        };

  return (
    <div className="mt-2 flex flex-nowrap items-center gap-1.5 overflow-hidden">
      <RoleMixPill label={labels.wolves} tone="wolf" value={mix.wolves} />
      <RoleMixPill label={labels.specials} tone="power" value={mix.specials} />
      <RoleMixPill label={labels.villagers} tone="villager" value={mix.villagers} />
    </div>
  );
}

function VariantSeatDots({ variant }: { variant: WerewolfVariant }) {
  return (
    <div
      aria-hidden="true"
      className="mt-2 flex flex-wrap gap-1.5"
    >
      {variant.roles.map((role, index) => (
        <span
          className={`h-2 w-3.5 rounded-full sm:h-2.5 sm:w-5 ${
            role === "werewolf"
              ? "bg-[#7A1F2B]"
              : role === "villager"
                ? "bg-[#D9C7B4]"
                : "bg-[#F0C36A]"
          }`}
          key={`${role}-${index}`}
        />
      ))}
      <span className="h-2 w-3.5 rounded-full bg-[#1E1718] sm:h-2.5 sm:w-5" />
    </div>
  );
}

function RoleMixPill({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "power" | "villager" | "wolf";
  value: number;
}) {
  const Icon = tone === "wolf" ? Moon : tone === "power" ? Shield : UsersRound;

  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-black leading-none sm:h-7 ${
        tone === "wolf"
          ? "bg-[#7A1F2B] text-white"
          : tone === "power"
            ? "bg-[#F0C36A]/25 text-[#7A1F2B]"
            : "bg-[#F4ECE6] text-[#1E1718]/72"
      }`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {label}
      <span className="font-mono">{value}</span>
    </span>
  );
}

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
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(25rem,0.95fr)] lg:items-stretch">
      <div className="overflow-hidden rounded-[1.6rem] border border-[#D9C7B4] bg-[#141820] text-white shadow-[0_24px_70px_rgba(30,23,24,0.18)]">
        <div className="relative min-h-[22rem]">
          <Image
            alt=""
            className="h-full min-h-[22rem] w-full object-cover opacity-70"
            height={720}
            priority={false}
            src="/game-tools/werewolf/werewolf.jpeg"
            width={960}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,24,32,0.12),rgba(20,24,32,0.88))]" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white backdrop-blur">
              <Moon className="h-3.5 w-3.5" />
              {t.eyebrow}
            </span>
            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-[1.04] tracking-normal sm:text-5xl">
              {t.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-white/78 sm:text-base">
              {t.helper}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {t.chips.map((chip) => (
                <span
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-white/18 bg-white/12 px-3 text-xs font-black text-white backdrop-blur"
                  key={chip}
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#F0C36A]" />
                  {chip}
                </span>
              ))}
              <Link
                className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-3 text-xs font-black text-[#1E1718] shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition hover:bg-[#F4ECE6]"
                href={withLocale(locale, "/game-tools/werewolf/card-preview")}
              >
                <img
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-5"
                  draggable={false}
                  src={werewolfUiAssets.actionRevealCard}
                />
                {t.preview}
              </Link>
            </div>
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

          <div className="rounded-[1.2rem] border border-[#D9C7B4] bg-white p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black text-[#1E1718]">
                {t.variants}
              </h2>
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[#F4ECE6] px-2.5 py-1 text-[11px] font-black text-[#7A1F2B] sm:text-xs">
                <img
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0"
                  draggable={false}
                  src={werewolfUiAssets.seatJudge}
                />
                <span className="truncate">{t.judge}</span>
              </span>
            </div>

            <div className="mt-3 grid gap-2">
              {werewolfVariants.map((variant) => (
                <label
                  className={`grid min-h-14 cursor-pointer grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-2 rounded-2xl border px-2.5 py-2.5 transition sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-3 sm:px-3 ${
                    selectedVariantKey === variant.key
                      ? "border-[#7A1F2B] bg-[#FFF7F1] shadow-[0_10px_22px_rgba(122,31,43,0.08)]"
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
                  <span className="relative mt-0.5 grid h-9 w-9 shrink-0 place-items-center sm:h-12 sm:w-12">
                    <img
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full"
                      draggable={false}
                      src={werewolfUiAssets.seatPlayerOccupied}
                    />
                    <span className="relative text-xs font-black text-white sm:text-sm">
                      {variant.roles.length}
                    </span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-[#1E1718]">
                      {getWerewolfVariantLabel(locale, variant)}
                    </p>
                    <p className="text-xs font-bold text-[#7A1F2B]/70">
                      {variant.totalSeats}
                      {locale === "zh-CN" ? "" : " "}
                      {t.players}
                    </p>
                    <VariantSeatDots variant={variant} />
                    <RoleMixBadges locale={locale} variant={variant} />
                  </div>
                </label>
              ))}
            </div>
          </div>

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
