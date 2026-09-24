import { notFound, redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { MobileChromeFullscreenOverride } from "@/features/game-tools/components/MobileChromeFullscreenOverride";
import { WerewolfPrivateSeatCard } from "@/features/game-tools/components/WerewolfPrivateSeatCard";
import {
  getActiveGameToolRoomForProfile,
  getGameToolPrivateSeatPath,
  getGameToolRoomPath,
} from "@/features/game-tools/gameToolRooms";
import {
  getWerewolfVariantFromRoomConfig,
  getWerewolfVariantLabel,
  getWerewolfRoleLabel,
  isActiveWerewolfSeatOccupant,
  isWerewolfRoleKey,
  isWerewolfJudgeSeat,
  isWerewolfPlayerSeat,
  type WerewolfPrivatePayload,
  type WerewolfRoleKey,
} from "@/features/game-tools/werewolfConfig";
import {
  getWerewolfRoomStateForViewer,
  isWerewolfEventVisibleToViewer,
  normalizeWerewolfRoomState,
} from "@/features/game-tools/werewolfRoomState";
import { getWerewolfSeatByToken } from "@/features/game-tools/queries/getWerewolfRoom";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

type WerewolfSeatPageProps = {
  params: Promise<{
    locale: string;
    token: string;
  }>;
};

function parsePrivatePayload({
  roleKey,
  value,
}: {
  roleKey: WerewolfRoleKey | null;
  value: unknown;
}): WerewolfPrivatePayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Partial<WerewolfPrivatePayload>;

  if (
    typeof payload.alignmentLabel !== "string" ||
    typeof payload.roleDescription !== "string" ||
    typeof payload.roleLabel !== "string" ||
    typeof payload.variantLabel !== "string"
  ) {
    return null;
  }

  return {
    alignmentLabel: payload.alignmentLabel,
    roleDescription: payload.roleDescription,
    roleKey: isWerewolfRoleKey(payload.roleKey)
      ? payload.roleKey
      : (roleKey ?? "villager"),
    roleLabel: payload.roleLabel,
    variantLabel: payload.variantLabel,
  };
}

