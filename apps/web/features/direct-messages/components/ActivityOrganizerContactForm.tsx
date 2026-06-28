"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, MessageCircle } from "lucide-react";
import { Button } from "@chill-club/ui";
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
  locale: string;
  organizerNickname: string;
  organizerProfileId: string;
};

const initialState: OpenActivityOrganizerConversationState = {};

function ContactSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="secondary"
      className="h-10 w-full gap-2 rounded-full border border-[#8AB68E] bg-[#FEFFF9] text-[#156240] shadow-none hover:bg-white sm:h-11"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[#B5301F]" />
      ) : (
        <MessageCircle className="h-4 w-4 shrink-0 text-[#B5301F]" />
      )}
      {label}
    </Button>
  );
}

export function ActivityOrganizerContactForm({
  accessToken,
  activityId,
  hint,
  isAuthenticated,
  label,
  locale,
  organizerNickname,
  organizerProfileId,
}: ActivityOrganizerContactFormProps) {
  const [state, formAction] = useActionState(
    openActivityOrganizerConversationFormAction,
    initialState,
  );
  const redirectPath = `/activities/${activityId}`;

  if (!isAuthenticated) {
    return (
      <div className="grid gap-2">
        <Link href={getSignInHref(locale, redirectPath)}>
          <Button
            type="button"
            variant="secondary"
            className="h-10 w-full gap-2 rounded-full border border-[#8AB68E] bg-[#FEFFF9] text-[#156240] shadow-none hover:bg-white sm:h-11"
            aria-label={`${label}: ${organizerNickname}`}
          >
            <MessageCircle className="h-4 w-4 shrink-0 text-[#B5301F]" />
            {label}
          </Button>
        </Link>
        <p className="hidden px-1 text-xs leading-5 text-zinc-500 sm:block">
          {hint}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="activityId" value={activityId} />
      <input
        type="hidden"
        name="organizerProfileId"
        value={organizerProfileId}
      />
      <input type="hidden" name="accessToken" value={accessToken ?? ""} />
      <ContactSubmitButton label={label} />
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
