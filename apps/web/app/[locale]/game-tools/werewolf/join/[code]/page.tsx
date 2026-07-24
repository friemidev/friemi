import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { GameToolBackButton } from "@/features/game-tools/components/GameToolBackButton";
import {
  getActiveGameToolRoomForProfile,
  getGameToolPrivateSeatPath,
  getGameToolRoomPath,
} from "@/features/game-tools/gameToolRooms";
import { getWerewolfRoomByCode } from "@/features/game-tools/queries/getWerewolfRoom";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

type WerewolfJoinPageProps = {
  params: Promise<{
    code: string;
    locale: string;
  }>;
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      back: "Loups-garous",
      codeLabel: "Code",
      cta: "Retour aux outils",
      endedBody: "Cette table est terminée. Demandez une nouvelle table.",
      endedTitle: "Partie terminée",
      notFoundBody: "Vérifiez le code ou demandez un nouveau lien.",
      notFoundTitle: "Table introuvable",
      runningBody:
        "La partie a déjà commencé. Demandez au maître si vous devez rejoindre une prochaine table.",
      runningTitle: "Partie déjà lancée",
    };
  }

  if (locale === "en") {
    return {
      back: "Werewolf",
      codeLabel: "Code",
      cta: "Back to tools",
      endedBody: "This table has ended. Ask for a new table.",
      endedTitle: "Game finished",
      notFoundBody: "Check the code or ask for a new invite.",
      notFoundTitle: "Room not found",
      runningBody:
        "This game has already started. Ask the judge if you should join the next table.",
      runningTitle: "Game already started",
    };
  }

  return {
    back: "狼人杀",
    codeLabel: "房号",
    cta: "返回工具",
    endedBody: "这局已经结束了。让朋友重新开一局。",
    endedTitle: "本局已结束",
    notFoundBody: "检查房号是否输错，或者让朋友重新发一次邀请。",
    notFoundTitle: "没有找到房间",
    runningBody: "这局已经开局，不能再加入本局。可以等下一局再进。",
    runningTitle: "本局已经开始",
  };
}

export default async function WerewolfJoinPage({
  params,
}: WerewolfJoinPageProps) {
  const { code, locale } = await params;
  const t = getCopy(locale);
  const viewerProfile = await getOptionalCurrentUserProfile();
  const room = await getWerewolfRoomByCode({
    code,
    locale,
    viewerProfile,
  });

  if (!room) {
    return (
      <JoinStatusPage
        body={t.notFoundBody}
        code={code}
        cta={t.cta}
        ctaHref={withLocale(locale, "/game-tools/werewolf")}
        label={t.codeLabel}
        locale={locale}
        title={t.notFoundTitle}
      />
    );
  }

  const viewerBelongsToJoinedRoom = Boolean(
    room.isHost || room.currentMember || room.viewerSeatId,
  );

  if (viewerProfile && !viewerBelongsToJoinedRoom) {
    const activeRoom = await getActiveGameToolRoomForProfile({
      profileId: viewerProfile.id,
    });

    if (activeRoom) {
      const privateSeatPath = activeRoom.privateSeatToken
        ? getGameToolPrivateSeatPath({
            kind: activeRoom.kind,
            privateSeatToken: activeRoom.privateSeatToken,
          })
        : null;

      redirect(
        withLocale(
          locale,
          privateSeatPath ??
            getGameToolRoomPath({
              kind: activeRoom.kind,
              roomId: activeRoom.id,
            }),
        ),
      );
    }
  }

  if (viewerBelongsToJoinedRoom) {
    redirect(withLocale(locale, `/game-tools/werewolf/rooms/${room.id}`));
  }

  if (room.status === "FINISHED") {
    return (
      <JoinStatusPage
        body={t.endedBody}
        code={room.code}
        cta={t.cta}
        ctaHref={withLocale(locale, "/game-tools/werewolf")}
        label={t.codeLabel}
        locale={locale}
        title={t.endedTitle}
      />
    );
  }

  if (room.status !== "LOBBY") {
    return (
      <JoinStatusPage
        body={t.runningBody}
        code={room.code}
        cta={t.cta}
        ctaHref={withLocale(locale, "/game-tools/werewolf")}
        label={t.codeLabel}
        locale={locale}
        title={t.runningTitle}
      />
    );
  }

  redirect(withLocale(locale, `/game-tools/werewolf/rooms/${room.id}`));
}

function JoinStatusPage({
  body,
  code,
  cta,
  ctaHref,
  label,
  locale,
  title,
}: {
  body: string;
  code: string;
  cta: string;
  ctaHref: string;
  label: string;
  locale: string;
  title: string;
}) {
  return (
    <PageContainer
      className="max-w-xl sm:pb-12 sm:pt-7"
      mobileSafeBottom
      mobileSafeTop
    >
      <GameToolBackButton
        fallbackHref={withLocale(locale, "/game-tools/werewolf")}
        locale={locale}
      />
      <section className="mt-5 overflow-hidden rounded-[1.6rem] border border-[#D9C7B4] bg-[#FFFDF7] shadow-[0_18px_48px_rgba(30,23,24,0.08)]">
        <div className="bg-[#1E1718] px-5 py-6 text-white">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/58">
            {label}
          </p>
          <p className="mt-1 font-mono text-2xl font-black tracking-[0.2em] text-[#F0C36A]">
            {code}
          </p>
        </div>
        <div className="p-5">
          <h1 className="text-2xl font-black leading-tight text-[#1E1718]">
            {title}
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-[#7A1F2B]/72">
            {body}
          </p>
          <Link
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#7A1F2B] px-5 text-sm font-black text-white transition hover:bg-[#9B2D3C]"
            href={ctaHref}
          >
            {cta}
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}
