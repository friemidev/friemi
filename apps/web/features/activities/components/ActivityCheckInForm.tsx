"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  checkInActivityAction,
  type CheckInActivityState,
} from "../actions/checkInActivity";

type ActivityCheckInFormProps = {
  activityId: string;
  checkInRequestedAt?: string | null;
  checkedInAt?: string | null;
  className?: string;
  locale: string;
};

const initialState: CheckInActivityState = {};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      checked: "Deja pointe",
      checkIn: "Pointer",
      pending: "Envoi...",
      requested: "Confirmation en cours",
    };
  }

  if (locale === "en") {
    return {
      checked: "Checked in",
      checkIn: "Check in",
      pending: "Sending...",
      requested: "Check-in confirming",
    };
  }

  return {
    checked: "已签到",
    checkIn: "签到",
    pending: "签到中...",
    requested: "签到确认中",
  };
}

function CheckInButton({
  checkedIn,
  onAttempt,
  requested,
  locale,
}: {
  checkedIn: boolean;
  onAttempt: () => void;
  requested: boolean;
  locale: string;
}) {
  const { pending } = useFormStatus();
  const copy = getCopy(locale);

  return (
    <button
      aria-busy={pending}
      className={cn(
        "inline-flex min-h-9 w-auto items-center justify-center gap-1.5 rounded-full px-3 text-xs font-black transition active:scale-[0.98]",
        checkedIn || requested
          ? "border border-[#8AB68E] bg-[#EAF7EA] text-[#156240]"
          : "bg-[#156240] text-white shadow-[0_8px_18px_rgba(21,98,64,0.16)]",
      )}
      disabled={pending || checkedIn || requested}
      onClick={onAttempt}
      type="submit"
    >
      {pending ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      <span>
        {pending
          ? copy.pending
          : checkedIn
            ? copy.checked
            : requested
              ? copy.requested
              : copy.checkIn}
      </span>
    </button>
  );
}

export function ActivityCheckInForm({
  activityId,
  checkInRequestedAt,
  checkedInAt,
  className,
  locale,
}: ActivityCheckInFormProps) {
  const [state, formAction] = useActionState(
    checkInActivityAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const isCheckedIn = Boolean(checkedInAt);
  const isRequested = Boolean(checkInRequestedAt || state.checkInRequestedAt);
  const visibleError =
    state.formError && dismissedError !== state.formError
      ? state.formError
      : null;

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setDismissedError(null);
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition, state.success]);

  useEffect(() => {
    if (!visibleError) {
      return;
    }

    function dismissOnOutsidePointer(event: PointerEvent) {
      if (formRef.current?.contains(event.target as Node)) {
        return;
      }

      setDismissedError(visibleError);
    }

    document.addEventListener("pointerdown", dismissOnOutsidePointer);

    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsidePointer);
    };
  }, [visibleError]);

  return (
    <form
      action={formAction}
      className={cn("grid justify-items-end gap-1.5", className)}
      noValidate
      ref={formRef}
    >
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />
      <CheckInButton
        checkedIn={isCheckedIn}
        locale={locale}
        onAttempt={() => setDismissedError(null)}
        requested={isRequested}
      />
      {visibleError ? (
        <p className="max-w-[16rem] rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-right text-[11px] font-semibold leading-4 text-red-700">
          {visibleError}
        </p>
      ) : null}
    </form>
  );
}
