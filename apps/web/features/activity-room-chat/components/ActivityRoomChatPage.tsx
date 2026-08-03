"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  Lock,
  LogOut,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Plus,
  SendHorizontal,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import {
  Fragment,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button } from "@chill-club/ui";
import { ActivityAnnouncementComposer } from "@/features/activities/components/ActivityAnnouncementComposer";
import { ActivityCheckInReviewPanel } from "@/features/activities/components/ActivityCheckInReviewPanel";
import { ActivityCoManagerPanel } from "@/features/activities/components/ActivityCoManagerPanel";
import { CancelActivityForm } from "@/features/activities/components/CancelActivityForm";
import {
  cancelParticipationAction,
  type CancelParticipationState,
} from "@/features/activities/actions/cancelParticipation";
import { ActivityParticipantContactDialog } from "@/features/direct-messages/components/ActivityParticipantContactDialog";
import { ContextualDetailLink } from "@/features/navigation/components/ContextualDetailLink";
import { cn } from "@/lib/utils";
import { withLocale } from "@/lib/routes";
import {
  formatChatDateSeparator,
  formatChatListTimestamp,
  formatChatMessageTime,
  getChatDateKey,
} from "@/lib/chatDateSeparators";
import {
  deleteActivityRoomMessageAction,
  inviteActivityRoomParticipantAction,
  removeActivityRoomParticipantAction,
  sendActivityRoomMessageAction,
  type ActivityRoomChatActionState,
  type ActivityRoomInviteActionState,
  type ActivityRoomMemberActionState,
} from "../actions/activityRoomChatActions";
import { getActivityRoomChatCopy } from "../copy";
import type {
  ActivityRoomChatActivityViewModel,
  ActivityRoomAnnouncementViewModel,
  ActivityRoomManagementViewModel,
  ActivityRoomChatPolicy,
  ActivityRoomInviteCandidateViewModel,
  ActivityRoomManagedParticipantViewModel,
  ActivityRoomMemberPreviewViewModel,
  ActivityRoomMessageViewModel,
} from "../services/activityRoomChat";

type ActivityRoomViewer = {
  avatarUrl: string | null;
  id: string;
  nickname: string;
};

type ActivityRoomChatPageProps = {
  activity: ActivityRoomChatActivityViewModel | null;
  activityId: string;
  locale: string;
  messages: ActivityRoomMessageViewModel[];
  policy: ActivityRoomChatPolicy;
  signInHref: string;
  viewer: ActivityRoomViewer | null;
};

type ActivityRoomManagePageProps = {
  activity: ActivityRoomChatActivityViewModel | null;
  activityId: string;
  locale: string;
  management?: ActivityRoomManagementViewModel | null;
  policy: ActivityRoomChatPolicy;
  signInHref: string;
  viewer: ActivityRoomViewer | null;
};

const initialActionState: ActivityRoomChatActionState = {};
const initialLeaveState: CancelParticipationState = {};
const initialInviteActionState: ActivityRoomInviteActionState = {};
const initialMemberActionState: ActivityRoomMemberActionState = {};

function getAvatarInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "F";
}

function getRoomManagementCopy(locale: string) {
  if (locale === "fr") {
    return {
      backToRoom: "Retour au chat",
      addMember: "Ajouter",
      close: "Fermer",
      contactParticipants: "Contacter",
      groupAnnouncement: "Annonce",
      groupName: "Nom du groupe",
      infoTitle: "Membres",
      invite: "Inviter",
      inviteEmpty: "Aucun contact mutuel à inviter.",
      inviteFailed: "Invitation impossible.",
      invitePending: "Invitation...",
      inviteSuccess: "Invité.",
      inviteTitle: "Inviter",
      kick: "Retirer",
      kickCancel: "Annuler",
      kickConfirm: "Retirer",
      kickDescription: "Cette personne perdra l'acces a ce groupe.",
      kickFailed: "Impossible de retirer cette personne.",
      kickPending: "Retrait...",
      kickTitle: "Retirer ce membre ?",
      label: "Options",
      leave: "Quitter le groupe",
      leaveCancel: "Rester",
      leaveConfirm: "Quitter",
      leaveDescription:
        "Vous n'aurez plus acces a cette discussion. Vous devrez rejoindre le groupe a nouveau.",
      leaveFailed: "Impossible de quitter pour le moment.",
      leavePending: "Sortie...",
      leaveTitle: "Quitter ce groupe ?",
      manageTitle: "Discussion",
      members: "Membres",
      membersCount: (count: number) => `${count} membre${count > 1 ? "s" : ""}`,
      moreMembers: "Voir plus",
      noAnnouncement: "Aucune annonce",
      removeMember: "Retirer",
      stopRemoving: "Terminé",
      viewGroup: "Voir le groupe",
    };
  }

  if (locale === "en") {
    return {
      backToRoom: "Back to chat",
      addMember: "Add",
      close: "Close",
      contactParticipants: "Contact",
      groupAnnouncement: "Group announcement",
      groupName: "Group name",
      infoTitle: "Members",
      invite: "Invite",
      inviteEmpty: "No mutual follows to invite.",
      inviteFailed: "Could not invite.",
      invitePending: "Inviting...",
      inviteSuccess: "Invited.",
      inviteTitle: "Invite",
      kick: "Remove",
      kickCancel: "Cancel",
      kickConfirm: "Remove",
      kickDescription: "This person will lose access to this group.",
      kickFailed: "Could not remove this member.",
      kickPending: "Removing...",
      kickTitle: "Remove this member?",
      label: "Options",
      leave: "Leave group",
      leaveCancel: "Stay",
      leaveConfirm: "Leave",
      leaveDescription:
        "You will lose access to this chat. Join the group again to come back.",
      leaveFailed: "Could not leave right now.",
      leavePending: "Leaving...",
      leaveTitle: "Leave this group?",
      manageTitle: "Chat",
      members: "Members",
      membersCount: (count: number) =>
        `${count} member${count === 1 ? "" : "s"}`,
      moreMembers: "More members",
      noAnnouncement: "No announcement",
      removeMember: "Remove",
      stopRemoving: "Done",
      viewGroup: "View group",
    };
  }

  return {
    backToRoom: "返回群聊",
    addMember: "添加",
    close: "关闭",
    contactParticipants: "联系成员",
    groupAnnouncement: "群公告",
    groupName: "群聊名称",
    infoTitle: "成员",
    invite: "邀请",
    inviteEmpty: "暂无可邀请的互关用户。",
    inviteFailed: "邀请失败，请稍后再试。",
    invitePending: "邀请中...",
    inviteSuccess: "已邀请。",
    inviteTitle: "邀请互关",
    kick: "移出",
    kickCancel: "取消",
    kickConfirm: "确认移出",
    kickDescription: "对方将不能继续查看这个群聊。",
    kickFailed: "暂时无法移出这位成员。",
    kickPending: "移出中...",
    kickTitle: "移出这位成员？",
    label: "群聊设置",
    leave: "退出本聚吧",
    leaveCancel: "暂不退出",
    leaveConfirm: "确认退出",
    leaveDescription:
      "退出后将无法继续查看这个群聊，需要重新加入聚吧才能回来。",
    leaveFailed: "暂时无法退出。",
    leavePending: "退出中...",
    leaveTitle: "确认退出本聚吧？",
    manageTitle: "群聊",
    members: "成员",
    membersCount: (count: number) => `${count} 位成员`,
    moreMembers: "查看更多成员",
    noAnnouncement: "暂无群公告",
    removeMember: "移除",
    stopRemoving: "完成",
    viewGroup: "查看聚吧",
  };
}

