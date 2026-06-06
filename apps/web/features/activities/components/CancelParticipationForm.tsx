"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button } from "@chill-club/ui";
import { getCopy } from "@/lib/copy";
import {
  cancelParticipationAction,
  type CancelParticipationState,
} from "../actions/cancelParticipation";

type CancelParticipationFormProps = {
  activityId: string;
  locale: string;
};

const initialState: CancelParticipationState = {};

function CancelButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).join;

  return (
    <Button
      type="submit"
      variant="secondary"
      className="w-full gap-2"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      <span className="truncate">{pending ? t.cancelPending : t.cancel}</span>
    </Button>
  );
}

function PendingCancelNotice({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).join;

  if (!pending) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
      aria-live="polite"
    >
      <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      <span>{t.cancelPending}</span>
    </div>
  );
}

export function CancelParticipationForm({
  activityId,
  locale,
}: CancelParticipationFormProps) {
  const [state, formAction] = useActionState(
    cancelParticipationAction,
    initialState,
  );
  const t = getCopy(locale).join;

  return (
    <form
      action={formAction}
      className="grid gap-3"
      noValidate
      onSubmit={(event) => {
        if (!window.confirm(t.cancelConfirm)) {
          event.preventDefault();
        }
      }}
    >
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />

      {state.formError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      ) : null}

      <PendingCancelNotice locale={locale} />
      <CancelButton locale={locale} />
    </form>
  );
}
