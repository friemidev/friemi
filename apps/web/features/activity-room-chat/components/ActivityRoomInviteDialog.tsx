"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  Check,
  Copy,
  LoaderCircle,
  Plus,
  QrCode,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import {
  inviteActivityRoomParticipantAction,
  type ActivityRoomInviteActionState,
} from "@/features/activity-room-chat/actions/activityRoomChatActions";
import type { ActivityRoomInviteCandidateViewModel } from "@/features/activity-room-chat/services/activityRoomChat";

const initialInviteActionState: ActivityRoomInviteActionState = {};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      add: "Ajouter",
      close: "Fermer",
      empty: "Aucun contact mutuel à inviter.",
      failed: "Invitation impossible.",
      invite: "Inviter",
      inviteByQr: "QR code",
      inviteFriends: "Contacts",
      pending: "Invitation...",
      qrFailed: "Impossible de generer le QR code.",
      qrHint: "Faites scanner ce code pour ouvrir ce groupe et le rejoindre.",
      qrTitle: "Scanner pour rejoindre",
      copyLink: "Copier le lien",
      copied: "Lien copie",
      copyFailed: "Copie impossible",
      title: "Inviter des membres",
    };
  }

  if (locale === "en") {
    return {
      add: "Add",
      close: "Close",
      empty: "No mutual follows to invite.",
      failed: "Could not invite.",
      invite: "Invite",
      inviteByQr: "QR code",
      inviteFriends: "Contacts",
      pending: "Inviting...",
      qrFailed: "Could not generate the QR code.",
      qrHint: "Ask someone to scan this code to open and join the group.",
      qrTitle: "Scan to join",
      copyLink: "Copy link",
      copied: "Link copied",
      copyFailed: "Could not copy",
      title: "Invite members",
    };
  }

  return {
    add: "添加",
    close: "关闭",
    empty: "暂无可邀请的互关用户。",
    failed: "邀请失败，请稍后再试。",
    invite: "邀请",
    inviteByQr: "二维码",
    inviteFriends: "好友",
    pending: "邀请中...",
    qrFailed: "二维码生成失败，请稍后再试。",
    qrHint: "让对方扫码打开聚吧，登录后即可按当前报名规则加入。",
    qrTitle: "扫码加入聚吧",
    copyLink: "复制链接",
    copied: "已复制",
    copyFailed: "复制失败",
    title: "邀请成员",
  };
}

async function copyInviteLink(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) {
      throw new Error("Could not copy activity invite link");
    }
  }
}

function getInitial(name: string) {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "F";
}

