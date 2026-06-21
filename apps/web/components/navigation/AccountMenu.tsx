"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  BarChart3,
  Bell,
  Building2,
  Check,
  Copy,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  ShieldAlert,
  UserPlus,
  type LucideIcon,
  UserRound,
} from "lucide-react";
import { getFriendsCopy } from "@/features/friends/copy";
import type { FriendRequestViewModel } from "@/features/friends/queries/getFriendsDashboard";
import { useNotificationBadge } from "@/features/notifications/components/NotificationBadgeProvider";
import { ProfileWechatBindingDialog } from "@/features/profile/components/ProfileWechatBindingDialog";
import { useViewerProfile } from "@/features/profile/components/ViewerProfileProvider";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { IntentPrefetchLink } from "./IntentPrefetchLink";

const AddFriendDialog = dynamic(
  () =>
    import("@/features/friends/components/FriendsDashboard").then(
      (mod) => mod.AddFriendDialog,
    ),
  { ssr: false },
);

type AccountMenuProps = {
  locale: string;
  showAdminLink?: boolean;
  unreadNotificationCount?: number;
  viewerFriendCode?: string | null;
  viewerWechatId?: string | null;
  viewerNickname?: string | null;
  incomingFriendRequests?: FriendRequestViewModel[];
};

export function AccountMenu({
  locale,
  showAdminLink = false,
  unreadNotificationCount = 0,
  viewerFriendCode = null,
  viewerWechatId = null,
  viewerNickname = null,
  incomingFriendRequests = [],
}: AccountMenuProps) {
  const { signOut, openUserProfile } = useClerk();
  const { user } = useUser();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [wechatDialogOpen, setWechatDialogOpen] = useState(false);
  const [wechatId, setWechatId] = useState(viewerWechatId);
  const [friendCodeCopied, setFriendCodeCopied] = useState(false);
  const [liveIncomingFriendRequests, setLiveIncomingFriendRequests] = useState(
    incomingFriendRequests,
  );
  const menuRef = useRef<HTMLDivElement>(null);
  const { unreadNotificationCount: liveUnreadNotificationCount } =
    useNotificationBadge(unreadNotificationCount);
  const { nickname: liveNickname } = useViewerProfile();
  const t = getCopy(locale).accountMenu;
  const profileCopy = getCopy(locale).profile;
  const friendsCopy = getFriendsCopy(locale);

  const displayName =
    liveNickname.trim() ||
    viewerNickname?.trim() ||
    user?.username ||
    t.fallbackName;
  const avatarUrl = user?.imageUrl;
  const initial = displayName.trim().charAt(0).toUpperCase() || "N";
  const profileHref = withLocale(locale, "/profile");
  const messagesHref = withLocale(locale, "/messages");
  const notificationsHref = withLocale(locale, "/notifications");
  const analyticsOpsHref = withLocale(locale, "/admin/analytics");
  const activityOpsHref = withLocale(locale, "/admin/data-scraper");
  const merchantOpsHref = withLocale(locale, "/admin/merchants");
  const reportOpsHref = withLocale(locale, "/admin/reports");
  const profileActive =
    pathname === profileHref || pathname.startsWith(`${profileHref}/`);
  const hasWechat = Boolean(wechatId?.trim());

  useEffect(() => {
    setLiveIncomingFriendRequests(incomingFriendRequests);
  }, [incomingFriendRequests]);

  useEffect(() => {
    setWechatId(viewerWechatId);
  }, [viewerWechatId]);

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    const abortController = new AbortController();

    void fetch("/api/friends/incoming-requests", {
      cache: "no-store",
      signal: abortController.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Incoming requests failed: ${response.status}`);
        }

        return response.json() as Promise<{
          incomingRequests?: FriendRequestViewModel[];
        }>;
      })
      .then((payload) => {
        setLiveIncomingFriendRequests(payload.incomingRequests ?? []);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      });

    return () => {
      abortController.abort();
    };
  }, [open, user]);

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

  function openAddFriendDialog() {
    setOpen(false);
    setAddFriendOpen(true);
  }

  function openWechatDialog() {
    setOpen(false);
    setWechatDialogOpen(true);
  }

  async function copyFriendCode() {
    if (!viewerFriendCode) return;

    try {
      await navigator.clipboard.writeText(viewerFriendCode);
      setFriendCodeCopied(true);
      window.setTimeout(() => setFriendCodeCopied(false), 1400);
    } catch {
      setFriendCodeCopied(false);
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={t.openMenu}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-rose-500 text-sm font-semibold text-white shadow-sm ring-1 ring-black/10 transition hover:bg-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d88d72]/35",
          profileActive &&
            "ring-2 ring-[#d8c9b3] ring-offset-2 ring-offset-paper after:absolute after:inset-[3px] after:rounded-full after:ring-2 after:ring-white/85",
        )}
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
              <div className="mt-2 flex min-w-0 items-stretch gap-2">
                {viewerFriendCode ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-zinc-50 px-2.5 py-2 ring-1 ring-black/5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium leading-none text-zinc-500">
                        {profileCopy.friendCodeLabel}
                      </p>
                      <p className="mt-1 font-mono text-xs font-semibold tracking-[0.18em] text-ink">
                        {viewerFriendCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-600 shadow-sm ring-1 ring-black/10 transition hover:bg-paper hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                      aria-label={
                        friendCodeCopied
                          ? profileCopy.friendCodeCopied
                          : profileCopy.copyFriendCode
                      }
                      title={
                        friendCodeCopied
                          ? profileCopy.friendCodeCopied
                          : profileCopy.copyFriendCode
                      }
                      onClick={copyFriendCode}
                    >
                      {friendCodeCopied ? (
                        <Check className="h-3.5 w-3.5 text-moss" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d88d72]/35",
                    hasWechat
                      ? "bg-white ring-1 ring-[#bfe5c8] hover:bg-green-50/50"
                      : "bg-zinc-50 ring-1 ring-black/5 hover:bg-paper",
                  )}
                  aria-label={
                    hasWechat ? profileCopy.wechatBound : profileCopy.wechatUnbound
                  }
                  title={
                    hasWechat ? profileCopy.wechatBound : profileCopy.wechatUnbound
                  }
                  onClick={openWechatDialog}
                >
                  <Image
                    alt=""
                    aria-hidden="true"
                    className={cn(
                      "h-7 w-7 object-contain",
                      !hasWechat && "grayscale opacity-35",
                    )}
                    height={28}
                    src="/wechat/wechat-icon.png"
                    width={28}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="py-2">
            <MenuLink
              href={profileHref}
              icon={UserRound}
              label={t.profile}
              active={profileActive}
              onClick={closeMenu}
            />
            <MenuButton
              icon={UserPlus}
              label={friendsCopy.addTitle}
              badgeCount={liveIncomingFriendRequests.length}
              onClick={openAddFriendDialog}
            />
            <WechatMenuButton
              active={hasWechat}
              label={hasWechat ? profileCopy.editWechat : profileCopy.bindWechat}
              onClick={openWechatDialog}
            />
            <MenuLink
              href={messagesHref}
              icon={MessageCircle}
              label={t.messages}
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
              badgeCount={liveUnreadNotificationCount}
              active={pathname === notificationsHref}
              onClick={closeMenu}
            />
            {showAdminLink ? (
              <>
                <MenuLink
                  href={analyticsOpsHref}
                  icon={BarChart3}
                  label={t.analyticsOps}
                  active={pathname.startsWith(analyticsOpsHref)}
                  onClick={closeMenu}
                />
                <MenuLink
                  href={activityOpsHref}
                  icon={LayoutDashboard}
                  label={t.activityOps}
                  active={pathname.startsWith(activityOpsHref)}
                  onClick={closeMenu}
                />
                <MenuLink
                  href={merchantOpsHref}
                  icon={Building2}
                  label={t.merchantOps}
                  active={pathname.startsWith(merchantOpsHref)}
                  onClick={closeMenu}
                />
                <MenuLink
                  href={reportOpsHref}
                  icon={ShieldAlert}
                  label={t.reportOps}
                  active={pathname.startsWith(reportOpsHref)}
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
      {addFriendOpen ? (
        <AddFriendDialog
          currentUserFriendCode={viewerFriendCode}
          incomingRequests={liveIncomingFriendRequests}
          locale={locale}
          onClose={() => setAddFriendOpen(false)}
          returnTo="messages"
        />
      ) : null}
      {wechatDialogOpen ? (
        <ProfileWechatBindingDialog
          initialWechatId={wechatId}
          locale={locale}
          onClose={() => setWechatDialogOpen(false)}
          onSaved={setWechatId}
        />
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
    <IntentPrefetchLink
      role="menuitem"
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-start gap-3 px-4 py-3 text-sm text-zinc-700 transition hover:bg-zinc-50",
        description ? "items-start" : "items-center",
        active && "bg-[#fff7ec] text-ink",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 text-zinc-500",
          active && "text-[#9b654f]",
        )}
        strokeWidth={active ? 2.4 : 2}
      />
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
    </IntentPrefetchLink>
  );
}

function MenuButton({
  icon: Icon,
  label,
  badgeCount = 0,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  badgeCount?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="relative flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
    >
      <Icon className="h-4 w-4 shrink-0 text-zinc-500" />
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{label}</span>
          {badgeCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-moss px-1.5 text-[11px] font-semibold text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function WechatMenuButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="relative flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-zinc-700 transition hover:bg-zinc-50"
    >
      <span
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          active
            ? "bg-white ring-1 ring-[#bfe5c8]"
            : "bg-zinc-100 ring-1 ring-zinc-200",
        )}
        aria-hidden="true"
      >
        <Image
          alt=""
          className={cn("h-4 w-4 object-contain", !active && "grayscale opacity-35")}
          height={16}
          src="/wechat/wechat-icon.png"
          width={16}
        />
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}
