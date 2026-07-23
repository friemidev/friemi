"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type HeaderCity = "Paris" | "Beijing" | "Shanghai";

const cityStorageKey = "friemi:selected-city";

const cityOptions: HeaderCity[] = ["Paris", "Beijing", "Shanghai"];

const cityLabels: Record<string, Record<HeaderCity, string>> = {
  "zh-CN": {
    Paris: "巴黎",
    Beijing: "北京",
    Shanghai: "上海",
  },
  en: {
    Paris: "Paris",
    Beijing: "Beijing",
    Shanghai: "Shanghai",
  },
  fr: {
    Paris: "Paris",
    Beijing: "Pekin",
    Shanghai: "Shanghai",
  },
};

function isHeaderCity(value: string | null): value is HeaderCity {
  return Boolean(value && cityOptions.includes(value as HeaderCity));
}

function getCityLabel(locale: string, city: HeaderCity) {
  return (cityLabels[locale] ?? cityLabels.en)[city];
}

export function AppHeaderCitySwitcher({ locale }: { locale: string }) {
  const pathname = usePathname();
  const [selectedCity, setSelectedCity] = useState<HeaderCity>("Paris");
  const notificationsHref = withLocale(locale, "/notifications");
  const hiddenOnCurrentRoute = pathname === notificationsHref;

  useEffect(() => {
    const storedCity = window.localStorage.getItem(cityStorageKey);

    if (isHeaderCity(storedCity)) {
      setSelectedCity(storedCity);
    }
  }, []);

  function selectCity(city: HeaderCity) {
    setSelectedCity(city);
    window.localStorage.setItem(cityStorageKey, city);
  }

  const selectedLabel = getCityLabel(locale, selectedCity);

  if (hiddenOnCurrentRoute) {
    return null;
  }

  return (
    <details className="group relative justify-self-end lg:justify-self-auto">
      <summary
        className="inline-flex h-9 cursor-pointer list-none items-center justify-center gap-1.5 rounded-full bg-white/85 px-3 text-xs font-extrabold text-[#156240] shadow-sm ring-1 ring-black/10 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/35 [&::-webkit-details-marker]:hidden"
        aria-label={selectedLabel}
        title={selectedLabel}
      >
        <MapPin
          aria-hidden="true"
          className="h-3.5 w-3.5 fill-[#F56D62] text-[#F56D62]"
        />
        <span>{selectedLabel}</span>
        <ChevronDown className="h-3 w-3 text-[#156240]/75 transition group-open:rotate-180" />
      </summary>

      <div className="absolute right-0 top-11 z-[70] grid min-w-[8.5rem] gap-1 rounded-[1rem] border border-[#D7D5C8] bg-white p-1.5 shadow-[0_18px_36px_rgba(17,18,16,0.12)]">
        {cityOptions.map((city) => {
          const active = city === selectedCity;

          return (
            <button
              key={city}
              className={cn(
                "flex items-center justify-between gap-3 rounded-[0.75rem] px-3 py-2 text-left text-[13px] font-extrabold transition",
                active
                  ? "bg-[#E8F4EC] text-[#156240]"
                  : "text-[#123D31] hover:bg-[#F5F4EC]",
              )}
              onClick={() => selectCity(city)}
              type="button"
            >
              <span>{getCityLabel(locale, city)}</span>
              {active ? <Check className="h-3.5 w-3.5" /> : null}
            </button>
          );
        })}
      </div>
    </details>
  );
}
