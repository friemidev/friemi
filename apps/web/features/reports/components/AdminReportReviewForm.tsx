"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ReportStatus } from "@prisma/client";
import { Button, Textarea } from "@chill-club/ui";
import {
  reviewReportAction,
  type ReviewReportState,
} from "../actions/reportActions";
import { getReportCopy } from "../copy";

type AdminReportReviewFormProps = {
  locale: string;
  reportId: string;
  reviewNote: string | null;
  status: ReportStatus;
};

const statuses: ReportStatus[] = [
  "PENDING",
  "REVIEWING",
  "RESOLVED",
  "DISMISSED",
];

const initialState: ReviewReportState = {};

function SubmitButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getReportCopy(locale).admin;

  return (
    <Button
      type="submit"
      className="h-10 w-full rounded-full px-5 sm:w-auto"
      disabled={pending}
    >
      {pending ? t.saving : t.save}
    </Button>
  );
}

export function AdminReportReviewForm({
  locale,
  reportId,
  reviewNote,
  status,
}: AdminReportReviewFormProps) {
  const [state, formAction] = useActionState(
    reviewReportAction,
    initialState,
  );
  const t = getReportCopy(locale);

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="reportId" value={reportId} />
      <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <label className="grid gap-1 text-sm font-medium text-ink">
          {t.admin.status}
          <select
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
            defaultValue={status}
            name="status"
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {t.statuses[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          {t.admin.noteLabel}
          <Textarea
            className="min-h-20 rounded-xl"
            defaultValue={reviewNote ?? ""}
            maxLength={500}
            name="reviewNote"
            placeholder={t.admin.notePlaceholder}
          />
        </label>
      </div>
      {state.ok ? (
        <p className="text-sm font-medium text-moss">{t.admin.reviewSuccess}</p>
      ) : null}
      {state.formError ? (
        <p className="text-sm font-medium text-red-600">{state.formError}</p>
      ) : null}
      <div className="flex sm:justify-end">
        <SubmitButton locale={locale} />
      </div>
    </form>
  );
}
