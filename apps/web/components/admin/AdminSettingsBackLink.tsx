import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { withLocale } from "@/lib/routes";

const backLabels: Record<string, string> = {
  "zh-CN": "返回设置",
  en: "Back to settings",
  fr: "Retour aux paramètres",
};

export function AdminSettingsBackLink({ locale }: { locale: string }) {
  const label = backLabels[locale] ?? backLabels["zh-CN"];

  return (
    <Link
      aria-label={label}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-ink transition hover:bg-sand/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
      href={withLocale(locale, "/account/settings")}
      title={label}
    >
      <ArrowLeft aria-hidden="true" className="h-5 w-5" />
    </Link>
  );
}
