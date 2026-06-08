"use client";

import { useActionState, useEffect, useState } from "react";
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

function CancelButton({
  locale,
  onOpen,
}: {
  locale: string;
  onOpen: () => void;
}) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).join;

  return (
    <Button
      type="button"
      variant="secondary"
      className="h-11 w-full gap-2 rounded-full border border-[#d9c6ad] bg-white text-[#7b6041] shadow-none hover:bg-[#fff8ed]"
      disabled={pending}
      aria-busy={pending}
      onClick={onOpen}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      <span className="truncate">{pending ? t.cancelPending : t.cancel}</span>
    </Button>
  );
}

function CancelParticipationConfirmDialog({
  locale,
  onClose,
}: {
  locale: string;
  onClose: () => void;
}) {
  const { pending } = useFormStatus();
  const t = getCopy(locale);

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-sm"
      role="presentation"
    >
      <div
        aria-describedby="cancel-participation-confirm-description"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-[#e2d7c2] bg-[#fffaf1] shadow-[0_22px_70px_rgba(36,28,14,0.22)]"
        role="alertdialog"
      >
        <div className="border-b border-[#eadfcd] px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6a40]">
            {t.join.cancel}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink">
            {t.join.cancel}
          </h2>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <p
            className="text-sm leading-6 text-zinc-600"
            id="cancel-participation-confirm-description"
          >
            {t.join.cancelConfirm}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              className="h-11 rounded-full bg-white"
              disabled={pending}
              onClick={onClose}
            >
              {t.activityOwner.cancelConfirmBack}
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
                {pending ? t.join.cancelPending : t.join.cancel}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (state.formError) {
      setIsConfirmOpen(false);
    }
  }, [state.formError]);

  return (
    <form action={formAction} className="grid gap-3" noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />

      {state.formError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
          {state.formError}
        </div>
      ) : null}

      <PendingCancelNotice locale={locale} />
      <CancelButton locale={locale} onOpen={() => setIsConfirmOpen(true)} />
      {isConfirmOpen ? (
        <CancelParticipationConfirmDialog
          locale={locale}
          onClose={() => setIsConfirmOpen(false)}
        />
      ) : null}
    </form>
  );
}
