const DEPARTURE_DELAY_MS = 500;
type ShouldDepart = () => boolean;
type RoomPresence = {
  owners: Map<symbol, ShouldDepart>;
  departed: boolean;
  onPageHide: () => void;
  onPageShow: () => void;
};

// Shared across component instances so a remount can cancel its predecessor's
// cleanup, including a spectator/player component switch and StrictMode replay.
const activeRooms = new Map<string, RoomPresence>();
const pendingDepartures = new Map<string, ReturnType<typeof setTimeout>>();

function depart(roomId: string, useBeacon: boolean) {
  const path = `/api/game-tools/draw-guess/rooms/${roomId}/depart`;
  if (useBeacon) {
    try { if (navigator.sendBeacon?.(path)) return; } catch { /* Fall back to keepalive. */ }
  }
  try { void fetch(path, { method: "POST", keepalive: true }).catch(() => {}); } catch { /* Departure is best effort. */ }
}

/** Register one mounted room owner; cleanup preserves the seat via /depart. */
export function registerDrawGuessRoomPresence(roomId: string, shouldDepart: ShouldDepart = () => true): () => void {
  const pending = pendingDepartures.get(roomId);
  if (pending !== undefined) {
    clearTimeout(pending);
    pendingDepartures.delete(roomId);
  }

  let presence = activeRooms.get(roomId);
  if (!presence) {
    const created: RoomPresence = {
      owners: new Map(),
      departed: false,
      onPageHide: () => {
        if (created.departed || !Array.from(created.owners.values()).some((canDepart) => canDepart())) return;
        created.departed = true;
        depart(roomId, true);
      },
      onPageShow: () => { created.departed = false; },
    };
    presence = created;
    activeRooms.set(roomId, presence);
    window.addEventListener("pagehide", presence.onPageHide);
    window.addEventListener("pageshow", presence.onPageShow);
  }
  const owner = Symbol(roomId);
  presence.owners.set(owner, shouldDepart);
  const ownedPresence = presence;

  return () => {
    if (!ownedPresence.owners.delete(owner) || ownedPresence.owners.size) return;
    window.removeEventListener("pagehide", ownedPresence.onPageHide);
    window.removeEventListener("pageshow", ownedPresence.onPageShow);
    activeRooms.delete(roomId);
    if (ownedPresence.departed || !shouldDepart()) return;
    const timer = setTimeout(() => {
      if (pendingDepartures.get(roomId) !== timer) return;
      pendingDepartures.delete(roomId);
      if (!activeRooms.has(roomId) && shouldDepart()) depart(roomId, false);
    }, DEPARTURE_DELAY_MS);
    pendingDepartures.set(roomId, timer);
  };
}
