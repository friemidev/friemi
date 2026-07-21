"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  Check,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  Ticket,
  UserPlus,
} from "lucide-react";
import {
  claimWerewolfSeatAction,
  joinWerewolfRoomAction,
  leaveWerewolfSeatAction,
  startWerewolfRoomAction,
  updateWerewolfReadyAction,
  type WerewolfRoomActionState,
} from "@/features/game-tools/actions/werewolfRoomActions";
import { WerewolfQrCode } from "@/features/game-tools/components/WerewolfQrCode";
import { WerewolfTestBotPanel } from "@/features/game-tools/components/WerewolfTestBotPanel";
import { werewolfUiAssets } from "@/features/game-tools/werewolfCardAssets";
import { withLocale } from "@/lib/routes";

type WerewolfRoomOverviewProps = {
  baseUrl: string;
  locale: string;
  notice?: string | null;
  room: {
    code: string;
    currentMember: {
      avatarLabel: string;
      avatarUrl: string | null;
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
      avatarUrl: string | null;
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
      avatarUrl: string | null;
      displayName: string;
      id: string;
      isClaimed: boolean;
      isDead: boolean;
      isJudgeSeat: boolean;
      isPlayerSeat: boolean;
      isViewerSeat: boolean;
      privateToken: string | null;
      readyAt: string | null;
      roleKey: string | null;
      roleLabel: string | null;
      seatNumber: number;
    }>;
    state: {
      phase: string;
      winner?: "GOOD" | "WEREWOLF" | null;
    };
    status: string;
    title: string;
    variant: {
      label: string;
      playerSeatCount: number;
      totalSeats: number;
    };
  };
  testBotsEnabled?: boolean;
};

type WerewolfSeat = WerewolfRoomOverviewProps["room"]["seats"][number];

