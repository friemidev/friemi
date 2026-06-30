"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowRight,
  Check,
  Clipboard,
  Crown,
  Eye,
  Link2,
  LockKeyhole,
  Play,
  QrCode,
  Shield,
  Sparkles,
  UserRoundPlus,
  Users,
} from "lucide-react";
import {
  joinAvalonRoomAction,
  startAvalonRoomAction,
  type AvalonRoomActionState,
} from "@/features/game-tools/actions/avalonRoomActions";
import { cn } from "@/lib/utils";

type AvalonRoomSeat = {
  avatarLabel: string;
  displayName: string;
  guestName: string | null;
  id: string;
  isClaimed: boolean;
  isHostSeat: boolean;
  isViewerSeat: boolean;
  privateToken: string | null;
  profileId: string | null;
  roleAlignment: string | null;
  roleKey: string | null;
  roleLabel: string | null;
  seatNumber: number;
};

type AvalonRoomView = {
  code: string;
  id: string;
  isHost: boolean;
  mode: string;
  playerCount: number;
  seats: AvalonRoomSeat[];
  status: string;
  title: string;
  viewerSeatId: string | null;
};

type AvalonRoomLobbyProps = {
  baseUrl: string;
  locale: string;
  room: AvalonRoomView;
};

type Copy = {
  claim: string;
  claimSeat: string;
  code: string;
  copied: string;
  copy: string;
  emptySeat: string;
  helper: string;
  host: string;
  joinHint: string;
  lobby: string;
  namePlaceholder: string;
  privateLink: string;
  privateLinks: string;
  privateLinksHint: string;
  roomLink: string;
  ready: string;
  roleHidden: string;
  roleRevealed: string;
  seat: string;
  start: string;
  started: string;
  startHint: string;
  table: string;
  viewerSeat: string;
};

const copies: Record<string, Copy> = {
  "zh-CN": {
    claim: "认领",
    claimSeat: "认领座位",
    code: "房号",
    copied: "已复制",
    copy: "复制",
    emptySeat: "待认领",
    helper: "把房号或链接发给玩家。房主可以先开局，再把每个座位的私密身份链接交给对应玩家。",
    host: "房主",
    joinHint: "输入一个桌上好认的名字，认领后本座位会绑定到你。",
    lobby: "候场",
    namePlaceholder: "你的桌上昵称",
    privateLink: "身份链接",
    privateLinks: "私密身份链接",
    privateLinksHint: "只把对应座位链接发给本人。游戏开始后链接里会显示身份和可见信息。",
    roomLink: "房间链接",
    ready: "已入座",
    roleHidden: "身份未公开",
    roleRevealed: "已发身份",
    seat: "座位",
    start: "开始发身份",
    started: "进行中",
    startHint: "开局后身份会写入每个座位的私密链接。公共房间页不会暴露所有身份。",
    table: "圆桌座位",
    viewerSeat: "你的座位",
  },
  en: {
    claim: "Claim",
    claimSeat: "Claim seat",
    code: "Code",
    copied: "Copied",
    copy: "Copy",
    emptySeat: "Open",
    helper:
      "Share the code or link. The host can start the room first, then hand each private identity link to the right player.",
    host: "Host",
    joinHint: "Use a table nickname players can recognize.",
    lobby: "Lobby",
    namePlaceholder: "Your table name",
    privateLink: "Identity link",
    privateLinks: "Private identity links",
    privateLinksHint:
      "Send each link only to the matching player. Roles and private vision appear after the game starts.",
    roomLink: "Room link",
    ready: "Seated",
    roleHidden: "Role hidden",
    roleRevealed: "Role dealt",
    seat: "Seat",
    start: "Deal roles",
    started: "In progress",
    startHint:
      "Starting writes roles into private seat links. The public room page will not reveal every identity.",
    table: "Table seats",
    viewerSeat: "Your seat",
  },
  fr: {
    claim: "Prendre",
    claimSeat: "Prendre la place",
    code: "Code",
    copied: "Copié",
    copy: "Copier",
    emptySeat: "Libre",
    helper:
      "Partage le code ou le lien. L'hôte peut lancer la partie, puis envoyer chaque lien privé au bon joueur.",
    host: "Hôte",
    joinHint: "Choisis un nom facile à reconnaître autour de la table.",
    lobby: "Accueil",
    namePlaceholder: "Ton nom à table",
    privateLink: "Lien d'identité",
    privateLinks: "Liens privés d'identité",
    privateLinksHint:
      "Envoie chaque lien uniquement à la personne concernée. Les rôles s'affichent après le lancement.",
    roomLink: "Lien de table",
    ready: "Assis",
    roleHidden: "Rôle caché",
    roleRevealed: "Rôle distribué",
    seat: "Place",
    start: "Distribuer",
    started: "En cours",
    startHint:
      "Le lancement écrit les rôles dans les liens privés. La page publique ne révèle pas toutes les identités.",
    table: "Places",
    viewerSeat: "Ta place",
  },
};

