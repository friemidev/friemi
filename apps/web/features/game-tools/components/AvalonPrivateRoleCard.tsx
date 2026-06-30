"use client";

import Image from "next/image";
import { useState } from "react";
import { Eye, ShieldAlert, Users } from "lucide-react";
import type { AvalonPrivatePayload } from "@/features/game-tools/avalonConfig";
import { cn } from "@/lib/utils";

type AvalonPrivateRoleCardProps = {
  locale: string;
  payload: AvalonPrivatePayload | null;
  roleKey: string | null;
  roomStatus: string;
  seatDisplayName: string;
  seatNumber: number;
};

const roleIconPaths: Record<string, string> = {
  assassin: "/game-tools/avalon/roles/role-assassin.svg",
  merlin: "/game-tools/avalon/roles/role-merlin.svg",
  minion: "/game-tools/avalon/roles/role-minion.svg",
  mordred: "/game-tools/avalon/roles/role-mordred.svg",
  morgana: "/game-tools/avalon/roles/role-morgana.svg",
  oberon: "/game-tools/avalon/roles/role-oberon.svg",
  percival: "/game-tools/avalon/roles/role-percival.svg",
  servant: "/game-tools/avalon/roles/role-servant.svg",
};

function getRoleIconPath(roleKey: string | null) {
  return roleKey
    ? (roleIconPaths[roleKey] ?? "/game-tools/avalon/roles/role-unknown.svg")
    : "/game-tools/avalon/roles/role-unknown.svg";
}

type Copy = {
  hidden: string;
  noRole: string;
  reveal: string;
  seat: string;
  visible: string;
};

const copies: Record<string, Copy> = {
  "zh-CN": {
    hidden: "先确认周围没人偷看，再揭开身份。",
    noRole: "房主还没有开始发身份。",
    reveal: "揭开身份",
    seat: "座位",
    visible: "你能看到",
  },
  en: {
    hidden: "Check the room before revealing your identity.",
    noRole: "The host has not dealt roles yet.",
    reveal: "Reveal role",
    seat: "Seat",
    visible: "You can see",
  },
  fr: {
    hidden: "Vérifie autour de toi avant de révéler ton identité.",
    noRole: "L'hôte n'a pas encore distribué les rôles.",
    reveal: "Révéler",
    seat: "Place",
    visible: "Tu peux voir",
  },
};

export function AvalonPrivateRoleCard({
  locale,
  payload,
  roleKey,
  roomStatus,
  seatDisplayName,
  seatNumber,
}: AvalonPrivateRoleCardProps) {
  const [revealed, setRevealed] = useState(false);
  const t = copies[locale] ?? copies.en;
  const canReveal = roomStatus === "IN_PROGRESS" && payload;

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] p-4 shadow-2xl shadow-[#156240]/15 sm:p-6">
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#F09182]/20 blur-3xl" />
      <div className="absolute -bottom-14 left-4 h-40 w-40 rounded-full bg-[#8AB68E]/20 blur-3xl" />

      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#156240]">
              Friemi Table Lab
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[#0E2A5A]">
              {seatDisplayName}
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#156240]/75">
              {t.seat} {seatNumber}
            </p>
          </div>
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#156240] text-white shadow-lg shadow-[#156240]/20">
            <Image
              alt=""
              className="h-8 w-8"
              height={36}
              src="/game-tools/avalon/avalon-tool-icon.svg"
              width={36}
            />
          </span>
        </div>

        {!canReveal ? (
          <div className="rounded-[1.5rem] border border-dashed border-[#D6D5B2] bg-white/75 p-5 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-[#F09182]" />
            <p className="mt-3 text-sm font-bold text-[#1D1D1B]">{t.noRole}</p>
          </div>
        ) : (
          <div
            className={cn(
              "rounded-[1.75rem] border p-4 transition",
              revealed
                ? "border-[#156240]/35 bg-white"
                : "border-[#D6D5B2] bg-[#1D1D1B]",
            )}
          >
            {revealed ? (
              <div className="space-y-4">
                <div className="grid gap-4 rounded-[1.5rem] bg-[radial-gradient(circle_at_25%_20%,rgba(255,245,230,0.95),transparent_36%),linear-gradient(135deg,#F1F2EC,#FEFFF9)] p-4 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center">
                  <div className="relative mx-auto grid h-36 w-32 place-items-center rounded-[1.65rem] border border-[#D6D5B2] bg-white shadow-xl shadow-[#156240]/10">
                    <Image
                      alt=""
                      className="h-24 w-24"
                      height={112}
                      src={getRoleIconPath(roleKey)}
                      width={112}
                    />
                    <span className="absolute -bottom-3 rounded-full bg-[#156240] px-3 py-1 text-xs font-black text-white shadow-lg">
                      {payload.alignmentLabel}
                    </span>
                  </div>
                  <div className="min-w-0 text-center sm:text-left">
                    <h2 className="text-4xl font-black leading-tight tracking-normal text-[#0E2A5A]">
                      {payload.roleLabel}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[#1D1D1B]/75">
                      {payload.roleDescription}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <p className="inline-flex items-center gap-2 text-sm font-black text-[#156240]">
                    <Users className="h-4 w-4" />
                    {t.visible}
                  </p>
                  {payload.visibleHints.length > 0 ? (
                    payload.visibleHints.map((hint) => (
                      <div
                        className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-[#D6D5B2] bg-white px-3 py-2"
                        key={`${hint.seatNumber}-${hint.label}`}
                      >
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#156240] text-xs font-black text-white">
                          {hint.seatNumber}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[#1D1D1B]">
                            {hint.displayName}
                          </p>
                          <p className="text-xs font-semibold text-[#156240]/70">
                            {hint.label}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-[#156240]/70 ring-1 ring-[#D6D5B2]">
                      -
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid min-h-72 place-items-center rounded-[1.25rem] border border-white/10 bg-[radial-gradient(circle_at_25%_25%,rgba(240,145,130,0.22),transparent_38%),radial-gradient(circle_at_70%_65%,rgba(138,182,142,0.28),transparent_34%)] p-6 text-center text-white">
                <div>
                  <Image
                    alt=""
                    className="mx-auto h-32 w-24 drop-shadow-2xl"
                    height={160}
                    src="/game-tools/avalon/roles/private-card-back.svg"
                    width={112}
                  />
                  <p className="mt-4 max-w-xs text-sm font-semibold leading-6 text-white/80">
                    {t.hidden}
                  </p>
                  <button
                    className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-[#156240] shadow-lg shadow-black/20 transition hover:-translate-y-0.5"
                    onClick={() => setRevealed(true)}
                    type="button"
                  >
                    <Eye className="h-4 w-4" />
                    {t.reveal}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
