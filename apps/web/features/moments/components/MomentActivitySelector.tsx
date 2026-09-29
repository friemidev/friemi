"use client";

import { CalendarDays, Check, ChevronRight, MapPin, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { MomentLinkableActivityViewModel } from "@/features/moments/queries/getMomentFeed";
import { cn } from "@/lib/utils";

type MomentActivitySelectorCopy = {
  close: string;
  empty: string;
  label: string;
  noResults: string;
  pickerTitle: string;
  scopeHint: string;
  searchPlaceholder: string;
};

type MomentActivitySelectorProps = {
  activities: MomentLinkableActivityViewModel[];
  copy: MomentActivitySelectorCopy;
  locale: string;
  onChange: (activityId: string) => void;
  value: string;
};

function formatActivityMeta(
  activity: MomentLinkableActivityViewModel,
  locale: string,
) {
  const date = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(new Date(activity.startAt));

  return [activity.city, date].filter(Boolean).join(" · ");
}

export function MomentActivitySelector({
  activities,
  copy,
  locale,
  onChange,
  value,
}: MomentActivitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedActivity = activities.find((activity) => activity.id === value);
  const filteredActivities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    if (!normalizedQuery) return activities;

    return activities.filter((activity) =>
      `${activity.title} ${activity.city}`
        .toLocaleLowerCase(locale)
        .includes(normalizedQuery),
    );
  }, [activities, locale, query]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function selectActivity(activityId: string) {
    onChange(activityId);
    setQuery("");
    setIsOpen(false);
  }

  const picker = isOpen
    ? createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-[#111210]/38 px-3 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-[2px] sm:items-center sm:p-5"
          role="presentation"
        >
          <button
            aria-label={copy.close}
            className="absolute inset-0"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <section
            aria-modal="true"
            className="relative flex max-h-[78dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.5rem] border border-[#E3DCC5] bg-[#FEFFF9] shadow-[0_-24px_64px_rgba(29,29,27,0.2)] sm:rounded-[1.5rem]"
            role="dialog"
          >
            <header className="border-b border-[#E8E2D2] px-4 pb-3 pt-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D9D4BE] sm:hidden" />
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-[#111210]">
                    {copy.pickerTitle}
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-[#747A72]">
                    {copy.scopeHint}
                  </p>
                </div>
                <button
                  aria-label={copy.close}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E3DCC5] bg-white text-[#4F554F] transition active:scale-95"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <label className="mt-3 flex h-11 items-center gap-2 rounded-xl border border-[#D8DDCF] bg-white px-3 focus-within:border-[#369758] focus-within:ring-2 focus-within:ring-[#369758]/12">
                <Search className="h-4 w-4 shrink-0 text-[#758077]" />
                <input
                  autoFocus
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-[#1D1D1B] outline-none placeholder:text-[#9A9F98]"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  type="search"
                  value={query}
                />
              </label>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2">
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                  !value
                    ? "bg-[#EAF5EC] text-[#156240]"
                    : "text-[#4F554F] hover:bg-[#F5F5EE]",
                )}
                onClick={() => selectActivity("")}
                type="button"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#758077] shadow-[inset_0_0_0_1px_#E3DCC5]">
                  <X className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-bold">
                  {copy.empty}
                </span>
                {!value ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>

              {filteredActivities.length > 0 ? (
                <div className="mt-1 divide-y divide-[#ECE7D9]">
                  {filteredActivities.map((activity) => {
                    const isSelected = activity.id === value;

                    return (
                      <button
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-3 text-left transition",
                          isSelected
                            ? "bg-[#F1F8EE] text-[#156240]"
                            : "text-[#1D1D1B] hover:bg-[#F7F7F0]",
                        )}
                        key={activity.id}
                        onClick={() => selectActivity(activity.id)}
                        type="button"
                      >
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F2F6EA] text-[#2F8152]">
                          <CalendarDays className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">
                            {activity.title}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-[#747A72]">
                            {activity.city ? (
                              <MapPin className="h-3 w-3 shrink-0" />
                            ) : null}
                            <span className="truncate">
                              {formatActivityMeta(activity, locale)}
                            </span>
                          </span>
                        </span>
                        {isSelected ? (
                          <Check className="h-4 w-4 shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-10 text-center">
                  <Search className="mx-auto h-5 w-5 text-[#A2A89F]" />
                  <p className="mt-2 text-sm font-semibold text-[#747A72]">
                    {copy.noResults}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="mt-3">
      <input name="activityId" type="hidden" value={value} />
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[#156240]">
        <CalendarDays className="h-3.5 w-3.5" />
        {copy.label}
      </p>
      <button
        className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[#DCE1D2] bg-[#F8F9F3] px-3 py-2.5 text-left transition hover:border-[#A9C8AF] hover:bg-[#F3F8EE] active:scale-[0.995]"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#2F8152] shadow-[inset_0_0_0_1px_#E3DCC5]">
          <CalendarDays className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-[#1D1D1B]">
            {selectedActivity?.title ?? copy.empty}
          </span>
          {selectedActivity ? (
            <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#747A72]">
              {formatActivityMeta(selectedActivity, locale)}
            </span>
          ) : null}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#778078]" />
      </button>
      {picker}
    </div>
  );
}
