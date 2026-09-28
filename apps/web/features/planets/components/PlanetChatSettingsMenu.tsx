"use client";

import Link from "next/link";
import {
  BellOff,
  CalendarPlus,
  Check,
  Ellipsis,
  ExternalLink,
  Link2,
  Megaphone,
  Pin,
  Settings2,
  UserMinus,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { ActivityCopyButton } from "@/features/activities/components/ActivityCopyButton";
import {
  removePlanetMemberAction,
  reviewPlanetMemberAction,
  togglePlanetChatMuteAction,
  togglePlanetChatPinAction,
  updatePlanetActivityLinkAction,
  updatePlanetAnnouncementAction,
} from "@/features/planets/actions/planetActions";

type Member = {
  avatarUrl: string | null;
  nickname: string;
  profileId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

type PendingMember = Omit<Member, "role"> & { joinedAtLabel: string };
type ActivityOption = { id: string; startAtLabel: string; title: string };

type PlanetChatSettingsMenuProps = {
  announcement: string | null;
  approvedMembers: Member[];
  availableActivities: ActivityOption[];
  inviteUrl: string;
  isMuted: boolean;
  isPinned: boolean;
  linkedActivityIds: string[];
  locale: string;
  pendingMembers: PendingMember[];
  planetHref: string;
  planetId: string;
  planetSlug: string;
  viewerRole: "OWNER" | "ADMIN" | "MEMBER" | null;
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      activities: "Rencontres de la planète",
      add: "Ajouter",
      announcement: "Annonce du groupe",
      announcementHint: "Visible en haut de la planète.",
      approve: "Approuver",
      close: "Fermer les réglages",
      copyFailed: "Copie impossible.",
      copyInvite: "Copier le lien d'invitation",
      copied: "Lien copié",
      emptyActivities: "Aucune rencontre publique à ajouter.",
      emptyMembers: "Aucune demande en attente.",
      manage: "Gérer la planète",
      members: "Membres",
      ownerRole: "Créateur",
      adminRole: "Admin",
      memberRole: "Membre",
      menu: "Réglages de la discussion",
      mute: "Mettre en sourdine",
      pin: "Épingler la discussion",
      reject: "Refuser",
      remove: "Retirer de la planète",
      removeConfirm: "Retirer ce membre de la planète ?",
      removeActivity: "Retirer",
      requests: "Demandes d'adhésion",
      save: "Enregistrer",
      viewPlanet: "Voir la planète",
    };
  }
  if (locale === "en") {
    return {
      activities: "Planet meetups",
      add: "Add",
      announcement: "Group announcement",
      announcementHint: "Shown at the top of the planet.",
      approve: "Approve",
      close: "Close chat settings",
      copyFailed: "Unable to copy the link.",
      copyInvite: "Copy invite link",
      copied: "Invite link copied",
      emptyActivities: "No public meetups are available to add.",
      emptyMembers: "No pending requests.",
      manage: "Manage planet",
      members: "Members",
      ownerRole: "Owner",
      adminRole: "Admin",
      memberRole: "Member",
      menu: "Chat settings",
      mute: "Mute notifications",
      pin: "Pin chat",
      reject: "Reject",
      remove: "Remove from planet",
      removeConfirm: "Remove this member from the planet?",
      removeActivity: "Remove",
      requests: "Join requests",
      save: "Save",
      viewPlanet: "View planet",
    };
  }
  return {
    activities: "星球聚吧",
    add: "加入星球",
    announcement: "群公告",
    announcementHint: "将展示在星球详情顶部。",
    approve: "通过",
    close: "关闭聊天设置",
    copyFailed: "复制失败，请手动复制链接。",
    copyInvite: "复制邀请链接",
    copied: "邀请链接已复制",
    emptyActivities: "暂无可添加的公开聚吧。",
    emptyMembers: "暂时没有待审核申请。",
    manage: "管理星球",
    members: "成员管理",
    ownerRole: "主理人",
    adminRole: "管理员",
    memberRole: "成员",
    menu: "聊天设置",
    mute: "消息免打扰",
    pin: "置顶聊天",
    reject: "拒绝",
    remove: "移出星球",
    removeConfirm: "确定将这位成员移出星球吗？",
    removeActivity: "移除",
    requests: "加入申请",
    save: "保存公告",
    viewPlanet: "查看星球",
  };
}