function InviteCandidateForm({
  activityId,
  candidate,
  locale,
  onInvited,
}: {
  activityId: string;
  candidate: ActivityRoomInviteCandidateViewModel;
  locale: string;
  onInvited: () => void;
}) {
  const router = useRouter();
  const copy = getCopy(locale);
  const [state, formAction, isPending] = useActionState(
    inviteActivityRoomParticipantAction,
    initialInviteActionState,
  );

  useEffect(() => {
    if (!state.ok) {
      return;
    }

    onInvited();
    router.refresh();
  }, [onInvited, router, state.ok]);

  return (
    <form action={formAction} className="grid gap-1.5" noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="inviteeProfileId" type="hidden" value={candidate.id} />
      <input name="locale" type="hidden" value={locale} />
      <button
        className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 text-left ring-1 ring-[#E7E2D6] transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
        disabled={isPending}
        type="submit"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F7F7F0] text-sm font-bold text-[#156240] ring-1 ring-[#E7E2D6]">
            {candidate.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                src={candidate.avatarUrl}
              />
            ) : (
              getInitial(candidate.nickname)
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-[#111210]">
              {candidate.nickname}
            </span>
            {candidate.friendCode ? (
              <span className="block text-xs font-semibold text-[#8B907F]">
                {candidate.friendCode}
              </span>
            ) : null}
          </span>
        </span>
        <span className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#156240] px-3 text-xs font-bold text-white">
          {isPending ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          {isPending ? copy.pending : copy.invite}
        </span>
      </button>
      {state.formError ? (
        <p className="px-2 text-xs font-bold leading-5 text-[#B5301F]">
          {state.formError || copy.failed}
        </p>
      ) : null}
    </form>
  );
}

export function ActivityRoomInviteDialog({
  activityId,
  candidates,
  locale,
  sharePath,
  triggerVariant = "tool",
}: {
  activityId: string;
  candidates: ActivityRoomInviteCandidateViewModel[];
  locale: string;
  sharePath?: string;
  triggerVariant?: "avatar" | "tool";
}) {
  const copy = getCopy(locale);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"friends" | "qr">("friends");
  const [inviteUrl, setInviteUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    setInviteUrl(
      sharePath ? new URL(sharePath, window.location.origin).toString() : "",
    );
  }, [sharePath]);

  useEffect(() => {
    if (!inviteUrl) {
      return;
    }

    let cancelled = false;
    setQrDataUrl(null);
    setQrFailed(false);

    QRCode.toDataURL(inviteUrl, {
      color: {
        dark: "#111210",
        light: "#FFFFFF",
      },
      margin: 1,
      width: 360,
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [inviteUrl]);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setCopyFailed(false);
      setMode("friends");
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleCopyLink() {
    if (!inviteUrl) {
      return;
    }

    try {
      await copyInviteLink(inviteUrl);
      setCopyFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
      setCopyFailed(true);
      window.setTimeout(() => setCopyFailed(false), 1800);
    }
  }

  return (
    <>
      {triggerVariant === "avatar" ? (
        <button
          className="grid min-w-0 justify-items-center gap-1.5 transition active:scale-95"
          onClick={() => setOpen(true)}
          type="button"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-[0.85rem] bg-white text-[#156240] ring-1 ring-[#D6D5B2]">
            <Plus className="h-5 w-5" />
          </span>
          <span className="max-w-full truncate text-[11px] font-semibold leading-none text-[#6C746A]">
            {copy.add}
          </span>
        </button>
      ) : (
        <button
          aria-haspopup="dialog"
          className="group relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold text-[#607268] transition hover:bg-[#F2F8F3] hover:text-[#156240] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#369758] active:scale-[0.97]"
          onClick={() => setOpen(true)}
          type="button"
        >
          <span className="flex h-6 w-6 items-center justify-center text-[#5C8A6C] transition group-hover:text-[#156240]">
            <UserPlus className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <span className="max-w-full truncate">{copy.invite}</span>
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end bg-[#111210]/42 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+1rem)] sm:items-center sm:justify-center sm:p-6"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setOpen(false);
            }
          }}
          role="presentation"
        >
          <section
            aria-labelledby="activity-room-invite-title"
            aria-modal="true"
            className="max-h-[min(82svh,34rem)] w-full max-w-md overflow-hidden rounded-[1.35rem] border border-[#D6D5B2] bg-white shadow-[0_24px_70px_rgba(17,18,16,0.24)]"
            role="dialog"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#EFEFEA] px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ECF5EF] text-[#156240] ring-1 ring-[#D8E8DC]">
                  <UserPlus className="h-4 w-4" />
                </span>
                <h2
                  className="truncate text-base font-bold text-[#111210]"
                  id="activity-room-invite-title"
                >
                  {copy.title}
                </h2>
              </div>
              <button
                aria-label={copy.close}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6C746A] transition active:bg-[#F7F7F0]"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {sharePath ? (
              <div className="border-b border-[#EFEFEA] px-4 py-2.5">
                <div className="grid grid-cols-2 rounded-xl bg-[#F4F5F0] p-1">
                  <button
                    className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition ${
                      mode === "friends"
                        ? "bg-white text-[#156240] shadow-sm"
                        : "text-[#6C746A]"
                    }`}
                    onClick={() => setMode("friends")}
                    type="button"
                  >
                    <UsersRound className="h-3.5 w-3.5" />
                    {copy.inviteFriends}
                  </button>
                  <button
                    className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition ${
                      mode === "qr"
                        ? "bg-white text-[#156240] shadow-sm"
                        : "text-[#6C746A]"
                    }`}
                    onClick={() => setMode("qr")}
                    type="button"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    {copy.inviteByQr}
                  </button>
                </div>
              </div>
            ) : null}
            <div
              className={`overflow-y-auto px-4 py-3 ${
                sharePath
                  ? "max-h-[calc(min(82svh,34rem)-7.7rem)]"
                  : "max-h-[calc(min(82svh,34rem)-3.75rem)]"
              }`}
            >
              {mode === "friends" ? (
                candidates.length > 0 ? (
                  <div className="grid gap-2">
                    {candidates.map((candidate) => (
                      <InviteCandidateForm
                        activityId={activityId}
                        candidate={candidate}
                        key={candidate.id}
                        locale={locale}
                        onInvited={() => setOpen(false)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl bg-[#F7F7F0] px-4 py-5 text-center text-sm font-bold leading-6 text-[#6C746A]">
                    {copy.empty}
                  </p>
                )
              ) : (
                <div className="grid justify-items-center gap-3 py-1 text-center">
                  <div className="overflow-hidden rounded-2xl bg-white p-2.5 ring-1 ring-[#E7E2D6]">
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={copy.qrTitle}
                        className="h-48 w-48"
                        draggable={false}
                        src={qrDataUrl}
                      />
                    ) : (
                      <span className="flex h-48 w-48 items-center justify-center bg-[#F7F7F0] text-[#156240]">
                        {qrFailed ? (
                          <span className="max-w-36 text-xs font-bold leading-5 text-[#B5301F]">
                            {copy.qrFailed}
                          </span>
                        ) : (
                          <LoaderCircle className="h-6 w-6 animate-spin" />
                        )}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#111210]">
                      {copy.qrTitle}
                    </p>
                    <p className="mt-1 max-w-xs text-xs font-medium leading-5 text-[#6C746A]">
                      {copy.qrHint}
                    </p>
                  </div>
                  <button
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#D6D5B2] bg-white px-5 text-xs font-bold text-[#156240] transition active:scale-[0.98] disabled:opacity-60"
                    disabled={!inviteUrl}
                    onClick={handleCopyLink}
                    type="button"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied
                      ? copy.copied
                      : copyFailed
                        ? copy.copyFailed
                        : copy.copyLink}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
