import { withLocale } from "./routes";

type FootprintsTab = "message" | "moment" | "planet";

type MobileRoutePrefetchOptions = {
  locale: string;
  pathname: string;
  search?: string;
};

const bottomNavigationTargets = [
  "/mobile-home",
  "/lobby",
  "/activities/new",
  "/footprints?tab=moment",
  "/profile",
] as const;

const footprintsTabs: FootprintsTab[] = ["message", "moment", "planet"];

function getLocalizedPathWithoutLocale(pathname: string, locale: string) {
  const localePrefix = `/${locale}`;

  if (pathname === localePrefix) {
    return "/";
  }

  if (pathname.startsWith(`${localePrefix}/`)) {
    return pathname.slice(localePrefix.length) || "/";
  }

  return pathname || "/";
}

function getActiveBottomNavigationTarget(routePath: string) {
  if (
    routePath === "/" ||
    routePath === "/home" ||
    routePath === "/mobile-home" ||
    routePath.startsWith("/mobile-home/")
  ) {
    return "/mobile-home";
  }

  if (routePath === "/lobby" || routePath.startsWith("/lobby/")) {
    return "/lobby";
  }

  if (
    routePath === "/activities/new" ||
    routePath.startsWith("/activities/new/")
  ) {
    return "/activities/new";
  }

  if (routePath === "/footprints" || routePath.startsWith("/footprints/")) {
    return "/footprints";
  }

  if (routePath === "/profile" || routePath.startsWith("/profile/")) {
    return "/profile";
  }

  return null;
}

function getFootprintsTab(search: string): FootprintsTab {
  const tab = new URLSearchParams(search).get("tab");

  if (tab === "message" || tab === "planet") {
    return tab;
  }

  return "moment";
}

function getFootprintsTargets(search: string) {
  const searchParams = new URLSearchParams(search);
  const activeTab = getFootprintsTab(search);
  const scope = searchParams.get("scope");
  const momentScope =
    scope === "mine" || scope === "mutual" || scope === "following"
      ? scope
      : null;

  return footprintsTabs
    .filter((tab) => tab !== activeTab)
    .map((tab) => {
      const params = new URLSearchParams({ tab });

      if (tab === "moment" && momentScope) {
        params.set("scope", momentScope);
      }

      return `/footprints?${params.toString()}`;
    });
}

export function getSequentialMobilePrefetchTargets({
  locale,
  pathname,
  search = "",
}: MobileRoutePrefetchOptions) {
  const routePath = getLocalizedPathWithoutLocale(pathname, locale);
  const activeBottomTarget = getActiveBottomNavigationTarget(routePath);
  const routeTargets =
    routePath === "/footprints" ? getFootprintsTargets(search) : [];
  const targetPaths = [
    ...routeTargets,
    ...bottomNavigationTargets.filter((target) => {
      const baseTarget = target.split("?")[0] ?? target;
      return baseTarget !== activeBottomTarget;
    }),
  ];
  const seen = new Set<string>();

  return targetPaths
    .map((target) => withLocale(locale, target))
    .filter((target) => {
      if (seen.has(target)) {
        return false;
      }

      seen.add(target);
      return true;
    });
}
