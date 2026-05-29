import Link from "next/link";
import Image from "next/image";
import { CalendarPlus, CircleUserRound, Compass } from "lucide-react";
import { Button } from "@chill-club/ui";
import { withLocale } from "@/lib/routes";
import { LocaleSwitcher } from "@/components/navigation/LocaleSwitcher";
import { UserMenu } from "@/components/navigation/UserMenu";
import { getCopy } from "@/lib/copy";

type AppHeaderProps = {
  locale: string;
  showAdminNav?: boolean;
};

export function AppHeader({ locale, showAdminNav = false }: AppHeaderProps) {
  const t = getCopy(locale);
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={withLocale(locale, "/")}
          className="flex items-center gap-2"
        >
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-paper shadow-sm ring-1 ring-black/10">
            <Image
              src="/logo-icon.png"
              alt="Next Fun Club"
              width={40}
              height={40}
              className="h-full w-full object-cover"
              priority
            />
          </span>
          <span className="hidden text-sm font-semibold tracking-normal sm:inline">
            Next Fun Club
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link
            className="flex whitespace-nowrap items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-white/70"
            href={withLocale(locale, "/activities")}
          >
            <Compass className="h-4 w-4" />
            {t.nav.activities}
          </Link>
          <Link
            className="flex whitespace-nowrap items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-white/70 lg:hidden"
            href={withLocale(locale, "/activities/new")}
          >
            <CalendarPlus className="h-4 w-4" />
            {t.nav.newActivityShort}
          </Link>
          <Link
            className="flex whitespace-nowrap items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-white/70"
            href={withLocale(locale, "/profile")}
          >
            <CircleUserRound className="h-4 w-4" />
            {t.nav.profile}
          </Link>
        </nav>

        <div className="flex min-w-0 items-center gap-2">
          <LocaleSwitcher locale={locale} />
          <Link
            href={withLocale(locale, "/activities/new")}
            className="hidden lg:block"
          >
            <Button className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              {t.nav.newActivity}
            </Button>
          </Link>
          <UserMenu locale={locale} showAdminLink={showAdminNav} />
        </div>
      </div>
    </header>
  );
}
