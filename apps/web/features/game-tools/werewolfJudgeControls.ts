type JudgeSeatIdentity = {
  isViewerSeat: boolean;
  seatNumber: number;
};

type PlayerLifeState = {
  isClaimed: boolean;
  isDead: boolean;
  isPlayerSeat: boolean;
};

export function isWerewolfJudgeViewer({
  currentMemberSeatNumber,
  judgeSeat,
}: {
  currentMemberSeatNumber: number | null | undefined;
  judgeSeat: JudgeSeatIdentity | null | undefined;
}) {
  return Boolean(
    judgeSeat &&
      (judgeSeat.isViewerSeat ||
        currentMemberSeatNumber === judgeSeat.seatNumber),
  );
}

export function countAliveWerewolfPlayers(seats: PlayerLifeState[]) {
  return seats.filter(
    (seat) => seat.isPlayerSeat && seat.isClaimed && !seat.isDead,
  ).length;
}
