import Link from "next/link";
import { CalendarPlus, CircleUserRound, Compass, Home } from "lucide-react";
import { withLocale } from "@/lib/routes";
import { getCopy } from "@/lib/copy";

type MobileNavProps = {
  locale: string;
};

export function MobileNav({ locale }: MobileNavProps) {
  const t = getCopy(locale);
  const items = [
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/activities", label: t.nav.activities, icon: Compass },
    {
      href: "/activities/new",
      label: t.nav.newActivityShort,
      icon: CalendarPlus,
    },
    { href: "/profile", label: t.nav.profileShort, icon: CircleUserRound },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-paper/95 backdrop-blur md:hidden">
      <div className="grid h-16 grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={withLocale(locale, item.href)}
              className="flex min-w-0 flex-col items-center justify-center gap-1 text-xs text-zinc-700"
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full whitespace-nowrap text-[11px] leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
