"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, MessageCircle } from "lucide-react";
import { Button } from "@chill-club/ui";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { getSignInHref } from "@/lib/auth-redirect";
import {
  openActivityOrganizerConversationFormAction,
  type OpenActivityOrganizerConversationState,
} from "../actions/directMessageActions";

type ActivityOrganizerContactFormProps = {
  accessToken?: string | null;
  activityId: string;
  hint: string;
  isAuthenticated: boolean;
  label: string;
  shortLabel?: string;
  locale: string;
  organizerNickname: string;
  organizerProfileId: string;
};

const initialState: OpenActivityOrganizerConversationState = {};

function ContactSubmitButton({
  label,
  shortLabel,
}: {
  label: string;
  shortLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="secondary"
      className="h-10 w-full gap-2 rounded-full border border-[#8AB68E] bg-[#FEFFF9] text-[#156240] shadow-none hover:bg-white sm:h-11"
      disabled={pending}
      aria-busy={pending}
      aria-label={label}
      title={label}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[#B5301F]" />
      ) : (
        <MessageCircle className="h-4 w-4 shrink-0 text-[#B5301F]" />
      )}
      <span className="min-w-0 truncate">{shortLabel}</span>
    </Button>
  );
}

export function ActivityOrganizerContactForm({
  accessToken,
  activityId,
  hint,
  isAuthenticated,
  label,
  shortLabel = label,
  locale,
  organizerNickname,
  organizerProfileId,
}: ActivityOrganizerContactFormProps) {
  const [state, formAction] = useActionState(
    openActivityOrganizerConversationFormAction,
    initialState,
  );
  const redirectPath = getActivityDetailPath(activityId);

  if (!isAuthenticated) {
    return (
      <div className="grid min-w-0 gap-2">
        <Link
          href={getSignInHref(locale, redirectPath)}
          className="friemi-pressable inline-flex min-h-11 min-w-0 w-full max-w-full items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[#8AB68E] bg-[#FEFFF9] px-4 text-sm font-semibold text-[#156240] shadow-none hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/45 focus-visible:ring-offset-2"
          aria-label={`${label}: ${organizerNickname}`}
          title={`${label}: ${organizerNickname}`}
        >
          <MessageCircle className="h-4 w-4 shrink-0 text-[#B5301F]" />
          <span className="min-w-0 truncate">{shortLabel}</span>
        </Link>
        <p className="hidden px-1 text-xs leading-5 text-zinc-500 sm:block">
          {hint}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid min-w-0 gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="activityId" value={activityId} />
      <input
        type="hidden"
        name="organizerProfileId"
        value={organizerProfileId}
      />
      <input type="hidden" name="accessToken" value={accessToken ?? ""} />
      <ContactSubmitButton label={label} shortLabel={shortLabel} />
      <p className="hidden px-1 text-xs leading-5 text-zinc-500 sm:block">
        {hint}
      </p>
      {state.formError ? (
        <p className="px-1 text-xs font-semibold leading-5 text-danger">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}
