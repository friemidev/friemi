"use client";

import Link from "next/link";
import { LoaderCircle, Plus, Save, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { withLocale } from "@/lib/routes";
import {
  createTicketDefinitionAction,
  issueTicketBatchAction,
  setTicketGiftableAction,
  updateTicketImageAction,
  type CreateTicketDefinitionState,
  type IssueTicketState,
  type SetTicketGiftableState,
  type UpdateTicketImageState,
} from "../actions/inventoryActions";
import { getAdminItemCopy } from "../adminItemCopy";
import { getInventoryCopy } from "../copy";
import { AdminItemImageField } from "./AdminItemImageField";
import {
  FriemiRecipientPicker,
  type InventoryRecipient,
} from "./FriemiRecipientPicker";

const fieldClassName =
  "w-full min-h-12 rounded-xl border border-sand bg-paper px-3 py-3 text-base text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/20";

export function CreateTicketDefinitionForm({
  locale,
  merchants = [],
  showHeading = true,
}: {
  locale: string;
  merchants?: { city: string; id: string; name: string }[];
  showHeading?: boolean;
}) {
  const copy = getInventoryCopy(locale);
  const adminCopy = getAdminItemCopy(locale);
  const router = useRouter();
  const [state, action, pending] = useActionState<
    CreateTicketDefinitionState,
    FormData
  >(createTicketDefinitionAction, {});
  const [uploading, setUploading] = useState(false);
  const [previewReady, setPreviewReady] = useState(true);

  useEffect(() => {
    if (state.status === "CREATED" && state.definitionId) {
      router.replace(
        withLocale(
          locale,
          `/admin/items/${encodeURIComponent(state.definitionId)}`,
        ),
      );
    }
  }, [locale, router, state.definitionId, state.status]);

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
          {adminCopy.form.merchantLabel}
          <select className={fieldClassName} defaultValue="" name="merchantId">
            <option value="">{adminCopy.form.merchantNone}</option>
            {merchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name} · {merchant.city}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal leading-5 text-ink/70">
            {adminCopy.form.merchantHint}
          </span>
        </label>
        <div className="grid gap-2 text-sm font-semibold text-ink">
          {adminCopy.form.optionalImage}
          <AdminItemImageField
            locale={locale}
            onPreviewReadyChange={setPreviewReady}
            onUploadingChange={setUploading}
          />
        </div>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          {copy.supply}
          <input
            className={fieldClassName}
            inputMode="numeric"
            max={100000}
            min={1}
            name="totalSupply"
            placeholder={copy.adminSupplyPlaceholder}
            required
            type="number"
          />
          <span className="text-xs font-normal leading-5 text-ink/70">
            {copy.adminSupplyHint}
          </span>
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
        <p className="-mt-2 text-sm leading-6 text-ink/70">
          {copy.adminGiftFormHint}
        </p>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-paper transition hover:bg-forest/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-50"
          disabled={pending || uploading || !previewReady}
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

export function UpdateTicketImageForm({
  definitionId,
  imageUrl,
  locale,
}: {
  definitionId: string;
  imageUrl: string | null;
  locale: string;
}) {
  const copy = getAdminItemCopy(locale).form;
  const router = useRouter();
  const [state, action, pending] = useActionState<
    UpdateTicketImageState,
    FormData
  >(updateTicketImageAction, {});
  const [uploading, setUploading] = useState(false);
  const [draftUrl, setDraftUrl] = useState(imageUrl ?? "");
  const [savedUrl, setSavedUrl] = useState(imageUrl ?? "");
  const [previewReady, setPreviewReady] = useState(true);
  const submittedUrlRef = useRef(imageUrl ?? "");
  const changed = draftUrl !== savedUrl;

  useEffect(() => {
    setDraftUrl(imageUrl ?? "");
    setSavedUrl(imageUrl ?? "");
  }, [imageUrl]);

  useEffect(() => {
    if (state.status !== "UPDATED") return;
    setSavedUrl(submittedUrlRef.current);
    router.refresh();
  }, [router, state]);

  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={() => {
        submittedUrlRef.current = draftUrl;
      }}
    >
      <input name="locale" readOnly type="hidden" value={locale} />
      <input name="definitionId" readOnly type="hidden" value={definitionId} />
      <AdminItemImageField
        initialUrl={imageUrl}
        locale={locale}
        onChange={setDraftUrl}
        onPreviewReadyChange={setPreviewReady}
        onUploadingChange={setUploading}
      />
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-forest px-4 text-sm font-bold text-paper transition hover:bg-forest/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-50"
        disabled={pending || uploading || !previewReady || !changed}
        type="submit"
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Save aria-hidden="true" className="h-4 w-4" />
        )}
        {copy.saveImage}
      </button>
      {state.status === "UPDATED" ? (
        <p className="text-sm font-semibold text-forest" role="status">
          {copy.imageUpdated}
        </p>
      ) : null}
      {state.status && state.status !== "UPDATED" ? (
        <p className="text-sm text-danger" role="alert">
          {state.status === "INVALID"
            ? copy.invalidImage
            : state.status === "FORBIDDEN"
              ? copy.forbidden
              : copy.saveFailed}
        </p>
      ) : null}
    </form>
  );
}

