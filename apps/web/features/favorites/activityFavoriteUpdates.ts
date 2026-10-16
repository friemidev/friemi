export const activityFavoriteUpdatedMessage =
  "friemi:activity-favorite-updated";
const snapshotRequestMessage = "friemi:activity-favorite-snapshot-request";

export type ActivityFavoriteSnapshot = {
  activityId: string;
  viewerProfileId: string;
  favoriteCount: number;
  isFavorited: boolean;
  updatedAt: number;
};

export function parseActivityFavoriteSnapshot(
  value: unknown,
): ActivityFavoriteSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.activityId !== "string" ||
    !data.activityId.trim() ||
    typeof data.viewerProfileId !== "string" ||
    !data.viewerProfileId.trim() ||
    typeof data.favoriteCount !== "number" ||
    !Number.isSafeInteger(data.favoriteCount) ||
    data.favoriteCount < 0 ||
    typeof data.isFavorited !== "boolean" ||
    typeof data.updatedAt !== "number" ||
    !Number.isSafeInteger(data.updatedAt) ||
    data.updatedAt < 0
  )
    return null;
  return data as ActivityFavoriteSnapshot;
}

const listeners = new Set<(snapshot: ActivityFavoriteSnapshot) => void>();
const recent = new Map<
  string,
  { snapshot: ActivityFavoriteSnapshot; receivedAt: number }
>();

function receive(snapshot: ActivityFavoriteSnapshot) {
  const previous = recent.get(snapshot.activityId)?.snapshot;
  if (previous && previous.updatedAt > snapshot.updatedAt) return;
  recent.delete(snapshot.activityId);
  recent.set(snapshot.activityId, { snapshot, receivedAt: Date.now() });
  while (recent.size > 50) recent.delete(recent.keys().next().value!);
  for (const listener of listeners) listener(snapshot);
}

function sendToFrames(
  snapshot: ActivityFavoriteSnapshot,
  exclude?: MessageEventSource | null,
) {
  for (const frame of document.querySelectorAll("iframe")) {
    if (frame.contentWindow && frame.contentWindow !== exclude) {
      frame.contentWindow.postMessage(
        { type: activityFavoriteUpdatedMessage, ...snapshot },
        window.location.origin,
      );
    }
  }
}

function onMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) return;
  const fromParent = window.parent !== window && event.source === window.parent;
  const fromFrame = [...document.querySelectorAll("iframe")].some(
    (frame) => frame.contentWindow === event.source,
  );
  if (!fromParent && !fromFrame) return;

  if (event.data?.type === snapshotRequestMessage && fromFrame) {
    const cached = recent.get(event.data.activityId);
    if (
      cached &&
      Date.now() - cached.receivedAt < 5000 &&
      cached.snapshot.viewerProfileId === event.data.viewerProfileId
    ) {
      (event.source as Window).postMessage(
        { type: activityFavoriteUpdatedMessage, ...cached.snapshot },
        event.origin,
      );
    }
    return;
  }
  if (event.data?.type !== activityFavoriteUpdatedMessage) return;
  const snapshot = parseActivityFavoriteSnapshot(event.data);
  if (!snapshot) return;
  receive(snapshot);
  sendToFrames(snapshot, event.source);
}

export function notifyActivityFavoriteUpdated(
  snapshot: ActivityFavoriteSnapshot,
) {
  if (typeof window === "undefined") return;
  receive(snapshot);
  sendToFrames(snapshot);
  if (window.parent !== window) {
    window.parent.postMessage(
      { type: activityFavoriteUpdatedMessage, ...snapshot },
      window.location.origin,
    );
  }
}

export function subscribeActivityFavoriteUpdates(
  activityId: string,
  viewerProfileId: string | null | undefined,
  callback: (snapshot: ActivityFavoriteSnapshot) => void,
) {
  if (typeof window === "undefined") return () => {};
  if (listeners.size === 0) window.addEventListener("message", onMessage);
  const listener = (snapshot: ActivityFavoriteSnapshot) => {
    if (snapshot.activityId === activityId) callback(snapshot);
  };
  listeners.add(listener);
  if (window.parent !== window && viewerProfileId) {
    window.parent.postMessage(
      { type: snapshotRequestMessage, activityId, viewerProfileId },
      window.location.origin,
    );
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("message", onMessage);
  };
}
