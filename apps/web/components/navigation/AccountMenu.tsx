"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  Bell,
  Building2,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  type LucideIcon,
  UserRound,
} from "lucide-react";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type AccountMenuProps = {
  locale: string;
  showAdminLink?: boolean;
  unreadNotificationCount?: number;
};

export function AccountMenu({
  locale,
  showAdminLink = false,
  unreadNotificationCount = 0,
}: AccountMenuProps) {
  const { signOut, openUserProfile } = useClerk();
  const { user } = useUser();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = getCopy(locale).accountMenu;

  const displayName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    t.fallbackName;
  const email = user?.primaryEmailAddress?.emailAddress;
  const avatarUrl = user?.imageUrl;
  const initial = displayName.trim().charAt(0).toUpperCase() || "N";
  const profileHref = withLocale(locale, "/profile");
  const messagesHref = withLocale(locale, "/messages");
  const notificationsHref = withLocale(locale, "/notifications");
  const activityOpsHref = withLocale(locale, "/admin/data-scraper");
  const merchantOpsHref = withLocale(locale, "/admin/merchants");

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={t.openMenu}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-rose-500 text-sm font-semibold text-white shadow-sm ring-1 ring-black/10 transition hover:bg-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
      >
        <AvatarCircle
          avatarUrl={avatarUrl}
          displayName={displayName}
          initial={initial}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl"
        >
          <div className="flex items-center gap-3 border-b border-black/5 px-4 py-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-rose-500 text-base font-semibold text-white">
              <AvatarCircle
                avatarUrl={avatarUrl}
                displayName={displayName}
                initial={initial}
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {displayName}
              </p>
              {email ? (
                <p className="truncate text-xs text-zinc-500">{email}</p>
              ) : null}
            </div>
          </div>

          <div className="py-2">
            <MenuLink
              href={profileHref}
              icon={UserRound}
              label={t.profile}
              active={pathname === profileHref}
              onClick={closeMenu}
            />
            <MenuLink
              href={messagesHref}
              icon={MessageCircle}
              label={t.messages}
              description={t.messagesDescription}
              active={
                pathname === messagesHref ||
                pathname.startsWith(`${messagesHref}/`)
              }
              onClick={closeMenu}
            />
            <MenuLink
              href={notificationsHref}
              icon={Bell}
              label={t.notifications}
              description={t.notificationsDescription}
              badgeCount={unreadNotificationCount}
              active={pathname === notificationsHref}
              onClick={closeMenu}
            />
            {showAdminLink ? (
              <>
                <MenuLink
                  href={activityOpsHref}
                  icon={LayoutDashboard}
                  label={t.activityOps}
                  description={t.activityOpsDescription}
                  active={pathname.startsWith(activityOpsHref)}
                  onClick={closeMenu}
                />
                <MenuLink
                  href={merchantOpsHref}
                  icon={Building2}
                  label={t.merchantOps}
                  description={t.merchantOpsDescription}
                  active={pathname.startsWith(merchantOpsHref)}
                  onClick={closeMenu}
                />
              </>
            ) : null}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                openUserProfile();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
            >
              <Settings className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="font-medium">{t.accountSettings}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                void signOut({ redirectUrl: withLocale(locale, "/") });
              }}
              className="flex w-full items-center gap-3 border-t border-black/5 px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
            >
              <LogOut className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="font-medium">{t.signOut}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AvatarCircle({
  avatarUrl,
  displayName,
  initial,
}: {
  avatarUrl?: string;
  displayName: string;
  initial: string;
}) {
  if (avatarUrl) {
    return (
      // Clerk returns already optimized avatar URLs. A plain img avoids adding
      // another configured remote image dependency for this tiny control.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={displayName}
        className="h-full w-full object-cover"
      />
    );
  }

  return <span aria-hidden="true">{initial}</span>;
}

function MenuLink({
  href,
  icon: Icon,
  label,
  description,
  active = false,
  badgeCount = 0,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  active?: boolean;
  badgeCount?: number;
  onClick: () => void;
}) {
  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-start gap-3 px-4 py-3 text-sm text-zinc-700 transition hover:bg-zinc-50",
        description ? "items-start" : "items-center",
        active && "bg-zinc-50 text-ink",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{label}</span>
          {badgeCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-moss px-1.5 text-[11px] font-semibold text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ) : null}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
            {description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
