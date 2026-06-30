"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  LoaderCircle,
  MessageCircle,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { ActivityContactableParticipantViewModel } from "@/features/activities/types";
import { cn } from "@/lib/utils";
import { openActivityParticipantConversationAction } from "../actions/directMessageActions";

type ActivityParticipantContactDialogProps = {
  activityId: string;
  buttonClassName?: string;
  buttonLabel: string;
  locale: string;
  participants: ActivityContactableParticipantViewModel[];
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      title: "Contacter un participant",
      description:
        "Choisissez une personne inscrite pour ouvrir une discussion.",
      emptyTitle: "Aucun participant joignable",
      emptyDescription:
        "Les inscriptions invitées et les profils indisponibles ne peuvent pas recevoir de message privé.",
      close: "Fermer",
      openChat: (name: string) => `Discuter avec ${name}`,
    };
  }

  if (locale === "en") {
    return {
      title: "Contact a participant",
      description: "Choose a signed-up participant to open a private chat.",
      emptyTitle: "No contactable participants",
      emptyDescription:
        "Guest signups and unavailable profiles cannot receive direct messages.",
      close: "Close",
      openChat: (name: string) => `Chat with ${name}`,
    };
  }

  return {
    title: "联系参与者",
    description: "选择一位真实报名用户，直接进入一对一私聊。",
    emptyTitle: "暂无可联系参与者",
    emptyDescription: "游客报名和不可用账号不会出现在私聊名单中。",
    close: "关闭",
    openChat: (name: string) => `和 ${name} 私聊`,
  };
}

function getInitial(nickname: string) {
  return nickname.trim().charAt(0).toUpperCase() || "N";
}

function ParticipantSubmitButton({
  ariaLabel,
  participant,
}: {
  ariaLabel: string;
  participant: ActivityContactableParticipantViewModel;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-sand bg-white px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#8AB68E] hover:bg-[#FEFFF9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/35 disabled:cursor-wait disabled:opacity-70"
      disabled={pending}
      aria-busy={pending}
      aria-label={ariaLabel}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#156240] text-sm font-semibold text-white ring-1 ring-[#8AB68E]">
        {participant.avatarUrl ? (
          // User avatars are stored as remote profile URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={participant.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          getInitial(participant.nickname)
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">
          {participant.nickname}
        </span>
      </span>
      {pending ? (
        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[#B5301F]" />
      ) : (
        <MessageCircle className="h-4 w-4 shrink-0 text-[#B5301F]" />
      )}
    </button>
  );
}

export function ActivityParticipantContactDialog({
  activityId,
  buttonClassName,
  buttonLabel,
  locale,
  participants,
}: ActivityParticipantContactDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = getCopy(locale);

  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-[#D6D5B2] bg-[#FFF5E6]/82 px-4 text-sm font-semibold text-[#156240] transition hover:-translate-y-0.5 hover:bg-white",
          buttonClassName,
        )}
        onClick={() => setIsOpen(true)}
      >
        <UsersRound className="h-4 w-4" />
        {buttonLabel}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
        >
          <div
            aria-modal="true"
            className="max-h-[calc(100svh-env(safe-area-inset-bottom)-2rem)] w-full overflow-y-auto rounded-[1.5rem] border border-[#D6D5B2] bg-[#FFF5E6] shadow-2xl sm:max-w-lg"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                  {buttonLabel}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-normal text-ink">
                  {t.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {t.description}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-zinc-600 shadow-sm ring-1 ring-black/10 transition hover:bg-zinc-50 hover:text-ink"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">{t.close}</span>
              </button>
            </div>

            <div className="grid gap-3 px-5 py-5">
              {participants.length > 0 ? (
                participants.map((participant) => (
                  <form
                    key={participant.id}
                    action={openActivityParticipantConversationAction}
                  >
                    <input name="locale" type="hidden" value={locale} />
                    <input name="activityId" type="hidden" value={activityId} />
                    <input
                      name="participantProfileId"
                      type="hidden"
                      value={participant.id}
                    />
                    <ParticipantSubmitButton
                      ariaLabel={t.openChat(participant.nickname)}
                      participant={participant}
                    />
                  </form>
                ))
              ) : (
                <div className="rounded-2xl border border-sand bg-white/82 px-4 py-6 text-center">
                  <UserRound className="mx-auto h-8 w-8 text-[#156240]" />
                  <p className="mt-3 text-sm font-semibold text-ink">
                    {t.emptyTitle}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {t.emptyDescription}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
