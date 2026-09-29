export type MobileViewportHeightClass =
  | "short"
  | "compact"
  | "standard"
  | "tall";

export type MobileViewportWidthClass =
  | "compact"
  | "narrow"
  | "standard"
  | "wide";

export type MobileViewportProfile = {
  heightClass: MobileViewportHeightClass;
  widthClass: MobileViewportWidthClass;
};

export function getMobileViewportProfile({
  height,
  width,
}: {
  height: number;
  width: number;
}): MobileViewportProfile {
  const widthClass: MobileViewportWidthClass =
    width <= 359
      ? "compact"
      : width <= 389
        ? "narrow"
        : width <= 430
          ? "standard"
          : "wide";
  const heightClass: MobileViewportHeightClass =
    height <= 600
      ? "short"
      : height <= 700
        ? "compact"
        : height <= 850
          ? "standard"
          : "tall";

  return { heightClass, widthClass };
}
