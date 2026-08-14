"use client";

import Link from "next/link";
import { AlertCircle, RotateCw } from "lucide-react";
import { useParams } from "next/navigation";
import { withLocale } from "@/lib/routes";

export default function PlanetRoomError({ reset }: { error: Error; reset: () => void }) {
  const params = useParams<{ locale: string; planetSlug: string }>();
  const locale = params.locale ?? "zh-CN";
  const copy = locale === "fr"
    ? { back: "Retour aux planètes", retry: "Réessayer", title: "Impossible de charger la planète" }
    : locale === "en"
      ? { back: "Back to planets", retry: "Try again", title: "Unable to load this planet" }
      : { back: "返回星球广场", retry: "重试", title: "星球暂时无法加载" };

  return (
    <main className="planet-detail-page app-mobile-page-shell [--app-mobile-page-top-gap:2rem] [--app-mobile-page-bottom-gap:1.25rem] min-h-dvh bg-white px-5 text-[#111210]">
      <section className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center text-center">
        <AlertCircle className="h-10 w-10 text-[#8A6550]" />
        <h1 className="mt-4 text-lg font-bold">{copy.title}</h1>
        <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#155F40] px-5 py-2.5 text-sm font-bold text-white" onClick={reset} type="button">
          <RotateCw className="h-4 w-4" />
          {copy.retry}
        </button>
        <Link className="mt-4 text-sm font-semibold text-[#50645A]" href={withLocale(locale, "/planets")}>
          {copy.back}
        </Link>
      </section>
    </main>
  );
}
