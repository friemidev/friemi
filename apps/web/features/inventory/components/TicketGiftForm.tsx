"use client";

import { Gift, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  giftTicketAction,
  type GiftTicketState,
} from "../actions/inventoryActions";
import { getInventoryCopy } from "../copy";
import { FriemiRecipientPicker } from "./FriemiRecipientPicker";

export function TicketGiftForm({
  definitionId,
  initialRequestId,
  locale,
}: {
  definitionId: string;
  initialRequestId: string;
  locale: string;
}) {
  const copy = getInventoryCopy(locale);
  const router = useRouter();
  const [state, action, pending] = useActionState<GiftTicketState, FormData>(
    giftTicketAction,
    {},
  );
  const [selected, setSelected] = useState(false);
  const [requestId, setRequestId] = useState(initialRequestId);

  useEffect(() => {
    if (state.status !== "GIFTED") return;
    setSelected(false);
    setRequestId(crypto.randomUUID());
    router.refresh();
  }, [router, state.giftId, state.status]);

  const error =
    state.status === "SELF"
      ? locale === "zh-CN"
        ? "不能赠送给自己。"
        : locale === "fr"
          ? "Vous ne pouvez pas vous offrir un billet."
          : "You cannot gift a ticket to yourself."
      : state.status === "NO_TICKETS"
        ? copy.noTickets
        : state.status === "NOT_FOUND"
          ? locale === "zh-CN"
            ? "没有找到收票人。"
            : locale === "fr"
              ? "Destinataire introuvable."
              : "Recipient not found."
          : state.status === "NOT_GIFTABLE"
            ? locale === "zh-CN"
              ? "这批票券不允许赠送。"
              : locale === "fr"
                ? "Ce lot de billets ne peut pas être offert."
                : "This ticket batch cannot be gifted."
            : state.status === "FAILED" || state.status === "INVALID"
              ? copy.giftError
              : null;

  return (
    <section className="rounded-[1.25rem] bg-white p-5 ring-1 ring-[#D6D5B2] sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF5E8] text-[#156240]">
          <Gift className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-[#111210]">{copy.gift}</h2>
          <p className="text-xs text-[#6C746A]">{copy.ticketHint}</p>
        </div>
      </div>

      <form action={action} className="mt-5 space-y-4">
        <input name="locale" readOnly type="hidden" value={locale} />
        <input
          name="definitionId"
          readOnly
          type="hidden"
          value={definitionId}
        />
        <input name="requestId" readOnly type="hidden" value={requestId} />
        <FriemiRecipientPicker
          key={requestId}
          locale={locale}
          onSelectionChange={setSelected}
        />
        <button
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#156240] px-4 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(21,98,64,0.18)] transition hover:bg-[#0F5033] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending || !selected}
          type="submit"
        >
          {pending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Gift className="h-4 w-4" />
          )}
          {copy.gift}
        </button>
      </form>

      {state.status === "GIFTED" ? (
        <p
          className="mt-4 rounded-xl bg-[#EAF5E8] px-4 py-3 text-sm font-bold text-[#156240]"
          role="status"
        >
          {copy.gifted} {state.recipientName}
        </p>
      ) : null}
      {error ? (
        <p
          className="mt-4 rounded-xl bg-[#FFF0ED] px-4 py-3 text-sm text-[#B5301F]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
