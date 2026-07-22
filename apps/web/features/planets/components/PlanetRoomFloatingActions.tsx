"use client";

import { useState } from "react";
import { Check, ShieldCheck, UserRoundPlus, X } from "lucide-react";
import { ActivityCopyButton } from "@/features/activities/components/ActivityCopyButton";
import { reviewPlanetMemberAction } from "@/features/planets/actions/planetActions";

type PendingMember = {
  avatarUrl: string | null;
  joinedAtLabel: string;
  nickname: string;
  profileId: string;
};

type PlanetRoomFloatingActionsProps = {
  inviteUrl: string;
  locale: string;
  pendingMembers: PendingMember[];
  planetId: string;
  planetSlug: string;
  viewerRole: "OWNER" | "ADMIN";
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      copyFailed: "Copie impossible. Selectionnez le lien manuellement.",
      copyInvite: "Copier le lien d'invitation",
      copied: "Lien copie",
      empty: "Aucune nouvelle demande.",
      reviewTitle: "Demandes en attente",
      reviewHint: "Validez ou refusez en un geste.",
      close: "Fermer",
      approve: "Approuver",
      reject: "Refuser",
      manage: "Gerer",
      manageTitle: "Actions du createur",
      pendingCount: "Demandes",
    };
  }

  if (locale === "en") {
    return {
      copyFailed: "Copy failed. Select the link manually.",
      copyInvite: "Copy invite link",
      copied: "Invite link copied",
      empty: "No pending requests.",
      reviewTitle: "Pending requests",
      reviewHint: "Approve or reject in one tap.",
      close: "Close",
      approve: "Approve",
      reject: "Reject",
      manage: "Manage",
      manageTitle: "Creator actions",
      pendingCount: "Requests",
    };
  }

  return {
    copyFailed: "\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u590d\u5236\u94fe\u63a5\u3002",
    copyInvite: "\u590d\u5236\u9080\u8bf7\u94fe\u63a5",
    copied: "\u9080\u8bf7\u94fe\u63a5\u5df2\u590d\u5236",
    empty: "\u6682\u65f6\u6ca1\u6709\u65b0\u7684\u7533\u8bf7\u3002",
    reviewTitle: "\u5f85\u5ba1\u6838\u7533\u8bf7",
    reviewHint: "\u70b9\u4e00\u4e0b\u5c31\u80fd\u901a\u8fc7\u6216\u62d2\u7edd\u3002",
    close: "\u5173\u95ed",
    approve: "\u901a\u8fc7",
    reject: "\u62d2\u7edd",
    manage: "\u7ba1\u7406",
    manageTitle: "\u661f\u7403\u64cd\u4f5c",
    pendingCount: "\u7533\u8bf7",
  };
}

function Avatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  if (avatarUrl) {
    return <img alt="" className="h-10 w-10 rounded-full object-cover" src={avatarUrl} />;
  }

  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9ead8] text-xs font-black text-[#246044]">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function PlanetRoomFloatingActions({
  inviteUrl,
  locale,
  pendingMembers,
  planetId,
  planetSlug,
  viewerRole,
}: PlanetRoomFloatingActionsProps) {
  const copy = getCopy(locale);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  function openReview() {
    setMenuOpen(false);
    setReviewOpen(true);
  }

  return (
    <>
      <div className="pointer-events-none fixed right-[max(1rem,calc((100vw-28rem)/2+1rem))] top-[calc(env(safe-area-inset-top)+5.25rem)] z-[60] md:top-24">
        {menuOpen ? (
          <button
            type="button"
            aria-label={copy.close}
            className="fixed inset-0 pointer-events-auto bg-transparent"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}

        <div className="pointer-events-auto relative flex flex-col items-end gap-2">
          {menuOpen ? (
            <div className="w-44 rounded-[1.2rem] border border-[#d6d5b2] bg-white/96 p-2 shadow-[0_18px_38px_rgba(29,29,27,0.14)] backdrop-blur-md">
              {viewerRole === "OWNER" ? (
                <div className="flex items-center justify-between rounded-[0.95rem] px-2 py-1.5 text-[#276949] hover:bg-[#f6f8f2]">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf3ea]">
                      <UserRoundPlus className="h-4 w-4" />
                    </span>
                    <span>{copy.copyInvite}</span>
                  </div>
                  <ActivityCopyButton
                    className="h-8 w-8 rounded-full bg-[#fef8ef] text-[#276949] ring-1 ring-[#d6d5b2] hover:bg-white hover:text-[#1d5a3f]"
                    failedLabel={copy.copyFailed}
                    label={copy.copyInvite}
                    successLabel={copy.copied}
                    value={inviteUrl}
                  />
                </div>
              ) : null}

              <button
                type="button"
                onClick={openReview}
                className="flex w-full items-center justify-between rounded-[0.95rem] px-2 py-1.5 text-left text-[#7a5623] transition hover:bg-[#fff8ef]"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff2d8] text-[#9a6a21]">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <span>{copy.reviewTitle}</span>
                </span>
                <span className="rounded-full bg-[#f3e4c5] px-2 py-1 text-[11px] font-black leading-none text-[#8d641f]">
                  {pendingMembers.length}
                </span>
              </button>
            </div>
          ) : null}

          {!menuOpen ? (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#d6d5b2] bg-white/96 px-3 py-2 text-[#6f5c34] shadow-[0_18px_38px_rgba(29,29,27,0.14)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white"
              aria-label={copy.manageTitle}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff4df] text-[#9a6a21]">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold">{copy.manage}</span>
              {pendingMembers.length ? (
                <span className="rounded-full bg-[#f3e4c5] px-2 py-1 text-[11px] font-black leading-none text-[#8d641f]">
                  {pendingMembers.length}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      </div>

      {reviewOpen ? (
        <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
          <button
            type="button"
            aria-label={copy.close}
            className="absolute inset-0 bg-black/32 backdrop-blur-sm"
            onClick={() => setReviewOpen(false)}
          />
          <section className="absolute inset-x-3 bottom-0 rounded-t-[1.75rem] border border-[#e7decd] bg-[#fffaf3] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 shadow-[0_-22px_50px_rgba(29,29,27,0.18)] sm:left-1/2 sm:bottom-6 sm:max-w-md sm:-translate-x-1/2 sm:rounded-[1.75rem]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#ddd1bf] sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#7a5623]">{copy.reviewTitle}</p>
                <p className="mt-1 text-xs text-[#8b8578]">{copy.reviewHint}</p>
              </div>
              <button
                type="button"
                aria-label={copy.close}
                onClick={() => setReviewOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#8b8578] ring-1 ring-[#e7decd] transition hover:bg-[#fffdf8] hover:text-[#5d5548]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {pendingMembers.length ? (
              <div className="mt-4 space-y-3">
                {pendingMembers.map((member) => (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eee2cf] bg-white/88 px-3 py-3 shadow-sm" key={member.profileId}>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar avatarUrl={member.avatarUrl} name={member.nickname} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#2c312b]">{member.nickname}</p>
                        <p className="text-[11px] text-[#8b8578]">{member.joinedAtLabel}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <form action={reviewPlanetMemberAction}>
                        <input name="locale" type="hidden" value={locale} />
                        <input name="planetId" type="hidden" value={planetId} />
                        <input name="planetSlug" type="hidden" value={planetSlug} />
                        <input name="memberProfileId" type="hidden" value={member.profileId} />
                        <input name="decision" type="hidden" value="approve" />
                        <button
                          type="submit"
                          aria-label={copy.approve}
                          title={copy.approve}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#246c4b] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1f5d41]"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </form>
                      <form action={reviewPlanetMemberAction}>
                        <input name="locale" type="hidden" value={locale} />
                        <input name="planetId" type="hidden" value={planetId} />
                        <input name="planetSlug" type="hidden" value={planetSlug} />
                        <input name="memberProfileId" type="hidden" value={member.profileId} />
                        <input name="decision" type="hidden" value="reject" />
                        <button
                          type="submit"
                          aria-label={copy.reject}
                          title={copy.reject}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e6c0bc] bg-[#fff8f7] text-[#b4473c] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff0ee]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[#e5d7c4] bg-white/68 px-4 py-5 text-center text-sm text-[#8b8578]">
                {copy.empty}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