function RoomAvatar({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string;
}) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xs font-black text-[#156240] shadow-[0_8px_18px_rgba(21,98,64,0.1)] ring-1 ring-[#D6D5B2]">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          src={avatarUrl}
        />
      ) : (
        getAvatarInitial(name)
      )}
    </span>
  );
}

function ActivityRoomChatAutoRefresh({
  activityId,
  intervalMs = 8000,
}: {
  activityId: string;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      const activeElement = document.activeElement;
      const composer = document.querySelector("[data-activity-room-composer]");
      const textarea = composer?.querySelector("textarea");
      const isComposing =
        activeElement instanceof HTMLElement &&
        Boolean(activeElement.closest("[data-activity-room-composer]"));
      const hasDraft = Boolean(textarea?.value.trim());

      if (document.visibilityState === "visible" && !isComposing && !hasDraft) {
        router.refresh();
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [activityId, intervalMs, router]);

  return null;
}

function ActivityRoomManagementMenu({
  activityId,
  locale,
}: {
  activityId: string;
  locale: string;
}) {
  const copy = getRoomManagementCopy(locale);

  return (
    <Link
      aria-label={copy.label}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#156240] ring-1 ring-[#D6D5B2] transition active:scale-95"
      href={withLocale(locale, `/lobby/${activityId}/room/manage`)}
      title={copy.label}
    >
      <MoreHorizontal className="h-4 w-4" />
    </Link>
  );
}

function ActivityRoomManageBackButton({
  fallbackHref,
  label,
}: {
  fallbackHref: string;
  label: string;
}) {
  const router = useRouter();

  return (
    <button
      aria-label={label}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#111210]/72 ring-1 ring-[#E7E1CA] transition active:scale-95"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.replace(fallbackHref);
      }}
      title={label}
      type="button"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}

function RoomInfoAvatarVisual({
  avatarUrl,
  className,
  name,
  role = "PARTICIPANT",
}: {
  avatarUrl: string | null;
  className?: string;
  name: string;
  role?: ActivityRoomMemberPreviewViewModel["role"];
}) {
  return (
    <span
      className={cn(
        "flex h-12 w-12 items-center justify-center overflow-hidden text-base font-black ring-1",
        role === "ORGANIZER"
          ? "rounded-[0.9rem] bg-[#156240] text-white ring-[#156240]/25"
          : "rounded-[0.85rem] bg-[#F7F7F0] text-[#156240] ring-[#E7E2D6]",
        className,
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          src={avatarUrl}
        />
      ) : (
        getAvatarInitial(name)
      )}
    </span>
  );
}

function RoomInfoAvatar({
  member,
  muted = false,
}: {
  member: ActivityRoomMemberPreviewViewModel;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 justify-items-center gap-1.5",
        muted && "opacity-45",
      )}
    >
      <RoomInfoAvatarVisual
        avatarUrl={member.avatarUrl}
        name={member.nickname}
        role={member.role}
      />
      <span className="line-clamp-2 min-h-[2rem] max-w-full break-words text-center text-[11px] font-semibold leading-4 text-[#6C746A]">
        {member.nickname}
      </span>
    </div>
  );
}

