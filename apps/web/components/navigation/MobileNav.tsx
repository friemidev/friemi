import Link from "next/link";
import { CalendarPlus, CircleUserRound, Compass, Home } from "lucide-react";
import { withLocale } from "@/lib/routes";

type MobileNavProps = {
  locale: string;
};

const items = [
  { href: "/", label: "首页", icon: Home },
  { href: "/activities", label: "活动", icon: Compass },
  { href: "/activities/new", label: "发起", icon: CalendarPlus },
  { href: "/profile", label: "我的", icon: CircleUserRound }
];

export function MobileNav({ locale }: MobileNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-paper/95 backdrop-blur md:hidden">
      <div className="grid h-16 grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.href} href={withLocale(locale, item.href)} className="flex flex-col items-center justify-center gap-1 text-xs text-zinc-700">
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
