"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@chill-club/ui";
import {
  cancelParticipationAction,
  type CancelParticipationState,
} from "../actions/cancelParticipation";

type CancelParticipationFormProps = {
  activityId: string;
  locale: string;
};

const initialState: CancelParticipationState = {};
const cancelConfirmationMessage =
  "确定要取消报名吗？取消后你的名额会释放给其他人。";

function CancelButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="secondary"
      className="w-full"
      disabled={pending}
    >
      {pending ? "取消中..." : "取消报名"}
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

  return (
    <form
      action={formAction}
      className="grid gap-3"
      noValidate
      onSubmit={(event) => {
        if (!window.confirm(cancelConfirmationMessage)) {
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

      <CancelButton />
    </form>
  );
}
