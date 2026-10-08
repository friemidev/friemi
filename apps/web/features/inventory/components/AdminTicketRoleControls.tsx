"use client";

import { LoaderCircle, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import {
  grantTicketManagerAdminAction,
  inviteTicketRedeemerAdminAction,
  revokeTicketAccessAdminAction,
  type AdminTicketAccessFormState,
} from "@/features/inventory/actions/adminTicketAccessActions";
import { getAdminTicketAccessCopy } from "@/features/inventory/adminTicketAccessCopy";

export function AdminTicketRoleForm({
  definitionId,
  locale,
  role,
}: {
  definitionId: string;
  locale: string;
  role: "MANAGER" | "REDEEMER";
}) {
  const copy = getAdminTicketAccessCopy(locale);
  const router = useRouter();
  const [state, action, pending] = useActionState<
    AdminTicketAccessFormState,
    FormData
  >(
    role === "MANAGER"
      ? grantTicketManagerAdminAction
      : inviteTicketRedeemerAdminAction,
    {},
  );
  const [code, setCode] = useState("");
  const invalid =
    state.status === "INVALID" || state.status === "NOT_FOUND";

  useEffect(() => {
    if (state.status === "GRANTED" || state.status === "INVITED") {
      setCode("");
      router.refresh();
    }
  }, [router, state.status]);

  const message =
    state.status === "GRANTED"
      ? copy.managerGranted
      : state.status === "INVITED"
        ? copy.staffInvited
        : state.status === "ALREADY_ACTIVE" || state.status === "ALREADY_PENDING"
          ? copy.alreadyAssigned
          : state.status === "SELF"
            ? copy.selfAssigned
          : state.status === "NOT_FOUND"
            ? copy.accountMissing
            : state.status
              ? copy.actionFailed
              : null;

  return (
    <form action={action} className="max-w-xl space-y-3">
      <input name="definitionId" readOnly type="hidden" value={definitionId} />
      <input name="locale" readOnly type="hidden" value={locale} />
      <label
        className="block text-sm font-semibold text-ink"
        htmlFor={`ticket-${role.toLowerCase()}-code`}
      >
        {copy.friendCode}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          aria-invalid={invalid}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-sand bg-paper px-4 font-mono text-base tracking-[0.08em] text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
          id={`ticket-${role.toLowerCase()}-code`}
          inputMode="numeric"
          maxLength={8}
          name="recipientCode"
          onChange={(event) => setCode(event.target.value)}
          placeholder={copy.friendCodePlaceholder}
          required
          type="text"
          value={code}
        />
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-sm font-bold text-paper disabled:opacity-50"
          disabled={pending || !code.trim()}
          type="submit"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus aria-hidden="true" className="h-4 w-4" />
          )}
          {role === "MANAGER" ? copy.addManager : copy.inviteStaff}
        </button>
      </div>
      {message ? (
        <p
          className={`text-sm font-semibold ${
            state.status === "GRANTED" || state.status === "INVITED"
              ? "text-forest"
              : "text-danger"
          }`}
          role={state.status === "GRANTED" || state.status === "INVITED" ? "status" : "alert"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function AdminTicketRevokeButton({
  accessId,
  definitionId,
  locale,
}: {
  accessId: string;
  definitionId: string;
  locale: string;
}) {
  const copy = getAdminTicketAccessCopy(locale);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  return (
    <div className="shrink-0 text-right">
      <button
        className="min-h-11 rounded-lg px-3 text-sm font-semibold text-danger disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError("");
            const result = await revokeTicketAccessAdminAction({
              accessId,
              definitionId,
              locale,
            });
            if (result.status === "REVOKED") router.refresh();
            else setError(copy.actionFailed);
          })
        }
        type="button"
      >
        {pending ? copy.revoke + "…" : copy.revoke}
      </button>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
