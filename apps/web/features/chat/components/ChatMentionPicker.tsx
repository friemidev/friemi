"use client";

import {
  AtSign,
  Check,
  LoaderCircle,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
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
      empty: "Aucun membre trouvé.",
      everyone: "Tout le monde",
      everyoneHint: "Réservé aux administrateurs et au créateur",
      failed: "Impossible de charger les membres.",
      loading: "Chargement des membres...",
      open: "Mentionner un membre",
      search: "Rechercher un membre",
      title: "Mentionner",
    };
  }

  if (locale === "en") {
    return {
      close: "Close",
      empty: "No members found.",
      everyone: "Everyone",
      everyoneHint: "Admins and the creator only",
      failed: "Members could not be loaded.",
      loading: "Loading members...",
      open: "Mention a member",
      search: "Search members",
      title: "Mention",
    };
  }

  return {
    close: "关闭",
    empty: "没有找到成员",
    everyone: "所有人",
    everyoneHint: "仅创建者和管理员可用",
    failed: "成员加载失败，请稍后再试。",
    loading: "正在加载成员...",
    open: "@群成员",
    search: "搜索群成员",
    title: "选择提醒的人",
  };
}

function MemberAvatar({ member }: { member: ChatMentionMember }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#E8F2EB] text-sm font-bold text-[#156240]">
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
  disabled = false,
  locale,
  onOpenChange,
  onSelectEveryone,
  onSelectMember,
  open,
  roomId,
  scopeKind,
  selectedProfileIds,
}: {
  disabled?: boolean;
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

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(
      () => {
        const params = new URLSearchParams({
          q: query.trim(),
          roomId,
          scopeKind,
        });

        setLoading(true);
        setError("");

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
            setCanMentionEveryone(Boolean(payload.canMentionEveryone));
            setMembers(Array.isArray(payload.members) ? payload.members : []);
          })
          .catch((fetchError: unknown) => {
            if (
              fetchError instanceof DOMException &&
              fetchError.name === "AbortError"
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
  }, [copy.failed, open, query, roomId, scopeKind]);

  return (
    <>
      <button
        aria-expanded={open}
        aria-label={copy.open}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#156240] transition hover:bg-[#EEF5F0] active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={disabled}
        onClick={() => onOpenChange(true)}
        title={copy.open}
        type="button"
      >
        <AtSign className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && mounted
        ? createPortal(
            <div
              aria-modal="true"
              className="fixed inset-0 z-[130] flex items-end justify-center bg-[#111210]/38 px-3 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-[2px] sm:items-center sm:p-5"
              role="dialog"
            >
              <button
                aria-label={copy.close}
                className="absolute inset-0 cursor-default"
                onClick={() => onOpenChange(false)}
                type="button"
              />
              <section className="relative flex max-h-[78svh] w-full max-w-md flex-col overflow-hidden rounded-t-[1.25rem] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_58px_rgba(17,18,16,0.24)] sm:max-h-[38rem] sm:rounded-[1.25rem] sm:pb-0">
                <header className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center border-b border-[#ECEAE3] px-3 py-3">
                  <span aria-hidden="true" />
                  <h2 className="truncate text-center text-base font-bold text-[#111210]">
                    {copy.title}
                  </h2>
                  <button
                    aria-label={copy.close}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[#626760] transition hover:bg-[#F3F4F0] active:scale-95"
                    onClick={() => onOpenChange(false)}
                    type="button"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </header>
                <label className="mx-4 my-3 flex h-11 items-center gap-2 rounded-lg bg-[#F3F4F0] px-3 text-[#777D75]">
                  <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="sr-only">{copy.search}</span>
                  <input
                    autoFocus
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#111210] outline-none placeholder:text-[#9A9E97]"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={copy.search}
                    value={query}
                  />
                </label>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
                  {canMentionEveryone && !query.trim() ? (
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
                    <div className="flex min-h-32 items-center justify-center gap-2 text-sm font-semibold text-[#747A73]">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      {copy.loading}
                    </div>
                  ) : error ? (
                    <p className="px-3 py-10 text-center text-sm font-semibold text-[#A52B3B]">
                      {error}
                    </p>
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
