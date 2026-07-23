"use client";

import { useState, useTransition } from "react";
import { useClerk } from "@clerk/nextjs";
import { AlertTriangle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { deleteCurrentAccountAction } from "@/features/account/actions/deleteAccount";
import { withLocale } from "@/lib/routes";

type AccountDeletionEntryCardProps = {
  copy: {
    acknowledgeLabel: string;
    body: string;
    cancel: string;
    confirmTitle: string;
    error: string;
    impactItems: readonly string[];
    openConfirm: string;
    submit: string;
    submitting: string;
    success: string;
    title: string;
  };
  locale: string;
};

export function AccountDeletionEntryCard({
  copy,
  locale,
}: AccountDeletionEntryCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { signOut } = useClerk();

  function submitDeletion() {
    if (!acknowledged || isPending) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteCurrentAccountAction({ locale });

      if (!result.ok) {
        setError(copy.error);
        return;
      }

      await signOut({
        redirectUrl: `${withLocale(locale, "/")}?accountDeleted=1`,
      });
    });
  }

  return (
    <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-[0_18px_48px_rgba(127,29,29,0.06)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.title}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-700">
            {copy.body}
          </p>
        </div>
        {!confirmOpen ? (
          <button
            type="button"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-red-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {copy.openConfirm}
          </button>
        ) : null}
      </div>

      {confirmOpen ? (
        <div className="mt-5 rounded-2xl border border-red-100 bg-red-50/70 p-4">
          <h2 className="text-base font-semibold text-red-950">
            {copy.confirmTitle}
          </h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-red-950/80">
            {copy.impactItems.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-700"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-red-950">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-red-300 text-red-700 focus:ring-red-300"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>{copy.acknowledgeLabel}</span>
          </label>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!acknowledged || isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
              onClick={submitDeletion}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              {isPending ? copy.submitting : copy.submit}
            </button>
            <button
              type="button"
              disabled={isPending}
              className="inline-flex h-11 items-center justify-center rounded-full border border-red-200 bg-white px-4 text-sm font-semibold text-red-800 transition hover:bg-red-50"
              onClick={() => {
                setConfirmOpen(false);
                setAcknowledged(false);
                setError(null);
              }}
            >
              {copy.cancel}
            </button>
          </div>
          {error ? (
            <p className="mt-3 text-xs leading-5 text-red-800">{error}</p>
          ) : null}
          {acknowledged ? (
            <p className="mt-3 text-xs leading-5 text-red-800/75">
              {copy.success}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
