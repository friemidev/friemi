"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Landmark,
  Mail,
  MessageCircleMore,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Method = {
  key: string;
  label: string;
  value: string;
  available: boolean;
  icon: typeof Landmark;
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      copied: "Copié",
      direct:
        "Le paiement va directement au participant. Friemi ne conserve jamais votre argent.",
      offline: "À convenir ensemble",
      missing: "À confirmer avec le bénéficiaire",
      title: "Modes de paiement du bénéficiaire",
    };
  }
  if (locale === "en") {
    return {
      copied: "Copied",
      direct: "Pay the participant directly. Friemi never holds your money.",
      offline: "Arrange directly",
      missing: "Confirm with the recipient",
      title: "Recipient payment methods",
    };
  }
  return {
    copied: "已复制",
    direct: "请直接向参与者付款，Friemi 不经手也不保管资金。",
    offline: "线下协商",
    missing: "请与收款人确认",
    title: "收款方付款方式",
  };
}

export function AaPaymentMethods({
  compact = false,
  contactEmail,
  locale,
  payeeName,
  wechatId,
}: {
  compact?: boolean;
  contactEmail: string | null;
  locale: string;
  payeeName: string;
  wechatId: string | null;
}) {
  const copy = getCopy(locale);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fallback = `${copy.missing} · ${payeeName}`;
  const methods: Method[] = [
    {
      available: false,
      icon: Landmark,
      key: "iban",
      label: "IBAN",
      value: fallback,
    },
    {
      available: false,
      icon: Smartphone,
      key: "revolut",
      label: "Revolut",
      value: fallback,
    },
    {
      available: Boolean(contactEmail),
      icon: Mail,
      key: "paypal",
      label: "PayPal",
      value: contactEmail ?? fallback,
    },
    {
      available: Boolean(wechatId),
      icon: MessageCircleMore,
      key: "other",
      label: locale === "fr" ? "Autre" : locale === "en" ? "Other" : "其他方式",
      value: wechatId ? `微信 ${wechatId}` : fallback,
    },
  ];
  const availableMethods = compact
    ? methods.filter((method) => method.available)
    : methods;
  const visibleMethods =
    availableMethods.length > 0
      ? availableMethods
      : [
          {
            available: false,
            icon: Landmark,
            key: "offline",
            label: copy.offline,
            value: fallback,
          },
        ];

  const copyValue = async (method: Method) => {
    if (!method.available) return;
    await navigator.clipboard.writeText(method.value);
    setCopiedKey(method.key);
    window.setTimeout(() => setCopiedKey(null), 1600);
  };

  return (
    <section>
      <h2
        className={cn(
          "font-black text-[#1D1D1B]",
          compact ? "text-[11px]" : "text-[12px]",
        )}
      >
        {copy.title}
      </h2>
      <div
        className={cn(
          "overflow-hidden border border-[#E7E1CE] bg-[#FEFFF9]",
          compact ? "mt-2 rounded-[12px]" : "mt-3 rounded-[14px]",
        )}
      >
        {visibleMethods.map((method, index) => {
          const Icon = method.icon;
          const copied = copiedKey === method.key;

          return (
            <button
              className={cn(
                "flex min-h-[58px] w-full items-center gap-3 px-4 text-left transition",
                compact && "min-h-[50px] px-3",
                index > 0 && "border-t border-[#EEEBDD]",
                method.available
                  ? "hover:bg-[#F5F8F2] active:bg-[#EEF5EC]"
                  : "cursor-default",
              )}
              disabled={!method.available}
              key={method.key}
              onClick={() => copyValue(method)}
              type="button"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white text-[#156240] ring-1 ring-[#DCE5D8]">
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-black text-[#1D1D1B]">
                  {method.label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-[10px] font-semibold",
                    method.available ? "text-[#777F78]" : "text-[#AAA79E]",
                  )}
                >
                  {method.value}
                </span>
              </span>
              {method.available ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#369758]">
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied
                    ? copy.copied
                    : locale === "fr"
                      ? "Copier"
                      : locale === "en"
                        ? "Copy"
                        : "复制"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p
        className={cn(
          "rounded-[12px] bg-[#FFF7E8] px-3 text-[10px] font-semibold text-[#806B3D]",
          compact ? "mt-2 py-2 leading-4" : "mt-3 py-2.5 leading-5",
        )}
      >
        {copy.direct}
      </p>
    </section>
  );
}