function Avatar({
  member,
}: {
  member: Pick<Member, "avatarUrl" | "nickname">;
}) {
  return member.avatarUrl ? (
    <img
      alt=""
      className="h-9 w-9 rounded-full object-cover"
      src={member.avatarUrl}
    />
  ) : (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E7F1E9] text-xs font-bold text-[#155F40]">
      {member.nickname.slice(0, 1).toUpperCase()}
    </span>
  );
}

function HiddenPlanetFields({
  locale,
  planetId,
  planetSlug,
}: Pick<PlanetChatSettingsMenuProps, "locale" | "planetId" | "planetSlug">) {
  return (
    <>
      <input name="locale" type="hidden" value={locale} />
      <input name="planetId" type="hidden" value={planetId} />
      <input name="planetSlug" type="hidden" value={planetSlug} />
    </>
  );
}

function PreferenceRow({
  action,
  checked,
  fieldName,
  icon,
  label,
  locale,
  planetId,
  planetSlug,
}: {
  action: (formData: FormData) => Promise<void>;
  checked: boolean;
  fieldName: "muted" | "pinned";
  icon: React.ReactNode;
  label: string;
  locale: string;
  planetId: string;
  planetSlug: string;
}) {
  return (
    <form action={action}>
      <HiddenPlanetFields
        locale={locale}
        planetId={planetId}
        planetSlug={planetSlug}
      />
      <input name={fieldName} type="hidden" value={checked ? "0" : "1"} />
      <button
        className="flex min-h-14 w-full items-center gap-3 border-b border-[#EFEFEA] px-4 text-left active:bg-[#F7F7F2]"
        type="submit"
      >
        <span className="text-[#155F40]">{icon}</span>
        <span className="min-w-0 flex-1 text-sm font-bold">{label}</span>
        <span
          className={`relative h-7 w-12 shrink-0 rounded-full p-0.5 ${checked ? "bg-[#1DB96A]" : "bg-[#D8DAD5]"}`}
        >
          <span
            className={`block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : ""}`}
          />
        </span>
      </button>
    </form>
  );
}

