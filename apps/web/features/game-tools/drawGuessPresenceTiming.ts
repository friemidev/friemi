export const DRAW_GUESS_REQUEST_TIMEOUT_MS = 8_000;
export const DRAW_GUESS_CONNECTED_POLL_MS = 10_000;
export const DRAW_GUESS_STALE_MS = 35_000;
export const DRAW_GUESS_FINISHED_STALE_MS = 180_000;

// Membership is shared by every tab for this profile. A closing tab must leave
// time for a surviving tab's next safety poll, including a slow request.
export const DRAW_GUESS_DEPART_GRACE_MS = DRAW_GUESS_CONNECTED_POLL_MS + DRAW_GUESS_REQUEST_TIMEOUT_MS + 2_000;
