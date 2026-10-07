import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { AccountLanguageSettingsSection } from "@/features/account/components/AccountLanguageSettingsSection";
import { withLocale } from "@/lib/routes";

type LanguageSettingsPageProps = {
  params: Promise<{ locale: string }>;
};

const copy = {
  "zh-CN": {
    title: "语言设置",
    back: "返回设置",
    choices: "界面语言",
  },
  en: {
    title: "Language settings",
    back: "Back to settings",
    choices: "Interface language",
  },
  fr: {
    title: "Langue de l’interface",
    back: "Retour aux réglages",
    choices: "Langue de l’interface",
  },
} as const;

export async function generateMetadata({
  params,
}: LanguageSettingsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const text = copy[locale as keyof typeof copy] ?? copy["zh-CN"];
  return { title: text.title };
}

export default async function LanguageSettingsPage({
  params,
}: LanguageSettingsPageProps) {
  const { locale } = await params;
  const text = copy[locale as keyof typeof copy] ?? copy["zh-CN"];

  return (
    <PageContainer className="app-mobile-page-shell [--app-mobile-page-top-gap:1rem] [--app-mobile-page-bottom-gap:1.75rem] max-w-xl px-5 pb-16 md:min-h-[70vh] md:py-10">
      <header className="flex min-h-11 items-center gap-3">
        <Link
          aria-label={text.back}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-ink transition hover:bg-sand/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          href={withLocale(locale, "/account/settings")}
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {text.title}
        </h1>
      </header>
      <div className="mt-8">
        <AccountLanguageSettingsSection label={text.choices} locale={locale} />
      </div>
    </PageContainer>
  );
}
