"use client";

import { LoaderCircle, Orbit, PencilLine, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  updateActivityPlanetLinksAction,
  type ActivityPlanetLinkState,
} from "../actions/updateActivityPlanetLinks";
import type { LinkablePlanetOption } from "../queries/getLinkablePlanets";
import { PlanetSelectionList } from "./PlanetSelectionList";

type ActivityPlanetLinkManagerProps = {
  activityId: string;
  linkedPlanetIds: string[];
  linkablePlanets: LinkablePlanetOption[];
  locale: string;
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      close: "Fermer",
      description:
        "Choisissez parmi les planètes publiques dont vous êtes créateur ou administrateur.",
      empty: "Vous ne gérez encore aucune planète publique.",
      manage: "Gérer les planètes",
      save: "Enregistrer",
      saving: "Enregistrement...",
      title: "Associer une planète",
    };
  }

  if (locale === "en") {
    return {
      close: "Close",
      description:
        "Choose from public planets where you are an owner or admin.",
      empty: "You do not manage a public planet yet.",
      manage: "Manage planets",
      save: "Save",
      saving: "Saving...",
      title: "Link a planet",
    };
  }

  return {
    close: "关闭",
    description: "选择你担任主理人或管理员的公开星球。",
    empty: "你目前还没有可关联的公开星球。",
    manage: "管理关联星球",
    save: "保存",
    saving: "保存中...",
    title: "关联星球",
  };
}

function SubmitButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const copy = getCopy(locale);

  return (
    <button
      className="inline-flex h-11 min-w-24 items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-bold text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-65"
      disabled={pending}
      type="submit"
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {pending ? copy.saving : copy.save}
    </button>
  );
}

export function ActivityPlanetLinkManager({
  activityId,
  linkedPlanetIds,
  linkablePlanets,
  locale,
}: ActivityPlanetLinkManagerProps) {
  const copy = getCopy(locale);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(linkedPlanetIds);
  const [state, formAction] = useActionState<ActivityPlanetLinkState, FormData>(
    updateActivityPlanetLinksAction,
    {},
  );

  useEffect(() => {
    if (!state.ok) return;
    setOpen(false);
    router.refresh();
  }, [router, state.ok, state.version]);

  useEffect(() => {
    if (!open) setSelectedIds(linkedPlanetIds);
  }, [linkedPlanetIds, open]);

  return (
    <>
      <button
        aria-label={copy.manage}
        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-[#BBD3C0] bg-white px-2.5 text-[11px] font-bold text-[#156240] transition hover:border-[#76A783] hover:bg-[#F3F8F2] active:scale-[0.97]"
        onClick={() => setOpen(true)}
        type="button"
      >
        <PencilLine className="h-3 w-3" aria-hidden="true" />
        {copy.manage}
      </button>

      {open ? (
        <div
          aria-label={copy.title}
          aria-modal="true"
          className="fixed inset-0 z-[90]"
          role="dialog"
        >
          <button
            aria-label={copy.close}
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            type="button"
          />
          <section className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] min-h-[68dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[42rem] sm:min-h-0 sm:w-[31rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-[#E9E5D8] px-5 py-4">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-base font-bold text-zinc-900">
                  <Orbit className="h-4 w-4 text-[#156240]" />
                  {copy.title}
                </h2>
                <p className="mt-1 text-xs font-medium leading-5 text-zinc-500">
                  {copy.description}
                </p>
              </div>
              <button
                aria-label={copy.close}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#DDD8C9] text-zinc-600"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <form action={formAction} className="flex min-h-0 flex-1 flex-col">
              <input name="activityId" type="hidden" value={activityId} />
              <input name="locale" type="hidden" value={locale} />
              {selectedIds.map((planetId) => (
                <input
                  key={planetId}
                  name="planetIds"
                  type="hidden"
                  value={planetId}
                />
              ))}
              <PlanetSelectionList
                locale={locale}
                onChange={setSelectedIds}
                options={linkablePlanets}
                selectedIds={selectedIds}
              />
              {state.error ? (
                <p
                  className="px-5 pb-2 text-sm font-semibold text-[#B5301F]"
                  role="alert"
                >
                  {state.error}
                </p>
              ) : null}
              <footer className="flex justify-end border-t border-[#E9E5D8] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:pb-4">
                <SubmitButton locale={locale} />
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
