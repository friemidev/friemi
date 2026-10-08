"use client";

import { Check, LoaderCircle, Search, UsersRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
  ChatMentionMember,
  ChatMentionScopeKind,
} from "@/features/chat/types";
import { getAvatarInitial } from "@/lib/display-text";

type MentionCandidatesResponse = {
  canMentionEveryone?: boolean;
  members?: ChatMentionMember[];
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      close: "Fermer",
      clear: "Effacer la recherche",
      empty: "Aucun membre trouvé.",
      everyone: "Tout le monde",
      everyoneHint: "Réservé aux administrateurs et au créateur",
      failed: "Impossible de charger les membres.",
      loading: "Chargement des membres...",
      search: "Rechercher un membre",
      retry: "Réessayer",
      title: "Mentionner",
    };
  }

  if (locale === "en") {
    return {
      close: "Close",
      clear: "Clear search",
      empty: "No members found.",
      everyone: "Everyone",
      everyoneHint: "Admins and the creator only",
      failed: "Members could not be loaded.",
      loading: "Loading members...",
      search: "Search members",
      retry: "Retry",
      title: "Mention",
    };
  }

  return {
    close: "关闭",
    clear: "清空搜索",
    empty: "没有找到成员",
    everyone: "所有人",
    everyoneHint: "仅创建者和管理员可用",
    failed: "成员加载失败，请稍后再试。",
    loading: "正在加载成员...",
    search: "搜索群成员",
    retry: "重试",
    title: "选择提醒的人",
  };
}

function MemberAvatar({ member }: { member: ChatMentionMember }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#E8F2EB] text-sm font-bold text-[#156240]"
    >
      {member.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          src={member.avatarUrl}
        />
      ) : (
        getAvatarInitial(member.nickname)
      )}
    </span>
  );
}

