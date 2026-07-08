import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { AvalonLiveRefresh } from "@/features/game-tools/components/AvalonLiveRefresh";
import { MobileChromeFullscreenOverride } from "@/features/game-tools/components/MobileChromeFullscreenOverride";
import { WerewolfPrivateSeatCard } from "@/features/game-tools/components/WerewolfPrivateSeatCard";
import {
  getWerewolfVariant,
  getWerewolfVariantLabel,
  getWerewolfRoleLabel,
  isWerewolfRoleKey,
  isWerewolfJudgeSeat,
  isWerewolfPlayerSeat,
  type WerewolfPrivatePayload,
  type WerewolfRoleKey,
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
  const showPlayerFullScreenCard =
    seat.room.status === "IN_PROGRESS" && !isCurrentSeatJudge;

  return (
    <>
      <MobileChromeFullscreenOverride enabled={showPlayerFullScreenCard} />
      <PageContainer
        className={
          showPlayerFullScreenCard
            ? "werewolf-seat-mobile-fullscreen !max-w-none !px-0 !py-0 max-md:!fixed max-md:!inset-0 max-md:!m-0 max-md:!h-[100svh] max-md:!w-screen max-md:!overflow-hidden max-md:!bg-[#090A0C] md:px-4 md:pb-6 md:pt-4"
            : "max-w-3xl pb-28 pt-4 sm:pb-12 sm:pt-7"
        }
      >
        <WerewolfPrivateSeatCard
          allReady={allReady}
          isJudgeSeat={isCurrentSeatJudge}
          isDead={deadSeatSet.has(seat.seatNumber)}
          isReady={Boolean(seat.readyAt)}
          locale={locale}
          payload={parsePrivatePayload({
            roleKey: seat.roleKey as WerewolfRoleKey | null,
            value: seat.privatePayload,
          })}
          privateToken={seat.privateToken}
          roleKey={seat.roleKey as WerewolfRoleKey | null}
          roleAlignment={seat.roleAlignment}
          roomUpdatedAt={seat.room.updatedAt.toISOString()}
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
        <AvalonLiveRefresh
          enabled={seat.room.status !== "FINISHED"}
          intervalMs={3500}
          locale={locale}
          showIndicator={!showPlayerFullScreenCard}
        />
      </PageContainer>
    </>
  );
}
