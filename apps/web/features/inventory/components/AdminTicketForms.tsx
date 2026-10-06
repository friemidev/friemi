"use client";

import { LoaderCircle, Plus, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  createTicketDefinitionAction,
  issueTicketBatchAction,
  setTicketGiftableAction,
  type CreateTicketDefinitionState,
  type IssueTicketState,
  type SetTicketGiftableState,
} from "../actions/inventoryActions";
import { getInventoryCopy } from "../copy";
import { FriemiRecipientPicker } from "./FriemiRecipientPicker";

const fieldClassName =
  "w-full rounded-xl border border-[#D6D5B2] bg-white px-3 py-3 text-base text-[#111210] outline-none focus:border-[#156240] focus:ring-2 focus:ring-[#156240]/20";

export function CreateTicketDefinitionForm({ locale }: { locale: string }) {
  const copy = getInventoryCopy(locale);
  const router = useRouter();
  const [state, action, pending] = useActionState<
    CreateTicketDefinitionState,
    FormData
  >(createTicketDefinitionAction, {});

  useEffect(() => {
    if (state.status === "CREATED") router.refresh();
  }, [router, state.definitionId, state.status]);

  return (
    <section className="rounded-[1.3rem] bg-white p-5 ring-1 ring-[#D6D5B2] sm:p-6">
      <h2 className="text-lg font-bold text-[#111210]">{copy.create}</h2>
      <p className="mt-1 text-sm text-[#6C746A]">{copy.ticketHint}</p>
      <form action={action} className="mt-5 grid gap-4">
        <input name="locale" readOnly type="hidden" value={locale} />
        <label className="grid gap-2 text-sm font-bold text-[#263B2E]">
          {copy.title}
          <input
            className={fieldClassName}
            maxLength={120}
            minLength={2}
            name="title"
            required
            type="text"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#263B2E]">
          {copy.description}
          <textarea
            className={fieldClassName}
            maxLength={1200}
            name="description"
            rows={3}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#263B2E]">
          {copy.supply}
          <input
            className={fieldClassName}
            defaultValue={1000}
            max={100000}
            min={1}
            name="totalSupply"
            required
            type="number"
          />
        </label>
        <label className="flex items-center gap-3 rounded-xl bg-[#F3F7F0] px-4 py-3 text-sm font-bold text-[#263B2E]">
          <input
            className="h-5 w-5 accent-[#156240]"
            defaultChecked
            name="isGiftable"
            type="checkbox"
          />
          {copy.giftable}
        </label>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#156240] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          {pending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {copy.create}
        </button>
      </form>
      {state.status === "CREATED" ? (
        <p className="mt-4 text-sm font-bold text-[#156240]" role="status">
          {copy.created}
        </p>
      ) : null}
      {state.status && state.status !== "CREATED" ? (
        <p className="mt-4 text-sm text-[#B5301F]" role="alert">
          {copy.createError}
        </p>
      ) : null}
    </section>
  );
}

export function IssueTicketForm({
  definitionId,
  initialRequestId,
  locale,
  remaining,
}: {
  definitionId: string;
  initialRequestId: string;
  locale: string;
  remaining: number;
}) {
  const copy = getInventoryCopy(locale);
  const router = useRouter();
  const [state, action, pending] = useActionState<IssueTicketState, FormData>(
    issueTicketBatchAction,
    {},
  );
  const [selected, setSelected] = useState(false);
  const [requestId, setRequestId] = useState(initialRequestId);

  useEffect(() => {
    if (state.status !== "ISSUED") return;
    setSelected(false);
    setRequestId(crypto.randomUUID());
    router.refresh();
  }, [router, state.batchId, state.status]);

  if (remaining <= 0) return null;

  return (
    <form
      action={action}
      className="mt-5 space-y-4 border-t border-[#E5E2D3] pt-5"
    >
      <input name="locale" readOnly type="hidden" value={locale} />
      <input name="definitionId" readOnly type="hidden" value={definitionId} />
      <input name="requestId" readOnly type="hidden" value={requestId} />
      <FriemiRecipientPicker
        key={requestId}
        locale={locale}
        onSelectionChange={setSelected}
      />
      <label className="grid gap-2 text-sm font-bold text-[#263B2E]">
        {copy.quantity}
        <input
          className={fieldClassName}
          defaultValue={Math.min(remaining, 1000)}
          max={Math.min(remaining, 2000)}
          min={1}
          name="quantity"
          required
          type="number"
        />
      </label>
      <button
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#156240] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
        disabled={pending || !selected}
        type="submit"
      >
        {pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {copy.issue}
      </button>
      {state.status === "ISSUED" ? (
        <p
          className="rounded-xl bg-[#EAF5E8] px-4 py-3 text-sm font-bold text-[#156240]"
          role="status"
        >
          {copy.issued} {state.recipientName}
        </p>
      ) : null}
      {state.status && state.status !== "ISSUED" ? (
        <p
          className="rounded-xl bg-[#FFF0ED] px-4 py-3 text-sm text-[#B5301F]"
          role="alert"
        >
          {state.status === "SOLD_OUT" ? copy.remaining : copy.issueError}
        </p>
      ) : null}
    </form>
  );
}

export function TicketGiftabilityButton({
  definitionId,
  isGiftable,
  locale,
}: {
  definitionId: string;
  isGiftable: boolean;
  locale: string;
}) {
  const copy = getInventoryCopy(locale);
  const router = useRouter();
  const [state, action, pending] = useActionState<
    SetTicketGiftableState,
    FormData
  >(setTicketGiftableAction, {});

  useEffect(() => {
    if (state.status === "UPDATED") router.refresh();
  }, [router, state.status]);

  return (
    <form action={action} className="mt-2">
      <input name="locale" readOnly type="hidden" value={locale} />
      <input name="definitionId" readOnly type="hidden" value={definitionId} />
      <input
        name="isGiftable"
        readOnly
        type="hidden"
        value={String(!isGiftable)}
      />
      <button
        className="rounded-full border border-[#D6D5B2] px-3 py-1.5 text-xs font-bold text-[#156240] disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {isGiftable ? copy.disableGifting : copy.enableGifting}
      </button>
      {state.status && state.status !== "UPDATED" ? (
        <p className="mt-2 text-xs text-[#B5301F]" role="alert">
          {copy.createError}
        </p>
      ) : null}
    </form>
  );
}
