import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@chill-club/shared";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/navigation/MobileNav";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { hasClerkKeys } from "@/lib/clerk";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  const messages = await getMessages();
  const showAdminNav = await isCurrentUserAdmin();
  const content = (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-screen pb-24 md:pb-0">
        <AppHeader locale={locale} showAdminNav={showAdminNav} />
        {children}
        <MobileNav locale={locale} />
      </div>
    </NextIntlClientProvider>
  );

  return hasClerkKeys() ? <ClerkProvider>{content}</ClerkProvider> : content;
}