export function ChatMentionPicker({
  locale,
  onOpenChange,
  onSelectEveryone,
  onSelectMember,
  open,
  roomId,
  scopeKind,
  selectedProfileIds,
}: {
  locale: string;
  onOpenChange: (open: boolean) => void;
  onSelectEveryone: () => void;
  onSelectMember: (member: ChatMentionMember) => void;
  open: boolean;
  roomId: string;
  scopeKind: ChatMentionScopeKind;
  selectedProfileIds: string[];
}) {
  const copy = getCopy(locale);
  const [canMentionEveryone, setCanMentionEveryone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<ChatMentionMember[]>([]);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const panelRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    if (!mounted) return;

    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    // Do not summon the keyboard just to browse members on a touch device.
    const initialFocus = window.matchMedia("(hover: hover) and (pointer: fine)")
      .matches
      ? searchRef.current
      : panelRef.current;
    initialFocus?.focus({ preventScroll: true });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled)",
        ) ?? [],
      );
      const first = controls[0];
      const last = controls.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panelRef.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === panelRef.current)
      ) {
        event.preventDefault();
        first?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [mounted, onOpenChange, open]);

  useEffect(() => {
    if (open) {
      setMembers([]);
      setCanMentionEveryone(false);
      if (listRef.current) listRef.current.scrollTop = 0;
    }
  }, [open, roomId, scopeKind]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    if (listRef.current) listRef.current.scrollTop = 0;
    const timer = window.setTimeout(
      () => {
        const params = new URLSearchParams({
          q: query.trim(),
          roomId,
          scopeKind,
        });

        void fetch(`/api/chat/mention-candidates?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error("MENTION_CANDIDATES_UNAVAILABLE");
            }

            return (await response.json()) as MentionCandidatesResponse;
          })
          .then((payload) => {
            if (controller.signal.aborted) return;
            setCanMentionEveryone(Boolean(payload.canMentionEveryone));
            setMembers(Array.isArray(payload.members) ? payload.members : []);
          })
          .catch((fetchError: unknown) => {
            if (
              controller.signal.aborted ||
              (fetchError instanceof DOMException &&
                fetchError.name === "AbortError")
            ) {
              return;
            }

            setCanMentionEveryone(false);
            setMembers([]);
            setError(copy.failed);
          })
          .finally(() => {
            if (!controller.signal.aborted) {
              setLoading(false);
            }
          });
      },
      query ? 180 : 0,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [copy.failed, open, query, retryCount, roomId, scopeKind]);

  return (
    <>
      {open && mounted
        ? createPortal(
            <div
              data-friemi-modal-overlay="true"
              className="fixed inset-x-0 z-[130] flex min-h-0 items-end justify-center bg-ink/40 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:p-5 sm:pt-[max(1.25rem,env(safe-area-inset-top))]"
              style={{
                height: "var(--friemi-modal-viewport-height, 100dvh)",
                top: "var(--friemi-modal-viewport-offset-top, 0px)",
              }}
            >
              <button
                aria-label={copy.close}
                className="absolute inset-0 cursor-default"
                tabIndex={-1}
                onClick={() => onOpenChange(false)}
                type="button"
              />
              <section
                aria-modal="true"
                aria-label={copy.title}
                className="relative flex h-[min(36rem,100%)] max-h-full min-h-0 w-full max-w-md shrink-0 flex-col overflow-hidden rounded-t-[1.25rem] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_58px_rgba(17,18,16,0.24)] outline-none sm:rounded-[1.25rem] sm:pb-0"
                ref={panelRef}
                role="dialog"
                tabIndex={-1}
              >
                <header className="grid shrink-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center border-b border-[#ECEAE3] px-3 py-2">
                  <span aria-hidden="true" />
                  <h2 className="truncate text-center text-base font-bold text-[#111210]">
                    {copy.title}
                  </h2>
                  <button
                    aria-label={copy.close}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-ink/70 transition hover:bg-fog active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"
                    onClick={() => onOpenChange(false)}
                    type="button"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </header>
                <label className="mx-4 my-3 flex h-11 shrink-0 items-center gap-2 rounded-lg bg-fog pl-3 pr-1 text-ink/60 focus-within:ring-2 focus-within:ring-forest/30">
                  <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="sr-only">{copy.search}</span>
                  <input
                    autoComplete="off"
                    autoCapitalize="none"
                    className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink/50"
                    enterKeyHint="search"
                    maxLength={80}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                    placeholder={copy.search}
                    ref={searchRef}
                    spellCheck={false}
                    value={query}
                  />
                  {query ? (
                    <button
                      aria-label={copy.clear}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink/60"
                      onClick={() => {
                        setQuery("");
                        searchRef.current?.focus({ preventScroll: true });
                      }}
                      type="button"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </label>
                <div
                  aria-busy={loading}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 [touch-action:pan-y_pinch-zoom] [-webkit-overflow-scrolling:touch]"
                  ref={listRef}
                >
                  {!loading && !error && canMentionEveryone && !query.trim() ? (
                    <button
                      className="flex w-full items-center gap-3 border-b border-[#ECEAE3] py-3 text-left transition active:bg-[#F7F8F5]"
                      onClick={() => {
                        onSelectEveryone();
                        onOpenChange(false);
                      }}
                      type="button"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E7F2EA] text-[#156240]">
                        <UsersRound className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-[#111210]">
                          {copy.everyone}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold text-[#8A8F87]">
                          {copy.everyoneHint}
                        </span>
                      </span>
                    </button>
                  ) : null}

                  {loading ? (
                    <div
                      role="status"
                      className="flex min-h-32 items-center justify-center gap-2 text-sm font-semibold text-[#747A73]"
                    >
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      {copy.loading}
                    </div>
                  ) : error ? (
                    <div className="px-3 py-6 text-center text-sm font-semibold">
                      <p role="alert" className="text-danger">
                        {error}
                      </p>
                      <button
                        className="mt-2 min-h-11 px-4 text-forest"
                        onClick={() => setRetryCount((count) => count + 1)}
                        type="button"
                      >
                        {copy.retry}
                      </button>
                    </div>
                  ) : members.length ? (
                    members.map((member) => {
                      const selected = selectedProfileIds.includes(member.id);

                      return (
                        <button
                          className="flex w-full items-center gap-3 border-b border-[#F0EEE8] py-3 text-left transition last:border-b-0 active:bg-[#F7F8F5]"
                          key={member.id}
                          onClick={() => {
                            onSelectMember(member);
                            onOpenChange(false);
                          }}
                          type="button"
                        >
                          <MemberAvatar member={member} />
                          <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#111210]">
                            {member.nickname}
                          </span>
                          {selected ? (
                            <Check className="h-4 w-4 shrink-0 text-[#156240]" />
                          ) : null}
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-10 text-center text-sm font-semibold text-[#858A82]">
                      {copy.empty}
                    </p>
                  )}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
