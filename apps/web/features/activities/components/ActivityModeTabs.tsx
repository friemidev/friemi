import Link from "next/link";
import { Compass, UsersRound } from "lucide-react";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type ActivityModeTabsProps = {
  current: "activities" | "lobby";
  locale: string;
};

export function ActivityModeTabs({
  current,
  locale,
}: ActivityModeTabsProps) {
  const tabs = [
    {
      id: "activities" as const,
      href: withLocale(locale, "/activities"),
      icon: Compass,
      label:
        locale === "fr"
          ? "Découverte"
          : locale === "en"
            ? "Activity Discovery"
            : "活动发现",
    },
    {
      id: "lobby" as const,
      href: withLocale(locale, "/lobby"),
      icon: UsersRound,
      label:
        locale === "fr"
          ? "Hall d'équipe"
          : locale === "en"
            ? "Team Lobby"
            : "组队大厅",
    },
  ];

  return (
    <div className="mx-auto flex w-full justify-center">
      <div className="inline-flex w-full max-w-md rounded-[1.35rem] border border-[#d8ccb4] bg-[linear-gradient(135deg,rgba(252,249,243,0.98),rgba(243,238,228,0.96))] p-1 shadow-[0_8px_22px_rgba(88,71,45,0.05)]">
        {tabs.map((tab) => {
          const active = tab.id === current;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-2.5 rounded-[1rem] px-3 py-2.5 transition",
                active
                  ? tab.id === "activities"
                    ? "border border-[#b9cbe0] bg-[linear-gradient(135deg,rgba(224,235,244,0.98),rgba(206,220,234,0.95))] text-[#496983] shadow-[inset_0_1px_0_rgba(249,253,255,0.82),0_3px_10px_rgba(98,123,150,0.1)]"
                    : "border border-[#afc4a9] bg-[linear-gradient(135deg,rgba(212,228,207,0.98),rgba(194,214,187,0.95))] text-[#436042] shadow-[inset_0_1px_0_rgba(247,252,245,0.82),0_3px_10px_rgba(101,128,92,0.12)]"
                  : "text-[#726759] hover:bg-white/68 hover:text-[#64788f]",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  active
                    ? tab.id === "activities"
                      ? "bg-[rgba(235,244,250,0.86)] text-[#5a7890] ring-1 ring-[#c8d8e6]"
                      : "bg-[rgba(236,246,231,0.86)] text-[#4e704a] ring-1 ring-[#c1d2ba]"
                    : "bg-white/88 text-[#b08b58] ring-1 ring-[#ddd2bf]",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 truncate text-sm font-semibold">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
