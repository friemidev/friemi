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
  "w-full min-h-12 rounded-xl border border-sand bg-paper px-3 py-3 text-base text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/20";

export function CreateTicketDefinitionForm({
  locale,
  showHeading = true,
}: {
  locale: string;
  showHeading?: boolean;
}) {
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
    <section className={showHeading ? "rounded-2xl bg-paper p-5 sm:p-6" : ""}>
      {showHeading ? (
        <>
          <h2 className="text-lg font-bold text-ink">{copy.create}</h2>
          <p className="mt-1 text-sm text-ink/70">{copy.ticketHint}</p>
        </>
      ) : null}
      <form
        action={action}
        className={`grid gap-4 ${showHeading ? "mt-5" : ""}`}
      >
        <input name="locale" readOnly type="hidden" value={locale} />
        <label className="grid gap-2 text-sm font-semibold text-ink">
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
        <label className="grid gap-2 text-sm font-semibold text-ink">
          {copy.description}
          <textarea
            className={fieldClassName}
            maxLength={1200}
            name="description"
            rows={3}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          {copy.supply}
          <input
            className={fieldClassName}
            defaultValue={1000}
            inputMode="numeric"
            max={100000}
            min={1}
            name="totalSupply"
            required
            type="number"
          />
        </label>
        <label className="flex min-h-12 items-center gap-3 rounded-xl bg-fog px-4 py-3 text-sm font-semibold text-ink">
          <input
            className="h-5 w-5 accent-forest"
            defaultChecked
            name="isGiftable"
            type="checkbox"
          />
          {copy.giftable}
        </label>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-paper transition hover:bg-forest/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-50"
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
        <p className="mt-4 text-sm font-bold text-forest" role="status">
          {copy.created}
        </p>
      ) : null}
      {state.status && state.status !== "CREATED" ? (
        <p className="mt-4 text-sm text-danger" role="alert">
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

  return (
    <div className="space-y-4">
      {remaining > 0 ? (
        <form action={action} className="space-y-5">
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
          <label className="grid gap-2 text-sm font-semibold text-ink">
            {copy.quantity}
            <input
              className={fieldClassName}
              defaultValue={Math.min(remaining, 1000)}
              inputMode="numeric"
              max={Math.min(remaining, 2000)}
              min={1}
              name="quantity"
              required
              type="number"
            />
          </label>
          <button
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-paper transition hover:bg-forest/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-50"
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
        </form>
      ) : null}
      {state.status === "ISSUED" ? (
        <p
          className="rounded-xl bg-fog px-4 py-3 text-sm font-bold text-forest"
          role="status"
        >
          {copy.issued} {state.recipientName}
        </p>
      ) : null}
      {state.status && state.status !== "ISSUED" ? (
        <p
          className="rounded-xl bg-rose/30 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {state.status === "SOLD_OUT" ? copy.remaining : copy.issueError}
        </p>
      ) : null}
    </div>
  );
}

export function TicketGiftabilityButton({
  definitionId,
  isGiftable,
  locale,
  tone = "light",
}: {
  definitionId: string;
  isGiftable: boolean;
  locale: string;
  tone?: "dark" | "light";
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
    <form action={action}>
      <input name="locale" readOnly type="hidden" value={locale} />
      <input name="definitionId" readOnly type="hidden" value={definitionId} />
      <input
        name="isGiftable"
        readOnly
        type="hidden"
        value={String(!isGiftable)}
      />
      <button
        aria-pressed={isGiftable}
        className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${
          tone === "dark"
            ? "bg-paper/10 text-paper hover:bg-paper/20 focus-visible:outline-paper"
            : "bg-fog text-forest hover:bg-sand/30 focus-visible:outline-forest"
        }`}
        disabled={pending}
        type="submit"
      >
        {isGiftable ? copy.disableGifting : copy.enableGifting}
      </button>
      {state.status && state.status !== "UPDATED" ? (
        <p
          className={`mt-2 text-xs ${tone === "dark" ? "text-paper" : "text-danger"}`}
          role="alert"
        >
          {copy.createError}
        </p>
      ) : null}
    </form>
  );
}