function WerewolfAvatar({
  avatarLabel,
  avatarUrl,
  className,
}: {
  avatarLabel: string;
  avatarUrl: string | null;
  className: string;
}) {
  return (
    <span
      className={`${className} relative grid place-items-center overflow-hidden rounded-full bg-[#111512] text-white shadow-sm`}
    >
      {avatarUrl ? (
        <img
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
          src={avatarUrl}
        />
      ) : (
        <span className="relative font-black">{avatarLabel}</span>
      )}
    </span>
  );
}

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      back: "Tous les outils",
      boundary:
        "Scannez, choisissez une place, puis lancez les rôles quand tout le monde est prêt.",
      changeSeat: "Changer",
      claimError: "Impossible de modifier la place.",
      code: "Code",
      copied: "Copié",
      copyInvite: "Copier le lien",
      currentMember: "Vous",
      dead: "Mort",
      empty: "Libre",
      enterMember: "Entrer",
      events: "Dernières actions",
      finished: "Partie terminée",
      foundation: "Loups-garous",
      host: "Hôte",
      manageConfirmRefresh: "Remplacer le lien privé de cette place ?",
      manageConfirmRelease: "Libérer cette place ?",
      manageNamePlaceholder: "Nom de table",
      manageRefresh: "Nouveau lien",
      manageRelease: "Libérer",
      manageRename: "Renommer",
      joinFirst: "Entrez un nom d'abord",
      joinName: "Nom",
      judge: "Maître",
      leaveRoom: "Quitter la table",
      leaveRoomConfirm: "Quitter cette partie en cours ?",
      leaveSeat: "Quitter",
      lobby: "Avant la partie",
      locked: "La partie a commencé.",
      members: "À placer",
      noMembers: "Personne en attente.",
      noticeJoined: "Vous êtes dans la table.",
      noticeLeft: "Place quittée.",
      noticeReady: "Vous êtes prêt.",
      noticeSeatChanged: "Place changée.",
      noticeSeatClaimed: "Place prise.",
      noticeSeatManaged: "Place mise à jour.",
      noticeUnready: "Prêt annulé.",
      openSeat: "Voir rôle",
      playerSeats: "Places",
      playerUnit: "joueurs",
      publicScreen: "Écran public",
      qrUnavailable: "QR indisponible. Utilisez le code.",
      ready: "Prêt",
      readyAction: "Prêt",
      alive: "Vivant",
      recap: "Récap",
      running: "En cours",
      seatedAt: "Place",
      selectSeat: "Choisir",
      scanJoin: "Scanner pour entrer",
      share: "Invitation",
      start: "Lancer",
      startConfirm: "Distribuer les rôles et verrouiller les places ?",
      startWaiting: "Attendez que toute la table soit prête.",
      status: "Statut",
      systemActor: "Table",
      unready: "Pas prêt",
      unreadyAction: "Annuler",
      waitingMember: "Entrez un nom, puis choisissez une place.",
      winnerGood: "Village gagnant",
      winnerWerewolf: "Loups gagnants",
    };
  }

  if (locale === "en") {
    return {
      back: "All tools",
      boundary: "Scan in, pick seats, then deal roles when the table is ready.",
      changeSeat: "Switch",
      claimError: "Could not update the seat.",
      code: "Code",
      copied: "Copied",
      copyInvite: "Copy invite",
      currentMember: "You",
      dead: "Dead",
      empty: "Open",
      enterMember: "Enter",
      events: "Latest moves",
      finished: "Game finished",
      foundation: "Werewolf",
      host: "Host",
      manageConfirmRefresh: "Replace this seat's private link?",
      manageConfirmRelease: "Release this seat?",
      manageNamePlaceholder: "Table name",
      manageRefresh: "New link",
      manageRelease: "Release",
      manageRename: "Rename",
      joinFirst: "Enter a name first",
      joinName: "Name",
      judge: "Judge",
      leaveRoom: "Leave room",
      leaveRoomConfirm: "Leave this running game?",
      leaveSeat: "Leave",
      lobby: "Before game",
      locked: "The game has started.",
      members: "Waiting to sit",
      noMembers: "No one is waiting.",
      noticeJoined: "You are in the table.",
      noticeLeft: "Seat left.",
      noticeReady: "You are ready.",
      noticeSeatChanged: "Seat switched.",
      noticeSeatClaimed: "Seat claimed.",
      noticeSeatManaged: "Seat updated.",
      noticeUnready: "Ready cancelled.",
      openSeat: "View role",
      playerSeats: "Player seats",
      playerUnit: "players",
      publicScreen: "Public screen",
      qrUnavailable: "QR unavailable. Use the code.",
      ready: "Ready",
      readyAction: "Ready",
      alive: "Alive",
      recap: "Recap",
      running: "In progress",
      seatedAt: "Seat",
      selectSeat: "Choose",
      scanJoin: "Scan to join",
      share: "Invite link",
      start: "Start game",
      startConfirm: "Deal roles and lock seats?",
      startWaiting: "Wait until the full table is ready.",
      status: "Status",
      systemActor: "Table",
      unready: "Not ready",
      unreadyAction: "Cancel",
      waitingMember: "Enter a name, then choose a seat.",
      winnerGood: "Good team wins",
      winnerWerewolf: "Werewolf team wins",
    };
  }

  return {
    back: "全部工具",
    boundary: "扫码入座，人齐发身份。现场照常聊、投票、走夜晚。",
    changeSeat: "换座",
    claimError: "座位操作失败。",
    code: "房号",
    copied: "已复制",
    copyInvite: "复制邀请链接",
    currentMember: "我",
    dead: "出局",
    empty: "空位",
    enterMember: "进入房间",
    events: "最近记录",
    finished: "本局已结束",
    foundation: "狼人杀",
    host: "房主",
    manageConfirmRefresh: "刷新后旧身份链接会失效，确定继续？",
    manageConfirmRelease: "确定清空这个座位？",
    manageNamePlaceholder: "桌上昵称",
    manageRefresh: "换链接",
    manageRelease: "清座",
    manageRename: "改名",
    joinFirst: "先输入昵称",
    joinName: "昵称",
    judge: "法官",
    leaveRoom: "退出房间",
    leaveRoomConfirm: "退出这局进行中的房间？",
    leaveSeat: "离座",
    lobby: "开局前",
    locked: "本局已经开始。",
    members: "待入座",
    noMembers: "没人等座。",
    noticeJoined: "已进入房间。",
    noticeLeft: "已离座。",
    noticeReady: "已准备。",
    noticeSeatChanged: "已换座。",
    noticeSeatClaimed: "已入座。",
    noticeSeatManaged: "座位已更新。",
    noticeUnready: "已取消准备。",
    openSeat: "查看身份",
    playerSeats: "座位",
    playerUnit: "玩家",
    publicScreen: "公共屏",
    qrUnavailable: "二维码没生成，先用房号。",
    ready: "已准备",
    readyAction: "准备",
    alive: "存活",
    recap: "复盘",
    running: "游戏中",
    seatedAt: "座位",
    selectSeat: "入座",
    scanJoin: "扫码进入房间",
    share: "邀请链接",
    start: "开始游戏",
    startConfirm: "发身份后座位会锁定，确定开局？",
    startWaiting: "等所有人准备。",
    status: "进度",
    systemActor: "房间",
    unready: "未准备",
    unreadyAction: "取消准备",
    waitingMember: "取个昵称入房。",
    winnerGood: "好人阵营获胜",
    winnerWerewolf: "狼人阵营获胜",
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

function getEventLabel(type: string, locale: string) {
  const labels: Record<string, Record<string, string>> = {
    werewolf_member_joined: {
      "zh-CN": "进房间",
      en: "Joined",
      fr: "Entrée",
    },
    werewolf_player_marked_dead: {
      "zh-CN": "出局",
      en: "Out",
      fr: "Élimination",
    },
    werewolf_player_revived: {
      "zh-CN": "回到场上",
      en: "Back in",
      fr: "Retour",
    },
    werewolf_ready_changed: {
      "zh-CN": "准备更新",
      en: "Ready update",
      fr: "Prêt",
    },
    werewolf_room_created: {
      "zh-CN": "开桌",
      en: "Table opened",
      fr: "Table ouverte",
    },
    werewolf_room_finished: {
      "zh-CN": "结算",
      en: "Result",
      fr: "Résultat",
    },
    werewolf_room_started: {
      "zh-CN": "发身份",
      en: "Roles dealt",
      fr: "Rôles donnés",
    },
    werewolf_seat_changed: {
      "zh-CN": "换座",
      en: "Seat switched",
      fr: "Place changée",
    },
    werewolf_seat_claimed: {
      "zh-CN": "入座",
      en: "Seated",
      fr: "Place prise",
    },
    werewolf_seat_left: {
      "zh-CN": "离座",
      en: "Left seat",
      fr: "Place quittée",
    },
    werewolf_seat_link_refreshed: {
      "zh-CN": "身份链接刷新",
      en: "Private link refreshed",
      fr: "Lien privé changé",
    },
    werewolf_seat_released: {
      "zh-CN": "清空座位",
      en: "Seat released",
      fr: "Place libérée",
    },
    werewolf_seat_renamed: {
      "zh-CN": "座位改名",
      en: "Seat renamed",
      fr: "Place renommée",
    },
    werewolf_test_bots_filled: {
      "zh-CN": "测试补位",
      en: "Test seats filled",
      fr: "Places test ajoutées",
    },
    werewolf_test_bots_readied: {
      "zh-CN": "测试准备",
      en: "Test ready",
      fr: "Prêt test",
    },
    werewolf_test_flow_started: {
      "zh-CN": "测试开局",
      en: "Test start",
      fr: "Départ test",
    },
    werewolf_test_phase_advanced: {
      "zh-CN": "测试推进",
      en: "Test step",
      fr: "Étape test",
    },
  };

  return labels[type]?.[locale] ?? labels[type]?.en ?? type;
}

function getEventTimeLabel(value: string, locale: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getNoticeLabel(
  notice: string | null | undefined,
  t: ReturnType<typeof getCopy>,
) {
  switch (notice) {
    case "joined":
      return t.noticeJoined;
    case "left":
      return t.noticeLeft;
    case "ready":
      return t.noticeReady;
    case "seat_changed":
      return t.noticeSeatChanged;
    case "seat_claimed":
      return t.noticeSeatClaimed;
    case "seat_managed":
      return t.noticeSeatManaged;
    case "unready":
      return t.noticeUnready;
    default:
      return null;
  }
}

export function WerewolfRoomOverview({
  baseUrl,
  locale,
  notice,
  room,
  testBotsEnabled = false,
}: WerewolfRoomOverviewProps) {
  const router = useRouter();
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
  const [readyState, readyAction] = useActionState(
    updateWerewolfReadyAction,
    initialState,
  );
  const [startState, startAction] = useActionState(
    startWerewolfRoomAction,
    initialState,
  );
  const t = getCopy(locale);
  const joinUrl = `${baseUrl}${withLocale(
    locale,
    `/game-tools/werewolf/join/${room.code}`,
  )}`;
  const recapHref = withLocale(
    locale,
    `/game-tools/werewolf/rooms/${room.id}/recap`,
  );
  const screenHref = withLocale(
    locale,
    `/game-tools/werewolf/rooms/${room.id}/screen`,
  );
  const isLobby = room.status === "LOBBY";
  const playerSeats = room.seats.filter((seat) => seat.isPlayerSeat);
  const leftTableSeats = playerSeats.filter(
    (seat) => seat.seatNumber % 2 === 1,
  );
  const rightTableSeats = playerSeats.filter(
    (seat) => seat.seatNumber % 2 === 0,
  );
  const judgeSeat = room.seats.find((seat) => seat.isJudgeSeat);
  const allSeatsReady =
    room.seats.length === room.variant.totalSeats &&
    room.seats.every((seat) => seat.isClaimed && Boolean(seat.readyAt));
  const currentMemberToken = room.currentMember?.memberToken ?? "";
  const canChooseSeat = Boolean(room.currentMember) && isLobby;
  const winnerLabel =
    room.state.winner === "GOOD"
      ? t.winnerGood
      : room.state.winner === "WEREWOLF"
        ? t.winnerWerewolf
        : null;
  const currentSeatPrivateToken = room.currentMember?.seatedPrivateToken;
  const startEventId =
    room.events.find((event) => event.type === "werewolf_room_started")?.id ??
    "current";
  const noticeLabel = getNoticeLabel(notice, t);

  useEffect(() => {
    if (room.status !== "IN_PROGRESS" || !currentSeatPrivateToken) {
      return;
    }

    const storageKey = `friemi:werewolf:started-redirect:${room.id}:${startEventId}`;

    if (window.sessionStorage.getItem(storageKey)) {
      return;
    }

    window.sessionStorage.setItem(storageKey, "1");
    router.replace(
      withLocale(
        locale,
        `/game-tools/werewolf/seats/${currentSeatPrivateToken}`,
      ),
    );
  }, [
    currentSeatPrivateToken,
    locale,
    room.id,
    room.status,
    router,
    startEventId,
  ]);

  const currentViewerSeat =
    room.seats.find(
      (seat) =>
        seat.isViewerSeat ||
        room.currentMember?.seatedSeatNumber === seat.seatNumber,
    ) ?? null;
  const judgeIsViewer = Boolean(judgeSeat?.isViewerSeat);
  const playerReadyCount = playerSeats.filter((seat) => seat.readyAt).length;
  const playerClaimedCount = playerSeats.filter(
    (seat) => seat.isClaimed,
  ).length;
  const centerTitle =
    room.status === "FINISHED"
      ? (winnerLabel ?? t.finished)
      : room.status === "IN_PROGRESS"
        ? t.running
        : t.lobby;
  const centerSubtitle =
    room.status === "LOBBY"
      ? `${playerReadyCount}/${room.seats.length} ${t.ready}`
      : room.status === "IN_PROGRESS"
        ? `${playerClaimedCount}/${playerSeats.length} ${t.alive}`
        : room.variant.label;

  const renderSeatNode = (seat: WerewolfSeat) => {
    const isCurrentSeat =
      seat.isViewerSeat ||
      room.currentMember?.seatedSeatNumber === seat.seatNumber;
    const emptySeatActionLabel = room.currentMember?.seatedSeatNumber
      ? t.changeSeat
      : t.selectSeat;
    const seatImage = seat.isClaimed
      ? seat.isDead
        ? werewolfUiAssets.seatPlayerDead
        : seat.readyAt || room.status !== "LOBBY"
          ? werewolfUiAssets.seatPlayerReady
          : werewolfUiAssets.seatPlayerOccupied
      : werewolfUiAssets.seatPlayerEmpty;
    const nodeClass = `relative z-20 mx-auto flex min-h-[5.6rem] w-full max-w-[5.35rem] flex-col items-center justify-start text-center transition ${
      isCurrentSeat ? "scale-[1.03]" : ""
    }`;
    const tokenClass = `relative grid h-16 w-16 place-items-center rounded-full transition ${
      seat.isDead ? "grayscale opacity-55" : ""
    } ${isCurrentSeat ? "drop-shadow-[0_0_14px_rgba(240,195,106,0.62)]" : ""}`;
    const seatNumberClass = `absolute -left-1 -top-1 z-20 grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[10.5px] font-black shadow-sm ring-1 ${
      isCurrentSeat
        ? "bg-[#F8DDA8] text-[#153B31] ring-[#F8DDA8]/85"
        : "bg-[#F8DDA8]/96 text-[#153B31] ring-[#D8A84E]/45"
    }`;
    const seatNameClass = `mt-1.5 block w-full truncate text-[10.5px] font-black leading-tight ${
      seat.isDead
        ? "text-white/42"
        : isCurrentSeat
          ? "text-[#F8DDA8]"
          : "text-white"
    }`;

    if (!seat.isClaimed && isLobby && canChooseSeat) {
      return (
        <form action={seatAction} className={nodeClass} key={seat.id}>
          <input name="locale" type="hidden" value={locale} />
          <input name="roomId" type="hidden" value={room.id} />
          <input name="memberToken" type="hidden" value={currentMemberToken} />
          <input name="seatNumber" type="hidden" value={seat.seatNumber} />
          <button
            aria-label={`${emptySeatActionLabel} ${seat.seatNumber}`}
            className="group flex w-full flex-col items-center text-center text-white disabled:cursor-not-allowed disabled:opacity-55"
            type="submit"
          >
            <span className={tokenClass}>
              <span className={seatNumberClass}>{seat.seatNumber}</span>
              <img
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full"
                draggable={false}
                src={seatImage}
              />
              <Plus className="relative h-4 w-4 text-[#F8DDA8] transition group-hover:scale-110" />
            </span>
            <span className={seatNameClass}>{emptySeatActionLabel}</span>
          </button>
        </form>
      );
    }

    return (
      <div className={nodeClass} key={seat.id}>
        <span className={tokenClass}>
          <span className={seatNumberClass}>{seat.seatNumber}</span>
          <img
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            draggable={false}
            src={seatImage}
          />
          {seat.isClaimed ? (
            <WerewolfAvatar
              avatarLabel={seat.avatarLabel}
              avatarUrl={seat.avatarUrl}
              className="relative h-12 w-12 border border-[#F8DDA8]/34 text-sm"
            />
          ) : (
            <span className="relative grid h-11 w-11 place-items-center rounded-full bg-[#102F29] text-xs font-black text-[#F8DDA8] shadow-sm">
              {seat.seatNumber}
            </span>
          )}
        </span>
        <span className={seatNameClass}>
          {seat.isClaimed ? seat.displayName : t.empty}
        </span>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[28rem] space-y-4 lg:max-w-[94rem]">
      <section className="grid gap-5 lg:grid-cols-[minmax(25rem,28rem)_minmax(0,1fr)] lg:items-start">
        <div
          className="relative overflow-hidden rounded-[1.75rem] border border-[#D8A84E]/35 bg-[#062A24] p-4 text-white shadow-[0_22px_52px_rgba(6,42,36,0.28)]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 14%, rgba(248,221,168,0.18), transparent 29%), radial-gradient(circle at 50% 58%, rgba(4,74,61,0.78), transparent 46%), linear-gradient(180deg, #062A24 0%, #06372F 52%, #031F1B 100%)",
          }}
        >
          <div className="pointer-events-none absolute inset-x-8 top-2 h-28 rounded-b-full border-b border-[#D8A84E]/16 bg-[#F8DDA8]/5" />
          <div className="pointer-events-none absolute inset-x-5 bottom-4 h-16 rounded-t-[2rem] border-t border-[#D8A84E]/18" />

          <div className="relative z-10 flex items-center justify-between gap-3">
            <Link
              aria-label={t.back}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#D8A84E]/38 bg-[#0A3B32]/86 text-[#F8DDA8] shadow-[0_8px_20px_rgba(0,0,0,0.20)] transition hover:bg-[#11483E]"
              href={withLocale(locale, "/game-tools/werewolf")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0 text-center">
              <p className="truncate text-base font-black tracking-normal text-[#F8DDA8]">
                {room.variant.label}
              </p>
              <p className="mt-0.5 text-[11px] font-black text-white/56">
                {t.code} ·{" "}
                <span className="font-mono tracking-[0.18em] text-[#F0C36A]">
                  {room.code}
                </span>
              </p>
            </div>

            <Link
              aria-label={t.publicScreen}
              className="grid h-10 w-10 place-items-center rounded-full border border-[#D8A84E]/38 bg-[#0A3B32]/86 text-[#F8DDA8] shadow-[0_8px_20px_rgba(0,0,0,0.20)] transition hover:bg-[#11483E]"
              href={screenHref}
              target="_blank"
            >
              <Monitor className="h-4 w-4" />
            </Link>
          </div>

          {noticeLabel ? (
            <div className="relative z-10 mt-3 flex items-center gap-2 rounded-2xl border border-[#D8A84E]/28 bg-[#F8DDA8]/12 px-3 py-2 text-xs font-black text-[#F8DDA8]">
              <Check className="h-4 w-4" />
              {noticeLabel}
            </div>
          ) : null}

          <div className="relative z-10 mt-4 overflow-hidden rounded-[1.35rem] border border-[#D8A84E]/30 bg-[#04241F]/68 shadow-inner">
            <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_20%_24%,rgba(248,221,168,0.42)_0_1px,transparent_2px),radial-gradient(circle_at_72%_16%,rgba(248,221,168,0.32)_0_1px,transparent_2px),radial-gradient(circle_at_82%_72%,rgba(248,221,168,0.22)_0_1px,transparent_2px)]" />
            <div className="pointer-events-none absolute left-6 top-12 h-12 w-12 rounded-full border border-[#F8DDA8]/34 shadow-[inset_-8px_0_0_rgba(248,221,168,0.16)]" />
            <div className="pointer-events-none absolute right-5 top-20 h-20 w-20 rounded-full bg-[#D8A84E]/8 blur-2xl" />

            <div className="relative px-2 py-3">
              {judgeSeat ? (
                <div className="relative z-30 mx-auto flex w-full max-w-[5.2rem] flex-col items-center text-center">
                  <span className="mb-0.5 rounded-full bg-[#062A24]/88 px-3 py-1 text-[11px] font-black text-[#F0C36A] ring-1 ring-[#D8A84E]/35">
                    {t.judge}
                  </span>
                  {judgeSeat.isClaimed ? (
                    <span
                      className={`relative grid h-14 w-14 place-items-center drop-shadow-[0_0_12px_rgba(240,195,106,0.42)] ${
                        judgeSeat.isDead ? "grayscale opacity-55" : ""
                      }`}
                    >
                      <img
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full"
                        draggable={false}
                        src={werewolfUiAssets.seatJudge}
                      />
                      <WerewolfAvatar
                        avatarLabel={judgeSeat.avatarLabel}
                        avatarUrl={judgeSeat.avatarUrl}
                        className="relative h-11 w-11 border border-[#F8DDA8]/34 text-xs"
                      />
                    </span>
                  ) : isLobby && canChooseSeat ? (
                    <form action={seatAction}>
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
                      <button
                        className="relative grid h-14 w-14 place-items-center transition hover:scale-105"
                        type="submit"
                      >
                        <img
                          alt=""
                          aria-hidden="true"
                          className="absolute inset-0 h-full w-full"
                          draggable={false}
                          src={werewolfUiAssets.seatJudge}
                        />
                        <Plus className="relative h-5 w-5 text-[#F8DDA8]" />
                      </button>
                    </form>
                  ) : (
                    <span className="relative grid h-14 w-14 place-items-center">
                      <img
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full opacity-70"
                        draggable={false}
                        src={werewolfUiAssets.seatJudge}
                      />
                      <span className="relative text-xs font-black text-[#F8DDA8]">
                        {t.empty}
                      </span>
                    </span>
                  )}
                  <span className="mt-1 block max-w-[5.2rem] truncate text-[10.5px] font-black leading-tight text-white">
                    {judgeSeat.isClaimed ? judgeSeat.displayName : t.empty}
                  </span>
                </div>
              ) : null}

              <div className="relative z-20 mt-4 grid grid-cols-[minmax(0,1fr)_minmax(7.55rem,8.4rem)_minmax(0,1fr)] gap-1">
                <div className="grid content-start gap-2.5">
                  {leftTableSeats.map((seat) => renderSeatNode(seat))}
                </div>

                <div className="relative flex min-h-[31.5rem] flex-col items-center justify-between overflow-hidden rounded-[4.25rem] border border-[#D8A84E]/38 bg-[#062A24] px-3 py-5 shadow-[0_0_30px_rgba(0,0,0,0.24),inset_0_0_34px_rgba(216,168,78,0.12)]">
                  <div className="pointer-events-none absolute inset-1.5 rounded-[3.75rem] border border-[#F8DDA8]/12" />
                  <div className="pointer-events-none absolute inset-x-2 bottom-7 top-7 rounded-[3.4rem] border border-[#D8A84E]/18 bg-[linear-gradient(90deg,rgba(8,56,47,0.88),rgba(4,34,29,0.96)_34%,rgba(13,72,58,0.78)_50%,rgba(4,34,29,0.96)_66%,rgba(8,56,47,0.88))]" />
                  <div className="pointer-events-none absolute inset-x-5 top-1/2 h-72 -translate-y-1/2 rounded-full bg-[#F0C36A]/8 blur-xl" />
                  <div className="pointer-events-none absolute left-1/2 top-10 h-[calc(100%-5rem)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#F8DDA8]/16 to-transparent" />

                  <Moon className="relative h-6 w-6 text-[#F0C36A]" />

                  <div className="relative grid place-items-center text-center">
                    <div className="mb-3 grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-[#D8A84E]/34 bg-[#062A24] shadow-[inset_0_0_18px_rgba(248,221,168,0.10)]">
                      <img
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover opacity-70"
                        draggable={false}
                        src="/game-tools/werewolf/werewolf.jpeg"
                      />
                      <div className="absolute h-16 w-16 rounded-full bg-[#062A24]/42" />
                    </div>
                    <p className="max-w-[5rem] text-center text-lg font-black leading-tight text-[#F8DDA8]">
                      {centerTitle}
                    </p>
                    <p className="mt-1 max-w-[5rem] text-center text-[10px] font-black leading-tight text-white/62">
                      {centerSubtitle}
                    </p>
                  </div>

                  <div className="relative grid h-8 w-8 place-items-center rounded-full border border-[#D8A84E]/30 bg-[#062A24]/84">
                    <Moon className="h-4 w-4 text-[#F0C36A]" />
                  </div>
                </div>

                <div className="grid content-start gap-2.5">
                  {rightTableSeats.map((seat) => renderSeatNode(seat))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-4 space-y-3">
            {!room.currentMember && isLobby ? (
              <form
                action={joinAction}
                className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2"
              >
                <input name="locale" type="hidden" value={locale} />
                <input name="roomId" type="hidden" value={room.id} />
                <input
                  className="h-12 min-w-0 rounded-full border border-[#D8A84E]/45 bg-[#F8DDA8]/95 px-4 text-sm font-black text-[#153B31] outline-none placeholder:text-[#153B31]/45 focus:border-[#F0C36A]"
                  maxLength={40}
                  name="displayName"
                  placeholder={t.joinName}
                />
                <SubmitButton
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#F8DDA8] px-4 text-sm font-black text-[#153B31] transition hover:bg-[#FFE7B7] disabled:cursor-not-allowed disabled:opacity-55"
                  label={t.enterMember}
                />
                {joinState.formError ? (
                  <p className="col-span-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                    {joinState.formError}
                  </p>
                ) : null}
              </form>
            ) : null}

            {room.currentMember && currentViewerSeat?.privateToken ? (
              <div className="grid gap-2">
                {isLobby ? (
                  <div className="grid grid-cols-2 gap-2">
                    <form action={readyAction}>
                      <input name="locale" type="hidden" value={locale} />
                      <input
                        name="privateToken"
                        type="hidden"
                        value={currentViewerSeat.privateToken}
                      />
                      <input
                        name="operation"
                        type="hidden"
                        value={currentViewerSeat.readyAt ? "unready" : "ready"}
                      />
                      <SubmitButton
                        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#F8DDA8] px-5 text-sm font-black text-[#153B31] transition hover:bg-[#FFE7B7] disabled:cursor-not-allowed disabled:opacity-55"
                        label={
                          currentViewerSeat.readyAt
                            ? t.unreadyAction
                            : t.readyAction
                        }
                      />
                    </form>
                    <form action={leaveAction}>
                      <input name="locale" type="hidden" value={locale} />
                      <input
                        name="privateToken"
                        type="hidden"
                        value={currentViewerSeat.privateToken}
                      />
                      <SubmitButton
                        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#F8DDA8] px-5 text-sm font-black text-[#153B31] transition hover:bg-[#FFE7B7] disabled:cursor-not-allowed disabled:opacity-55"
                        label={t.leaveSeat}
                      />
                    </form>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#F8DDA8] px-5 text-sm font-black text-[#153B31] transition hover:bg-[#FFE7B7]"
                      href={withLocale(
                        locale,
                        `/game-tools/werewolf/seats/${currentViewerSeat.privateToken}`,
                      )}
                    >
                      <Ticket className="h-4 w-4" />
                      {t.openSeat}
                    </Link>
                    <form
                      action={leaveAction}
                      onSubmit={(event) => {
                        if (!window.confirm(t.leaveRoomConfirm)) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input name="locale" type="hidden" value={locale} />
                      <input
                        name="privateToken"
                        type="hidden"
                        value={currentViewerSeat.privateToken}
                      />
                      <SubmitButton
                        className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[#F8DDA8]/55 bg-transparent px-5 text-sm font-black text-[#F8DDA8] transition hover:bg-[#F8DDA8]/10 disabled:cursor-not-allowed disabled:opacity-55"
                        label={t.leaveRoom}
                      />
                    </form>
                  </div>
                )}

                {judgeIsViewer && judgeSeat?.privateToken && isLobby ? (
                  <form
                    action={startAction}
                    className="grid gap-1.5"
                    onSubmit={(event) => {
                      if (!window.confirm(t.startConfirm)) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input name="locale" type="hidden" value={locale} />
                    <input
                      name="privateToken"
                      type="hidden"
                      value={judgeSeat.privateToken}
                    />
                    <SubmitButton
                      className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#F8DDA8] px-5 text-sm font-black text-[#153B31] transition hover:bg-[#FFE7B7] disabled:cursor-not-allowed disabled:opacity-45"
                      disabled={!allSeatsReady}
                      label={t.start}
                    />
                    {!allSeatsReady ? (
                      <p className="text-center text-[11px] font-bold text-white/58">
                        {t.startWaiting}
                      </p>
                    ) : null}
                  </form>
                ) : null}
              </div>
            ) : null}

            {!room.currentMember && !isLobby ? (
              <p className="rounded-2xl border border-[#D8A84E]/25 bg-[#F8DDA8]/10 px-3 py-2 text-center text-xs font-bold text-[#F8DDA8]">
                {t.locked}
              </p>
            ) : null}

            {seatState.formError ||
            leaveState.formError ||
            readyState.formError ||
            startState.formError ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {seatState.formError ||
                  leaveState.formError ||
                  readyState.formError ||
                  startState.formError ||
                  t.claimError}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.35rem] border border-[#D9C7B4] bg-white p-4 shadow-sm">
            <WerewolfQrCode
              codeLabel={t.code}
              copiedLabel={t.copied}
              copyLabel={t.copyInvite}
              label={t.scanJoin}
              roomCode={room.code}
              unavailableLabel={t.qrUnavailable}
              value={joinUrl}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#1E1718] px-3 text-xs font-black text-white transition hover:bg-[#3A2A2D]"
                href={screenHref}
                target="_blank"
              >
                <Monitor className="h-3.5 w-3.5" />
                {t.publicScreen}
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#D9C7B4] bg-[#FFFDF7] px-3 text-xs font-black text-[#7A1F2B] transition hover:bg-[#FFF7F1]"
                href={recapHref}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t.recap}
              </Link>
            </div>
          </div>

          {testBotsEnabled && room.isHost ? (
            <WerewolfTestBotPanel locale={locale} room={room} />
          ) : null}

          <div className="rounded-[1.35rem] border border-[#D9C7B4] bg-white p-4 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-sm font-black text-[#1E1718]">
              <UserPlus className="h-4 w-4 text-[#7A1F2B]" />
              {t.events}
            </h2>
            <div className="relative mt-3 space-y-2 before:absolute before:bottom-3 before:left-3 before:top-3 before:w-px before:bg-[#D9C7B4]">
              {room.events.length ? (
                room.events.slice(0, 8).map((event) => (
                  <div
                    className="relative flex items-start gap-2 rounded-2xl bg-[#F7F3EC] px-3 py-2 text-xs font-bold text-[#7A1F2B]"
                    key={event.id}
                  >
                    <span className="relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#F7F3EC]">
                      <img
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full"
                        draggable={false}
                        src={werewolfUiAssets.timelineEventDot}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-black text-[#1E1718]">
                        {event.actorName ?? t.systemActor}
                      </span>
                      <span className="block truncate">
                        {getEventLabel(event.type, locale)}
                      </span>
                    </span>
                    <time
                      className="shrink-0 pt-0.5 font-mono text-[10px] font-black text-[#7A1F2B]/52"
                      dateTime={event.createdAt}
                    >
                      {getEventTimeLabel(event.createdAt, locale)}
                    </time>
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
