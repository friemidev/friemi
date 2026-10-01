"use client";

import { ChevronRight, Orbit, X } from "lucide-react";
import { useState } from "react";
import type { LinkablePlanetOption } from "../queries/getLinkablePlanets";
import { PlanetSelectionList } from "./PlanetSelectionList";

type ActivityPlanetPickerFieldProps = {
  locale: string;
  onChange: (planetIds: string[]) => void;
  options: LinkablePlanetOption[];
  selectedIds: string[];
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      cancel: "Annuler",
      confirm: "Confirmer",
      description: "Rechercher et filtrer par catégorie",
      empty: "Choisir une planète",
      selected: (count: number) => `${count} planète${count > 1 ? "s" : ""}`,
      title: "Planète associée (facultatif)",
    };
  }

  if (locale === "en") {
    return {
      cancel: "Cancel",
      confirm: "Done",
      description: "Search and filter by category",
      empty: "Choose planets",
      selected: (count: number) => `${count} planet${count === 1 ? "" : "s"}`,
      title: "Linked planet (optional)",
    };
  }

  return {
    cancel: "取消",
    confirm: "完成",
    description: "可搜索并按分类筛选",
    empty: "点击选择星球",
    selected: (count: number) => `已选择 ${count} 个星球`,
    title: "关联星球（可选）",
  };
}

export function ActivityPlanetPickerField({
  locale,
  onChange,
  options,
  selectedIds,
}: ActivityPlanetPickerFieldProps) {
  const copy = getCopy(locale);
  const [open, setOpen] = useState(false);
  const [draftIds, setDraftIds] = useState(selectedIds);
  const selectedPlanets = options.filter((planet) =>
    selectedIds.includes(planet.id),
  );

  function openDialog() {
    setDraftIds(selectedIds);
    setOpen(true);
  }

  function confirmSelection() {
    onChange(draftIds);
    setOpen(false);
  }

  return (
    <div className="min-w-0" data-field-name="planetIds">
      {selectedIds.map((planetId) => (
        <input key={planetId} name="planetIds" type="hidden" value={planetId} />
      ))}
      <button
        aria-haspopup="dialog"
        className="flex min-h-16 w-full min-w-0 items-center gap-3 rounded-2xl border border-[#D8D2C2] bg-white/85 px-4 py-3 text-left transition hover:border-[#8AB68E] hover:bg-white active:scale-[0.99]"
        onClick={openDialog}
        type="button"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF4EC] text-[#156240]">
          <Orbit className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-zinc-800 sm:text-base">
            {copy.title}
          </span>
          <span className="mt-0.5 block truncate text-xs font-medium text-zinc-500">
            {selectedPlanets.length > 0
              ? selectedPlanets.map((planet) => planet.name).join("、")
              : copy.empty}
          </span>
        </span>
        {selectedPlanets.length > 0 ? (
          <span className="shrink-0 rounded-full bg-[#EAF4EC] px-2.5 py-1 text-[11px] font-bold text-[#156240]">
            {copy.selected(selectedPlanets.length)}
          </span>
        ) : null}
        <ChevronRight
          className="h-4 w-4 shrink-0 text-zinc-400"
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          aria-label={copy.title}
          aria-modal="true"
          className="fixed inset-0 z-[95]"
          role="dialog"
        >
          <button
            aria-label={copy.cancel}
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            type="button"
          />
          <section className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] min-h-[68dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[42rem] sm:min-h-0 sm:w-[31rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E9E5D8] px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-zinc-900">
                  {copy.title}
                </h2>
                <p className="mt-1 text-xs font-medium text-zinc-500">
                  {copy.description}
                </p>
              </div>
              <button
                aria-label={copy.cancel}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#DDD8C9] text-zinc-600"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <PlanetSelectionList
              locale={locale}
              onChange={setDraftIds}
              options={options}
              selectedIds={draftIds}
            />

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#E9E5D8] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:pb-4">
              <button
                className="h-11 rounded-full px-4 text-sm font-bold text-zinc-600"
                onClick={() => setOpen(false)}
                type="button"
              >
                {copy.cancel}
              </button>
              <button
                className="h-11 min-w-24 rounded-full bg-[#156240] px-5 text-sm font-bold text-white active:scale-[0.98]"
                onClick={confirmSelection}
                type="button"
              >
                {copy.confirm}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
