"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
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
  onOpen,
}: {
  disabled?: boolean;
  locale: string;
  onOpen: () => void;
}) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).activityOwner;

  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full gap-2 text-red-700 hover:bg-red-50"
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={onOpen}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      <span className="truncate">{pending ? t.cancelling : t.cancel}</span>
    </Button>
  );
}

function CancelActivityConfirmDialog({
  locale,
  onClose,
}: {
  locale: string;
  onClose: () => void;
}) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).activityOwner;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-sm"
      role="presentation"
    >
      <div
        aria-describedby="cancel-activity-confirm-description"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-[#e2d7c2] bg-[#fffaf1] shadow-[0_22px_70px_rgba(36,28,14,0.22)]"
        role="alertdialog"
      >
        <div className="border-b border-[#eadfcd] px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6a40]">
            {t.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink">
            {t.cancelConfirmTitle}
          </h2>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <p
            className="text-sm leading-6 text-zinc-600"
            id="cancel-activity-confirm-description"
          >
            {t.cancelConfirmDescription}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              className="h-11 rounded-full bg-white"
              disabled={pending}
              onClick={onClose}
            >
              {t.cancelConfirmBack}
            </Button>
            <Button
              type="submit"
              className="h-11 gap-2 rounded-full bg-[#9f4a3e] text-white hover:bg-[#8b3f35]"
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              <span className="truncate">
                {pending ? t.cancelling : t.cancelConfirmSubmit}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (state.formError) {
      setIsConfirmOpen(false);
    }
  }, [state.formError]);

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

      <CancelActivityButton
        disabled={disabled}
        locale={locale}
        onOpen={() => setIsConfirmOpen(true)}
      />
      {isConfirmOpen ? (
        <CancelActivityConfirmDialog
          locale={locale}
          onClose={() => setIsConfirmOpen(false)}
        />
      ) : null}
    </form>
  );
}
