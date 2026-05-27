"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@chill-club/ui";
import { getCopy } from "@/lib/copy";
import {
  cancelActivityAction,
  type CancelActivityState,
} from "../actions/cancelActivity";

type CancelActivityFormProps = {
  activityId: string;
  disabled?: boolean;
  locale: string;
};

const initialState: CancelActivityState = {};

function CancelActivityButton({
  disabled,
  locale,
}: {
  disabled?: boolean;
  locale: string;
}) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).activityOwner;

  return (
    <Button
      type="submit"
      variant="secondary"
      className="w-full text-red-700 hover:bg-red-50"
      disabled={disabled || pending}
      onClick={(event) => {
        if (!window.confirm(t.cancelConfirm)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? t.cancelling : t.cancel}
    </Button>
  );
}

export function CancelActivityForm({
  activityId,
  disabled,
  locale,
}: CancelActivityFormProps) {
  const [state, formAction] = useActionState(
    cancelActivityAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-2" noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />

      {state.formError ? (
        <div
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {state.formError}
        </div>
      ) : null}

      <CancelActivityButton disabled={disabled} locale={locale} />
    </form>
  );
}
