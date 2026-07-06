"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  Check,
  Crown,
  Moon,
  Shield,
  Ticket,
  UserPlus,
  UsersRound,
} from "lucide-react";
import {
  claimWerewolfSeatAction,
  joinWerewolfRoomAction,
  leaveWerewolfSeatAction,
  type WerewolfRoomActionState,
} from "@/features/game-tools/actions/werewolfRoomActions";
import { withLocale } from "@/lib/routes";

type WerewolfRoomOverviewProps = {
  baseUrl: string;
  locale: string;
  room: {
    code: string;
    currentMember: {
      avatarLabel: string;
      displayName: string;
      id: string;
      isGuest: boolean;
      memberToken: string | null;
      readyAt: string | null;
      seatedPrivateToken: string | null;
      seatedSeatId: string | null;
      seatedSeatNumber: number | null;
    } | null;
    events: Array<{
      actorName: string | null;
      createdAt: string;
      id: string;
      type: string;
    }>;
    host: {
      nickname: string;
    };
    id: string;
    isHost: boolean;
    members: Array<{
      avatarLabel: string;
      displayName: string;
      id: string;
      isCurrentMember: boolean;
      isGuest: boolean;
      lastSeenAt: string;
      readyAt: string | null;
      seatedSeatId: string | null;
      seatedSeatNumber: number | null;
    }>;
    seats: Array<{
      avatarLabel: string;
      displayName: string;
      id: string;
      isClaimed: boolean;
      isDead: boolean;
      isJudgeSeat: boolean;
      isPlayerSeat: boolean;
      isViewerSeat: boolean;
      privateToken: string | null;
      readyAt: string | null;
      roleLabel: string | null;
      seatNumber: number;
    }>;
    state: {
      phase: string;
    };
    status: string;
    title: string;
    variant: {
      label: string;
      playerSeatCount: number;
      totalSeats: number;
    };
  };
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      back: "Tous les outils",
      boundary:
        "Friemi prépare la table et les rôles. Le maître du jeu garde la parole, les votes, le rythme et la nuit.",
      changeSeat: "Changer",
      claimError: "Impossible de modifier la place.",
      code: "Code",
      currentMember: "Votre entrée",
      empty: "Libre",
      enterMember: "Entrer",
      events: "Événements",
      foundation: "Base MVP",
      host: "Hôte",
      joinFirst: "Entrez d'abord dans la zone membres",
      joinName: "Nom à table",
      judge: "Maître du jeu",
      leaveSeat: "Quitter",
      locked: "La partie est verrouillée.",
      members: "Joueurs non placés",
      noMembers: "Aucun joueur en attente.",
      openSeat: "Page privée",
      playerSeats: "Places joueurs",
      ready: "Prêt",
      seatedAt: "Place",
      selectSeat: "Choisir",
      share: "Lien de partage",
      status: "Statut",
      unready: "Pas prêt",
      waitingMember:
        "Entrez dans la table pour apparaître ici, puis choisissez une place.",
    };
  }

  if (locale === "en") {
    return {
      back: "All tools",
      boundary:
        "Friemi prepares seats and roles. The offline judge still handles speaking, votes, timing, and night actions.",
      changeSeat: "Switch",
      claimError: "Could not update the seat.",
      code: "Code",
      currentMember: "Your entry",
      empty: "Open",
      enterMember: "Enter",
      events: "Events",
      foundation: "MVP foundation",
      host: "Host",
      joinFirst: "Join the member area first",
      joinName: "Table name",
      judge: "Judge",
      leaveSeat: "Leave",
      locked: "The game is locked.",
      members: "Unseated members",
      noMembers: "No one is waiting.",
      openSeat: "Private page",
      playerSeats: "Player seats",
      ready: "Ready",
      seatedAt: "Seat",
      selectSeat: "Choose",
      share: "Share link",
      status: "Status",
      unready: "Not ready",
      waitingMember:
        "Enter the room to appear here, then choose a seat.",
    };
  }

  return {
    back: "全部工具",
    boundary:
      "Friemi 负责开桌、座位和身份。发言、投票、计时、夜晚行动仍由线下法官主持。",
    changeSeat: "换到此座",
    claimError: "座位操作失败。",
    code: "房号",
    currentMember: "我的成员状态",
    empty: "空位",
    enterMember: "进入成员区",
    events: "事件",
    foundation: "MVP 基础设施",
    host: "房主",
    joinFirst: "请先进入成员区",
    joinName: "桌上昵称",
    judge: "法官位",
    leaveSeat: "离开座位",
    locked: "本局已锁定。",
    members: "未落座成员",
    noMembers: "暂无等待落座成员。",
    openSeat: "进入私密座位页",
    playerSeats: "玩家座位",
    ready: "已准备",
    seatedAt: "已落座",
    selectSeat: "选择此座",
    share: "分享链接",
    status: "状态",
    unready: "未准备",
    waitingMember: "先进入房间成员区，再选择玩家座或法官位。",
  };
}

