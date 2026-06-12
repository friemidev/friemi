"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import jsQR from "jsqr";
import {
  Children,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal, useFormStatus } from "react-dom";
import {
  AlertCircle,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Inbox,
  LoaderCircle,
  MessageCircle,
  QrCode,
  Send,
  ShieldCheck,
  ScanLine,
  Trash2,
  type LucideIcon,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { formatActivityDateOnly } from "@chill-club/shared";
import { Button, Input, Textarea } from "@chill-club/ui";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";
import { openDirectConversationAction } from "@/features/direct-messages/actions/directMessageActions";
import {
  acceptFriendRequestAction,
  cancelFriendRequestAction,
  rejectFriendRequestAction,
  removeFriendshipAction,
  sendFriendRequestAction,
  type FriendActionState,
} from "../actions/friendActions";
import { getFriendsCopy } from "../copy";
import type {
  FriendActivitySummaryViewModel,
  FriendRequestViewModel,
  FriendsDashboardViewModel,
  FriendUserViewModel,
} from "../queries/getFriendsDashboard";

type FriendsDashboardProps = {
  dashboard: FriendsDashboardViewModel;
  currentUserFriendCode?: string | null;
  initialAddFriendCode?: string;
  locale: string;
};

type FriendAction = (
  previousState: FriendActionState,
  formData: FormData,
) => Promise<FriendActionState>;

const initialState: FriendActionState = {};

type FriendPreviewStatus =
  | "AVAILABLE"
  | "SELF"
  | "FRIENDS"
  | "PENDING"
  | "AMBIGUOUS"
  | "NOT_FOUND"
  | "ERROR";
type FriendPreviewUser = {
  id: string;
  nickname: string;
  friendCode: string | null;
  avatarUrl: string | null;
};
type FriendPreview = {
  user: FriendPreviewUser | null;
  status: FriendPreviewStatus | null;
};

export function FriendsDashboard({
  dashboard,
  currentUserFriendCode = null,
  initialAddFriendCode,
  locale,
}: FriendsDashboardProps) {
  const t = getFriendsCopy(locale);
  const [addFriendOpen, setAddFriendOpen] = useState(
    Boolean(initialAddFriendCode),
  );
  const hasOutgoingRequests = dashboard.outgoingRequests.length > 0;
  const incomingRequestCount = dashboard.incomingRequests.length;

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "grid gap-4",
          hasOutgoingRequests &&
            "lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)]",
        )}
      >
        <section className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss">
              <UsersRound className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-ink">
                {t.friendsTitle}
              </h2>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm text-zinc-500">
                  {dashboard.friends.length > 0
                    ? t.friendsDescription(dashboard.friends.length)
                    : t.friendsListDescription}
                </p>
                <button
                  type="button"
                  className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/85 text-zinc-700 shadow-sm ring-1 ring-black/10 transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                  aria-label={t.addTitle}
                  title={t.addTitle}
                  onClick={() => setAddFriendOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  <RequestCountBadge count={incomingRequestCount} />
                </button>
              </div>
            </div>
          </div>

          {dashboard.friends.length === 0 ? (
            <PlainEmptyState
              title={t.friendsEmptyTitle}
              description={t.friendsEmptyDescription}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {dashboard.friends.map((friend) => (
                <FriendCard
                  key={friend.id}
                  activities={friend.recentActivities}
                  friendshipId={friend.id}
                  locale={locale}
                  user={friend.user}
                />
              ))}
            </div>
          )}
        </section>

        {hasOutgoingRequests ? (
          <RequestPanel
            count={dashboard.outgoingRequests.length}
            title={t.outgoingTitle}
            icon="send"
          >
            {dashboard.outgoingRequests.map((request) => (
              <OutgoingRequestCard
                key={request.id}
                locale={locale}
                request={request}
              />
            ))}
          </RequestPanel>
        ) : null}
      </div>

      {addFriendOpen ? (
        <AddFriendDialog
          currentUserFriendCode={currentUserFriendCode}
          initialSearchTerm={initialAddFriendCode}
          incomingRequests={dashboard.incomingRequests}
          locale={locale}
          onClose={() => setAddFriendOpen(false)}
        />
      ) : null}
    </div>
  );
}

