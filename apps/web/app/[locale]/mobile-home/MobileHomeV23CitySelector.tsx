"use client";

import { Check, ChevronRight, MapPin, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type CityOption = {
  id: string;
  labels: Record<"en" | "fr" | "zh-CN", string>;
  open: boolean;
};

const cityOptions: CityOption[] = [
  {
    id: "paris",
    labels: { en: "Paris", fr: "Paris", "zh-CN": "巴黎" },
    open: true,
  },
  {
    id: "lyon",
    labels: { en: "Lyon", fr: "Lyon", "zh-CN": "里昂" },
    open: false,
  },
  {
    id: "marseille",
    labels: { en: "Marseille", fr: "Marseille", "zh-CN": "马赛" },
    open: false,
  },
  {
    id: "toulouse",
    labels: { en: "Toulouse", fr: "Toulouse", "zh-CN": "图卢兹" },
    open: false,
  },
  {
    id: "bordeaux",
    labels: { en: "Bordeaux", fr: "Bordeaux", "zh-CN": "波尔多" },
    open: false,
  },
  {
    id: "nice",
    labels: { en: "Nice", fr: "Nice", "zh-CN": "尼斯" },
    open: false,
  },
];

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      close: "Fermer",
      current: "Disponible",
      soon: "Bientôt disponible",
      soonMessage: (city: string) => `${city} arrive bientôt.`,
      title: "Choisir une ville",
    };
  }

  if (locale === "en") {
    return {
      close: "Close",
      current: "Available",
      soon: "Coming soon",
      soonMessage: (city: string) => `${city} is coming soon.`,
      title: "Choose a city",
    };
  }

  return {
    close: "关闭",
    current: "已开放",
    soon: "敬请期待",
    soonMessage: (city: string) => `${city}正在筹备，敬请期待。`,
    title: "选择城市",
  };
}

function getCityLabel(city: CityOption, locale: string) {
  return city.labels[locale === "en" || locale === "fr" ? locale : "zh-CN"];
}

export function MobileHomeV23CitySelector({
  currentCity,
  locale,
}: {
  currentCity: string;
  locale: string;
}) {
  const copy = getCopy(locale);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function closePicker() {
    setOpen(false);
    setNotice("");
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${copy.title}: ${currentCity}`}
        className="inline-flex h-9 min-w-0 select-none items-center gap-1 rounded-full bg-white/78 px-2.5 text-[13px] font-semibold text-[#123D31] shadow-[0_10px_24px_rgba(21,98,64,0.08)] ring-1 ring-[#D6D5B2]/62 transition active:scale-95"
        onClick={() => setOpen(true)}
        title={copy.title}
        type="button"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 fill-[#F56D62] text-[#F56D62]" />
        <span className="max-w-[4.4rem] truncate">{currentCity}</span>
        <ChevronRight className="h-3.5 w-3.5 rotate-90 text-[#123D31]/58" />
      </button>

      {open ? (
        <div
          aria-label={copy.title}
          aria-modal="true"
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/35 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePicker();
          }}
          role="dialog"
        >
          <section className="w-full max-w-md overflow-hidden rounded-[1.25rem] bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-[#EFEAD7] px-5 py-4">
              <h2 className="text-lg font-black text-[#111210]">
                {copy.title}
              </h2>
              <button
                aria-label={copy.close}
                className="grid h-9 w-9 place-items-center rounded-full text-[#4F574F] ring-1 ring-[#D6D5B2] transition active:scale-95"
                onClick={closePicker}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="max-h-[62svh] overflow-y-auto px-5 py-2">
              {cityOptions.map((city) => {
                const label = getCityLabel(city, locale);

                return (
                  <button
                    className="flex min-h-14 w-full items-center gap-3 border-b border-[#EFEAD7] py-3 text-left transition last:border-b-0 active:bg-[#F5F7F2]"
                    key={city.id}
                    onClick={() => {
                      if (city.open) {
                        closePicker();
                        return;
                      }

                      setNotice(copy.soonMessage(label));
                    }}
                    type="button"
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                        city.open
                          ? "bg-[#EAF5E8] text-[#156240]"
                          : "bg-[#F1F2EC] text-[#7A8276]",
                      )}
                    >
                      {city.open ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-[#111210]">
                        {label}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 block text-xs font-semibold",
                          city.open ? "text-[#156240]" : "text-[#7A8276]",
                        )}
                      >
                        {city.open ? copy.current : copy.soon}
                      </span>
                    </span>
                    {!city.open ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#A7A99D]" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <p
              aria-live="polite"
              className={cn(
                "min-h-12 border-t border-[#EFEAD7] px-5 py-3 text-center text-xs font-bold leading-5 text-[#156240]",
                !notice && "text-transparent",
              )}
            >
              {notice || "."}
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
