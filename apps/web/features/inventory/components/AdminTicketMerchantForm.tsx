"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  setTicketMerchantAction,
  type SetTicketMerchantState,
} from "@/features/inventory/actions/inventoryActions";
import { getAdminItemCopy } from "@/features/inventory/adminItemCopy";

export function AdminTicketMerchantForm({
  definitionId,
  locale,
  merchantId,
  merchants,
}: {
  definitionId: string;
  locale: string;
  merchantId: string | null;
  merchants: { city: string; id: string; name: string }[];
}) {
  const copy = getAdminItemCopy(locale);
  const router = useRouter();
  const [selectedMerchantId, setSelectedMerchantId] = useState(merchantId ?? "");
  const [state, action, pending] = useActionState<
    SetTicketMerchantState,
    FormData
  >(setTicketMerchantAction, {});
  const changed = selectedMerchantId !== (merchantId ?? "");

  useEffect(() => {
    setSelectedMerchantId(merchantId ?? "");
  }, [merchantId]);

  useEffect(() => {
    if (state.status === "UPDATED") router.refresh();
  }, [router, state.status]);

  return (
    <form action={action} className="mt-5 max-w-xl space-y-4">
      <input name="definitionId" readOnly type="hidden" value={definitionId} />
      <input name="locale" readOnly type="hidden" value={locale} />
      <label className="block text-sm font-semibold text-ink" htmlFor="ticket-merchant">
        {copy.form.merchantLabel}
      </label>
      <select
        className="min-h-12 w-full rounded-xl border border-sand bg-paper px-4 text-base text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
        id="ticket-merchant"
        name="merchantId"
        onChange={(event) => setSelectedMerchantId(event.target.value)}
        value={selectedMerchantId}
      >
        <option value="">{copy.form.merchantNone}</option>
        {merchants.map((merchant) => (
          <option key={merchant.id} value={merchant.id}>
            {merchant.name}{merchant.city ? ` · ${merchant.city}` : ""}
          </option>
        ))}
      </select>
      {changed ? (
        <p className="text-sm leading-6 text-ink/70">{copy.access.changeWarning}</p>
      ) : null}
      {changed ? (
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-sm font-bold text-paper disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          disabled={pending}
          type="submit"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {copy.access.saveMerchant}
        </button>
      ) : null}
      {state.status === "UPDATED" ? (
        <p className="text-sm font-semibold text-forest" role="status">
          {copy.access.merchantSaved}
        </p>
      ) : state.status ? (
        <p className="text-sm font-semibold text-danger" role="alert">
          {copy.access.merchantFailed}
        </p>
      ) : null}
    </form>
  );
}
