"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Flag, Loader2, X } from "lucide-react";
import type { ReportReason, ReportTargetType } from "@prisma/client";
import { getSignInHref } from "@/lib/auth-redirect";
import { cn } from "@/lib/utils";
import {
  createReportAction,
  type CreateReportState,
} from "../actions/reportActions";
import { getReportCopy } from "../copy";
import { SafetyDialog } from "./SafetyDialog";

type ReportDialogProps = {
  className?: string;
  isAuthenticated: boolean;
  locale: string;
  redirectPath: string;
  targetId: string;
  targetType: ReportTargetType;
  variant?: "button" | "link" | "icon";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

const reportReasons: ReportReason[] = [
  "SAFETY_CONCERN",
  "HARASSMENT",
  "INAPPROPRIATE_CONTENT",
  "SPAM",
  "MISLEADING_INFORMATION",
  "OTHER",
];

function ReportForm({
  locale,
  redirectPath,
  targetId,
  targetType,
  onClose,
}: Pick<
  ReportDialogProps,
  "locale" | "redirectPath" | "targetId" | "targetType"
> & { onClose: () => void }) {
  const t = getReportCopy(locale);
  const titleId = useId();
  const hintId = useId();
  const [reason, setReason] = useState<ReportReason>("SAFETY_CONCERN");
  const [description, setDescription] = useState("");
  const [state, formAction, pending] = useActionState(
    createReportAction,
    {} as CreateReportState,
  );
  return (
    <SafetyDialog labelledBy={titleId} onClose={onClose}>
      <header className="flex items-start justify-between gap-3 border-b border-sand px-5 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink/70">
            {t.targetTypes[targetType]}
          </p>
          <h2 id={titleId} className="mt-1 text-lg font-bold">
            {state.ok ? t.successTitle : t.title}
          </h2>
        </div>
        <button
          aria-label={t.close}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-forest focus-visible:outline"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </header>
      {state.ok ? (
        <div className="space-y-5 p-5">
          <p
            role="status"
            className="flex items-start gap-2 text-sm leading-6 text-forest"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            {t.successDescription}
          </p>
          <button
            type="button"
            className="min-h-11 w-full rounded-full bg-forest px-4 py-2 font-semibold text-white"
            onClick={onClose}
          >
            {t.close}
          </button>
        </div>
      ) : (
        <form action={formAction} className="grid gap-4 p-5">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <input type="hidden" name="redirectPath" value={redirectPath} />
          <label className="grid gap-2 text-sm font-semibold">
            {t.reasonLabel}
            <select
              className="h-11 w-full rounded-lg border border-sand bg-white px-3 text-base"
              disabled={pending}
              name="reason"
              onChange={(event) =>
                setReason(event.target.value as ReportReason)
              }
              value={reason}
            >
              {reportReasons.map((item) => (
                <option key={item} value={item}>
                  {t.reasons[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {t.descriptionLabel}
            <textarea
              aria-describedby={hintId}
              className="min-h-28 w-full resize-y rounded-lg border border-sand bg-white px-3 py-3 text-base leading-6 outline-none focus:border-forest"
              disabled={pending}
              maxLength={500}
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t.descriptionPlaceholder}
              value={description}
            />
          </label>
          <p id={hintId} className="text-sm leading-6 text-ink/75">
            {t.descriptionHint}
          </p>
          {state.formError ? (
            <p role="alert" className="text-sm font-semibold text-danger">
              {state.formError}
            </p>
          ) : null}
          {Object.values(state.fieldErrors ?? {}).map((messages, index) => (
            <p key={index} role="alert" className="text-sm text-danger">
              {messages[0]}
            </p>
          ))}
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-forest px-5 py-2 font-semibold text-white disabled:opacity-60"
            disabled={pending}
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Flag aria-hidden="true" className="h-4 w-4" />
            )}
            {pending ? t.submitting : t.submit}
          </button>
        </form>
      )}
    </SafetyDialog>
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
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: ReportDialogProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = (value: boolean) => {
    setLocalOpen(value);
    onOpenChange?.(value);
  };
  const t = getReportCopy(locale);
  const triggerLabel = isAuthenticated ? t.trigger : t.signInTrigger;
  const triggerClass = cn(
    "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-sm font-medium text-ink/75 ring-1 ring-sand transition hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest",
    variant === "link" && "bg-transparent px-0 text-xs ring-0",
    variant === "icon" && "h-11 w-11 px-0",
    className,
  );
  const trigger = (
    <>
      <Flag className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className={variant === "icon" ? "sr-only" : undefined}>
        {triggerLabel}
      </span>
    </>
  );
  if (!isAuthenticated) {
    return hideTrigger ? null : (
      <Link
        className={triggerClass}
        href={getSignInHref(locale, redirectPath)}
        title={triggerLabel}
      >
        {trigger}
      </Link>
    );
  }
  return (
    <>
      {!hideTrigger ? (
        <button
          type="button"
          className={triggerClass}
          onClick={() => setOpen(true)}
          title={triggerLabel}
        >
          {trigger}
        </button>
      ) : null}
      {open ? (
        <ReportForm
          key={targetType + ":" + targetId}
          locale={locale}
          redirectPath={redirectPath}
          targetId={targetId}
          targetType={targetType}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
