"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type PlanetChatBackButtonProps = {
  fallbackHref: string;
  label: string;
};

export function PlanetChatBackButton({
  fallbackHref,
  label,
}: PlanetChatBackButtonProps) {
  const router = useRouter();

  return (
    <button
      aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D9D6C8] bg-white text-[#155F40] transition active:scale-95"
      onClick={() => {
        let hasInternalReferrer = false;

        try {
          const referrer = document.referrer ? new URL(document.referrer) : null;
          hasInternalReferrer = Boolean(referrer) && referrer?.origin === window.location.origin;
        } catch {
          hasInternalReferrer = false;
        }

        if (hasInternalReferrer && window.history.length > 1) {
          router.back();
          return;
        }

        router.replace(fallbackHref);
      }}
      title={label}
      type="button"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
