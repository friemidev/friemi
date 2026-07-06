"use client";

import { ArrowLeft } from "lucide-react";
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
      className={cn(
        "inline-flex h-10 max-w-full items-center gap-2 rounded-full border border-[#8AB68E]/70 bg-[#FEFFF9]/95 px-3.5 text-sm font-black text-[#156240] shadow-sm shadow-[#156240]/5 transition hover:-translate-y-0.5 hover:border-[#369758] hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/25",
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
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  );
}
