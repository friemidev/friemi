"use client";

import { useState, useTransition } from "react";
import { useClerk } from "@clerk/nextjs";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";
import { deleteCurrentAccountAction } from "@/features/account/actions/deleteAccount";
import { withLocale } from "@/lib/routes";

type AccountDeletionEntryCardProps = {
  clerkEnabled: boolean;
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
  clerkEnabled,
  copy,
  locale,
}: AccountDeletionEntryCardProps) {
  return clerkEnabled ? (
    <ClerkDeletionEntryCard copy={copy} locale={locale} />
  ) : (
    <DeletionEntryContent
      copy={copy}
      locale={locale}
      onDeleted={async () => {
        window.location.assign(`${withLocale(locale, "/")}?accountDeleted=1`);
      }}
    />
  );
}

function ClerkDeletionEntryCard({
  copy,
  locale,
}: Omit<AccountDeletionEntryCardProps, "clerkEnabled">) {
  const { signOut } = useClerk();

  return (
    <DeletionEntryContent
      copy={copy}
      locale={locale}
      onDeleted={() =>
        signOut({ redirectUrl: `${withLocale(locale, "/")}?accountDeleted=1` })
      }
    />
  );
}

function DeletionEntryContent({
  copy,
  locale,
  onDeleted,
}: Omit<AccountDeletionEntryCardProps, "clerkEnabled"> & {
  onDeleted: () => Promise<unknown>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

      await onDeleted();
    });
  }

  return (
    <section
      aria-labelledby="account-security-deletion-heading"
      className="pt-2"
    >
      <div className="px-2">
        <h2
          className="flex items-center gap-2 text-sm font-bold text-danger"
          id="account-security-deletion-heading"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {copy.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink/70">{copy.body}</p>
      </div>

      {!confirmOpen ? (
        <button
          aria-expanded={false}
          className="group mt-3 flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-2 text-left text-sm font-semibold text-danger transition hover:bg-rose/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          onClick={() => setConfirmOpen(true)}
          type="button"
        >
          {copy.openConfirm}
          <ChevronRight
            className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </button>
      ) : (
        <div className="mt-4 rounded-xl bg-rose/20 p-4 sm:p-5">
          <h3 className="text-base font-semibold text-ink">
            {copy.confirmTitle}
          </h3>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink/80">
            {copy.impactItems.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2
                  className="mt-1 h-4 w-4 shrink-0 text-danger"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <label className="mt-5 flex min-h-11 items-start gap-3 text-sm leading-6 text-ink">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 rounded border-sand text-danger focus:ring-danger"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>{copy.acknowledgeLabel}</span>
          </label>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!acknowledged || isPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-danger px-4 text-sm font-semibold text-white transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:bg-sand disabled:text-ink/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
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
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-paper px-4 text-sm font-semibold text-ink transition hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
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
            <p className="mt-3 text-sm leading-5 text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
