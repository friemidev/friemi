"use client";

import { useState } from "react";
import { leavePlanetAction } from "@/features/planets/actions/planetActions";

type PlanetLeaveButtonProps = {
  locale: string;
  planetId: string;
  planetSlug: string;
};

export function PlanetLeaveButton({ locale, planetId, planetSlug }: PlanetLeaveButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const copy = locale === "fr"
    ? { leave: "Quitter", title: "Quitter cette planete ?", body: "Vous devrez la rejoindre a nouveau pour participer.", cancel: "Annuler", confirm: "Confirmer" }
    : locale === "en"
      ? { leave: "Leave", title: "Leave this planet?", body: "You will need to join again to participate.", cancel: "Cancel", confirm: "Leave planet" }
      : { leave: "退出星球", title: "确定退出这个星球？", body: "退出后将无法参与群聊和发布动态，需要重新加入才能参与。", cancel: "暂不退出", confirm: "确认退出" };

  return (
    <>
      <button className="rounded-full border border-[#e7b4ae] bg-[#fff9f8] px-3 py-1.5 text-xs font-bold text-[#b4473c] transition hover:bg-[#fff0ee]" onClick={() => setIsConfirming(true)} type="button">
        {copy.leave}
      </button>
      {isConfirming ? (
        <div className="fixed inset-0 z-50 flex items-end bg-[#37110d]/35 p-4 sm:items-center sm:justify-center" role="presentation">
          <section aria-modal="true" className="w-full max-w-sm rounded-3xl border border-[#efc2bc] bg-[#fffaf9] p-5 shadow-2xl" role="dialog">
            <p className="text-base font-black text-[#9f342a]">{copy.title}</p>
            <p className="mt-2 text-sm leading-6 text-[#805c57]">{copy.body}</p>
            <div className="mt-5 flex gap-3">
              <button className="flex-1 rounded-xl border border-[#dfd4d0] bg-white py-2.5 text-sm font-bold text-[#665b58]" onClick={() => setIsConfirming(false)} type="button">{copy.cancel}</button>
              <form action={leavePlanetAction} className="flex-1">
                <input name="locale" type="hidden" value={locale} />
                <input name="planetId" type="hidden" value={planetId} />
                <input name="planetSlug" type="hidden" value={planetSlug} />
                <button className="w-full rounded-xl bg-[#ba4439] py-2.5 text-sm font-black text-white hover:bg-[#a73a30]" type="submit">{copy.confirm}</button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
