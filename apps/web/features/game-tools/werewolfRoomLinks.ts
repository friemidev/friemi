const werewolfJoinPath = "/game-tools/werewolf/join";

export function getWerewolfAppJoinUrl(roomCode: string) {
  return `friemi://game-tools/werewolf/join/${encodeURIComponent(roomCode.trim().toUpperCase())}`;
}

export function getWerewolfWebJoinPath(roomCode: string) {
  return `${werewolfJoinPath}/${encodeURIComponent(roomCode.trim().toUpperCase())}`;
}
