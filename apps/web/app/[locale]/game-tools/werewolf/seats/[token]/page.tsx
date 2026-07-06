import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { WerewolfPrivateSeatCard } from "@/features/game-tools/components/WerewolfPrivateSeatCard";
import {
  getWerewolfVariant,
  getWerewolfVariantLabel,
  getWerewolfRoleLabel,
  isWerewolfJudgeSeat,
  isWerewolfPlayerSeat,
  type WerewolfPrivatePayload,
} from "@/features/game-tools/werewolfConfig";
import { normalizeWerewolfRoomState } from "@/features/game-tools/werewolfRoomState";
import { getWerewolfSeatByToken } from "@/features/game-tools/queries/getWerewolfRoom";
import { withLocale } from "@/lib/routes";

type WerewolfSeatPageProps = {
  params: Promise<{
    locale: string;
    token: string;
  }>;
};

function getConfigVariantKey(config: unknown) {
  if (!config || typeof config !== "object") {
    return null;
  }

  const value = (config as { variantKey?: unknown }).variantKey;

  return typeof value === "string" ? value : null;
}

function parsePrivatePayload(value: unknown): WerewolfPrivatePayload | null {
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

  const roomState = normalizeWerewolfRoomState(seat.room.state);
  const variant = getWerewolfVariant(getConfigVariantKey(seat.room.config));
  const isCurrentSeatJudge = isWerewolfJudgeSeat(seat.seatNumber, variant);
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

  return (
    <PageContainer className="max-w-3xl pb-28 pt-4 sm:pb-12 sm:pt-7">
      <WerewolfPrivateSeatCard
        allReady={allReady}
        isJudgeSeat={isCurrentSeatJudge}
        isDead={deadSeatSet.has(seat.seatNumber)}
        isReady={Boolean(seat.readyAt)}
        locale={locale}
        payload={parsePrivatePayload(seat.privatePayload)}
        privateToken={seat.privateToken}
        roomHref={withLocale(
          locale,
          `/game-tools/werewolf/rooms/${seat.roomId}${roomMemberQuery}`,
        )}
        roomState={roomState}
        roomStatus={seat.room.status}
        seatDisplayName={seat.displayName}
        seatNumber={seat.seatNumber}
        seats={seat.room.seats.map((roomSeat) => ({
          displayName: roomSeat.displayName,
          isDead: deadSeatSet.has(roomSeat.seatNumber),
          isJudgeSeat: isWerewolfJudgeSeat(roomSeat.seatNumber, variant),
          isPlayerSeat: isWerewolfPlayerSeat(roomSeat.seatNumber, variant),
          readyAt: roomSeat.readyAt?.toISOString() ?? null,
          roleLabel: isCurrentSeatJudge
            ? getWerewolfRoleLabel(locale, roomSeat.roleKey)
            : null,
          seatNumber: roomSeat.seatNumber,
        }))}
        variantLabel={getWerewolfVariantLabel(locale, variant)}
      />
    </PageContainer>
  );
}
