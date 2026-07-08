"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  BarChart3,
  Bell,
  Building2,
  Check,
  Copy,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  type LucideIcon,
  UserRound,
} from "lucide-react";
import { getFriendsCopy } from "@/features/friends/copy";
import type { FriendRequestViewModel } from "@/features/friends/queries/getFriendsDashboard";
import { useNotificationBadge } from "@/features/notifications/components/NotificationBadgeProvider";
import { ProfileContactBindingDialog } from "@/features/profile/components/ProfileContactBindingDialog";
import { isFriemiIOSApp, unregisterIOSMobileDevice } from "@/features/mobile/push/clientPush";
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
  viewerContactEmail?: string | null;
  viewerEmail?: string | null;
  viewerFriendCode?: string | null;
  viewerPhone?: string | null;
  viewerWechatId?: string | null;
  viewerNickname?: string | null;
  incomingFriendRequests?: FriendRequestViewModel[];
};

type AndroidPushTokenPayload = {
  deviceId?: string;
  fcmToken?: string;
  ok?: boolean;
};

const accountMenuSecurityCopy: Record<string, string> = {
  "zh-CN": "账号与安全",
  en: "Account & Security",
  fr: "Compte et securite",
};

function isFriemiAndroidApp() {
  return (
    typeof window !== "undefined" &&
    /FriemiAndroid\//i.test(window.navigator.userAgent)
  );
}

function parseAndroidPushTokenPayload(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AndroidPushTokenPayload;
  } catch {
    return null;
  }
}

async function unregisterAndroidPushToken() {
  if (!isFriemiAndroidApp()) {
    return;
  }

  const payload = parseAndroidPushTokenPayload(
    window.FriemiAndroid?.getStoredPushToken?.(),
  );

  if (!payload?.ok || (!payload.fcmToken && !payload.deviceId)) {
    return;
  }

  try {
    await fetch("/api/mobile/devices/unregister", {
      body: JSON.stringify({
        deviceId: payload.deviceId,
        fcmToken: payload.fcmToken,
        platform: "ANDROID",
      }),
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
  } catch (error) {
    console.error("Failed to unregister Android push token", error);
  }
}

export function AccountMenu({
  locale,
  showAdminLink = false,
  unreadNotificationCount = 0,
  viewerContactEmail = null,
  viewerEmail = null,
  viewerFriendCode = null,
  viewerPhone = null,
  viewerWechatId = null,
  viewerNickname = null,
  incomingFriendRequests = [],
}: AccountMenuProps) {
  const { signOut, openUserProfile } = useClerk();
  const { user } = useUser();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactBindings, setContactBindings] = useState({
    contactEmail: viewerContactEmail,
    phone: viewerPhone,
    wechatId: viewerWechatId,
  });
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
  const accountSecurityHref = withLocale(locale, "/account/security");
  const analyticsOpsHref = withLocale(locale, "/admin/analytics");
  const activityOpsHref = withLocale(locale, "/admin/data-scraper");
  const merchantOpsHref = withLocale(locale, "/admin/merchants");
  const reportOpsHref = withLocale(locale, "/admin/reports");
  const profileActive =
    pathname === profileHref || pathname.startsWith(`${profileHref}/`);
  const contactBindingCount = [
    contactBindings.contactEmail,
    contactBindings.phone,
    contactBindings.wechatId,
  ].filter((value) => Boolean(value?.trim())).length;
  const hasContactBindings = contactBindingCount > 0;

  useEffect(() => {
    setLiveIncomingFriendRequests(incomingFriendRequests);
  }, [incomingFriendRequests]);

  useEffect(() => {
    setContactBindings({
      contactEmail: viewerContactEmail,
      phone: viewerPhone,
      wechatId: viewerWechatId,
    });
  }, [viewerContactEmail, viewerPhone, viewerWechatId]);

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

  function openContactDialog() {
    setOpen(false);
    setContactDialogOpen(true);
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
          "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#369758] text-sm font-semibold text-white shadow-sm ring-1 ring-black/10 transition hover:bg-[#156240] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/35 max-[420px]:h-9 max-[420px]:w-9",
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
                    "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/35",
                    hasContactBindings
                      ? "bg-white ring-1 ring-[#8AB68E] hover:bg-green-50/50"
                      : "bg-zinc-50 ring-1 ring-black/5 hover:bg-paper",
                  )}
                  aria-label={
                    hasContactBindings
                      ? profileCopy.contactBindingsBound
                      : profileCopy.contactBindingsUnbound
                  }
                  title={
                    hasContactBindings
                      ? profileCopy.contactBindingsBound
                      : profileCopy.contactBindingsUnbound
                  }
                  onClick={openContactDialog}
                >
                  <ShieldCheck
                    aria-hidden="true"
                    className={cn(
                      "h-5 w-5",
                      hasContactBindings ? "text-[#156240]" : "text-zinc-400",
                    )}
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
            <MenuLink
              href={accountSecurityHref}
              icon={KeyRound}
              label={
                accountMenuSecurityCopy[locale] ??
                accountMenuSecurityCopy["zh-CN"]
              }
              active={pathname === accountSecurityHref}
              onClick={closeMenu}
            />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                const unregisterTask = isFriemiAndroidApp()
                  ? unregisterAndroidPushToken()
                  : isFriemiIOSApp()
                    ? unregisterIOSMobileDevice()
                    : Promise.resolve();

                void unregisterTask.finally(() => {
                  void signOut({ redirectUrl: withLocale(locale, "/") });
                });
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
      {contactDialogOpen ? (
        <ProfileContactBindingDialog
          initialContactEmail={contactBindings.contactEmail}
          initialPhone={contactBindings.phone}
          initialWechatId={contactBindings.wechatId}
          loginEmail={viewerEmail}
          locale={locale}
          onClose={() => setContactDialogOpen(false)}
          onSaved={setContactBindings}
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
        active && "bg-[#FEFFF9] text-ink",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 text-zinc-500",
          active && "text-[#B5301F]",
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
