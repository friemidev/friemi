"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
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
      className="w-full"
      disabled={pending}
    >
      {pending ? t.cancelPending : t.cancel}
    </Button>
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

      <CancelButton locale={locale} />
    </form>
  );
}