export default async function WerewolfSeatPage({
  params,
}: WerewolfSeatPageProps) {
  const { locale, token } = await params;
  const seat = await getWerewolfSeatByToken({ token });

  if (!seat) {
    notFound();
  }

  const viewerProfile = await getOptionalCurrentUserProfile();

  const viewerOwnsPrivateSeat = Boolean(
    viewerProfile &&
    (seat.profileId === viewerProfile.id ||
      seat.room.members.some(
        (member) =>
          member.profileId === viewerProfile.id &&
          member.seatedSeatId === seat.id,
      )),
  );

  if (viewerProfile && !viewerOwnsPrivateSeat) {
    const activeRoom = await getActiveGameToolRoomForProfile({
      profileId: viewerProfile.id,
    });

    if (activeRoom) {
      const privateSeatPath =
        activeRoom.kind !== "WEREWOLF" && activeRoom.privateSeatToken
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

  const roomState = normalizeWerewolfRoomState(seat.room.state);
  const variant = getWerewolfVariantFromRoomConfig(
    seat.room.config,
    seat.room.locale,
  );
  const isCurrentSeatJudge = isWerewolfJudgeSeat(seat.seatNumber, variant);
  const viewerRoomState = getWerewolfRoomStateForViewer({
    isFinished: seat.room.status === "FINISHED",
    isJudge: isCurrentSeatJudge,
    roleKey: seat.roleKey,
    seatNumber: seat.seatNumber,
    state: roomState,
  });
  const deadSeatSet = new Set(roomState.deadSeatNumbers);
  const seatMember = seat.room.members.find(
    (member) => member.seatedSeatId === seat.id,
  );
  const roomMemberQuery =
    seatMember && !seatMember.profileId
      ? `?memberToken=${encodeURIComponent(seatMember.memberToken)}`
      : "";
  const allReady =
    seat.room.seats.length === variant.totalSeats &&
    seat.room.seats.every(
      (roomSeat) =>
        Boolean(roomSeat.profileId || roomSeat.guestName) &&
        Boolean(roomSeat.readyAt),
    );
  const showPlayerFullScreenCard =
    seat.room.status === "IN_PROGRESS" && !isCurrentSeatJudge;
  const roomHref = withLocale(
    locale,
    `/game-tools/werewolf/rooms/${seat.roomId}${roomMemberQuery}`,
  );

  if (!showPlayerFullScreenCard) {
    redirect(roomHref);
  }

  return (
    <>
      <MobileChromeFullscreenOverride enabled={showPlayerFullScreenCard} />
      <PageContainer
        className={
          showPlayerFullScreenCard
            ? "werewolf-seat-mobile-fullscreen !max-w-none !px-0 !py-0 max-md:!fixed max-md:!inset-0 max-md:!m-0 max-md:!h-[100svh] max-md:!w-screen max-md:!overflow-hidden max-md:!bg-[#090A0C] md:px-4 md:pb-6 md:pt-4"
            : "max-w-3xl sm:pb-12 sm:pt-7"
        }
        mobileSafeBottom={!showPlayerFullScreenCard}
        mobileSafeTop={!showPlayerFullScreenCard}
      >
        <WerewolfPrivateSeatCard
          allReady={allReady}
          isJudgeSeat={isCurrentSeatJudge}
          isDead={deadSeatSet.has(seat.seatNumber)}
          isReady={Boolean(seat.readyAt)}
          flowEvents={seat.room.events
            .filter((event) =>
              isWerewolfEventVisibleToViewer({
                isFinished: seat.room.status === "FINISHED",
                isJudge: isCurrentSeatJudge,
                type: event.type,
              }),
            )
            .map((event) => ({
              createdAt: event.createdAt.toISOString(),
              id: event.id,
              payload: event.payload,
              type: event.type,
            }))}
          flowSubmissions={seat.room.submissions.flatMap((submission) => {
            const isVote =
              submission.kind === "WEREWOLF_SHERIFF_VOTE" ||
              submission.kind === "WEREWOLF_EXILE_VOTE";
            const isOwnNightAction =
              submission.kind === "WEREWOLF_NIGHT_ACTION" &&
              submission.seat?.seatNumber === seat.seatNumber;
            const metadata =
              submission.metadata && typeof submission.metadata === "object"
                ? (submission.metadata as Record<string, unknown>)
                : null;
            const isWitchKillContext =
              seat.roleKey === "witch" &&
              submission.kind === "WEREWOLF_NIGHT_ACTION" &&
              metadata?.actionKind === "WOLF_KILL";
            const isWolfPackKillContext =
              seat.roleAlignment === "werewolf" &&
              submission.kind === "WEREWOLF_NIGHT_ACTION" &&
              metadata?.actionKind === "WOLF_KILL";
            const isCurrentFlowSession =
              submission.roundIndex === roomState.flow.sessionIndex;

            if (
              !isVote &&
              (!isCurrentFlowSession ||
                (!isOwnNightAction &&
                  !isWitchKillContext &&
                  !isWolfPackKillContext))
            ) {
              return [];
            }

            return [
              {
                actionKind:
                  typeof metadata?.actionKind === "string"
                    ? metadata.actionKind
                    : null,
                id: submission.id,
                kind: submission.kind,
                roundIndex: submission.roundIndex,
                secondaryTargetSeatNumber:
                  typeof metadata?.secondaryTargetSeatNumber === "number"
                    ? metadata.secondaryTargetSeatNumber
                    : null,
                submittedAt: submission.submittedAt.toISOString(),
                seerResult:
                  typeof metadata?.seerResult === "string"
                    ? metadata.seerResult
                    : null,
                targetSeatNumber: isVote
                  ? submission.value === "ABSTAIN"
                    ? null
                    : Number(submission.value)
                  : typeof metadata?.targetSeatNumber === "number"
                    ? metadata.targetSeatNumber
                    : null,
                voterSeatNumber:
                  isWitchKillContext || isWolfPackKillContext
                    ? null
                    : (submission.seat?.seatNumber ?? null),
              },
            ];
          })}
          locale={locale}
          memberToken={
            seatMember && !seatMember.profileId ? seatMember.memberToken : null
          }
          payload={parsePrivatePayload({
            roleKey: seat.roleKey as WerewolfRoleKey | null,
            value: seat.privatePayload,
          })}
          privateToken={seat.privateToken}
          roleKey={seat.roleKey as WerewolfRoleKey | null}
          roleAlignment={seat.roleAlignment}
          roleDeck={variant.roles}
          roomUpdatedAt={seat.room.updatedAt.toISOString()}
          roomHref={roomHref}
          roomId={seat.roomId}
          roomState={viewerRoomState}
          roomStatus={seat.room.status}
          seatDisplayName={seat.displayName}
          seatNumber={seat.seatNumber}
          seats={seat.room.seats.map((roomSeat) => ({
            displayName: roomSeat.displayName,
            isActive: isActiveWerewolfSeatOccupant(roomSeat),
            isDead: deadSeatSet.has(roomSeat.seatNumber),
            isJudgeSeat: isWerewolfJudgeSeat(roomSeat.seatNumber, variant),
            isPlayerSeat: isWerewolfPlayerSeat(roomSeat.seatNumber, variant),
            readyAt: roomSeat.readyAt?.toISOString() ?? null,
            roleKey: isCurrentSeatJudge
              ? (roomSeat.roleKey as WerewolfRoleKey | null)
              : null,
            roleLabel: isCurrentSeatJudge
              ? getWerewolfRoleLabel(locale, roomSeat.roleKey)
              : null,
            seatNumber: roomSeat.seatNumber,
          }))}
          variantLabel={getWerewolfVariantLabel(locale, variant)}
        />
      </PageContainer>
    </>
  );
}
