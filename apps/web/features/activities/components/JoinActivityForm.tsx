"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button, Textarea } from "@chill-club/ui";
import { trackClientAnalyticsEvent } from "@/features/analytics/client";
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
  activityTitle: string;
  compactUnauthenticated?: boolean;
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
    <Button
      type="submit"
      className="h-11 w-full gap-2 rounded-full border-0 bg-[#d88d72] text-white hover:bg-[#c87b61]"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      <span className="truncate">
        {pending
          ? t.submitting
          : requiresApproval
            ? t.submitApproval
            : t.submit}
      </span>
    </Button>
  );
}

function PendingSubmitNotice({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).join;

  if (!pending) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-xs font-medium text-moss"
      aria-live="polite"
    >
      <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      <span>{t.submitting}</span>
    </div>
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

function SignInPrompt({
  compact,
  locale,
}: {
  compact: boolean;
  locale: string;
}) {
  const t = getCopy(locale).join;

  if (compact) {
    return (
      <div className="grid gap-2.5">
        <p className="text-xs leading-5 text-zinc-500 sm:text-sm sm:leading-6">
          {t.signInDescription}
        </p>
        <Link
          className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-full border border-[#d9c6ad] bg-white px-4 text-sm font-semibold text-[#6f5434] transition hover:bg-[#fff8ed]"
          href={withLocale(locale, "/sign-in")}
        >
          {t.signInTitle}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <DisabledAction title={t.signInTitle} description={t.signInDescription} />
      <Link
        className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-full bg-[#d88d72] px-4 text-sm font-medium text-white transition hover:bg-[#c87b61]"
        href={withLocale(locale, "/sign-in")}
      >
        {t.signInTitle}
      </Link>
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

function ParticipationStatusCard({
  description,
  isPending,
  title,
}: {
  description: string;
  isPending: boolean;
  title: string;
}) {
  return (
    <div
      className={
        isPending
          ? "rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm"
          : "rounded-xl border border-[#d9cfbd] bg-white/90 px-3 py-3 text-sm"
      }
    >
      <p
        className={
          isPending ? "font-medium text-amber-900" : "font-medium text-ink"
        }
      >
        {title}
      </p>
      <p
        className={
          isPending
            ? "mt-1 leading-6 text-amber-800"
            : "mt-1 leading-6 text-zinc-500"
        }
      >
        {description}
      </p>
    </div>
  );
}

function RejoinNotice({
  locale,
  status,
}: {
  locale: string;
  status: "REJECTED";
}) {
  const t = getCopy(locale).join;
  const copy = {
    title: t.rejectedTitle,
    description: t.rejectedDescription,
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
  activityTitle,
  compactUnauthenticated = false,
  locale,
  requiresApproval,
  isFull,
  isClosed,
  isOrganizer,
  isAuthenticated,
  viewerParticipationStatus,
}: JoinActivityFormProps) {
  const [state, formAction] = useActionState(joinActivityAction, initialState);
  const [effectiveParticipationStatus, setEffectiveParticipationStatus] =
    useState<ViewerParticipationStatus>(viewerParticipationStatus);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const t = getCopy(locale).join;

  useEffect(() => {
    setEffectiveParticipationStatus(viewerParticipationStatus);
  }, [viewerParticipationStatus]);

  useEffect(() => {
    if (!state.success || !state.participantStatus) {
      return;
    }

    setEffectiveParticipationStatus(state.participantStatus);
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition, state.participantStatus, state.success]);

  if (isClosed) {
    return (
      <DisabledAction title={t.closedTitle} description={t.closedDescription} />
    );
  }

  if (
    effectiveParticipationStatus &&
    effectiveParticipationStatus !== "REJECTED" &&
    effectiveParticipationStatus !== "CANCELLED"
  ) {
    const copy = getParticipationCopy(effectiveParticipationStatus, locale);

    return (
      <div className="grid gap-2.5">
        <ParticipationStatusCard
          description={copy.description}
          isPending={effectiveParticipationStatus === "PENDING"}
          title={copy.title}
        />
        <CancelParticipationForm
          activityId={activityId}
          activityTitle={activityTitle}
          locale={locale}
          onCancelled={() => setEffectiveParticipationStatus(null)}
        />
      </div>
    );
  }

  if (isFull) {
    return (
      <DisabledAction title={t.fullTitle} description={t.fullDescription} />
    );
  }

  if (!isAuthenticated) {
    return <SignInPrompt compact={compactUnauthenticated} locale={locale} />;
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
    <form
      action={formAction}
      className="grid gap-3"
      noValidate
      onSubmit={() => {
        trackClientAnalyticsEvent({
          name: "join_started",
          entityId: activityId,
          entityType: "team",
          sourceSurface: "activity_detail",
          properties: {
            requires_approval: requiresApproval,
          },
        });
      }}
    >
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />

      {effectiveParticipationStatus === "REJECTED" ? (
        <RejoinNotice locale={locale} status={effectiveParticipationStatus} />
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

      <PendingSubmitNotice locale={locale} />
      <SubmitButton locale={locale} requiresApproval={requiresApproval} />
    </form>
  );
}
