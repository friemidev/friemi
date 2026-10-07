"use client";

import {
  BadgeCheck,
  CircleAlert,
  LoaderCircle,
  TicketCheck,
} from "lucide-react";
import { useState } from "react";
import {
  redeemTicketByTokenAction,
  type getTicketRedemptionPreview,
} from "@/features/inventory/actions/ticketRedemptionActions";
import { InventoryItemArtwork } from "@/features/inventory/components/InventoryItemArtwork";
import { getTicketRedemptionCopy } from "@/features/inventory/ticketRedemptionCopy";

type Preview =
  | Awaited<ReturnType<typeof getTicketRedemptionPreview>>
  | Awaited<ReturnType<typeof redeemTicketByTokenAction>>;

export function TicketRedemptionPreview({
  expectedDefinitionId,
  initialPreview,
  locale,
  token,
}: {
  expectedDefinitionId?: string;
  initialPreview: Preview;
  locale: string;
  token: string;
}) {
  const copy = getTicketRedemptionCopy(locale);
  const [preview, setPreview] = useState<Preview>(initialPreview);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const hasDetails =
    preview.status === "READY" ||
    preview.status === "ALREADY_REDEEMED" ||
    preview.status === "REDEEMED";

  async function redeem() {
    if (preview.status !== "READY") return;
    setPending(true);
    setError("");
    try {
      const result = await redeemTicketByTokenAction(
        token,
        locale,
        expectedDefinitionId,
      );
      if (result.status === "FAILED") {
        setError(copy.unavailable);
      } else {
        setPreview(result);
      }
    } catch {
      setError(copy.unavailable);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[1.35rem] bg-white shadow-[0_18px_45px_rgba(24,53,36,0.10)] ring-1 ring-[#D6D5B2]">
      {hasDetails ? (
        <>
          {preview.imageUrl ? (
            <InventoryItemArtwork
              alt={preview.title}
              className="aspect-[4/3] w-full"
              fit="contain"
              imageUrl={preview.imageUrl}
            />
          ) : null}
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-[#68776A]">
                  {copy.ticket}
                </p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-[#111210]">
                  {preview.title}
                </h2>
              </div>
              <TicketCheck
                aria-hidden="true"
                className="h-7 w-7 shrink-0 text-[#156240]"
              />
            </div>
            <dl className="mt-5 divide-y divide-[#EBEEE7] border-y border-[#EBEEE7] text-sm">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-[#667065]">{copy.serial}</dt>
                <dd className="font-bold tabular-nums text-[#111210]">
                  {preview.serialNumber}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-[#667065]">{copy.holder}</dt>
                <dd className="min-w-0 text-right font-bold text-[#111210]">
                  {preview.ownerNickname}
                </dd>
              </div>
            </dl>

            {preview.status === "READY" ? (
              <>
                <p className="mt-5 text-sm leading-6 text-[#667065]">
                  {copy.confirmHint}
                </p>
                {error ? (
                  <p
                    className="mt-3 text-sm font-semibold text-[#A62834]"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
                <button
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#156240] px-5 text-sm font-bold text-white disabled:opacity-50 active:scale-[0.99]"
                  disabled={pending}
                  onClick={redeem}
                  type="button"
                >
                  {pending ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : (
                    <BadgeCheck aria-hidden="true" className="h-4 w-4" />
                  )}
                  {pending ? copy.processing : copy.confirm}
                </button>
              </>
            ) : (
              <div
                className={`mt-5 flex items-start gap-3 rounded-xl p-4 text-sm font-bold ${
                  preview.status === "REDEEMED"
                    ? "bg-[#EAF5E8] text-[#156240]"
                    : "bg-[#FFF2E6] text-[#8F5522]"
                }`}
                role="status"
              >
                {preview.status === "REDEEMED" ? (
                  <BadgeCheck aria-hidden="true" className="h-5 w-5 shrink-0" />
                ) : (
                  <CircleAlert
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                  />
                )}
                <div>
                  <p>
                    {preview.status === "REDEEMED"
                      ? copy.redeemed
                      : copy.alreadyRedeemed}
                  </p>
                  <p className="mt-1 font-normal">
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(preview.redeemedAt))}
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="p-7 text-center">
          <CircleAlert
            aria-hidden="true"
            className="mx-auto h-9 w-9 text-[#A62834]"
          />
          <h2 className="mt-4 text-lg font-bold text-[#111210]">
            {preview.status === "EXPIRED"
              ? copy.expired
              : preview.status === "MISMATCH"
                ? copy.mismatch
                : preview.status === "FORBIDDEN"
                  ? copy.unavailable
                  : copy.invalid}
          </h2>
        </div>
      )}
    </section>
  );
}
