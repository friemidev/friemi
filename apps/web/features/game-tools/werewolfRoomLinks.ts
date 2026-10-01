import { withLocale } from "@/lib/routes";

const werewolfJoinPath = "/game-tools/werewolf/join";

export function getWerewolfAppJoinUrl(roomCode: string) {
  return `friemi://game-tools/werewolf/join/${encodeURIComponent(roomCode.trim().toUpperCase())}`;
}

export function getWerewolfWebJoinPath(roomCode: string) {
  return `${werewolfJoinPath}/${encodeURIComponent(roomCode.trim().toUpperCase())}`;
}

export function getWerewolfExitHref({
  locale,
  roomId,
}: {
  locale: string;
  roomId: string;
}) {
  return `${withLocale(locale, "/game-tools/werewolf")}?exitedRoomId=${encodeURIComponent(roomId)}`;
}

export function getWerewolfPrivateSeatHref({
  locale,
  privateToken,
  roundNumber,
}: {
  locale: string;
  privateToken: string;
  roundNumber?: number;
}) {
  const path = withLocale(
    locale,
    `/game-tools/werewolf/seats/${privateToken}`,
  );

  return Number.isInteger(roundNumber) && (roundNumber ?? 0) > 0
    ? `${path}?round=${roundNumber}`
    : path;
}
