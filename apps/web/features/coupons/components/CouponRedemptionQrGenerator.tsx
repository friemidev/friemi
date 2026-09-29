"use client";

import { LoaderCircle, QrCode, RefreshCw } from "lucide-react";
import { useActionState } from "react";
import {
  generateCouponRedemptionTokenAction,
  type GenerateCouponRedemptionTokenState,
} from "@/features/coupons/actions/couponActions";
import { CouponQrCode } from "./CouponQrCode";

const initialState: GenerateCouponRedemptionTokenState = {};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      copy: "Copier le lien",
      copied: "Lien copié",
      error: "Ce coupon ne peut plus générer de QR code.",
      generate: "Afficher le QR code",
      hint: "Ce QR code est valable 10 minutes. Présentez-le à la boutique.",
      refresh: "Actualiser le QR code",
    };
  }
  if (locale === "en") {
    return {
      copy: "Copy link",
      copied: "Link copied",
      error: "A redemption QR code cannot be generated for this coupon.",
      generate: "Show QR code",
      hint: "This QR code is valid for 10 minutes. Show it to the store.",
      refresh: "Refresh QR code",
    };
  }
  return {
    copy: "复制核销链接",
    copied: "链接已复制",
    error: "这张优惠券暂时无法生成核销二维码。",
    generate: "展示二维码",
    hint: "二维码有效期为 10 分钟，请向店家出示并由店家扫码核销。",
    refresh: "刷新二维码",
  };
}

export function CouponRedemptionQrGenerator({
  itemId,
  locale,
}: {
  itemId: string;
  locale: string;
}) {
  const copy = getCopy(locale);
  const [state, formAction, pending] = useActionState(
    generateCouponRedemptionTokenAction,
    initialState,
  );

  return (
    <section className="mt-6 rounded-[1.25rem] bg-white p-5 ring-1 ring-[#D6D5B2]">
      {state.path ? (
        <CouponQrCode
          copiedLabel={copy.copied}
          copyLabel={copy.copy}
          path={state.path}
        />
      ) : null}

      <p className="mx-auto mt-4 max-w-xs text-center text-xs font-semibold leading-5 text-[#6C746A]">
        {copy.hint}
      </p>

      {state.status && state.status !== "GENERATED" ? (
        <p className="mt-3 text-center text-xs font-bold text-[#A62834]">
          {copy.error}
        </p>
      ) : null}

      <form action={formAction} className="mt-4">
        <input name="itemId" type="hidden" value={itemId} />
        <input name="locale" type="hidden" value={locale} />
        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-black text-white disabled:opacity-55"
          disabled={pending}
          type="submit"
        >
          {pending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : state.path ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <QrCode className="h-4 w-4" />
          )}
          {state.path ? copy.refresh : copy.generate}
        </button>
      </form>
    </section>
  );
}
