export function shouldHideMobileScrollProgress(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const firstRouteSegment = segments[0];
  const localizedRouteSegment = segments[1];
  const isAccountSettingsRoute =
    segments[segments.length - 2] === "account" &&
    (segments.at(-1) === "settings" || segments.at(-1) === "security");

  if (
    isAccountSettingsRoute ||
    firstRouteSegment === "admin" ||
    firstRouteSegment === "footprints" ||
    firstRouteSegment === "game-tools" ||
    firstRouteSegment === "poll" ||
    firstRouteSegment === "profile" ||
    localizedRouteSegment === "admin" ||
    localizedRouteSegment === "footprints" ||
    localizedRouteSegment === "game-tools" ||
    localizedRouteSegment === "poll" ||
    localizedRouteSegment === "profile" ||
    (segments.length === 2 && firstRouteSegment === "messages") ||
    (segments.length === 3 && localizedRouteSegment === "messages")
  ) {
    return true;
  }

  return (
    (segments.length === 1 &&
      (firstRouteSegment === "mobile-home" ||
        firstRouteSegment === "activities" ||
        firstRouteSegment === "footprints" ||
        firstRouteSegment === "lobby" ||
        firstRouteSegment === "planets" ||
        firstRouteSegment === "profile")) ||
    (segments.length === 2 &&
      (localizedRouteSegment === "mobile-home" ||
        localizedRouteSegment === "activities" ||
        localizedRouteSegment === "footprints" ||
        localizedRouteSegment === "lobby" ||
        localizedRouteSegment === "planets" ||
        localizedRouteSegment === "profile")) ||
    (segments.length === 2 &&
      firstRouteSegment === "activities" &&
      segments[1] === "new") ||
    (segments.length === 3 &&
      localizedRouteSegment === "activities" &&
      segments[2] === "new")
  );
}