export function PlanetChatSettingsMenu(props: PlanetChatSettingsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const copy = getCopy(props.locale);
  const linkedActivityIds = new Set(props.linkedActivityIds);
  const canManage =
    props.viewerRole === "OWNER" || props.viewerRole === "ADMIN";
  const roleLabels = {
    OWNER: copy.ownerRole,
    ADMIN: copy.adminRole,
    MEMBER: copy.memberRole,
  };

  return (
    <div className="relative">
      {menuOpen ? (
        <button
          aria-label={copy.close}
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      ) : null}
      <button
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={copy.menu}
        className="relative z-50 flex h-10 w-10 items-center justify-center rounded-full border border-[#D9D6C8] bg-white text-[#155F40] active:scale-95"
        onClick={() => setMenuOpen((current) => !current)}
        type="button"
      >
        <Ellipsis className="h-5 w-5" />
        {props.pendingMembers.length ? (
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[#EF476F] ring-2 ring-white" />
        ) : null}
      </button>

      {menuOpen ? (
        <div
          className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-[#E2DFD3] bg-white shadow-[0_18px_45px_rgba(17,18,16,0.16)]"
          role="menu"
        >
          <PreferenceRow
            action={togglePlanetChatMuteAction}
            checked={props.isMuted}
            fieldName="muted"
            icon={<BellOff className="h-4 w-4" />}
            label={copy.mute}
            locale={props.locale}
            planetId={props.planetId}
            planetSlug={props.planetSlug}
          />
          <PreferenceRow
            action={togglePlanetChatPinAction}
            checked={props.isPinned}
            fieldName="pinned"
            icon={<Pin className="h-4 w-4" />}
            label={copy.pin}
            locale={props.locale}
            planetId={props.planetId}
            planetSlug={props.planetSlug}
          />
          {canManage ? (
            <button
              className="flex min-h-14 w-full items-center gap-3 border-b border-[#EFEFEA] px-4 text-left text-sm font-bold active:bg-[#F7F7F2]"
              onClick={() => {
                setMenuOpen(false);
                setManageOpen(true);
              }}
              role="menuitem"
              type="button"
            >
              <Settings2 className="h-4 w-4 text-[#155F40]" />
              <span className="flex-1">{copy.manage}</span>
              {props.pendingMembers.length ? (
                <span className="rounded-full bg-[#FFF0F3] px-2 py-0.5 text-[10px] text-[#B52645]">
                  {props.pendingMembers.length}
                </span>
              ) : null}
            </button>
          ) : null}
          <Link
            className="flex min-h-14 items-center gap-3 px-4 text-sm font-bold active:bg-[#F7F7F2]"
            href={props.planetHref}
            role="menuitem"
          >
            <ExternalLink className="h-4 w-4 text-[#155F40]" />
            {copy.viewPlanet}
          </Link>
        </div>
      ) : null}

      {manageOpen ? (
        <div
          className="fixed inset-0 z-[70]"
          role="dialog"
          aria-modal="true"
          aria-label={copy.manage}
        >
          <button
            aria-label={copy.close}
            className="absolute inset-0 bg-black/35"
            onClick={() => setManageOpen(false)}
            type="button"
          />
          <section className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[1.5rem] bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[28rem] sm:rounded-[1.25rem]">
            <header className="flex shrink-0 items-center justify-between border-b border-[#E9E7DE] px-5 py-4">
              <h2 className="text-base font-bold">{copy.manage}</h2>
              <button
                aria-label={copy.close}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDDACE]"
                onClick={() => setManageOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              {props.viewerRole === "OWNER" ? (
                <div className="flex items-center justify-between border-b border-[#ECEAE2] py-4">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <Link2 className="h-4 w-4 text-[#155F40]" />
                    {copy.copyInvite}
                  </span>
                  <ActivityCopyButton
                    className="h-9 w-9 rounded-full border border-[#D8D5C8] text-[#155F40]"
                    failedLabel={copy.copyFailed}
                    label={copy.copyInvite}
                    successLabel={copy.copied}
                    value={props.inviteUrl}
                  />
                </div>
              ) : null}

              <form
                action={updatePlanetAnnouncementAction}
                className="border-b border-[#ECEAE2] py-5"
              >
                <HiddenPlanetFields {...props} />
                <label className="flex items-center gap-2 text-sm font-bold">
                  <Megaphone className="h-4 w-4 text-[#8A641F]" />
                  {copy.announcement}
                </label>
                <p className="mt-1 text-xs text-[#7E837C]">
                  {copy.announcementHint}
                </p>
                <textarea
                  className="mt-3 min-h-20 w-full resize-none border border-[#DCD9CE] px-3 py-2 text-sm outline-none focus:border-[#155F40]"
                  defaultValue={props.announcement ?? ""}
                  maxLength={1000}
                  name="announcement"
                />
                <button
                  className="mt-2 rounded-full bg-[#155F40] px-4 py-2 text-xs font-bold text-white"
                  type="submit"
                >
                  {copy.save}
                </button>
              </form>

              <section className="border-b border-[#ECEAE2] py-5">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <UsersRound className="h-4 w-4 text-[#155F40]" />
                  {copy.requests}
                </h3>
                {props.pendingMembers.length ? (
                  <div className="mt-3 divide-y divide-[#ECEAE2]">
                    {props.pendingMembers.map((member) => (
                      <div
                        className="flex items-center gap-3 py-3"
                        key={member.profileId}
                      >
                        <Avatar member={member} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">
                            {member.nickname}
                          </p>
                          <p className="text-[11px] text-[#858B84]">
                            {member.joinedAtLabel}
                          </p>
                        </div>
                        <form action={reviewPlanetMemberAction}>
                          <HiddenPlanetFields {...props} />
                          <input
                            name="memberProfileId"
                            type="hidden"
                            value={member.profileId}
                          />
                          <input
                            name="decision"
                            type="hidden"
                            value="approve"
                          />
                          <button
                            aria-label={copy.approve}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#155F40] text-white"
                            type="submit"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </form>
                        <form action={reviewPlanetMemberAction}>
                          <HiddenPlanetFields {...props} />
                          <input
                            name="memberProfileId"
                            type="hidden"
                            value={member.profileId}
                          />
                          <input name="decision" type="hidden" value="reject" />
                          <button
                            aria-label={copy.reject}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5C5C0] text-[#B4473C]"
                            type="submit"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#858B84]">
                    {copy.emptyMembers}
                  </p>
                )}
              </section>

              <section className="border-b border-[#ECEAE2] py-5">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <UserMinus className="h-4 w-4 text-[#155F40]" />
                  {copy.members}
                </h3>
                <div className="mt-3 divide-y divide-[#ECEAE2]">
                  {props.approvedMembers.map((member) => {
                    const removable =
                      member.role !== "OWNER" &&
                      (props.viewerRole === "OWNER" ||
                        member.role === "MEMBER");
                    return (
                      <div
                        className="flex items-center gap-3 py-3"
                        key={member.profileId}
                      >
                        <Avatar member={member} />
                        <p className="min-w-0 flex-1 truncate text-sm font-bold">
                          {member.nickname}
                        </p>
                        <span className="text-[10px] font-bold text-[#858B84]">
                          {roleLabels[member.role]}
                        </span>
                        {removable ? (
                          <form
                            action={removePlanetMemberAction}
                            onSubmit={(event) => {
                              if (!window.confirm(copy.removeConfirm)) {
                                event.preventDefault();
                              }
                            }}
                          >
                            <HiddenPlanetFields {...props} />
                            <input
                              name="memberProfileId"
                              type="hidden"
                              value={member.profileId}
                            />
                            <button
                              aria-label={`${copy.remove} ${member.nickname}`}
                              className="flex h-9 w-9 items-center justify-center rounded-full text-[#B4473C] active:bg-[#FFF1EF]"
                              type="submit"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          </form>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="py-5">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <CalendarPlus className="h-4 w-4 text-[#155F40]" />
                  {copy.activities}
                </h3>
                {props.availableActivities.length ? (
                  <div className="mt-3 divide-y divide-[#ECEAE2]">
                    {props.availableActivities.map((activity) => {
                      const linked = linkedActivityIds.has(activity.id);
                      return (
                        <div
                          className="flex items-center gap-3 py-3"
                          key={activity.id}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">
                              {activity.title}
                            </p>
                            <p className="text-[11px] text-[#858B84]">
                              {activity.startAtLabel}
                            </p>
                          </div>
                          <form action={updatePlanetActivityLinkAction}>
                            <HiddenPlanetFields {...props} />
                            <input
                              name="activityId"
                              type="hidden"
                              value={activity.id}
                            />
                            <input
                              name="decision"
                              type="hidden"
                              value={linked ? "remove" : "add"}
                            />
                            <button
                              className={`rounded-full px-3 py-1.5 text-xs font-bold ${linked ? "border border-[#D8D5C8] text-[#6C716B]" : "bg-[#155F40] text-white"}`}
                              type="submit"
                            >
                              {linked ? copy.removeActivity : copy.add}
                            </button>
                          </form>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[#858B84]">
                    {copy.emptyActivities}
                  </p>
                )}
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
