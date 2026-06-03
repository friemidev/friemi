"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Flag,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import type { ReportReason, ReportTargetType } from "@prisma/client";
import { Button, Textarea } from "@chill-club/ui";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  createReportAction,
  type CreateReportState,
} from "../actions/reportActions";
import { getReportCopy } from "../copy";

type ReportDialogProps = {
  className?: string;
  isAuthenticated: boolean;
  locale: string;
  redirectPath: string;
  targetId: string;
  targetType: ReportTargetType;
  variant?: "button" | "link" | "icon";
};

const reportReasons: ReportReason[] = [
  "SPAM",
  "HARASSMENT",
  "INAPPROPRIATE_CONTENT",
  "MISLEADING_INFORMATION",
  "SAFETY_CONCERN",
  "OTHER",
];

const initialState: CreateReportState = {
  values: {
    reason: "MISLEADING_INFORMATION",
    description: "",
  },
};

function SubmitButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getReportCopy(locale);

  return (
    <Button
      type="submit"
      className="h-11 w-full rounded-full"
      disabled={pending}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.submitting}
        </span>
      ) : (
        t.submit
      )}
    </Button>
  );
}

export function ReportDialog({
  className,
  isAuthenticated,
  locale,
  redirectPath,
  targetId,
  targetType,
  variant = "button",
}: ReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(
    createReportAction,
    initialState,
  );
  const router = useRouter();
  const descriptionId = useId();
  const t = getReportCopy(locale);
  const triggerLabel = isAuthenticated ? t.trigger : t.signInTrigger;
  const signInHref = withLocale(
    locale,
    `/sign-in?redirect_url=${encodeURIComponent(withLocale(locale, redirectPath))}`,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  if (!isAuthenticated) {
    return (
      <Link
        className={cn(
          "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-medium text-zinc-600 ring-1 ring-black/10 transition hover:bg-white hover:text-ink",
          variant === "link" && "h-auto px-0 text-xs ring-0 hover:bg-transparent",
          variant === "icon" && "h-9 w-9 px-0",
          className,
        )}
        href={signInHref}
        title={triggerLabel}
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
        {variant === "icon" ? (
          <span className="sr-only">{triggerLabel}</span>
        ) : (
          triggerLabel
        )}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white/80 px-3 text-sm font-medium text-zinc-600 ring-1 ring-black/10 transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300",
          variant === "link" &&
            "h-auto bg-transparent px-0 text-xs ring-0 hover:bg-transparent",
          variant === "icon" && "h-9 w-9 px-0",
          className,
        )}
        onClick={() => setOpen(true)}
        title={triggerLabel}
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
        {variant === "icon" ? (
          <span className="sr-only">{triggerLabel}</span>
        ) : (
          triggerLabel
        )}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-black/35 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
          role="presentation"
        >
          <div
            aria-describedby={descriptionId}
            aria-modal="true"
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.5rem] border border-black/10 bg-paper shadow-2xl sm:max-w-lg sm:rounded-[1.5rem]"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                  {t.targetTypes[targetType]}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-normal text-ink">
                  {state.ok ? t.successTitle : t.title}
                </h2>
                <p
                  id={descriptionId}
                  className="mt-2 text-sm leading-6 text-zinc-600"
                >
                  {state.ok ? t.successDescription : t.description}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-zinc-600 shadow-sm ring-1 ring-black/10 transition hover:bg-zinc-50 hover:text-ink"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">{t.close}</span>
              </button>
            </div>

            {state.ok ? (
              <div className="px-5 py-6">
                <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-4 text-sm leading-6 text-moss">
                  <CheckCircle2 className="mb-2 h-5 w-5" />
                  {t.successNote}
                </div>
                <Button
                  type="button"
                  className="mt-5 h-11 w-full rounded-full"
                  onClick={() => setOpen(false)}
                >
                  {t.close}
                </Button>
              </div>
            ) : (
              <form action={formAction} className="grid gap-4 px-5 py-5">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="targetType" value={targetType} />
                <input type="hidden" name="targetId" value={targetId} />
                <input type="hidden" name="redirectPath" value={redirectPath} />

                <label className="grid gap-2 text-sm font-medium text-ink">
                  {t.reasonLabel}
                  <select
                    className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
                    defaultValue={
                      state.values?.reason ?? initialState.values?.reason
                    }
                    name="reason"
                  >
                    {reportReasons.map((reason) => (
                      <option key={reason} value={reason}>
                        {t.reasons[reason]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-ink">
                  {t.descriptionLabel}
                  <Textarea
                    className="min-h-28 rounded-xl"
                    defaultValue={state.values?.description}
                    maxLength={500}
                    name="description"
                    placeholder={t.descriptionPlaceholder}
                  />
                </label>

                <div className="rounded-2xl bg-[#eef5ea] px-4 py-3 text-sm leading-6 text-moss">
                  <ShieldAlert className="mb-1 h-4 w-4" />
                  {t.descriptionHint}
                </div>

                {state.formError ? (
                  <p role="alert" className="text-sm font-medium text-red-600">
                    {state.formError}
                  </p>
                ) : null}
                {state.fieldErrors?.reason?.[0] ? (
                  <p role="alert" className="text-sm font-medium text-red-600">
                    {state.fieldErrors.reason[0]}
                  </p>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <SubmitButton locale={locale} />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 rounded-full px-5"
                    onClick={() => setOpen(false)}
                  >
                    {t.cancel}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
