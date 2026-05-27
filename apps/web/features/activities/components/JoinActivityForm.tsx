"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Textarea } from "@chill-club/ui";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import {
  joinActivityAction,
  type JoinActivityState,
} from "../actions/joinActivity";
import { CancelParticipationForm } from "./CancelParticipationForm";

type ViewerParticipationStatus =
  | "JOINED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | null;

type JoinActivityFormProps = {
  activityId: string;
  locale: string;
  requiresApproval: boolean;
  isFull: boolean;
  isClosed: boolean;
  isOrganizer: boolean;
  isAuthenticated: boolean;
  viewerParticipationStatus: ViewerParticipationStatus;
};

const initialState: JoinActivityState = {};

function SubmitButton({
  locale,
  requiresApproval,
}: {
  locale: string;
  requiresApproval: boolean;
}) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).join;

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? t.submitting : requiresApproval ? t.submitApproval : t.submit}
    </Button>
  );
}

function DisabledAction({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 leading-6 text-zinc-500">{description}</p>
    </div>
  );
}

function getParticipationCopy(
  status: Exclude<ViewerParticipationStatus, null>,
  locale: string,
) {
  const t = getCopy(locale).join;

  if (status === "PENDING") {
    return {
      title: t.pendingTitle,
      description: t.pendingDescription,
    };
  }

  return {
    title: t.joinedTitle,
    description: t.joinedDescription,
  };
}

function RejoinNotice({
  locale,
  status,
}: {
  locale: string;
  status: "REJECTED" | "CANCELLED";
}) {
  const t = getCopy(locale).join;
  const copy =
    status === "REJECTED"
      ? {
          title: t.rejectedTitle,
          description: t.rejectedDescription,
        }
      : {
          title: t.cancelledTitle,
          description: t.cancelledDescription,
        };

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
      <p className="font-medium text-amber-900">{copy.title}</p>
      <p className="mt-1 leading-6 text-amber-800">{copy.description}</p>
    </div>
  );
}

export function JoinActivityForm({
  activityId,
  locale,
  requiresApproval,
  isFull,
  isClosed,
  isOrganizer,
  isAuthenticated,
  viewerParticipationStatus,
}: JoinActivityFormProps) {
  const [state, formAction] = useActionState(joinActivityAction, initialState);
  const t = getCopy(locale).join;

  if (isClosed) {
    return (
      <DisabledAction title={t.closedTitle} description={t.closedDescription} />
    );
  }

  if (
    viewerParticipationStatus &&
    viewerParticipationStatus !== "REJECTED" &&
    viewerParticipationStatus !== "CANCELLED"
  ) {
    const copy = getParticipationCopy(viewerParticipationStatus, locale);

    return (
      <div className="grid gap-3">
        <DisabledAction title={copy.title} description={copy.description} />
        <CancelParticipationForm activityId={activityId} locale={locale} />
      </div>
    );
  }

  if (isFull) {
    return (
      <DisabledAction title={t.fullTitle} description={t.fullDescription} />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="grid gap-3">
        <DisabledAction
          title={t.signInTitle}
          description={t.signInDescription}
        />
        <Link
          className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
          href={withLocale(locale, "/sign-in")}
        >
          {t.signInTitle}
        </Link>
      </div>
    );
  }

  if (isOrganizer) {
    return (
      <DisabledAction
        title={t.organizerTitle}
        description={t.organizerDescription}
      />
    );
  }

  return (
    <form action={formAction} className="grid gap-3" noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />

      {viewerParticipationStatus === "REJECTED" ||
      viewerParticipationStatus === "CANCELLED" ? (
        <RejoinNotice locale={locale} status={viewerParticipationStatus} />
      ) : null}

      {state.formError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      ) : null}

      <label className="grid gap-2 text-sm font-medium text-zinc-700">
        {t.messageLabel}
        <Textarea
          className="min-h-24"
          name="message"
          defaultValue={state.values?.message}
          maxLength={300}
          placeholder={t.messagePlaceholder}
        />
        <span className="text-xs font-normal text-zinc-500">
          {requiresApproval ? t.messageHintApproval : t.messageHint}
        </span>
        {state.fieldErrors?.message?.[0] ? (
          <span className="text-xs font-medium text-red-600">
            {state.fieldErrors.message[0]}
          </span>
        ) : null}
      </label>

      <SubmitButton locale={locale} requiresApproval={requiresApproval} />
    </form>
  );
}