export function IssueTicketForm({
  definitionId,
  initialRequestId,
  locale,
  remaining,
  ticketTitle,
}: {
  definitionId: string;
  initialRequestId: string;
  locale: string;
  remaining: number;
  ticketTitle: string;
}) {
  const copy = getInventoryCopy(locale);
  const router = useRouter();
  const [state, action, pending] = useActionState<IssueTicketState, FormData>(
    issueTicketBatchAction,
    {},
  );
  const [recipient, setRecipient] = useState<InventoryRecipient | null>(null);
  const [quantity, setQuantity] = useState("");
  const [requestId, setRequestId] = useState(initialRequestId);
  const maxQuantity = Math.min(remaining, 2000);
  const quantityNumber = Number(quantity);
  const canIssue =
    recipient !== null &&
    /^\d+$/.test(quantity) &&
    Number.isSafeInteger(quantityNumber) &&
    quantityNumber >= 1 &&
    quantityNumber <= maxQuantity;

  useEffect(() => {
    if (state.status !== "ISSUED") return;
    setRecipient(null);
    setQuantity("");
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
            onRecipientChange={setRecipient}
            purpose="allocate"
          />
          <label className="grid gap-2 text-sm font-semibold text-ink">
            {copy.adminIssueQuantity}
            <input
              className={fieldClassName}
              inputMode="numeric"
              max={maxQuantity}
              min={1}
              name="quantity"
              onChange={(event) => setQuantity(event.target.value)}
              required
              type="number"
              value={quantity}
            />
            <span className="text-xs font-normal text-ink/70">
              {copy.adminIssueLimit(maxQuantity)}
            </span>
          </label>
          {canIssue && recipient ? (
            <p className="rounded-xl bg-fog px-4 py-3 text-sm leading-6 text-ink">
              {copy.adminIssueReview(
                quantityNumber,
                ticketTitle,
                recipient.nickname,
                recipient.friendCode ?? "",
              )}
            </p>
          ) : null}
          <button
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-paper transition hover:bg-forest/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-50"
            disabled={pending || !canIssue}
            type="submit"
          >
            {pending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {copy.adminIssueConfirm}
          </button>
        </form>
      ) : null}
      {state.status === "ISSUED" ? (
        <div
          className="rounded-xl bg-fog px-4 py-3 text-sm text-forest"
          role="status"
        >
          <p className="font-bold">
            {copy.issued} {state.recipientName}
          </p>
          <Link
            className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={withLocale(locale, `/admin/items/tickets/${definitionId}`)}
          >
            {copy.adminIssueSuccessHistory}
          </Link>
        </div>
      ) : null}
      {state.status && state.status !== "ISSUED" ? (
        <p
          className="rounded-xl bg-rose/30 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {state.status === "SOLD_OUT"
            ? copy.adminIssueNoStock
            : state.status === "NOT_FOUND"
              ? copy.adminIssueNotFound
              : state.status === "INVALID"
                ? copy.adminIssueInvalid
                : copy.issueError}
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
