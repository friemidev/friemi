"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { brand } from "@/lib/brand";

type FriemiAlertProviderProps = {
  locale: string;
};

type AlertItem = {
  id: number;
  message: string;
};

function getAlertCopy(locale: string) {
  if (locale === "fr") {
    return {
      close: "D'accord",
      title: "Friemi",
    };
  }

  if (locale === "en") {
    return {
      close: "OK",
      title: "Friemi",
    };
  }

  return {
    close: "知道了",
    title: "Friemi",
  };
}

function stringifyAlertMessage(message?: unknown) {
  if (typeof message === "string") {
    return message;
  }

  if (message === undefined || message === null) {
    return "";
  }

  return String(message);
}

export function FriemiAlertProvider({ locale }: FriemiAlertProviderProps) {
  const copy = getAlertCopy(locale);
  const titleId = useId();
  const messageId = useId();
  const originalAlertRef = useRef<typeof window.alert | null>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const nextIdRef = useRef(1);
  const [mounted, setMounted] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const currentAlert = alerts[0] ?? null;

  const closeAlert = useCallback(() => {
    setAlerts((items) => items.slice(1));
  }, []);

  const openAlert = useCallback((message?: unknown) => {
    const text = stringifyAlertMessage(message);

    setAlerts((items) => [
      ...items,
      {
        id: nextIdRef.current++,
        message: text,
      },
    ]);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    originalAlertRef.current = window.alert;
    window.alert = openAlert;

    return () => {
      if (window.alert === openAlert && originalAlertRef.current) {
        window.alert = originalAlertRef.current;
      }
    };
  }, [openAlert]);

  useEffect(() => {
    if (!currentAlert) {
      return;
    }

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" || event.key === "Enter") {
        event.preventDefault();
        closeAlert();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;

      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [closeAlert, currentAlert]);

  if (!mounted || !currentAlert) {
    return null;
  }

  return createPortal(
    <div className="friemi-alert-overlay fixed inset-0 z-[1200] flex items-center justify-center bg-[#111210]/34 px-5 py-[calc(1.25rem+env(safe-area-inset-top))] backdrop-blur-[3px]">
      <section
        aria-describedby={messageId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="friemi-alert-card relative w-full max-w-[20.5rem] overflow-hidden rounded-[1.45rem] border border-[#D6D5B2]/75 bg-[linear-gradient(180deg,#FFFFFF_0%,#FEFFF9_72%,#FFF5E6_100%)] text-[#111210] shadow-[0_22px_56px_rgba(29,29,27,0.18)] ring-1 ring-white/90"
        role="alertdialog"
      >
        <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[#8AB68E]/16 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 left-4 h-24 w-24 rounded-full bg-[#F09182]/12 blur-2xl" />
        <div className="relative px-5 pb-4 pt-5">
          <div className="flex items-center">
            <span className="relative block h-8 w-[6.9rem]">
              <Image
                alt={brand.name}
                className="h-full w-full object-contain object-left"
                height={72}
                priority={false}
                src={brand.lockupHorizontalNavyPath}
                width={240}
              />
            </span>
            <span className="sr-only" id={titleId}>
              {copy.title}
            </span>
          </div>

          <p
            className="mt-6 whitespace-pre-wrap break-words text-[17px] font-black leading-7 tracking-normal text-[#111210]"
            id={messageId}
          >
            {currentAlert.message}
          </p>

          <div className="mt-5 flex justify-end">
            <button
              className="inline-flex h-10 min-w-[6.4rem] items-center justify-center rounded-full bg-[#156240] px-5 text-[14px] font-black text-white shadow-[0_12px_22px_rgba(21,98,64,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#369758] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB68E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FEFFF9] active:translate-y-0 active:scale-[0.98]"
              onClick={closeAlert}
              ref={closeButtonRef}
              type="button"
            >
              {copy.close}
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
