"use client";

import { Check, Orbit, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  getPlanetCategoryLabel,
  planetCategoryValues,
  resolvePlanetCategory,
  type PlanetCategory,
} from "@/features/planets/utils/planetCategories";
import { cn } from "@/lib/utils";
import type { LinkablePlanetOption } from "../queries/getLinkablePlanets";

type PlanetSelectionListProps = {
  locale: string;
  onChange: (planetIds: string[]) => void;
  options: LinkablePlanetOption[];
  selectedIds: string[];
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      all: "Toutes",
      empty: "Aucune planète ne correspond à cette recherche.",
      search: "Rechercher une planète",
      selected: (count: number) =>
        `${count} sélectionnée${count > 1 ? "s" : ""}`,
    };
  }

  if (locale === "en") {
    return {
      all: "All",
      empty: "No planets match this search.",
      search: "Search planets",
      selected: (count: number) => `${count} selected`,
    };
  }

  return {
    all: "全部",
    empty: "没有符合条件的星球。",
    search: "搜索星球",
    selected: (count: number) => `已选 ${count} 个`,
  };
}

export function PlanetSelectionList({
  locale,
  onChange,
  options,
  selectedIds,
}: PlanetSelectionListProps) {
  const copy = getCopy(locale);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlanetCategory | "ALL">("ALL");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredOptions = useMemo(
    () =>
      options.filter((planet) => {
        const matchesCategory =
          category === "ALL" ||
          planet.tags.some((tag) => resolvePlanetCategory(tag) === category);
        const matchesQuery =
          !normalizedQuery ||
          planet.name.toLocaleLowerCase().includes(normalizedQuery) ||
          planet.tags.some((tag) => {
            const resolvedCategory = resolvePlanetCategory(tag);
            const searchableLabel = resolvedCategory
              ? getPlanetCategoryLabel(resolvedCategory, locale)
              : tag;
            return searchableLabel
              .toLocaleLowerCase()
              .includes(normalizedQuery);
          });
        return matchesCategory && matchesQuery;
      }),
    [category, locale, normalizedQuery, options],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-3 border-b border-[#ECE7DA] px-4 py-3 sm:px-5">
        <label className="flex h-10 items-center gap-2 rounded-xl border border-[#D9D5C8] bg-[#F8F8F4] px-3 text-zinc-500 focus-within:border-[#76A783] focus-within:bg-white">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <input
            aria-label={copy.search}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-zinc-800 outline-none placeholder:text-zinc-400"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            type="search"
            value={query}
          />
          {selectedIds.length > 0 ? (
            <span className="shrink-0 text-[11px] font-bold text-[#156240]">
              {copy.selected(selectedIds.length)}
            </span>
          ) : null}
        </label>

        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            className={cn(
              "h-8 shrink-0 rounded-full border px-3 text-xs font-bold transition",
              category === "ALL"
                ? "border-[#156240] bg-[#156240] text-white"
                : "border-[#D9D5C8] bg-white text-zinc-600",
            )}
            onClick={() => setCategory("ALL")}
            type="button"
          >
            {copy.all}
          </button>
          {planetCategoryValues.map((value) => (
            <button
              className={cn(
                "h-8 shrink-0 rounded-full border px-3 text-xs font-bold transition",
                category === value
                  ? "border-[#156240] bg-[#156240] text-white"
                  : "border-[#D9D5C8] bg-white text-zinc-600",
              )}
              key={value}
              onClick={() => setCategory(value)}
              type="button"
            >
              {getPlanetCategoryLabel(value, locale)}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-5">
        {filteredOptions.length > 0 ? (
          <div className="divide-y divide-[#ECE8DC]">
            {filteredOptions.map((planet) => {
              const selected = selectedIds.includes(planet.id);
              return (
                <label
                  className="flex min-h-16 cursor-pointer items-center gap-3 py-2.5"
                  key={planet.id}
                >
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#EAF4EC] text-[#156240]">
                    {planet.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={planet.coverImageUrl}
                      />
                    ) : (
                      <Orbit className="h-4 w-4" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-zinc-800">
                      {planet.name}
                    </span>
                    {planet.tags.length > 0 ? (
                      <span className="mt-1 flex min-w-0 flex-wrap gap-1">
                        {planet.tags.map((tag) => (
                          <span
                            className="rounded-full bg-[#EEF5EF] px-2 py-0.5 text-[10px] font-bold text-[#47715A]"
                            key={tag}
                          >
                            {getPlanetCategoryLabel(
                              resolvePlanetCategory(tag) ?? tag,
                              locale,
                            )}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                  <input
                    checked={selected}
                    className="sr-only"
                    onChange={() =>
                      onChange(
                        selected
                          ? selectedIds.filter((id) => id !== planet.id)
                          : [...selectedIds, planet.id],
                      )
                    }
                    type="checkbox"
                  />
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
                      selected
                        ? "border-[#156240] bg-[#156240] text-white"
                        : "border-[#BFC5BA] bg-white text-transparent",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="px-4 py-10 text-center text-sm font-medium text-zinc-500">
            {copy.empty}
          </p>
        )}
      </div>
    </div>
  );
}
