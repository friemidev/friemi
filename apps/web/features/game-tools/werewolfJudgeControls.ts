type JudgeSeatIdentity = {
  isViewerSeat: boolean;
  seatNumber: number;
};

type PlayerLifeState = {
  isClaimed: boolean;
  isDead: boolean;
  isPlayerSeat: boolean;
};

type ViewerSeatIdentity = {
  isViewerSeat: boolean;
  privateToken: string | null;
};

export function getWerewolfViewerPrivateToken({
  currentMemberPrivateToken,
  viewerSeat,
}: {
  currentMemberPrivateToken: string | null | undefined;
  viewerSeat: ViewerSeatIdentity | null | undefined;
}) {
  if (currentMemberPrivateToken) {
    return currentMemberPrivateToken;
  }

  return viewerSeat?.isViewerSeat ? viewerSeat.privateToken : null;
}

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
