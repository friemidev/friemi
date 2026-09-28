export const DRAW_GUESS_ROOM_EVENT = "room-changed";

export function getDrawGuessRoomTopic(roomId: string) {
  return `friemi:draw-guess:${roomId}`;
}

export const DRAW_GUESS_INK_EVENT = "ink-batch";

export function getDrawGuessInkTopic(roomId: string, gameNumber: number, turnIndex: number) {
  return `friemi:draw-guess:${roomId}:ink:${gameNumber}:${turnIndex}`;
}

export function getDrawGuessRealtimeBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return url && publishableKey ? { url, publishableKey } : null;
}