function ActivityRoomActionAvatar({
  active = false,
  disabled = false,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="grid min-w-0 justify-items-center gap-1.5 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-[0.85rem] bg-white text-[#156240] ring-1 ring-[#D6D5B2]",
          active && "bg-[#FFF1EF] text-[#B5301F] ring-[#F0B7AE]",
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "max-w-full truncate text-[11px] font-semibold leading-none text-[#6C746A]",
          active && "text-[#B5301F]",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function ActivityRoomGridRemoveMemberButton({
  activityId,
  locale,
  member,
}: {
  activityId: string;
  locale: string;
  member: ActivityRoomManagedParticipantViewModel;
}) {
  const router = useRouter();
  const copy = getRoomManagementCopy(locale);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    removeActivityRoomParticipantAction,
    initialMemberActionState,
  );

  useEffect(() => {
    if (!state.ok) {
      return;
    }

    setConfirmOpen(false);
    router.refresh();
  }, [router, state.ok]);

  return (
    <form
      action={formAction}
      className="grid min-w-0 justify-items-center gap-1.5"
      noValidate
    >
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />
      <input name="participantId" type="hidden" value={member.id} />
      <button
        className="group grid min-w-0 justify-items-center gap-1.5 transition active:scale-95 disabled:cursor-wait disabled:opacity-70"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
        type="button"
      >
        <span className="relative">
          <RoomInfoAvatarVisual
            avatarUrl={member.user.avatarUrl}
            name={member.user.nickname}
          />
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#E7457A] text-white ring-2 ring-white">
            {isPending ? (
              <LoaderCircle className="h-3 w-3 animate-spin" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
          </span>
        </span>
        <span className="max-w-full truncate text-[11px] font-semibold leading-none text-[#B5301F]">
          {member.user.nickname}
        </span>
      </button>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[#111210]/42 px-5 py-[max(1rem,env(safe-area-inset-top))]"
          role="presentation"
        >
          <div
            aria-describedby="activity-room-kick-description"
            aria-labelledby="activity-room-kick-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-[1.25rem] border border-[#F0B7AE] bg-white p-5 shadow-[0_24px_70px_rgba(17,18,16,0.24)]"
            role="alertdialog"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF1EF] text-[#B5301F]">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h2
              className="mt-4 text-lg font-black text-[#111210]"
              id="activity-room-kick-title"
            >
              {copy.kickTitle}
            </h2>
            <p
              className="mt-2 text-sm font-semibold leading-6 text-[#6C746A]"
              id="activity-room-kick-description"
            >
              {copy.kickDescription}
            </p>
            <p className="mt-3 truncate rounded-xl bg-[#F7F7F0] px-3 py-2 text-xs font-black text-[#4F574F]">
              {member.user.nickname}
            </p>
            {state.formError ? (
              <p className="mt-3 rounded-xl bg-[#FFF1EF] px-3 py-2 text-xs font-bold leading-5 text-[#B5301F]">
                {state.formError || copy.kickFailed}
              </p>
            ) : null}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                className="h-11 rounded-full border border-[#D6D5B2] bg-white text-sm font-black text-[#4F574F] transition active:scale-[0.98]"
                disabled={isPending}
                onClick={() => setConfirmOpen(false)}
                type="button"
              >
                {copy.kickCancel}
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#B5301F] text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                disabled={isPending}
                type="submit"
              >
                {isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                {isPending ? copy.kickPending : copy.kickConfirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function ActivityRoomInviteCandidateForm({
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
  const copy = getRoomManagementCopy(locale);
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
          <RoomAvatar
            avatarUrl={candidate.avatarUrl}
            name={candidate.nickname}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-black text-[#111210]">
              {candidate.nickname}
            </span>
            {candidate.friendCode ? (
              <span className="block text-xs font-semibold text-[#8B907F]">
                {candidate.friendCode}
              </span>
            ) : null}
          </span>
        </span>
        <span className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#156240] px-3 text-xs font-black text-white">
          {isPending ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          {isPending ? copy.invitePending : copy.invite}
        </span>
      </button>
      {state.formError ? (
        <p className="px-2 text-xs font-bold leading-5 text-[#B5301F]">
          {state.formError || copy.inviteFailed}
        </p>
      ) : null}
    </form>
  );
}

function ActivityRoomInviteDialog({
  activityId,
  candidates,
  locale,
}: {
  activityId: string;
  candidates: ActivityRoomInviteCandidateViewModel[];
  locale: string;
}) {
  const copy = getRoomManagementCopy(locale);
  const [open, setOpen] = useState(false);

  return (
    <>
      <ActivityRoomActionAvatar
        icon={<Plus className="h-5 w-5" />}
        label={copy.addMember}
        onClick={() => setOpen(true)}
      />

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-[#111210]/42 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+1rem)] sm:items-center sm:justify-center sm:p-6"
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
                  className="truncate text-base font-black text-[#111210]"
                  id="activity-room-invite-title"
                >
                  {copy.inviteTitle}
                </h2>
              </div>
              <button
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6C746A] transition active:bg-[#F7F7F0]"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(min(82svh,34rem)-3.75rem)] overflow-y-auto px-4 py-3">
              {candidates.length > 0 ? (
                <div className="grid gap-2">
                  {candidates.map((candidate) => (
                    <ActivityRoomInviteCandidateForm
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
                  {copy.inviteEmpty}
                </p>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function ActivityRoomMemberPreviewGrid({
  activityId,
  canManage,
  inviteCandidates,
  locale,
  members,
  moreLabel,
  removableMembers,
}: {
  activityId: string;
  canManage: boolean;
  inviteCandidates: ActivityRoomInviteCandidateViewModel[];
  locale: string;
  members: ActivityRoomMemberPreviewViewModel[];
  moreLabel: string;
  removableMembers: ActivityRoomManagedParticipantViewModel[];
}) {
  const copy = getRoomManagementCopy(locale);
  const [removeMode, setRemoveMode] = useState(false);
  const visibleMembers = members.slice(0, canManage ? 18 : 20);
  const removableMemberByProfileId = new Map(
    removableMembers.map((member) => [member.user.id, member]),
  );

  if (visibleMembers.length === 0 && !canManage) {
    return null;
  }

  return (
    <section className="bg-white px-5 py-5">
      <div className="grid grid-cols-5 gap-x-3 gap-y-5">
        {visibleMembers.map((member) => {
          const removableMember = removableMemberByProfileId.get(member.id);

          return removeMode && removableMember ? (
            <ActivityRoomGridRemoveMemberButton
              activityId={activityId}
              key={member.id}
              locale={locale}
              member={removableMember}
            />
          ) : (
            <RoomInfoAvatar
              key={member.id}
              member={member}
              muted={removeMode && !removableMember}
            />
          );
        })}
        {canManage ? (
          <ActivityRoomInviteDialog
            activityId={activityId}
            candidates={inviteCandidates}
            locale={locale}
          />
        ) : null}
        {canManage && removableMembers.length > 0 ? (
          <ActivityRoomActionAvatar
            active={removeMode}
            icon={
              removeMode ? (
                <X className="h-5 w-5" />
              ) : (
                <UserMinus className="h-5 w-5" />
              )
            }
            label={removeMode ? copy.stopRemoving : copy.removeMember}
            onClick={() => setRemoveMode((value) => !value)}
          />
        ) : null}
      </div>
      {members.length > visibleMembers.length ? (
        <p className="mt-4 text-center text-xs font-semibold text-[#8B907F]">
          {moreLabel}
        </p>
      ) : null}
    </section>
  );
}

function ActivityRoomInfoRow({
  children,
  label,
}: {
  children?: ReactNode;
  label: string;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-[#EFEFEA] bg-white px-5 py-3 last:border-b-0">
      <span className="shrink-0 text-[15px] font-black text-[#111210]">
        {label}
      </span>
      <span className="min-w-0 text-right text-sm font-semibold text-[#8B907F]">
        {children}
      </span>
    </div>
  );
}

function ActivityRoomInfoContextualLinkRow({
  activityHref,
  activityId,
  label,
  locale,
  roomHref,
}: {
  activityHref: string;
  activityId: string;
  label: string;
  locale: string;
  roomHref: string;
}) {
  const copy = getRoomManagementCopy(locale);

  return (
    <ContextualDetailLink
      className="flex min-h-14 items-center justify-between gap-4 border-b border-[#EFEFEA] bg-white px-5 py-3 transition active:bg-[#F7F7F0] last:border-b-0"
      detailSource={{
        sourceHref: roomHref,
        sourceKey: "messages",
        sourceLabel: copy.backToRoom,
        targetKey: `activity:${activityId}`,
        targetKind: "activity",
      }}
      href={activityHref}
    >
      <span className="shrink-0 text-[15px] font-black text-[#111210]">
        {label}
      </span>
      <span className="flex min-w-0 items-center justify-end gap-2 text-right text-sm font-semibold text-[#8B907F]">
        <ExternalLink className="h-4 w-4 shrink-0" />
        <ChevronRight className="h-4 w-4 shrink-0 text-[#B6B7AE]" />
      </span>
    </ContextualDetailLink>
  );
}

function ActivityRoomLeaveAction({
  activityHref,
  activityId,
  activityTitle,
  locale,
}: {
  activityHref: string;
  activityId: string;
  activityTitle: string;
  locale: string;
}) {
  const router = useRouter();
  const copy = getRoomManagementCopy(locale);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    cancelParticipationAction,
    initialLeaveState,
  );

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setConfirmOpen(false);
    router.push(activityHref);
    router.refresh();
  }, [activityHref, router, state.success]);

  return (
    <form action={formAction} className="grid gap-2" noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />
      {state.formError ? (
        <p className="rounded-xl bg-[#FFF1EF] px-3 py-2 text-xs font-bold leading-5 text-[#B5301F]">
          {state.formError || copy.leaveFailed}
        </p>
      ) : null}
      <button
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#F0B7AE] bg-white px-4 text-sm font-black text-[#B5301F] transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
        type="button"
      >
        {isPending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        {isPending ? copy.leavePending : copy.leave}
      </button>
      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-[#111210]/42 px-5 py-[max(1rem,env(safe-area-inset-top))]"
          role="presentation"
        >
          <div
            aria-describedby="activity-room-leave-description"
            aria-labelledby="activity-room-leave-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-[1.25rem] border border-[#F0B7AE] bg-white p-5 shadow-[0_24px_70px_rgba(17,18,16,0.24)]"
            role="alertdialog"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF1EF] text-[#B5301F]">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h2
              className="mt-4 text-lg font-black text-[#111210]"
              id="activity-room-leave-title"
            >
              {copy.leaveTitle}
            </h2>
            <p
              className="mt-2 text-sm font-semibold leading-6 text-[#6C746A]"
              id="activity-room-leave-description"
            >
              {copy.leaveDescription}
            </p>
            {activityTitle ? (
              <p className="mt-3 truncate rounded-xl bg-[#F7F7F0] px-3 py-2 text-xs font-black text-[#4F574F]">
                {activityTitle}
              </p>
            ) : null}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                className="h-11 rounded-full border border-[#D6D5B2] bg-white text-sm font-black text-[#4F574F] transition active:scale-[0.98]"
                disabled={isPending}
                onClick={() => setConfirmOpen(false)}
                type="button"
              >
                {copy.leaveCancel}
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#B5301F] text-sm font-black text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                disabled={isPending}
                type="submit"
              >
                {isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                {isPending ? copy.leavePending : copy.leaveConfirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function ScrollAnchor({ lastMessageId }: { lastMessageId?: string }) {
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    anchorRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageId]);

  return <div ref={anchorRef} aria-hidden="true" />;
}

function ChatDateSeparator({
  createdAt,
  locale,
}: {
  createdAt: string;
  locale: string;
}) {
  const label = formatChatDateSeparator(createdAt, locale);

  if (!label) {
    return null;
  }

  return (
    <div className="my-1 flex items-center gap-3 px-8" aria-label={label}>
      <span className="h-px flex-1 bg-[#E7E2D6]" />
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#8B907F] ring-1 ring-[#E7E2D6]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[#E7E2D6]" />
    </div>
  );
}

function ActivityRoomAnnouncementNotice({
  announcements,
  locale,
  variant = "bar",
}: {
  announcements: ActivityRoomAnnouncementViewModel[];
  locale: string;
  variant?: "bar" | "row";
}) {
  const [open, setOpen] = useState(false);
  const copy = getActivityRoomChatCopy(locale).announcements;
  const latestAnnouncement = announcements[0];
  const isRow = variant === "row";

  if (!latestAnnouncement) {
    return null;
  }

  return (
    <>
      <button
        className={cn(
          "group flex items-center gap-2 bg-white text-left transition active:bg-[#F7F7F0]",
          isRow
            ? "min-h-14 w-full border-b border-[#EFEFEA] px-5 py-3 last:border-b-0"
            : "mx-4 my-2 min-h-9 max-w-[calc(100%-2rem)] self-start rounded-full border border-[#D6D5B2] px-3 py-1.5 shadow-sm",
        )}
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ECF5EF] text-[#156240] ring-1 ring-[#D8E8DC]">
          <Bell className="h-3.5 w-3.5" />
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#E7457A] ring-2 ring-white"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[12px] font-black text-[#156240]">
              {copy.title}
            </span>
            <span className="min-w-0 truncate text-[12px] font-semibold text-[#5F635E]">
              {latestAnnouncement.content}
            </span>
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[#8B907F] transition group-active:translate-x-0.5" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-[#111210]/42 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+1rem)] sm:items-center sm:justify-center sm:p-6"
          role="presentation"
        >
          <section
            aria-labelledby="activity-room-announcement-title"
            aria-modal="true"
            className="max-h-[min(82svh,34rem)] w-full max-w-md overflow-hidden rounded-[1.35rem] border border-[#D6D5B2] bg-white shadow-[0_24px_70px_rgba(17,18,16,0.24)]"
            role="dialog"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#E9E1CD] px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ECF5EF] text-[#156240] ring-1 ring-[#D8E8DC]">
                  <Bell className="h-4 w-4" />
                </span>
                <h2
                  className="truncate text-base font-black text-[#111210]"
                  id="activity-room-announcement-title"
                >
                  {copy.title}
                </h2>
              </div>
              <button
                className="h-8 shrink-0 rounded-full px-3 text-xs font-black text-[#6C746A] transition active:bg-[#F7F7F0]"
                onClick={() => setOpen(false)}
                type="button"
              >
                {copy.close}
              </button>
            </div>
            <div className="max-h-[calc(min(82svh,34rem)-3.5rem)] overflow-y-auto px-4 py-3">
              <div className="grid gap-3">
                {announcements.map((announcement, index) => (
                  <article
                    className="rounded-[1rem] border border-[#E7E2D6] bg-[#FEFFF9] px-3.5 py-3"
                    key={announcement.id}
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] font-bold text-[#8B907F]">
                      <span className="rounded-full bg-white px-2 py-1 text-[#156240] ring-1 ring-[#D8E8DC]">
                        {announcement.authorName}
                      </span>
                      {index === 0 ? (
                        <span className="rounded-full bg-[#E7457A] px-2 py-1 text-white">
                          {copy.latest}
                        </span>
                      ) : null}
                      <span>
                        {formatChatListTimestamp(
                          announcement.createdAt,
                          locale,
                        )}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-[#111210]">
                      {announcement.content}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function StatusPanel({
  actionHref,
  actionLabel,
  description,
  icon = "lock",
  title,
}: StatusPanelProps) {
  const Icon = icon === "message" ? MessageCircle : Lock;

  return (
    <div className="flex min-h-[18rem] items-center justify-center px-5 py-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#156240] shadow-[0_10px_24px_rgba(21,98,64,0.08)] ring-1 ring-[#D6D5B2]">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-lg font-black text-[#111210]">{title}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#6C746A]">
          {description}
        </p>
        {actionHref && actionLabel ? (
          <Link
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#156240] px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(21,98,64,0.18)] transition active:scale-95"
            href={actionHref}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

type StatusPanelProps = {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  icon?: "lock" | "message";
  title: string;
};

export function ActivityRoomManagePage({
  activity,
  activityId,
  locale,
  management,
  policy,
  signInHref,
  viewer,
}: ActivityRoomManagePageProps) {
  const copy = getRoomManagementCopy(locale);
  const chatCopy = getActivityRoomChatCopy(locale);
  const activityHref = withLocale(
    locale,
    `/lobby/${activity?.id ?? activityId}`,
  );
  const roomHref = withLocale(
    locale,
    `/lobby/${activity?.id ?? activityId}/room`,
  );
  const state: StatusPanelProps | null = getDeniedState({
    activity,
    activityHref,
    locale,
    policy,
    signInHref,
    viewer,
  });
  const canManageRoom =
    policy.role === "ORGANIZER" || policy.role === "CO_MANAGER";
  const memberPreview =
    management?.memberPreview ??
    (viewer && policy.canView
      ? [
          {
            id: viewer.id,
            avatarUrl: viewer.avatarUrl,
            nickname: viewer.nickname,
            role: "PARTICIPANT" as const,
            status: null,
          },
        ]
      : []);
  const titleSuffix =
    memberPreview.length > 0 ? ` (${memberPreview.length})` : "";

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden bg-white text-[#111210] md:h-[calc(100dvh-8rem)] md:rounded-[1.45rem] md:border md:border-[#D6D5B2]">
      <header className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2 border-b border-[#EFEFEA] bg-white p-4 max-md:pt-[calc(env(safe-area-inset-top)+1rem)]">
        <ActivityRoomManageBackButton
          fallbackHref={roomHref}
          label={copy.backToRoom}
        />
        <h1 className="truncate text-center text-lg font-black text-[#111210]">
          {copy.infoTitle}
          {titleSuffix}
        </h1>
        <span aria-hidden="true" />
      </header>

      {state ? (
        <StatusPanel
          actionHref={state.actionHref}
          actionLabel={state.actionLabel}
          description={state.description}
          title={state.title}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <ActivityRoomMemberPreviewGrid
            activityId={activity?.id ?? activityId}
            canManage={canManageRoom}
            inviteCandidates={management?.inviteCandidates ?? []}
            locale={locale}
            members={memberPreview}
            moreLabel={copy.moreMembers}
            removableMembers={management?.roomParticipants ?? []}
          />

          <div className="h-2 bg-[#F2F2EF]" />

          <section className="bg-white">
            <ActivityRoomInfoRow label={copy.groupName}>
              <span className="line-clamp-1">
                {activity?.title ?? chatCopy.title}
              </span>
            </ActivityRoomInfoRow>
            {activity?.announcements.length ? (
              <ActivityRoomAnnouncementNotice
                announcements={activity.announcements}
                locale={locale}
                variant="row"
              />
            ) : null}
            <ActivityRoomInfoContextualLinkRow
              activityHref={activityHref}
              activityId={activity?.id ?? activityId}
              label={copy.viewGroup}
              locale={locale}
              roomHref={roomHref}
            />
          </section>

          {management && canManageRoom ? (
            <>
              <div className="h-2 bg-[#F2F2EF]" />
              <section className="bg-white px-4 py-4">
                <p className="mb-3 px-1 text-xs font-black uppercase tracking-[0.14em] text-[#8B907F]">
                  {canManageRoom ? copy.manageTitle : copy.label}
                </p>
                <div className="grid gap-3">
                  <ActivityAnnouncementComposer
                    activityId={activity?.id ?? activityId}
                    locale={locale}
                    compact
                  />
                  {management.contactableParticipants.length > 0 ? (
                    <ActivityParticipantContactDialog
                      activityId={activity?.id ?? activityId}
                      buttonClassName="min-h-10 bg-white px-4 text-sm font-black"
                      buttonLabel={copy.contactParticipants}
                      locale={locale}
                      participants={management.contactableParticipants}
                    />
                  ) : null}
                  <ActivityCheckInReviewPanel
                    activityId={activity?.id ?? activityId}
                    locale={locale}
                    participants={management.checkInRoster}
                  />
                  {management.coManagerDashboard ? (
                    <ActivityCoManagerPanel
                      dashboard={management.coManagerDashboard}
                      locale={locale}
                    />
                  ) : null}
                  <div className="rounded-[1rem] border border-[#F0D6D1] bg-white p-2">
                    <CancelActivityForm
                      activityId={activity?.id ?? activityId}
                      activityTitle={management.activityTitle}
                      disabled={!management.canCancelActivity}
                      locale={locale}
                    />
                  </div>
                </div>
              </section>
            </>
          ) : policy.role === "PARTICIPANT" ? (
            <>
              <div className="h-2 bg-[#F2F2EF]" />
              <section className="bg-white px-4 py-4">
                <ActivityRoomLeaveAction
                  activityHref={activityHref}
                  activityId={activity?.id ?? activityId}
                  activityTitle={activity?.title ?? chatCopy.title}
                  locale={locale}
                />
              </section>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}

function getDeniedState({
  activity,
  activityHref,
  locale,
  policy,
  signInHref,
  viewer,
}: {
  activity: ActivityRoomChatActivityViewModel | null;
  activityHref: string;
  locale: string;
  policy: ActivityRoomChatPolicy;
  signInHref: string;
  viewer: ActivityRoomViewer | null;
}): StatusPanelProps | null {
  const copy = getActivityRoomChatCopy(locale);

  if (policy.canView) {
    return null;
  }

  if (!viewer) {
    return {
      actionHref: signInHref,
      actionLabel: copy.loginAction,
      description: copy.loginDescription,
      title: copy.loginTitle,
    };
  }

  if (policy.reason === "PUBLIC_EVENT_UNAVAILABLE") {
    return {
      actionHref: activity?.publicEventId
        ? withLocale(
            locale,
            `/public-events/${activity.publicEventId}/teams/new`,
          )
        : activityHref,
      actionLabel: activity?.publicEventId
        ? copy.createGroup
        : copy.openActivity,
      description: copy.errors.PUBLIC_EVENT_UNAVAILABLE,
      title: copy.title,
    };
  }

  return {
    actionHref: activityHref,
    actionLabel: copy.viewActivity,
    description:
      policy.reason === "ALLOWED"
        ? copy.emptyDescription
        : copy.errors[policy.reason],
    title:
      policy.reason === "ACTIVITY_NOT_FOUND" ? copy.title : copy.lockedTitle,
  };
}

function getPolicyNotice(
  policy: ActivityRoomChatPolicy,
  locale: string,
  fallback: string,
) {
  const copy = getActivityRoomChatCopy(locale);

  return policy.reason === "ALLOWED" ? fallback : copy.errors[policy.reason];
}

function MessageRow({
  canManage,
  isDeleting,
  locale,
  message,
  onDelete,
  viewer,
}: {
  canManage: boolean;
  isDeleting: boolean;
  locale: string;
  message: ActivityRoomMessageViewModel;
  onDelete: (messageId: string) => void;
  viewer: ActivityRoomViewer | null;
}) {
  const copy = getActivityRoomChatCopy(locale);
  const canDelete = !message.isDeleted && (message.isMine || canManage);
  const sender = message.isMine && viewer ? viewer : message.sender;

  return (
    <div
      className={cn(
        "group flex items-start gap-2.5",
        message.isMine ? "justify-end" : "justify-start",
      )}
    >
      {!message.isMine ? (
        <span className="pt-[1.25rem]">
          <RoomAvatar avatarUrl={sender.avatarUrl} name={sender.nickname} />
        </span>
      ) : null}
      <div
        className={cn(
          "grid max-w-[76%] gap-0.5 sm:max-w-[64%]",
          message.isMine ? "justify-items-end" : "justify-items-start",
        )}
      >
        {!message.isMine ? (
          <p className="max-w-full truncate pl-1 text-[11px] font-black leading-4 text-[#6C746A]">
            {sender.nickname}
          </p>
        ) : null}
        <div
          className={cn(
            "rounded-[1.05rem] px-3.5 py-2 text-sm leading-6 shadow-[0_8px_18px_rgba(21,98,64,0.06)]",
            message.isDeleted
              ? "bg-[#F1F2EC] text-[#8B907F] ring-1 ring-[#DFDAC5]"
              : message.isMine
                ? "rounded-br-[0.35rem] bg-[#156240] text-white"
                : "rounded-tl-[0.35rem] bg-white text-[#111210] ring-1 ring-[#D6D5B2]",
          )}
        >
          <p
            className={cn(
              "whitespace-pre-wrap break-words",
              message.isDeleted && "font-semibold italic",
            )}
          >
            {message.isDeleted ? copy.deletedMessage : message.body}
          </p>
          <div
            className={cn(
              "mt-1 flex items-center gap-2 text-[11px]",
              message.isMine && !message.isDeleted
                ? "text-white/68"
                : "text-[#8B907F]",
            )}
          >
            <span>{formatChatMessageTime(message.createdAt, locale)}</span>
            {canDelete ? (
              <button
                aria-busy={isDeleting}
                aria-label={copy.deleteMessage}
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full opacity-100 transition active:scale-95 disabled:cursor-wait disabled:opacity-70 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
                  message.isMine
                    ? "bg-white/14 text-white hover:bg-white/22"
                    : "bg-[#F1F2EC] text-[#6C746A] hover:bg-[#E8E1CF]",
                )}
                disabled={isDeleting}
                onClick={() => onDelete(message.id)}
                title={copy.deleteMessage}
                type="button"
              >
                {isDeleting ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {message.isMine ? (
        <RoomAvatar avatarUrl={sender.avatarUrl} name={sender.nickname} />
      ) : null}
    </div>
  );
}

function RoomComposer({
  activityId,
  disabled,
  locale,
  onSent,
  viewer,
}: {
  activityId: string;
  disabled: boolean;
  locale: string;
  onSent: (message: ActivityRoomMessageViewModel) => void;
  viewer: ActivityRoomViewer | null;
}) {
  const copy = getActivityRoomChatCopy(locale);
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState("");
  const [isSending, setIsSending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled || isSending) {
      return;
    }

    const trimmedBody = body.trim();

    if (!trimmedBody) {
      setBody("");
      setFormError("");
      return;
    }

    const formData = new FormData();
    formData.set("activityId", activityId);
    formData.set("body", trimmedBody);
    formData.set("locale", locale);

    setFormError("");
    setIsSending(true);

    void sendActivityRoomMessageAction(initialActionState, formData)
      .then((state) => {
        if (state.ok && state.messageId) {
          setBody("");
          onSent({
            body: trimmedBody,
            createdAt: new Date().toISOString(),
            id: state.messageId,
            isDeleted: false,
            isMine: true,
            sender: {
              avatarUrl: viewer?.avatarUrl ?? null,
              friendCode: null,
              id: viewer?.id ?? "",
              nickname: viewer?.nickname ?? "Friemi",
            },
          });

          return;
        }

        setFormError(state.formError ?? copy.sendFailed);
        setBody(state.values?.body ?? trimmedBody);
      })
      .catch(() => {
        setFormError(copy.sendFailed);
        setBody(trimmedBody);
      })
      .finally(() => setIsSending(false));
  }

  return (
    <form
      className="relative z-20 shrink-0 border-t border-[#D6D5B2] bg-white/94 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:rounded-b-[1.45rem] md:pb-3"
      data-activity-room-composer
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="flex items-end gap-2">
        <textarea
          className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-[1.25rem] border border-[#D6D5B2] bg-[#FEFFF9] px-4 py-3 text-sm font-semibold leading-5 text-[#111210] outline-none placeholder:text-[#9BA08E] focus:border-[#8AB68E] focus:ring-2 focus:ring-[#8AB68E]/20 disabled:bg-[#F1F2EC]"
          disabled={disabled || isSending}
          maxLength={500}
          name="body"
          onChange={(event) => setBody(event.target.value)}
          placeholder={copy.placeholder}
          rows={1}
          value={body}
        />
        <Button
          aria-busy={isSending}
          className="h-11 min-w-11 shrink-0 rounded-full bg-[#156240] px-0 text-white shadow-[0_12px_24px_rgba(21,98,64,0.18)] hover:bg-[#156240] sm:min-w-[5rem] sm:px-4"
          disabled={disabled || isSending}
          type="submit"
        >
          {isSending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizontal className="h-4 w-4" />
          )}
          <span className="hidden whitespace-nowrap sm:inline">
            {isSending ? copy.sending : copy.send}
          </span>
          <span className="sr-only sm:hidden">
            {isSending ? copy.sending : copy.send}
          </span>
        </Button>
      </div>
      {formError ? (
        <p className="mt-2 px-2 text-xs font-bold text-[#9A2135]">
          {formError}
        </p>
      ) : null}
    </form>
  );
}

export function ActivityRoomChatPage({
  activity,
  activityId,
  locale,
  messages: initialMessages,
  policy,
  signInHref,
  viewer,
}: ActivityRoomChatPageProps) {
  const router = useRouter();
  const copy = getActivityRoomChatCopy(locale);
  const [messages, setMessages] =
    useState<ActivityRoomMessageViewModel[]>(initialMessages);
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const canManage = policy.role === "ORGANIZER" || policy.role === "CO_MANAGER";
  const lastMessageId = messages[messages.length - 1]?.id;
  const activityHref = withLocale(
    locale,
    `/lobby/${activity?.id ?? activityId}`,
  );
  const messagesHref = withLocale(locale, "/footprints?tab=message");
  const state: StatusPanelProps | null = getDeniedState({
    activity,
    activityHref,
    locale,
    policy,
    signInHref,
    viewer,
  });

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  function handleSent(message: ActivityRoomMessageViewModel) {
    setMessages((current) => [...current, message]);
    router.refresh();
  }

  function handleDelete(messageId: string) {
    if (deletingId) {
      return;
    }

    const formData = new FormData();
    formData.set("activityId", activity?.id ?? "");
    formData.set("locale", locale);
    formData.set("messageId", messageId);

    setDeleteError("");
    setDeletingId(messageId);

    void deleteActivityRoomMessageAction(initialActionState, formData)
      .then((result) => {
        if (result.ok) {
          setMessages((current) =>
            current.map((message) =>
              message.id === messageId
                ? { ...message, body: "", isDeleted: true }
                : message,
            ),
          );
          router.refresh();
          return;
        }

        setDeleteError(result.formError ?? copy.deleteFailed);
      })
      .catch(() => setDeleteError(copy.deleteFailed))
      .finally(() => setDeletingId(""));
  }

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col overflow-hidden bg-[#FEFFF9] text-[#111210] shadow-[0_18px_48px_rgba(21,98,64,0.08)] md:h-[calc(100dvh-8rem)] md:rounded-[1.45rem] md:border md:border-[#D6D5B2] md:ring-1 md:ring-white/70">
      {activity && policy.canView ? (
        <ActivityRoomChatAutoRefresh activityId={activity.id} />
      ) : null}
      <header className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-[#D6D5B2] bg-white p-4 max-md:pt-[calc(env(safe-area-inset-top)+1rem)]">
        <button
          aria-label={copy.backToActivity}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#156240] shadow-[0_8px_18px_rgba(21,98,64,0.08)] ring-1 ring-[#D6D5B2] transition active:scale-95"
          onClick={() => {
            router.replace(messagesHref);
            router.refresh();
          }}
          title={copy.backToActivity}
          type="button"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 text-center">
          <p className="mx-auto flex max-w-full items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#156240]">
            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{copy.title}</span>
          </p>
          <h1 className="mt-1 truncate text-lg font-black text-[#111210]">
            {activity?.title ?? copy.title}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {activity && policy.canView ? (
            <ActivityRoomManagementMenu
              activityId={activity.id}
              locale={locale}
            />
          ) : null}
        </div>
      </header>

      {activity?.announcements.length ? (
        <ActivityRoomAnnouncementNotice
          announcements={activity.announcements}
          locale={locale}
        />
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#FEFFF9_0%,#FFF8EA_100%)] px-3 py-4 sm:px-5">
        {policy.canView ? (
          messages.length > 0 ? (
            <div className="grid gap-3">
              {messages.map((message, index) => {
                const previousMessage = messages[index - 1];
                const showDateSeparator =
                  !previousMessage ||
                  getChatDateKey(previousMessage.createdAt) !==
                    getChatDateKey(message.createdAt);

                return (
                  <Fragment key={message.id}>
                    {showDateSeparator ? (
                      <ChatDateSeparator
                        createdAt={message.createdAt}
                        locale={locale}
                      />
                    ) : null}
                    <MessageRow
                      canManage={canManage}
                      isDeleting={deletingId === message.id}
                      locale={locale}
                      message={message}
                      onDelete={handleDelete}
                      viewer={viewer}
                    />
                  </Fragment>
                );
              })}
              <ScrollAnchor lastMessageId={lastMessageId} />
            </div>
          ) : (
            <StatusPanel
              description={
                policy.canSend
                  ? copy.emptyDescription
                  : getPolicyNotice(policy, locale, copy.readOnly)
              }
              icon="message"
              title={copy.emptyTitle}
            />
          )
        ) : state ? (
          <StatusPanel
            actionHref={state.actionHref}
            actionLabel={state.actionLabel}
            description={state.description}
            icon={state.icon}
            title={state.title}
          />
        ) : null}
      </div>

      {deleteError ? (
        <p className="border-t border-[#D6D5B2] bg-white px-5 py-2 text-xs font-bold text-[#9A2135]">
          {deleteError}
        </p>
      ) : null}

      {activity && policy.canSend ? (
        <RoomComposer
          activityId={activity.id}
          disabled={Boolean(deletingId)}
          locale={locale}
          onSent={handleSent}
          viewer={viewer}
        />
      ) : policy.canView ? (
        <div className="shrink-0 border-t border-[#D6D5B2] bg-white/94 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-center text-xs font-black text-[#6C746A] backdrop-blur md:rounded-b-[1.45rem] md:pb-3">
          {getPolicyNotice(policy, locale, copy.readOnly)}
        </div>
      ) : null}
    </section>
  );
}
