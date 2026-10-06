"use client";

import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { withLocale } from "@/lib/routes";

export function ChatRoomLoading() {
  const { locale = "zh-CN" } = useParams<{ locale: string }>();
  const router = useRouter();
  const backLabel =
    locale === "fr" ? "Retour" : locale === "en" ? "Back" : "返回";
  const loadingLabel =
    locale === "fr"
      ? "Chargement de la discussion"
      : locale === "en"
        ? "Loading conversation"
        : "正在加载聊天";

  return (
    <div
      className="max-md:fixed max-md:inset-0 max-md:z-50 max-md:overflow-hidden max-md:bg-white md:px-5 md:py-8"
      data-chat-loading
    >
      <section
        aria-busy="true"
        aria-label={loadingLabel}
        className="mobile-chat-viewport mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden bg-white md:h-[calc(100dvh-8rem)] md:rounded-lg md:border md:border-black/5"
      >
        <header className="grid shrink-0 grid-cols-[2.25rem_1fr_2.25rem] items-center gap-3 border-b border-black/[0.04] px-4 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)]">
          <button
            aria-label={backLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D8E8DC] text-[#156240]"
            onClick={() =>
              window.history.length > 1
                ? router.back()
                : router.replace(withLocale(locale, "/footprints?tab=message"))
            }
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div
            aria-hidden="true"
            className="chat-loading-pulse mx-auto h-4 w-28 rounded bg-[#EDF1EE]"
          />
        </header>
        <div
          aria-hidden="true"
          className="chat-loading-pulse flex min-h-0 flex-1 flex-col justify-end gap-6 overflow-hidden px-4 pb-6"
        >
          {[false, true, false, false, true].map((mine, index) => (
            <div
              className={`flex items-start gap-2 ${mine ? "flex-row-reverse" : ""}`}
              key={index}
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-[#EDF1EE]" />
              <div
                className={`h-12 rounded-lg ${mine ? "w-[46%] bg-[#E8F2EC]" : "w-[58%] bg-[#F2F3F1]"}`}
              />
            </div>
          ))}
        </div>
        <div
          aria-hidden="true"
          className="flex shrink-0 items-center gap-3 border-t border-black/[0.04] px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2"
        >
          <div className="h-10 w-10 rounded-full bg-[#EDF1EE]" />
          <div className="h-[38px] flex-1 rounded-md border border-[#E5EAE6]" />
          <div className="h-10 w-10 rounded-full bg-[#E8F2EC]" />
        </div>
        <span className="sr-only" role="status">
          {loadingLabel}
        </span>
      </section>
    </div>
  );
}