function AddFriendForm({
  className,
  autoFocusSearch = false,
  currentUserFriendCode = null,
  initialSearchTerm = "",
  locale,
  returnTo = "friends",
  showHeader = true,
}: {
  autoFocusSearch?: boolean;
  className?: string;
  currentUserFriendCode?: string | null;
  initialSearchTerm?: string;
  locale: string;
  returnTo?: "friends" | "messages";
  showHeader?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    sendFriendRequestAction,
    initialState,
  );
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [preview, setPreview] = useState<FriendPreview>({
    user: null,
    status: null,
  });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showSentSuccess, setShowSentSuccess] = useState(false);
  const [optimisticTarget, setOptimisticTarget] =
    useState<FriendPreviewUser | null>(null);
  const t = getFriendsCopy(locale);
  const hasSearchTerm = searchTerm.trim().length > 0;
  const submitDisabled =
    !hasSearchTerm ||
    previewLoading ||
    !preview.user ||
    preview.status !== "AVAILABLE";

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setSearchTerm("");
      setPreview({ user: null, status: null });
      setOptimisticTarget(null);
      setShowSentSuccess(true);
      router.refresh();
    }
  }, [router, state.ok]);

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
      setShowSentSuccess(false);
    }
  }, [initialSearchTerm]);

  useEffect(() => {
    if (state.formError) {
      setOptimisticTarget(null);
    }
  }, [state.formError]);

  useEffect(() => {
    const query = searchTerm.trim();

    if (!query) {
      setPreview({ user: null, status: null });
      setPreviewLoading(false);
      return;
    }

    const controller = new AbortController();
    setPreview({ user: null, status: null });
    setPreviewLoading(true);
    const timer = window.setTimeout(() => {
      fetch(
        `/api/friends/preview?${new URLSearchParams({
          q: query,
          locale,
        }).toString()}`,
        {
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        },
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Friend preview failed: ${response.status}`);
          }

          return response.json();
        })
        .then((data: FriendPreview) => {
          setPreview({
            user: data.user,
            status: data.status,
          });
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            console.error("Failed to preview friend", error);
            setPreview({ user: null, status: "ERROR" });
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setPreviewLoading(false);
          }
        });
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [locale, searchTerm]);

  return (
    <section
      className={cn(
        "rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      {currentUserFriendCode && !showHeader ? (
        <OwnFriendCodeBlock friendCode={currentUserFriendCode} locale={locale} />
      ) : null}

      {showHeader ? (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-clay/10 text-clay">
            <UserPlus className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">{t.addTitle}</h2>
            <p className="mt-1 text-sm text-zinc-500">{t.addDescription}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-6 text-zinc-600">{t.addDescription}</p>
      )}

      {currentUserFriendCode && showHeader ? (
        <OwnFriendCodeBlock friendCode={currentUserFriendCode} locale={locale} />
      ) : null}

      <div className="mt-4 grid gap-2 sm:hidden">
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#d9c8ad] bg-white/82 px-4 text-sm font-semibold text-[#5f4f3f] shadow-sm shadow-black/5 transition hover:bg-white"
          onClick={() => setQrScannerOpen(true)}
        >
          <ScanLine className="h-4 w-4" aria-hidden="true" />
          {t.scanQrAdd}
        </button>
        <p className="text-center text-xs leading-5 text-zinc-500">
          {t.scanQrHint}
        </p>
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="mt-4 grid gap-4"
        noValidate
        onSubmit={(event) => {
          if (submitDisabled || !preview.user) {
            event.preventDefault();
            return;
          }

          setOptimisticTarget(preview.user);
          setShowSentSuccess(false);
        }}
      >
        <input name="locale" type="hidden" value={locale} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-700">
            {t.searchLabel}
          </span>
          <Input
            name="searchTerm"
            placeholder={t.searchPlaceholder}
            autoComplete="off"
            autoFocus={autoFocusSearch}
            className="bg-white"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.currentTarget.value);
              setShowSentSuccess(false);
            }}
          />
          <span className="text-xs leading-5 text-zinc-500">
            {t.searchHint}
          </span>
        </label>
        <FriendPreviewCard
          hasSearchTerm={hasSearchTerm}
          loading={previewLoading}
          preview={preview}
          locale={locale}
        />
        {optimisticTarget ? (
          <div
            className="flex items-center gap-2 rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-xs font-medium text-moss"
            aria-live="polite"
          >
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            <span className="min-w-0 truncate">
              {t.sendingTo(optimisticTarget.nickname)}
            </span>
          </div>
        ) : null}
        <label className="grid gap-2">
          <span className="text-sm font-medium text-zinc-700">
            {t.messageLabel}
          </span>
          <Textarea
            name="message"
            maxLength={240}
            placeholder={t.messagePlaceholder}
            className="min-h-24 resize-none bg-white"
          />
        </label>

        {showSentSuccess ? (
          <p
            className="rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-xs font-medium text-moss"
            aria-live="polite"
          >
            {t.sentSuccess}
          </p>
        ) : null}
        {state.formError ? <FormError message={state.formError} /> : null}

        <SubmitButton
          className="w-full"
          disabled={submitDisabled}
          icon={Send}
          pendingLabel={t.sending}
        >
          {t.send}
        </SubmitButton>
      </form>

      {qrScannerOpen ? (
        <FriendQrScannerDialog
          locale={locale}
          onClose={() => setQrScannerOpen(false)}
          onScan={(friendCode) => {
            setSearchTerm(friendCode);
            setShowSentSuccess(false);
            setQrScannerOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}

function FriendPreviewCard({
  hasSearchTerm,
  loading,
  locale,
  preview,
}: {
  hasSearchTerm: boolean;
  loading: boolean;
  locale: string;
  preview: FriendPreview;
}) {
  const t = getFriendsCopy(locale);

  if (!hasSearchTerm) {
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-black/10 bg-white/80 p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-zinc-100" />
          <div className="min-w-0 flex-1">
            <p className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
            <p className="mt-2 h-3 w-36 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-zinc-500">
          {t.previewLoading}
        </p>
      </div>
    );
  }

  if (!preview.user) {
    const messageByStatus: Partial<Record<FriendPreviewStatus, string>> = {
      AMBIGUOUS: t.previewAmbiguous,
      ERROR: t.previewError,
      NOT_FOUND: t.previewNotFound,
    };
    const message = messageByStatus[preview.status ?? "NOT_FOUND"];

    if (!message) {
      return null;
    }

    return (
      <div
        className="flex items-start gap-2 rounded-xl border border-clay/20 bg-clay/5 px-3 py-3 text-sm text-clay"
        aria-live="polite"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="min-w-0 leading-5">{message}</p>
      </div>
    );
  }

  const descriptionByStatus: Record<FriendPreviewStatus, string> = {
    AVAILABLE: t.previewAvailable,
    SELF: t.previewSelf,
    FRIENDS: t.previewFriends,
    PENDING: t.previewPending,
    AMBIGUOUS: t.previewAmbiguous,
    NOT_FOUND: t.previewNotFound,
    ERROR: t.previewError,
  };
  const canSend = preview.status === "AVAILABLE";

  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-3 shadow-sm",
        canSend ? "border-moss/25 ring-1 ring-moss/10" : "border-black/10",
      )}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-zinc-500">{t.previewTitle}</p>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
            canSend ? "bg-moss/10 text-moss" : "bg-zinc-100 text-zinc-500",
          )}
        >
          {canSend ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5" />
          )}
          {canSend ? t.previewReady : t.previewBlocked}
        </span>
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-3">
        <PreviewAvatar user={preview.user} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {preview.user.nickname}
          </p>
          {preview.user.friendCode ? (
            <p className="mt-0.5 truncate font-mono text-xs font-medium tracking-[0.12em] text-zinc-500">
              {preview.user.friendCode}
            </p>
          ) : null}
        </div>
      </div>
      {preview.status ? (
        <p
          className={cn(
            "mt-3 rounded-lg px-3 py-2 text-xs leading-5",
            canSend ? "bg-moss/5 text-moss" : "bg-zinc-50 text-zinc-500",
          )}
        >
          {descriptionByStatus[preview.status]}
        </p>
      ) : null}
    </div>
  );
}

function PreviewAvatar({ user }: { user: FriendPreviewUser }) {
  const initial = user.nickname.trim().slice(0, 1).toUpperCase() || "N";

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-moss text-sm font-semibold text-white">
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt={user.nickname}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}

export function AddFriendDialog({
  currentUserFriendCode = null,
  initialSearchTerm = "",
  incomingRequests = [],
  locale,
  onClose,
  returnTo = "friends",
}: {
  currentUserFriendCode?: string | null;
  initialSearchTerm?: string;
  incomingRequests?: FriendRequestViewModel[];
  locale: string;
  onClose: () => void;
  returnTo?: "friends" | "messages";
}) {
  const t = getFriendsCopy(locale);
  const titleId = "add-friend-dialog-title";
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalElement(document.body);

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const dialog = (
    <div
      className="fixed inset-0 z-[9999] isolate flex h-[100dvh] min-h-[100svh] w-full items-stretch justify-center overflow-hidden bg-paper sm:items-start sm:bg-black/35 sm:p-6 sm:pt-10 md:items-center md:pt-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex h-[100dvh] min-h-[100svh] w-full flex-col overflow-hidden bg-paper sm:h-auto sm:min-h-0 sm:max-h-[min(42rem,calc(100dvh-3rem))] sm:max-w-xl sm:rounded-xl sm:shadow-2xl sm:ring-1 sm:ring-black/10">
        <div className="flex items-center justify-between border-b border-black/10 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5 sm:pt-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-moss">{t.entryTitle}</p>
            <h2
              id={titleId}
              className="mt-1 text-2xl font-semibold tracking-normal text-ink"
            >
              {t.addTitle}
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm ring-1 ring-black/10 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
            aria-label={t.close}
            title={t.close}
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:max-h-[calc(100dvh-10rem)] sm:p-5">
          <AddFriendForm
            className="border-0 bg-transparent p-0 shadow-none"
            currentUserFriendCode={currentUserFriendCode}
            initialSearchTerm={initialSearchTerm}
            locale={locale}
            returnTo={returnTo}
            showHeader={false}
          />
          {incomingRequests.length > 0 ? (
            <section className="mt-6 grid gap-3 border-t border-black/10 pt-5">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-ink">
                    {t.incomingTitle}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {t.incomingDescription}
                  </p>
                </div>
                <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-clay px-2 text-xs font-semibold text-white">
                  {incomingRequests.length}
                </span>
              </div>
              {incomingRequests.map((request) => (
                <IncomingRequestCard
                  key={request.id}
                  locale={locale}
                  request={request}
                  returnTo={returnTo}
                />
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!portalElement) {
    return null;
  }

  return createPortal(dialog, portalElement);
}

export function RequestCountBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function OwnFriendCodeBlock({
  friendCode,
  locale,
}: {
  friendCode: string;
  locale: string;
}) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const t = getFriendsCopy(locale);
  const qrValue = useMemo(
    () => getFriendQrValue(friendCode, locale),
    [friendCode, locale],
  );

  async function copyFriendCode() {
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  useEffect(() => {
    if (!qrOpen) {
      return;
    }

    let active = true;
    setQrFailed(false);

    QRCode.toDataURL(qrValue, {
      color: {
        dark: "#1f1712",
        light: "#fffaf2",
      },
      margin: 1,
      width: 220,
    })
      .then((dataUrl) => {
        if (active) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to generate friend QR code", error);
        if (active) {
          setQrFailed(true);
        }
      });

    return () => {
      active = false;
    };
  }, [qrOpen, qrValue]);

  return (
    <div className="mt-4 rounded-lg border border-black/10 bg-white/75 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500">{t.ownFriendCode}</p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-[0.18em] text-ink">
            {friendCode}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm ring-1 ring-black/10 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 sm:hidden"
            aria-label={t.showMyQr}
            title={t.showMyQr}
            onClick={() => setQrOpen((current) => !current)}
          >
            <QrCode className="h-4 w-4" />
            {t.myQrAction}
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm ring-1 ring-black/10 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
            aria-label={copied ? t.ownFriendCodeCopied : t.copyOwnFriendCode}
            title={copied ? t.ownFriendCodeCopied : t.copyOwnFriendCode}
            onClick={copyFriendCode}
          >
            {copied ? (
              <Check className="h-4 w-4 text-moss" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {qrOpen ? (
        <div className="mt-3 grid justify-items-center rounded-2xl border border-[#e5d6bf] bg-[#fffaf2] px-4 py-4 text-center sm:hidden">
          <p className="text-sm font-semibold text-ink">{t.myQrTitle}</p>
          <p className="mt-1 max-w-64 text-xs leading-5 text-zinc-500">
            {t.myQrDescription}
          </p>
          <div className="mt-3 flex h-56 w-56 items-center justify-center rounded-[1.25rem] bg-white p-3 shadow-sm ring-1 ring-black/10">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={t.myQrTitle}
                className="h-full w-full object-contain"
              />
            ) : qrFailed ? (
              <p className="px-4 text-sm leading-6 text-clay">
                {t.qrGenerateFailed}
              </p>
            ) : (
              <LoaderCircle className="h-6 w-6 animate-spin text-zinc-400" />
            )}
          </div>
          <p className="mt-3 font-mono text-base font-semibold tracking-[0.18em] text-ink">
            {friendCode}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{t.myQrFallback}</p>
        </div>
      ) : null}
    </div>
  );
}

function getFriendQrValue(friendCode: string, locale: string) {
  if (typeof window === "undefined") {
    return friendCode;
  }

  const url = new URL(`/${locale}/friends`, window.location.origin);
  url.searchParams.set("friendCode", friendCode);

  return url.toString();
}

function extractFriendCodeFromQrValue(rawValue: string) {
  const value = rawValue.trim();
  const directCode = value.replace(/[\s-]/g, "");

  if (/^\d{6}$/.test(directCode)) {
    return directCode;
  }

  try {
    const url = new URL(value);
    const friendCode = url.searchParams.get("friendCode")?.trim() ?? "";

    if (
      url.origin === window.location.origin &&
      /^\/[^/]+\/friends\/?$/.test(url.pathname) &&
      /^\d{6}$/.test(friendCode)
    ) {
      return friendCode;
    }
  } catch {
    return null;
  }

  return null;
}

function FriendQrScannerDialog({
  locale,
  onClose,
  onScan,
}: {
  locale: string;
  onClose: () => void;
  onScan: (friendCode: string) => void;
}) {
  const t = getFriendsCopy(locale);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let closed = false;

    function stopCamera() {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t.cameraUnsupported);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
          },
        });

        if (closed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
          scanFrame();
        }
      } catch (cameraError) {
        console.error("Failed to start friend QR scanner", cameraError);
        setError(t.cameraPermissionDenied);
      }
    }

    function scanFrame() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", { willReadFrequently: true });

      if (!video || !canvas || !context || closed) {
        return;
      }

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          context.drawImage(video, 0, 0, width, height);

          const imageData = context.getImageData(0, 0, width, height);
          const result = jsQR(imageData.data, width, height);

          if (result?.data) {
            const friendCode = extractFriendCodeFromQrValue(result.data);

            if (friendCode) {
              setDetected(true);
              stopCamera();
              window.setTimeout(() => onScan(friendCode), 180);
              return;
            }

            setError(t.invalidQrCode);
          }
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(scanFrame);
    }

    void startCamera();

    return () => {
      closed = true;
      stopCamera();
    };
  }, [onScan, t.cameraPermissionDenied, t.cameraUnsupported, t.invalidQrCode]);

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex min-h-[100svh] items-end justify-center bg-black/40 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t.scanQrAdd}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-[1.5rem] bg-paper shadow-2xl ring-1 ring-black/10">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-moss">{t.scanQrEyebrow}</p>
            <h3 className="text-lg font-semibold text-ink">{t.scanQrTitle}</h3>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm ring-1 ring-black/10"
            aria-label={t.close}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          <div className="relative aspect-square overflow-hidden rounded-[1.25rem] bg-[#171310]">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="pointer-events-none absolute inset-8 rounded-[1rem] border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
            {!ready && !error ? (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <LoaderCircle className="h-7 w-7 animate-spin" />
              </div>
            ) : null}
            {detected ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-moss shadow-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  {t.scanQrDetected}
                </span>
              </div>
            ) : null}
          </div>
          {error ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-clay/20 bg-clay/5 px-3 py-3 text-sm text-clay">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-5">{error}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {t.scanQrDescription}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
              <Camera className="h-3.5 w-3.5" />
              {t.scanQrManualFallback}
            </span>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-[#5f4f3f] shadow-sm ring-1 ring-black/10"
              onClick={onClose}
            >
              {t.manualInput}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function RequestPanel({
  className,
  count,
  title,
  icon,
  children,
}: {
  className?: string;
  count: number;
  title: string;
  icon: "inbox" | "send";
  children: ReactNode;
}) {
  const Icon = icon === "inbox" ? Inbox : Send;
  const items = Children.toArray(children);
  const hasItems = items.length > 0;

  return (
    <section
      className={cn(
        "rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-lg font-semibold text-ink">{title}</h2>
          {count > 0 ? (
            <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-clay/10 px-2 text-xs font-semibold text-clay">
              {count}
            </span>
          ) : null}
        </div>
      </div>

      {hasItems ? <div className="mt-4 grid gap-3">{items}</div> : null}
    </section>
  );
}

function FriendCard({
  activities,
  friendshipId,
  locale,
  user,
}: {
  activities: FriendActivitySummaryViewModel[];
  friendshipId: string;
  locale: string;
  user: FriendUserViewModel;
}) {
  const [state, formAction] = useActionState(
    removeFriendshipAction,
    initialState,
  );
  const t = getFriendsCopy(locale);

  return (
    <article className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3">
      <UserSummary
        compactBio={activities.length > 0}
        locale={locale}
        user={user}
      />
      {activities.length > 0 ? (
        <FriendActivitySummary activities={activities} locale={locale} />
      ) : null}
      <form action={openDirectConversationAction} className="mt-3 grid">
        <input name="locale" type="hidden" value={locale} />
        <input name="friendProfileId" type="hidden" value={user.id} />
        <SubmitButton
          icon={MessageCircle}
          pendingLabel={t.acting}
          variant="secondary"
        >
          {t.message}
        </SubmitButton>
      </form>
      <form
        action={formAction}
        className="mt-3 grid gap-2"
        onSubmit={(event) => {
          if (!window.confirm(t.removeConfirm)) {
            event.preventDefault();
          }
        }}
      >
        <input name="locale" type="hidden" value={locale} />
        <input name="friendshipId" type="hidden" value={friendshipId} />
        {state.formError ? <FormError message={state.formError} /> : null}
        <SubmitButton icon={Trash2} pendingLabel={t.acting} variant="secondary">
          {t.remove}
        </SubmitButton>
      </form>
    </article>
  );
}

function FriendActivitySummary({
  activities,
  locale,
}: {
  activities: FriendActivitySummaryViewModel[];
  locale: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = getFriendsCopy(locale);
  const [firstActivity, ...remainingActivities] = activities;

  if (!firstActivity) {
    return null;
  }

  const hasMore = remainingActivities.length > 0;

  return (
    <div className="mt-3 rounded-md bg-moss/5 p-2.5 ring-1 ring-moss/10">
      <div className="flex min-w-0 items-start gap-2">
        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
        <Link
          className="min-w-0 flex-1 text-xs font-medium leading-5 text-ink transition hover:text-moss"
          href={withLocale(locale, `/activities/${firstActivity.id}`)}
          title={firstActivity.title}
        >
          <span className="line-clamp-2">
            {t.friendActivitySummary(
              formatActivityDateOnly(firstActivity.startAt, locale),
              firstActivity.title,
              firstActivity.timeState,
            )}
          </span>
        </Link>
        {hasMore ? (
          <button
            type="button"
            className="inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-white px-2 text-xs font-semibold text-moss ring-1 ring-moss/15 transition hover:bg-moss/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-moss"
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? t.collapseActivities
                : t.showMoreActivitiesLabel(remainingActivities.length)
            }
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded
              ? t.collapseActivities
              : t.moreActivities(remainingActivities.length)}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition",
                isExpanded && "rotate-180",
              )}
            />
          </button>
        ) : null}
      </div>

      {isExpanded ? (
        <div className="mt-2 grid max-h-32 gap-1 overflow-y-auto pr-1">
          {remainingActivities.map((activity) => (
            <Link
              key={activity.id}
              className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] gap-2 rounded-md bg-white/70 px-2 py-1.5 text-xs leading-5 text-zinc-600 ring-1 ring-black/5 transition hover:bg-white hover:text-ink"
              href={withLocale(locale, `/activities/${activity.id}`)}
              title={activity.title}
            >
              <span className="shrink-0 whitespace-nowrap text-zinc-500">
                {formatActivityDateOnly(activity.startAt, locale)}
              </span>
              <span className="truncate font-medium">{activity.title}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function IncomingRequestCard({
  locale,
  request,
  returnTo = "friends",
}: {
  locale: string;
  request: FriendRequestViewModel;
  returnTo?: "friends" | "messages";
}) {
  const t = getFriendsCopy(locale);

  return (
    <article className="min-w-0 rounded-xl border border-black/10 bg-white/95 p-3 shadow-sm shadow-black/5">
      <div className="rounded-lg border border-black/10 bg-paper/45 p-3">
        <UserSummary locale={locale} showBio={false} user={request.user} />
        <RequestMeta
          label={t.messageLabel}
          locale={locale}
          request={request}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <SmallActionForm
          action={acceptFriendRequestAction}
          icon={Check}
          locale={locale}
          requestId={request.id}
          returnTo={returnTo}
          variant="primary"
        >
          {t.accept}
        </SmallActionForm>
        <SmallActionForm
          action={rejectFriendRequestAction}
          icon={X}
          locale={locale}
          requestId={request.id}
          returnTo={returnTo}
          variant="secondary"
        >
          {t.reject}
        </SmallActionForm>
      </div>
    </article>
  );
}

function OutgoingRequestCard({
  locale,
  request,
}: {
  locale: string;
  request: FriendRequestViewModel;
}) {
  const t = getFriendsCopy(locale);

  return (
    <article className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3">
      <UserSummary locale={locale} showBio={false} user={request.user} />
      <RequestMeta label={t.messageLabel} locale={locale} request={request} />
      <div className="mt-3">
        <SmallActionForm
          action={cancelFriendRequestAction}
          icon={X}
          locale={locale}
          requestId={request.id}
          variant="secondary"
        >
          {t.cancel}
        </SmallActionForm>
      </div>
    </article>
  );
}

function SmallActionForm({
  action,
  children,
  icon,
  locale,
  requestId,
  returnTo = "friends",
  variant = "primary",
}: {
  action: FriendAction;
  children: ReactNode;
  icon: LucideIcon;
  locale: string;
  requestId: string;
  returnTo?: "friends" | "messages";
  variant?: "primary" | "secondary" | "success";
}) {
  const [state, formAction] = useActionState(action, initialState);
  const t = getFriendsCopy(locale);

  return (
    <form action={formAction} className="grid gap-2">
      <input name="locale" type="hidden" value={locale} />
      <input name="requestId" type="hidden" value={requestId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      {state.formError ? <FormError message={state.formError} /> : null}
      <SubmitButton icon={icon} pendingLabel={t.acting} variant={variant}>
        {children}
      </SubmitButton>
    </form>
  );
}

function SubmitButton({
  children,
  className,
  disabled = false,
  icon: Icon,
  pendingLabel,
  variant = "primary",
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  icon: LucideIcon;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "success";
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending || disabled}
      className={cn("gap-2 whitespace-nowrap", className)}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {pending ? pendingLabel : children}
    </Button>
  );
}

function UserSummary({
  compactBio = false,
  locale,
  showBio = true,
  user,
}: {
  compactBio?: boolean;
  locale: string;
  showBio?: boolean;
  user: FriendUserViewModel;
}) {
  const t = getFriendsCopy(locale);

  return (
    <div className="flex min-w-0 items-start gap-3">
      <UserAvatar user={user} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-ink">
          {user.nickname}
        </h3>
        {user.friendCode ? (
          <p className="mt-0.5 truncate font-mono text-xs font-medium tracking-[0.12em] text-zinc-500">
            {t.friendCodeLabel} {user.friendCode}
          </p>
        ) : null}
        {showBio ? (
          <p
            className={cn(
              "mt-1 break-words text-xs leading-5 text-zinc-500",
              compactBio ? "line-clamp-1" : "line-clamp-2",
            )}
          >
            {user.bio || t.noBio}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function UserAvatar({ user }: { user: FriendUserViewModel }) {
  const initial = user.nickname.trim().slice(0, 1).toUpperCase() || "N";

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-moss text-sm font-semibold text-white">
      {user.avatarUrl ? (
        // User avatars come from Clerk or existing profile data. Keeping img
        // here avoids adding remote image domains for this small control.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt={user.nickname}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}

function RequestMeta({
  label,
  locale,
  request,
}: {
  label: string;
  locale: string;
  request: FriendRequestViewModel;
}) {
  const t = getFriendsCopy(locale);

  return (
    <div className="mt-3 space-y-2">
      {request.message ? (
        <div className="rounded-md bg-white/80 px-3 py-2 ring-1 ring-black/5">
          <p className="text-[11px] font-semibold text-zinc-400">{label}</p>
          <p className="mt-1 break-words text-sm leading-6 text-zinc-700">
            {request.message}
          </p>
        </div>
      ) : null}
      <p className="text-xs text-zinc-400">
        {t.requestedAt(request.createdAt.slice(0, 10))}
      </p>
    </div>
  );
}

function PlainEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="py-8">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
        {description}
      </p>
    </div>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {message}
    </p>
  );
}
