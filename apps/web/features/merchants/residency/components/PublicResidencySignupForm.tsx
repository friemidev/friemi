"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import {
  cancelResidencySignupAction,
  signupResidencyAction,
  type ResidencyActionState,
} from "../actions";
import { getPublicResidencyCopy } from "../publicCopy";

export function PublicResidencySignupForm({
  locale,
  signedUp,
  slotId,
}: {
  locale: string;
  signedUp: boolean;
  slotId: string;
}) {
  const copy = getPublicResidencyCopy(locale);
  const router = useRouter();
  const [state, action, pending] = useActionState<
    ResidencyActionState,
    FormData
  >(signedUp ? cancelResidencySignupAction : signupResidencyAction, {});

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <form action={action} className="space-y-3">
      <input name="slotId" type="hidden" value={slotId} />
      <input name="locale" type="hidden" value={locale} />
      {signedUp ? (
        <p className="text-sm font-semibold text-forest">{copy.joined}</p>
      ) : null}
      <button
        aria-busy={pending}
        className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-60 ${
          signedUp ? "bg-fog text-forest" : "bg-forest text-paper"
        }`}
        disabled={pending}
        type="submit"
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : null}
        {signedUp ? copy.cancel : copy.join}
      </button>
      <p aria-live="polite" className="text-sm text-ink/70">
        {state.error
          ? state.error
          : state.success
            ? signedUp
              ? copy.cancelled
              : copy.joined
            : null}
      </p>
    </form>
  );
}
