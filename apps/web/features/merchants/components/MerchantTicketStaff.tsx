"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle, UserRoundPlus } from "lucide-react";
import {
  inviteTicketRedeemerAction,
  revokeTicketAccessAction,
} from "@/features/inventory/actions/ticketAccessActions";
import { getMerchantTicketCopy } from "@/features/merchants/merchantTicketCopy";

export type MerchantTicketStaffMember = {
  id: string;
  role: string;
  status: string;
  source: string;
  profile: { id: string; nickname: string; friendCode: string | null };
  invitedAt: Date | string;
};

export function MerchantTicketStaff({
  definitionId,
  locale,
  staff,
}: {
  definitionId: string;
  locale: string;
  staff: MerchantTicketStaffMember[];
}) {
  const copy = getMerchantTicketCopy(locale);
  const router = useRouter();
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const visibleStaff = staff.filter(
    (item) => item.role === "REDEEMER" && item.status !== "REVOKED",
  );

  function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setNotice(null);
    const normalized = code.replace(/\D/g, "");
    if (normalized.length !== 6) {
      setNotice({ kind: "error", text: copy.inviteError });
      return;
    }
    startTransition(async () => {
      try {
        const result = await inviteTicketRedeemerAction(
          definitionId,
          normalized,
          locale,
        );
        if (result.status === "INVITED") {
          setCode("");
          setNotice({ kind: "success", text: copy.invited });
          router.refresh();
          return;
        }
        const message =
          result.status === "ALREADY_ACTIVE"
            ? copy.inviteAlreadyActive
            : result.status === "ALREADY_PENDING"
              ? copy.inviteAlreadyPending
              : result.status === "NOT_FOUND"
                ? copy.inviteNotFound
                : result.status === "SELF"
                  ? copy.inviteSelf
                  : copy.inviteError;
        setNotice({ kind: "error", text: message });
      } catch {
        setNotice({ kind: "error", text: copy.inviteError });
      }
    });
  }

  function revoke(accessId: string) {
    if (pending) return;
    setNotice(null);
    setBusyId(accessId);
    startTransition(async () => {
      try {
        const result = await revokeTicketAccessAction(accessId, locale);
        if (result.status === "REVOKED") {
          setNotice({ kind: "success", text: copy.removed });
          router.refresh();
        } else {
          setNotice({ kind: "error", text: copy.removeError });
        }
      } catch {
        setNotice({ kind: "error", text: copy.removeError });
      } finally {
        setBusyId(null);
        setRemoveId(null);
      }
    });
  }

  return (
    <>
      <section className="mt-8" aria-labelledby="ticket-staff-invite-title">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fog text-forest">
            <UserRoundPlus aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold" id="ticket-staff-invite-title">
              {copy.inviteTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink/70">
              {copy.inviteHint}
            </p>
          </div>
        </div>
        <form className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={invite}>
          <label className="min-w-0 flex-1 text-sm font-semibold">
            <span className="block pb-2">{copy.inviteLabel}</span>
            <input
              autoComplete="off"
              className="h-12 w-full rounded-xl bg-fog px-4 text-base font-medium outline-none placeholder:text-ink/55 focus:ring-2 focus:ring-forest"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              pattern="[0-9]{6}"
              placeholder={copy.invitePlaceholder}
              required
              type="text"
              value={code}
            />
          </label>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            disabled={pending}
            type="submit"
          >
            {pending && !busyId ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
            {copy.invite}
          </button>
        </form>
        {notice ? (
          <p
            className={`mt-3 text-sm font-semibold ${notice.kind === "success" ? "text-forest" : "text-danger"}`}
            role={notice.kind === "success" ? "status" : "alert"}
          >
            {notice.text}
          </p>
        ) : null}
      </section>

      <section className="mt-10" aria-labelledby="ticket-staff-list-title">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold" id="ticket-staff-list-title">
            {copy.staffList}
          </h2>
          <span className="text-sm tabular-nums text-ink/65">
            {visibleStaff.length}
          </span>
        </div>
        {visibleStaff.length ? (
          <ul className="mt-3 space-y-2">
            {visibleStaff.map((member) => {
              const isPending = member.status === "PENDING";
              return (
                <li className="rounded-2xl bg-fog/60 px-4 py-4" key={member.id}>
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold">
                        {member.profile.nickname}
                      </p>
                      {member.profile.friendCode ? (
                        <p className="mt-0.5 text-sm tabular-nums text-ink/65">
                          {member.profile.friendCode}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-forest">
                      {isPending ? copy.statusPending : copy.statusActive}
                    </span>
                  </div>
                  {removeId === member.id ? (
                    <div className="mt-4">
                      <p className="text-sm leading-6 text-ink/75">{copy.removeHint}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          className="min-h-11 rounded-full bg-danger px-4 text-sm font-semibold text-white disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                          disabled={pending}
                          onClick={() => revoke(member.id)}
                          type="button"
                        >
                          {busyId === member.id ? <LoaderCircle aria-hidden="true" className="mr-2 inline h-4 w-4 animate-spin" /> : null}
                          {copy.removeConfirm}
                        </button>
                        <button
                          className="min-h-11 px-3 text-sm font-semibold text-ink/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                          onClick={() => setRemoveId(null)}
                          type="button"
                        >
                          {copy.removeCancel}
                        </button>
                      </div>
                    </div>
                  ) : member.role === "REDEEMER" && member.source === "INVITATION" ? (
                    <button
                      className="mt-2 min-h-11 text-sm font-semibold text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                      disabled={pending}
                      onClick={() => setRemoveId(member.id)}
                      type="button"
                    >
                      {copy.remove}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-5 rounded-2xl bg-fog/70 px-5 py-8 text-center text-sm text-ink/70">
            {copy.staffEmpty}
          </p>
        )}
      </section>
    </>
  );
}
