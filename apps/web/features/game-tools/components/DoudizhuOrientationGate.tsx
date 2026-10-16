"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Maximize2, RotateCw, Smartphone } from "lucide-react";
import s from "./DoudizhuOrientationGate.module.css";

const PHONE_PORTRAIT = "(max-width: 767px) and (orientation: portrait)";

/** Keep the room mounted and advancing while a phone is being rotated. */
export function DoudizhuOrientationGate({
  locale,
  children,
  onExit,
  preview = false,
}: {
  locale: string;
  children: ReactNode;
  onExit?: () => void;
  preview?: boolean;
}) {
  const [portrait, setPortrait] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const ownsFullscreen = useRef(false);
  const ownsLock = useRef(false);
  const t =
    locale === "zh-CN"
      ? {
          title: "横过来，一起出牌",
          description: "将手机横放，牌桌会自动展开。",
          enter: "进入横屏",
          manual: "请关闭手机的方向锁定，再将手机横放。",
          timer: "本局计时仍在继续。",
          preview: "预览计时暂停，可安心调整方向。",
          back: "返回入口",
          leaving: "离开房间",
        }
      : locale === "fr"
        ? {
            title: "Tournez pour jouer",
            description:
              "Placez votre téléphone à l’horizontale pour ouvrir la table.",
            enter: "Passer en paysage",
            manual:
              "Désactivez le verrouillage de rotation, puis tournez votre téléphone.",
            timer: "Le temps de jeu continue de s’écouler.",
            preview: "Le temps est en pause dans cet aperçu.",
            back: "Retour à l’accueil",
            leaving: "Quitter la salle",
          }
        : {
            title: "Turn your phone to play",
            description: "Hold your phone sideways to open the card table.",
            enter: "Enter landscape",
            manual:
              "Turn off your phone’s rotation lock, then hold it sideways.",
            timer: "The round timer is still running.",
            preview: "The timer is paused in this preview.",
            back: "Back to game entry",
            leaving: "Leave room",
          };
  useEffect(() => {
    mounted.current = true;
    const query = window.matchMedia(PHONE_PORTRAIT);
    const element = root.current;
    const sync = () => setPortrait(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => {
      mounted.current = false;
      query.removeEventListener("change", sync);
      if (ownsLock.current) {
        try {
          screen.orientation?.unlock();
        } catch {
          /* Optional browser API. */
        }
      }
      if (ownsFullscreen.current && document.fullscreenElement === element)
        void document.exitFullscreen().catch(() => {});
    };
  }, []);

  async function enterLandscape() {
    if (busy) return;
    setBusy(true);
    const element = root.current;
    try {
      if (element?.requestFullscreen && !document.fullscreenElement) {
        await element.requestFullscreen();
        ownsFullscreen.current = true;
      }
      if (!mounted.current) {
        if (ownsFullscreen.current && document.fullscreenElement === element)
          await document.exitFullscreen().catch(() => {});
        return;
      }
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: "landscape") => Promise<void>;
      };
      if (orientation?.lock) {
        await orientation.lock("landscape");
        ownsLock.current = true;
      }
    } catch {
      /* Safari and some WebViews require physically rotating the device. */
    } finally {
      if (mounted.current) {
        setBusy(false);
        setManual(window.matchMedia(PHONE_PORTRAIT).matches);
      } else if (ownsLock.current) {
        try {
          screen.orientation?.unlock();
        } catch {}
      }
    }
  }

  return (
    <div ref={root} className={s.root} data-ddz-orientation="landscape">
      <div className={s.content} inert={portrait || undefined}>
        {children}
      </div>
      <section className={s.prompt} aria-label={t.title}>
        <div className={s.phone} aria-hidden="true">
          <Smartphone size={78} strokeWidth={1.4} />
          <RotateCw className={s.rotate} size={30} />
          <span>♠</span>
        </div>
        <h1>{t.title}</h1>
        <p>{t.description}</p>
        <button
          type="button"
          className={s.enter}
          disabled={busy}
          onClick={() => void enterLandscape()}
        >
          <Maximize2 size={19} />
          {t.enter}
        </button>
        {manual && (
          <p className={s.manual} role="status">
            {t.manual}
          </p>
        )}
        <p className={s.timer}>{preview ? t.preview : t.timer}</p>
        {onExit ? (
          <button className={s.back} onClick={onExit}>
            <ArrowLeft size={17} />
            {t.leaving}
          </button>
        ) : (
          <a className={s.back} href={`/${locale}/game-tools/doudizhu`}>
            <ArrowLeft size={17} />
            {t.back}
          </a>
        )}
      </section>
    </div>
  );
}