const initialState: AvalonRoomActionState = {};
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
  return roleKey ? (roleIconPaths[roleKey] ?? "/game-tools/avalon/roles/role-unknown.svg") : "/game-tools/avalon/roles/role-unknown.svg";
}

export function AvalonRoomLobby({
  baseUrl,
  locale,
  room,
}: AvalonRoomLobbyProps) {
  const t = copies[locale] ?? copies.en;
  const roomUrl = `${baseUrl}/${locale}/game-tools/avalon/rooms/${room.id}`;
  const joinUrl = `${baseUrl}/${locale}/game-tools/avalon/join/${room.code}`;
  const claimedCount = room.seats.filter((seat) => seat.isClaimed).length;
  const statusLabel = room.status === "IN_PROGRESS" ? t.started : t.lobby;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_25rem]">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] p-4 shadow-xl shadow-[#156240]/10 sm:p-6">
        <div className="absolute -right-20 top-0 h-48 w-48 rounded-full bg-[#8AB68E]/20 blur-3xl" />
        <div className="absolute -left-16 bottom-10 h-40 w-40 rounded-full bg-[#F09182]/12 blur-3xl" />

        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(20rem,1fr)] xl:items-center">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#156240] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-[#156240]/15">
                <Sparkles className="h-3.5 w-3.5" />
                {statusLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#D6D5B2] bg-white px-3 py-1 text-xs font-black text-[#156240]">
                <Users className="h-3.5 w-3.5" />
                {claimedCount}/{room.playerCount}
              </span>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#156240]/70">
                Friemi Table Lab
              </p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-normal text-[#0E2A5A] sm:text-4xl">
                {room.title}
              </h1>
            </div>
            <div className="grid max-w-md grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[1.5rem] border border-[#D6D5B2] bg-white/85 p-2 shadow-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F1F2EC] text-[#156240]">
                  <QrCode className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-black text-[#156240]">
                    {t.code}
                  </span>
                  <code className="block truncate text-xl font-black tracking-[0.18em] text-[#0E2A5A]">
                    {room.code}
                  </code>
                </div>
              </div>
              <CopyButton label={t.copy} successLabel={t.copied} value={joinUrl} />
            </div>
          </div>

          <RoundTable room={room} t={t} />
        </div>

        <div className="relative mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#156240]" />
            <h2 className="text-base font-bold text-[#1D1D1B]">{t.table}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {room.seats.map((seat) => (
              <SeatCard
                key={seat.id}
                locale={locale}
                roomId={room.id}
                roomStatus={room.status}
                seat={seat}
                t={t}
              />
            ))}
          </div>
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] p-4 shadow-xl shadow-[#156240]/10 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#156240] text-white shadow-lg shadow-[#156240]/20">
              <Play className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#1D1D1B]">{t.start}</h2>
              <p className="mt-1 text-sm leading-6 text-[#156240]/75">
                {t.startHint}
              </p>
            </div>
          </div>
          {room.isHost && room.status === "LOBBY" ? (
            <StartRoomForm locale={locale} roomId={room.id} t={t} />
          ) : (
            <p className="mt-4 rounded-2xl bg-[#F1F2EC] px-4 py-3 text-sm font-semibold text-[#156240]">
              {room.status === "IN_PROGRESS" ? t.roleRevealed : t.roleHidden}
            </p>
          )}
        </section>

        <section className="rounded-[2rem] border border-[#8AB68E]/35 bg-[#FEFFF9] p-4 shadow-xl shadow-[#156240]/10 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F09182] text-white shadow-lg shadow-[#F09182]/20">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#1D1D1B]">
                {t.privateLinks}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#156240]/75">
                {t.privateLinksHint}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {room.seats.map((seat) => {
              const seatUrl = seat.privateToken
                ? `${baseUrl}/${locale}/game-tools/avalon/seats/${seat.privateToken}`
                : "";

              return (
                <div
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-[#D6D5B2] bg-white/80 px-3 py-2"
                  key={seat.id}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F2EC] text-xs font-black text-[#156240]">
                    {seat.seatNumber}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#1D1D1B]">
                      {seat.displayName}
                    </p>
                    <p className="text-xs font-medium text-[#156240]/65">
                      {seat.privateToken ? t.privateLink : t.roleHidden}
                    </p>
                  </div>
                  {seat.privateToken ? (
                    <CopyButton
                      compact
                      label={t.copy}
                      successLabel={t.copied}
                      value={seatUrl}
                    />
                  ) : (
                    <Eye className="h-4 w-4 text-[#D6D5B2]" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#D6D5B2] bg-white/75 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#156240]/70">
                URL
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-[#0E2A5A]">
                {roomUrl}
              </p>
            </div>
            <CopyButton label={t.copy} successLabel={t.copied} value={roomUrl} />
          </div>
        </section>
      </aside>
    </div>
  );
}

function RoundTable({ room, t }: { room: AvalonRoomView; t: Copy }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[26rem]">
      <div className="absolute inset-[13%] rounded-full border border-[#D6D5B2] bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.95),rgba(241,242,236,0.92)_58%,rgba(138,182,142,0.18))] shadow-2xl shadow-[#156240]/10" />
      <div className="absolute inset-[31%] grid place-items-center rounded-full border border-[#8AB68E]/40 bg-[#FEFFF9]/90 text-center shadow-inner">
        <Image
          alt=""
          className="h-14 w-14"
          height={64}
          src="/game-tools/avalon/avalon-tool-icon.svg"
          width={64}
        />
        <span className="sr-only">{t.table}</span>
      </div>

      {room.seats.map((seat, index) => {
        const angle = -90 + (360 / room.seats.length) * index;
        const radius = 41;
        const left = 50 + radius * Math.cos((angle * Math.PI) / 180);
        const top = 50 + radius * Math.sin((angle * Math.PI) / 180);

        return (
          <div
            className="absolute"
            key={seat.id}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className={cn(
                "group relative grid h-16 w-16 place-items-center rounded-[1.35rem] border bg-white shadow-lg transition hover:-translate-y-1 sm:h-[4.5rem] sm:w-[4.5rem]",
                seat.isViewerSeat
                  ? "border-[#369758] shadow-[#156240]/25 ring-4 ring-[#8AB68E]/20"
                  : seat.isClaimed
                    ? "border-[#8AB68E]/60 shadow-[#156240]/15"
                    : "border-[#D6D5B2] opacity-75",
              )}
            >
              <div
                className={cn(
                  "absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white",
                  seat.isClaimed ? "bg-[#369758]" : "bg-[#D6D5B2]",
                )}
              />
              {seat.isHostSeat ? (
                <Crown className="absolute -left-1 -top-1 h-4 w-4 rounded-full bg-[#FFF5E6] p-0.5 text-[#156240] ring-1 ring-[#D6D5B2]" />
              ) : null}
              <Image
                alt=""
                className="h-8 w-8 sm:h-10 sm:w-10"
                height={48}
                src={room.status === "IN_PROGRESS" ? getRoleIconPath(seat.roleKey) : "/game-tools/avalon/player-ready-token.svg"}
                width={48}
              />
              <span className="absolute bottom-1 rounded-full bg-white/90 px-1.5 text-[0.65rem] font-black text-[#156240] shadow-sm">
                {seat.seatNumber}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SeatCard({
  locale,
  roomId,
  roomStatus,
  seat,
  t,
}: {
  locale: string;
  roomId: string;
  roomStatus: string;
  seat: AvalonRoomSeat;
  t: Copy;
}) {
  const canClaim = roomStatus === "LOBBY" && !seat.isClaimed;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[1.5rem] border bg-white/90 p-3 shadow-sm transition hover:-translate-y-0.5",
        seat.isViewerSeat
          ? "border-[#369758] shadow-[#156240]/20"
          : "border-[#D6D5B2]",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          seat.roleAlignment === "evil"
            ? "bg-[#B5301F]"
            : seat.roleAlignment === "good"
              ? "bg-[#156240]"
              : "bg-[#D6D5B2]",
        )}
      />
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-14 w-14 shrink-0 place-items-center rounded-2xl border bg-[#FEFFF9] text-lg font-black shadow-md",
            seat.roleAlignment === "evil"
              ? "border-[#B5301F]/30"
              : seat.roleAlignment === "good"
                ? "border-[#156240]/30"
                : "border-[#D6D5B2]",
          )}
        >
          <Image
            alt=""
            className="h-10 w-10"
            height={44}
            src={roomStatus === "IN_PROGRESS" ? getRoleIconPath(seat.roleKey) : "/game-tools/avalon/player-ready-token.svg"}
            width={44}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-black text-[#1D1D1B]">
              {seat.displayName}
            </h3>
            {seat.isHostSeat ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF5E6] px-2 py-0.5 text-[0.68rem] font-black text-[#156240] ring-1 ring-[#D6D5B2]">
                <Crown className="h-3 w-3" />
                {t.host}
              </span>
            ) : null}
            {seat.isViewerSeat ? (
              <span className="rounded-full bg-[#DEEBFF] px-2 py-0.5 text-[0.68rem] font-black text-[#0E2A5A]">
                {t.viewerSeat}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-semibold text-[#156240]/70">
            {t.seat} {seat.seatNumber} ·{" "}
            {seat.isClaimed ? t.ready : t.emptySeat}
          </p>
          <p className="mt-2 rounded-full bg-[#F1F2EC] px-3 py-1 text-xs font-bold text-[#156240]">
            {seat.roleLabel ?? t.roleHidden}
          </p>
        </div>
      </div>

      {canClaim ? (
        <ClaimSeatForm locale={locale} roomId={roomId} seat={seat} t={t} />
      ) : null}
    </article>
  );
}

function ClaimSeatForm({
  locale,
  roomId,
  seat,
  t,
}: {
  locale: string;
  roomId: string;
  seat: AvalonRoomSeat;
  t: Copy;
}) {
  const [state, formAction] = useActionState(joinAvalonRoomAction, initialState);

  return (
    <form action={formAction} className="mt-3 grid gap-2">
      <input name="locale" type="hidden" value={locale} />
      <input name="roomId" type="hidden" value={roomId} />
      <input name="seatNumber" type="hidden" value={seat.seatNumber} />
      <input
        className="h-10 rounded-2xl border border-[#D6D5B2] bg-[#FEFFF9] px-3 text-sm font-semibold text-[#1D1D1B] outline-none transition focus:border-[#369758] focus:ring-2 focus:ring-[#8AB68E]/20"
        maxLength={40}
        name="displayName"
        placeholder={t.namePlaceholder}
      />
      <p className="text-xs leading-5 text-[#156240]/65">{t.joinHint}</p>
      <ClaimSeatSubmitButton label={t.claimSeat} />
      {state.formError ? (
        <p className="rounded-2xl bg-[#F09182]/12 px-3 py-2 text-xs font-semibold text-[#B5301F]">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

function ClaimSeatSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#156240] px-4 text-sm font-bold text-white shadow-lg shadow-[#156240]/15 transition hover:-translate-y-0.5 disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      <UserRoundPlus className="h-4 w-4" />
      {label}
    </button>
  );
}

function StartRoomForm({
  locale,
  roomId,
  t,
}: {
  locale: string;
  roomId: string;
  t: Copy;
}) {
  const [state, formAction] = useActionState(
    startAvalonRoomAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 grid gap-2">
      <input name="locale" type="hidden" value={locale} />
      <input name="roomId" type="hidden" value={roomId} />
      <StartRoomSubmitButton label={t.start} />
      {state.formError ? (
        <p className="rounded-2xl bg-[#F09182]/12 px-3 py-2 text-sm font-semibold text-[#B5301F]">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

function StartRoomSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#F09182] px-5 text-sm font-black text-white shadow-xl shadow-[#F09182]/25 transition hover:-translate-y-0.5 disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      <Play className="h-4 w-4 fill-current" />
      {label}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

function CopyButton({
  compact = false,
  label,
  successLabel,
  value,
}: {
  compact?: boolean;
  label: string;
  successLabel: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);
  const icon = copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />;
  const buttonLabel = copied ? successLabel : label;
  const canCopy = Boolean(value);
  const handleCopy = async () => {
    if (!canCopy) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-full border border-[#8AB68E]/45 bg-white text-xs font-bold text-[#156240] transition hover:-translate-y-0.5 hover:bg-[#F1F2EC] disabled:opacity-50",
        compact ? "h-8 w-8" : "h-9 px-3",
      )}
      disabled={!canCopy}
      onClick={handleCopy}
      type="button"
    >
      {compact ? <Link2 className="h-4 w-4" /> : icon}
      {compact ? null : buttonLabel}
    </button>
  );
}
