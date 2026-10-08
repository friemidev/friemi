"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  acceptTicketAccessInvitationAction,
  declineTicketAccessInvitationAction,
} from "../actions/ticketAccessActions";
import { getTicketWorkbenchCopy } from "../ticketWorkbenchCopy";

export function TicketAccessInvitationActions({
  invitationId,
  locale,
}: {
  invitationId: string;
  locale: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const copy = getTicketWorkbenchCopy(locale);

  function respond(accept: boolean) {
    setError("");
    startTransition(async () => {
      try {
        const result = accept
          ? await acceptTicketAccessInvitationAction(invitationId, locale)
          : await declineTicketAccessInvitationAction(invitationId, locale);
        if (result.status === (accept ? "ACCEPTED" : "DECLINED")) {
          router.refresh();
        } else {
          setError(copy.invitationFailed);
        }
      } catch {
        setError(copy.invitationFailed);
      }
    });
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <button
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-forest px-4 text-sm font-bold text-white transition hover:bg-forest/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-50"
          disabled={pending}
          onClick={() => respond(true)}
          type="button"
        >
          {pending ? copy.invitationPending : copy.accept}
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-fog px-4 text-sm font-semibold text-ink transition hover:bg-sand/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-50"
          disabled={pending}
          onClick={() => respond(false)}
          type="button"
        >
          {copy.decline}
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-sm font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