const initialState: WerewolfRoomActionState = {};

function SubmitButton({
  className,
  disabled = false,
  label,
}: {
  className?: string;
  disabled?: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={
        className ??
        "inline-flex h-9 items-center justify-center rounded-full bg-[#7A1F2B] px-3 text-xs font-black text-white transition hover:bg-[#9B2D3C] disabled:cursor-not-allowed disabled:opacity-55"
      }
      disabled={pending || disabled}
      type="submit"
    >
      {label}
    </button>
  );
}

function getStatusLabel({
  isClaimed,
  isReady,
  t,
}: {
  isClaimed: boolean;
  isReady: boolean;
  t: ReturnType<typeof getCopy>;
}) {
  if (!isClaimed) {
    return t.empty;
  }

  return isReady ? t.ready : t.unready;
}

export function WerewolfRoomOverview({
  baseUrl,
  locale,
  room,
}: WerewolfRoomOverviewProps) {
  const [joinState, joinAction] = useActionState(
    joinWerewolfRoomAction,
    initialState,
  );
  const [seatState, seatAction] = useActionState(
    claimWerewolfSeatAction,
    initialState,
  );
  const [leaveState, leaveAction] = useActionState(
    leaveWerewolfSeatAction,
    initialState,
  );
  const t = getCopy(locale);
  const shareUrl = `${baseUrl}${withLocale(
    locale,
    `/game-tools/werewolf/rooms/${room.id}`,
  )}`;
  const isLobby = room.status === "LOBBY";
  const playerSeats = room.seats.filter((seat) => seat.isPlayerSeat);
  const judgeSeat = room.seats.find((seat) => seat.isJudgeSeat);
  const unseatedMembers = room.members.filter(
    (member) => !member.seatedSeatNumber,
  );
  const currentMemberToken = room.currentMember?.memberToken ?? "";
  const canChooseSeat = Boolean(room.currentMember) && isLobby;

  return (
    <div className="space-y-5">
      <Link
        className="inline-flex h-10 items-center gap-2 rounded-full border border-[#D9C7B4] bg-white px-4 text-sm font-bold text-[#7A1F2B] shadow-sm transition hover:bg-[#FFF7F1]"
        href={withLocale(locale, "/game-tools/werewolf")}
      >
        <ArrowLeft className="h-4 w-4" />
        {t.back}
      </Link>

      <section className="rounded-[1.4rem] border border-[#D9C7B4] bg-[#FFFDF7] p-4 shadow-[0_18px_48px_rgba(30,23,24,0.08)] sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#7A1F2B] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white">
              <Moon className="h-3.5 w-3.5" />
              {t.foundation}
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-normal text-[#1E1718] sm:text-4xl">
              {room.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-[#7A1F2B]/78">
              {t.boundary}
            </p>
          </div>

          <div className="grid gap-2 rounded-[1.1rem] border border-[#D9C7B4] bg-white p-3 text-sm font-bold text-[#1E1718]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#7A1F2B]">{t.code}</span>
              <span className="font-mono text-lg font-black tracking-[0.18em]">
                {room.code}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#7A1F2B]">{t.status}</span>
              <span>{room.state.phase === "LOBBY" ? "LOBBY" : room.state.phase}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#7A1F2B]">{t.host}</span>
              <span className="truncate">{room.host.nickname}</span>
            </div>
            <div className="min-w-0 border-t border-[#D9C7B4] pt-2">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#7A1F2B]/70">
                {t.share}
              </p>
              <p className="mt-1 truncate font-mono text-xs text-[#1E1718]/70">
                {shareUrl}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="rounded-[1.4rem] border border-[#D9C7B4] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-[#1E1718]">
                {t.playerSeats}
              </h2>
              <p className="mt-1 text-sm font-bold text-[#7A1F2B]/72">
                {room.variant.label} · {room.variant.playerSeatCount} /{" "}
                {room.variant.totalSeats}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F4ECE6] px-3 py-1.5 text-xs font-black text-[#7A1F2B]">
              <UsersRound className="h-3.5 w-3.5" />
              {playerSeats.filter((seat) => seat.isClaimed).length}/
              {playerSeats.length}
            </span>
          </div>

          {seatState.formError ? (
            <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
              {seatState.formError || t.claimError}
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {playerSeats.map((seat) => {
              const isCurrentSeat =
                seat.isViewerSeat ||
                room.currentMember?.seatedSeatNumber === seat.seatNumber;

              return (
                <div
                  className={`grid min-h-40 content-between rounded-[1rem] border p-2 text-center ${
                    isCurrentSeat
                      ? "border-[#7A1F2B] bg-[#FFF7F1]"
                      : "border-[#D9C7B4] bg-[#FFFDF7]"
                  }`}
                  key={seat.id}
                >
                  <div className="grid place-items-center">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-[#7A1F2B] text-sm font-black text-white">
                      {seat.seatNumber}
                    </span>
                    <p className="mt-2 w-full truncate text-sm font-black text-[#1E1718]">
                      {seat.isClaimed ? seat.displayName : t.empty}
                    </p>
                    <p className="text-xs font-bold text-[#7A1F2B]/68">
                      {getStatusLabel({
                        isClaimed: seat.isClaimed,
                        isReady: Boolean(seat.readyAt),
                        t,
                      })}
                    </p>
                  </div>

                  {!seat.isClaimed && isLobby ? (
                    canChooseSeat ? (
                      <form action={seatAction} className="mt-3">
                        <input name="locale" type="hidden" value={locale} />
                        <input name="roomId" type="hidden" value={room.id} />
                        <input
                          name="memberToken"
                          type="hidden"
                          value={currentMemberToken}
                        />
                        <input
                          name="seatNumber"
                          type="hidden"
                          value={seat.seatNumber}
                        />
                        <SubmitButton
                          label={
                            room.currentMember?.seatedSeatNumber
                              ? t.changeSeat
                              : t.selectSeat
                          }
                        />
                      </form>
                    ) : (
                      <p className="mt-3 text-xs font-bold text-[#7A1F2B]/60">
                        {t.joinFirst}
                      </p>
                    )
                  ) : null}

                  {isCurrentSeat && seat.privateToken ? (
                    <div className="mt-3 grid gap-1.5">
                      <Link
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-[#1E1718] px-3 text-xs font-black text-white transition hover:bg-[#3A2A2D]"
                        href={withLocale(
                          locale,
                          `/game-tools/werewolf/seats/${seat.privateToken}`,
                        )}
                      >
                        <Ticket className="h-3.5 w-3.5" />
                        {t.openSeat}
                      </Link>
                      {isLobby ? (
                        <form action={leaveAction}>
                          <input name="locale" type="hidden" value={locale} />
                          <input
                            name="privateToken"
                            type="hidden"
                            value={seat.privateToken}
                          />
                          <SubmitButton
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-[#D9C7B4] bg-white px-3 text-xs font-black text-[#7A1F2B] transition hover:bg-[#FFF7F1] disabled:cursor-not-allowed disabled:opacity-55"
                            label={t.leaveSeat}
                          />
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.4rem] border border-[#D9C7B4] bg-[#1E1718] p-4 text-white shadow-sm">
            <span className="inline-flex items-center gap-2 text-sm font-black">
              <Crown className="h-4 w-4 text-[#F0C36A]" />
              {t.judge}
            </span>
            <div className="mt-4 grid min-h-36 place-items-center rounded-[1rem] border border-white/12 bg-white/8 p-3 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-sm font-black text-[#1E1718]">
                {judgeSeat?.seatNumber ?? "J"}
              </span>
              <p className="mt-2 text-sm font-black">
                {judgeSeat?.isClaimed ? judgeSeat.displayName : t.empty}
              </p>
              <p className="mt-1 text-xs font-bold text-white/62">
                {judgeSeat?.readyAt ? t.ready : t.unready}
              </p>
              {judgeSeat && !judgeSeat.isClaimed && isLobby ? (
                canChooseSeat ? (
                  <form action={seatAction} className="mt-3 grid w-full gap-1.5">
                    <input name="locale" type="hidden" value={locale} />
                    <input name="roomId" type="hidden" value={room.id} />
                    <input
                      name="memberToken"
                      type="hidden"
                      value={currentMemberToken}
                    />
                    <input
                      name="seatNumber"
                      type="hidden"
                      value={judgeSeat.seatNumber}
                    />
                    <SubmitButton
                      className="inline-flex h-9 items-center justify-center rounded-full bg-white px-3 text-xs font-black text-[#1E1718] transition hover:bg-[#F4ECE6] disabled:cursor-not-allowed disabled:opacity-55"
                      label={
                        room.currentMember?.seatedSeatNumber
                          ? t.changeSeat
                          : t.selectSeat
                      }
                    />
                  </form>
                ) : (
                  <p className="mt-3 text-xs font-bold text-white/62">
                    {t.joinFirst}
                  </p>
                )
              ) : null}
              {judgeSeat?.isViewerSeat && judgeSeat.privateToken ? (
                <div className="mt-3 grid w-full gap-1.5">
                  <Link
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-black text-[#1E1718] transition hover:bg-[#F4ECE6]"
                    href={withLocale(
                      locale,
                      `/game-tools/werewolf/seats/${judgeSeat.privateToken}`,
                    )}
                  >
                    <Ticket className="h-3.5 w-3.5" />
                    {t.openSeat}
                  </Link>
                  {isLobby ? (
                    <form action={leaveAction}>
                      <input name="locale" type="hidden" value={locale} />
                      <input
                        name="privateToken"
                        type="hidden"
                        value={judgeSeat.privateToken}
                      />
                      <SubmitButton
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-black text-white transition hover:bg-white/16 disabled:cursor-not-allowed disabled:opacity-55"
                        label={t.leaveSeat}
                      />
                    </form>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-[#D9C7B4] bg-white p-4 shadow-sm">
            <span className="inline-flex items-center gap-2 text-sm font-black text-[#1E1718]">
              <Shield className="h-4 w-4 text-[#7A1F2B]" />
              {t.members}
            </span>

            {room.currentMember ? (
              <div className="mt-3 rounded-[1rem] border border-[#D9C7B4] bg-[#FFF7F1] p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#7A1F2B]/70">
                  {t.currentMember}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#7A1F2B] text-xs font-black text-white">
                    {room.currentMember.avatarLabel}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#1E1718]">
                      {room.currentMember.displayName}
                    </p>
                    <p className="text-xs font-bold text-[#7A1F2B]/68">
                      {room.currentMember.seatedSeatNumber
                        ? `${t.seatedAt} ${room.currentMember.seatedSeatNumber}`
                        : t.members}
                    </p>
                  </div>
                </div>
              </div>
            ) : isLobby ? (
              <form
                action={joinAction}
                className="mt-3 grid gap-2 rounded-[1rem] border border-[#D9C7B4] bg-[#FFFDF7] p-3"
              >
                <input name="locale" type="hidden" value={locale} />
                <input name="roomId" type="hidden" value={room.id} />
                <p className="text-sm font-bold leading-6 text-[#7A1F2B]/72">
                  {t.waitingMember}
                </p>
                <input
                  className="h-10 min-w-0 rounded-full border border-[#D9C7B4] bg-white px-3 text-sm font-bold text-[#1E1718] outline-none focus:border-[#7A1F2B]"
                  maxLength={40}
                  name="displayName"
                  placeholder={t.joinName}
                />
                <SubmitButton
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#7A1F2B] px-4 text-sm font-black text-white transition hover:bg-[#9B2D3C] disabled:cursor-not-allowed disabled:opacity-55"
                  label={t.enterMember}
                />
                {joinState.formError ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                    {joinState.formError}
                  </p>
                ) : null}
              </form>
            ) : (
              <p className="mt-3 text-sm font-bold leading-6 text-[#7A1F2B]/72">
                {t.locked}
              </p>
            )}

            <div className="mt-3 space-y-2">
              {unseatedMembers.length ? (
                unseatedMembers.map((member) => (
                  <div
                    className="flex items-center gap-2 rounded-2xl bg-[#F7F3EC] px-3 py-2"
                    key={member.id}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1E1718] text-xs font-black text-white">
                      {member.avatarLabel}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-black text-[#1E1718]">
                      {member.displayName}
                    </span>
                    {member.isCurrentMember ? (
                      <Check className="h-4 w-4 text-[#7A1F2B]" />
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm font-bold text-[#7A1F2B]/70">
                  {t.noMembers}
                </p>
              )}
            </div>

            {leaveState.formError ? (
              <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {leaveState.formError}
              </p>
            ) : null}
          </div>

          <div className="rounded-[1.4rem] border border-[#D9C7B4] bg-white p-4 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-sm font-black text-[#1E1718]">
              <UserPlus className="h-4 w-4 text-[#7A1F2B]" />
              {t.events}
            </h2>
            <div className="mt-3 space-y-2">
              {room.events.length ? (
                room.events.slice(0, 4).map((event) => (
                  <div
                    className="rounded-2xl bg-[#F7F3EC] px-3 py-2 text-xs font-bold text-[#7A1F2B]"
                    key={event.id}
                  >
                    {event.type}
                  </div>
                ))
              ) : (
                <p className="text-sm font-bold text-[#7A1F2B]/70">-</p>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
