type WerewolfViewerAccessSource = {
  currentMember: {
    id: string;
    seatedSeatId: string | null;
  } | null;
  seats: Array<{
    id: string;
    isJudgeSeat: boolean;
    isViewerSeat: boolean;
  }>;
};

export function getWerewolfViewerAccessScope(room: WerewolfViewerAccessSource) {
  const viewerSeat = room.seats.find((seat) => seat.isViewerSeat);

  return [
    room.currentMember?.id ?? "",
    room.currentMember?.seatedSeatId ?? "",
    viewerSeat?.id ?? "",
    viewerSeat?.isJudgeSeat ? "judge" : "player",
  ].join(":");
}
