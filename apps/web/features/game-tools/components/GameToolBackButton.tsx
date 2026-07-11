"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const backCopy: Record<string, string> = {
  "zh-CN": "返回上一页",
  en: "Back",
  fr: "Retour",
};

type GameToolBackButtonProps = {
  className?: string;
  fallbackHref: string;
  locale: string;
};

export function GameToolBackButton({
  className,
  fallbackHref,
  locale,
}: GameToolBackButtonProps) {
  const router = useRouter();
  const label = backCopy[locale] ?? backCopy.en;

  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex h-10 w-10 max-w-full items-center justify-center rounded-full border border-[#8AB68E]/70 bg-[#FEFFF9]/95 text-sm font-black text-[#156240] shadow-sm shadow-[#156240]/5 transition hover:-translate-y-0.5 hover:border-[#369758] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/25 md:w-auto md:gap-2 md:px-3.5",
        className,
      )}
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push(fallbackHref);
      }}
    >
      <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="hidden truncate md:inline">{label}</span>
    </button>
  );
}
