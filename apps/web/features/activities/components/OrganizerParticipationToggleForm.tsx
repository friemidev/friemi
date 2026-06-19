"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { LoaderCircle, UserCheck2, UserMinus2 } from "lucide-react";
import { Button } from "@chill-club/ui";
import {
  toggleOrganizerParticipationAction,
  type ToggleOrganizerParticipationState,
} from "../actions/toggleOrganizerParticipation";

type OrganizerParticipationToggleFormProps = {
  activityId: string;
  isClosed: boolean;
  isParticipatingByDefault: boolean;
  locale: string;
};

const initialState: ToggleOrganizerParticipationState = {};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      closed: "Cette activite est terminee ou annulee. Votre statut ne peut plus etre change.",
      participatingDescription:
        "Vous comptez actuellement dans le total des participants.",
      participatingTitle: "Vous participez",
      submitParticipating: "Je participe",
      submitSkipping: "Je ne participe pas",
      submittingParticipating: "Mise a jour...",
      submittingSkipping: "Mise a jour...",
      skippedDescription:
        "Vous n'etes pas compte dans le total des participants pour l'instant.",
      skippedTitle: "Vous ne participez pas",
      title: "Votre place",
    };
  }

  if (locale === "en") {
    return {
      closed:
        "This activity is ended or cancelled. Your organizer participation can no longer change.",
      participatingDescription:
        "You currently count toward the participant total.",
      participatingTitle: "You're participating",
      submitParticipating: "I'm participating",
      submitSkipping: "I'm not participating",
      submittingParticipating: "Updating...",
      submittingSkipping: "Updating...",
      skippedDescription:
        "You are not counted in the participant total right now.",
      skippedTitle: "You're not participating",
      title: "Your seat",
    };
  }

  return {
    closed: "活动已结束或已取消，当前不能再修改你的发起人参与状态。",
    participatingDescription: "你当前会计入参与人数。",
    participatingTitle: "你正在参加",
    submitParticipating: "我参加",
    submitSkipping: "我不参加",
    submittingParticipating: "更新中...",
    submittingSkipping: "更新中...",
    skippedDescription: "你当前不会计入参与人数。",
    skippedTitle: "你不参加",
    title: "我的名额",
  };
}

function SubmitButton({
  isParticipating,
  locale,
}: {
  isParticipating: boolean;
  locale: string;
}) {
  const { pending } = useFormStatus();
  const copy = getCopy(locale);
  const Icon = isParticipating ? UserMinus2 : UserCheck2;

  return (
    <Button
      type="submit"
      className="h-10 w-full gap-2 rounded-full border border-[#d9c6ad] bg-white text-[#6f5434] shadow-none hover:bg-[#fff8ed]"
      disabled={pending}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="h-4 w-4" aria-hidden="true" />
      )}
      {pending
        ? isParticipating
          ? copy.submittingSkipping
          : copy.submittingParticipating
        : isParticipating
          ? copy.submitSkipping
          : copy.submitParticipating}
    </Button>
  );
}

export function OrganizerParticipationToggleForm({
  activityId,
  isClosed,
  isParticipatingByDefault,
  locale,
}: OrganizerParticipationToggleFormProps) {
  const [state, formAction] = useActionState(
    toggleOrganizerParticipationAction,
    initialState,
  );
  const [isParticipating, setIsParticipating] = useState(
    isParticipatingByDefault,
  );
  const [, startTransition] = useTransition();
  const router = useRouter();
  const copy = getCopy(locale);

  useEffect(() => {
    setIsParticipating(isParticipatingByDefault);
  }, [isParticipatingByDefault]);

  useEffect(() => {
    if (!state.success || state.isParticipating === undefined) {
      return;
    }

    setIsParticipating(state.isParticipating);
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition, state.isParticipating, state.success]);

  if (isClosed) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm">
        <p className="font-medium text-ink">{copy.title}</p>
        <p className="mt-1 leading-6 text-zinc-500">{copy.closed}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-2 rounded-2xl border border-[#e5d7bf] bg-white/80 p-3">
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />
      <input
        name="nextState"
        type="hidden"
        value={isParticipating ? "not_participating" : "participating"}
      />
      <p className="text-sm font-semibold text-ink">{copy.title}</p>
      <div className="rounded-xl border border-[#eadcca] bg-[#fffaf2] px-3 py-3 text-sm">
        <p className="font-medium text-ink">
          {isParticipating ? copy.participatingTitle : copy.skippedTitle}
        </p>
        <p className="mt-1 leading-6 text-zinc-600">
          {isParticipating
            ? copy.participatingDescription
            : copy.skippedDescription}
        </p>
      </div>
      {state.formError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      ) : null}
      <SubmitButton isParticipating={isParticipating} locale={locale} />
    </form>
  );
}
