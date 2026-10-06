import { locales } from "@chill-club/shared";

export type RouteMotionDirection = "forward" | "back";

export const routeMotionHistoryKey = "__friemiRouteMotionIndex";

export function readRouteMotionIndex(state: unknown): number | null {
  if (!state || typeof state !== "object") return null;
  const index = (state as Record<string, unknown>)[routeMotionHistoryKey];
  return typeof index === "number" && Number.isSafeInteger(index)
    ? index
    : null;
}

const primaryRoutes = [
  "mobile-home",
  "lobby",
  "activities/new",
  "footprints",
  "profile",
];

function routeSegments(pathname: string) {
  const segments = pathname.split(/[?#]/, 1)[0].split("/").filter(Boolean);
  if (locales.includes(segments[0] as (typeof locales)[number]))
    segments.shift();
  return segments;
}

function isExcluded(segments: string[]) {
  const section = segments[0] ?? "";
  return (
    ["game-tools", "sign-in", "sign-up", "auth", "admin"].includes(section) ||
    section.startsWith("android-auth-")
  );
}

export function getRouteMotionDirection({
  fromPath,
  toPath,
  historyDirection,
}: {
  fromPath: string;
  toPath: string;
  historyDirection?: RouteMotionDirection | null;
}): RouteMotionDirection | null {
  const from = routeSegments(fromPath);
  const to = routeSegments(toPath);
  if (from.join("/") === to.join("/") || isExcluded(from) || isExcluded(to)) {
    return null;
  }
  const fromTab = primaryRoutes.indexOf(from.join("/"));
  const toTab = primaryRoutes.indexOf(to.join("/"));
  if (fromTab !== -1 && toTab !== -1) return null;
  if (historyDirection) return historyDirection;
  if (
    toTab !== -1 ||
    (to.length < from.length && to.every((part, index) => part === from[index]))
  ) {
    return "back";
  }
  return "forward";
}
