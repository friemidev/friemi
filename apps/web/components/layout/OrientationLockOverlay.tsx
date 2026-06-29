type OrientationLockOverlayProps = {
  locale: string;
};

const orientationLockCopy = {
  "zh-CN": {
    description: "横屏会挤压按钮、弹窗和卡片。转回竖屏后继续使用 Friemi。",
    eyebrow: "Friemi portrait mode",
    hint: "把设备竖回来就好",
    title: "请竖屏浏览",
  },
  en: {
    description:
      "Landscape squeezes cards, sheets, and actions. Rotate back to continue with Friemi.",
    eyebrow: "Friemi portrait mode",
    hint: "Turn your device upright",
    title: "Portrait works best",
  },
  fr: {
    description:
      "Le mode paysage compresse les cartes, les fenêtres et les actions. Repasse en portrait pour continuer.",
    eyebrow: "Friemi mode portrait",
    hint: "Remets ton appareil à la verticale",
    title: "Passe en portrait",
  },
} as const;

export function OrientationLockOverlay({
  locale,
}: OrientationLockOverlayProps) {
  const copy =
    orientationLockCopy[locale as keyof typeof orientationLockCopy] ??
    orientationLockCopy.en;

  return (
    <div className="app-orientation-lock" role="status" aria-live="polite">
      <div className="app-orientation-lock__panel">
        <div className="app-orientation-lock__device" aria-hidden="true">
          <span className="app-orientation-lock__screen" />
          <span className="app-orientation-lock__arrow" />
        </div>
        <p className="app-orientation-lock__eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
        <span className="app-orientation-lock__hint">{copy.hint}</span>
      </div>
    </div>
  );
}
