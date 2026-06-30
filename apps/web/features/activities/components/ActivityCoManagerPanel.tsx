"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Search,
  ShieldCheck,
  UserCog,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@chill-club/ui";
import {
  addActivityCoManagerAction,
  removeActivityCoManagerAction,
  type ManageActivityCoManagersState,
} from "../actions/manageActivityCoManagers";
import type { ActivityCoManagerDashboardViewModel } from "../queries/getActivityCoManagerDashboard";

type ActivityCoManagerPanelProps = {
  dashboard: ActivityCoManagerDashboardViewModel;
  locale: string;
};

type Copy = {
  add: string;
  addByCode: string;
  addDisabledFull: string;
  addEmpty: string;
  availableHint: string;
  close: string;
  current: string;
  empty: string;
  friendCodeHint: string;
  friendCodeLabel: string;
  friendCodePlaceholder: string;
  friendList: string;
  managerRole: string;
  maxLabel: (count: number) => string;
  openPicker: string;
  organizerOnly: string;
  remove: string;
  removing: string;
  searchEmpty: string;
  searchPlaceholder: string;
  title: string;
  viewerManagerHint: string;
};

const initialState: ManageActivityCoManagersState = {};

function getCopy(locale: string): Copy {
  if (locale === "fr") {
    return {
      add: "Ajouter",
      addByCode: "Ajouter par code",
      addDisabledFull: "Limite atteinte",
      addEmpty: "Aucun ami disponible à ajouter.",
      availableHint: "Les gestionnaires doivent déjà être vos amis.",
      close: "Fermer",
      current: "Gestionnaires actuels",
      empty: "Aucun gestionnaire pour le moment.",
      friendCodeHint:
        "Le code doit appartenir à une personne déjà dans vos amis.",
      friendCodeLabel: "Code ami",
      friendCodePlaceholder: "123456",
      friendList: "Amis disponibles",
      managerRole: "Gestionnaire",
      maxLabel: (count: number) => `${count}/3 gestionnaires`,
      openPicker: "Choisir un ami",
      organizerOnly: "Seul l'organisateur peut modifier cette liste.",
      remove: "Retirer",
      removing: "Retrait...",
      searchEmpty: "Aucun ami correspondant.",
      searchPlaceholder: "Nom ou code ami",
      title: "Gestionnaires du plan",
      viewerManagerHint:
        "Vous pouvez aider à valider les inscriptions, modifier le plan et l'annuler si nécessaire.",
    };
  }

  if (locale === "en") {
    return {
      add: "Add",
      addByCode: "Add by code",
      addDisabledFull: "Limit reached",
      addEmpty: "No available friends to add.",
      availableHint: "Managers must already be your friends.",
      close: "Close",
      current: "Current managers",
      empty: "No managers yet.",
      friendCodeHint: "The code must belong to one of your friends.",
      friendCodeLabel: "Friend code",
      friendCodePlaceholder: "123456",
      friendList: "Available friends",
      managerRole: "Manager",
      maxLabel: (count: number) => `${count}/3 managers`,
      openPicker: "Choose friend",
      organizerOnly: "Only the organizer can edit this list.",
      remove: "Remove",
      removing: "Removing...",
      searchEmpty: "No matching friends.",
      searchPlaceholder: "Name or friend code",
      title: "Plan managers",
      viewerManagerHint:
        "You can help review requests, edit this plan, and cancel it when needed.",
    };
  }

  return {
    add: "添加",
    addByCode: "用好友号添加",
    addDisabledFull: "已达上限",
    addEmpty: "暂无可添加的好友。",
    availableHint: "管理人必须已经是你的好友。",
    close: "关闭",
    current: "当前管理人",
    empty: "暂未设置管理人。",
    friendCodeHint: "好友号对应的人也必须已经是你的好友。",
    friendCodeLabel: "好友号",
    friendCodePlaceholder: "例如 551007",
    friendList: "可添加好友",
    managerRole: "管理人",
    maxLabel: (count: number) => `${count}/3 位管理人`,
    openPicker: "选择好友",
    organizerOnly: "只有发起人可以修改这份名单。",
    remove: "移除",
    removing: "移除中...",
    searchEmpty: "没有匹配的好友。",
    searchPlaceholder: "搜索昵称或好友号",
    title: "组局管理人",
    viewerManagerHint: "你可以协助审核报名、编辑组局，并在必要时取消组局。",
  };
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "N";
}

function SubmitAddButton({
  label,
  locale,
}: {
  label?: string;
  locale: string;
}) {
  const { pending } = useFormStatus();
  const copy = getCopy(locale);

  return (
    <Button
      className="h-10 rounded-full bg-[#156240] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(21,98,64,0.16)] hover:bg-[#369758] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? `${copy.add}...` : (label ?? copy.add)}
    </Button>
  );
}

function RemoveButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const copy = getCopy(locale);

  return (
    <button
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-[#DEAAB3] bg-white px-3 text-xs font-semibold text-[#B5301F] transition hover:bg-[#FFF5E6] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
      {pending ? copy.removing : copy.remove}
    </button>
  );
}

function RemoveCoManagerForm({
  activityId,
  coManagerId,
  locale,
}: {
  activityId: string;
  coManagerId: string;
  locale: string;
}) {
  const [state, formAction] = useActionState(
    removeActivityCoManagerAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-2" noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="coManagerId" type="hidden" value={coManagerId} />
      <input name="locale" type="hidden" value={locale} />
      <RemoveButton locale={locale} />
      {state.formError ? (
        <p
          className="text-xs font-medium leading-5 text-[#B5301F]"
          role="alert"
        >
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

function FriendAvatar({
  avatarUrl,
  nickname,
}: {
  avatarUrl: string | null;
  nickname: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-[#8AB68E]/50"
        src={avatarUrl}
      />
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#156240] text-sm font-extrabold text-white ring-1 ring-[#8AB68E]/50">
      {getInitial(nickname)}
    </span>
  );
}

export function ActivityCoManagerPanel({
  dashboard,
  locale,
}: ActivityCoManagerPanelProps) {
  const copy = getCopy(locale);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [friendSearch, setFriendSearch] = useState("");
  const [state, formAction] = useActionState(
    addActivityCoManagerAction,
    initialState,
  );
  const isFull = dashboard.coManagers.length >= dashboard.maxManagers;
  const canOpenPicker = dashboard.canEditManagers && !isFull;
  const filteredFriends = useMemo(() => {
    const query = friendSearch.trim().toLocaleLowerCase();

    if (!query) {
      return dashboard.availableFriends;
    }

    return dashboard.availableFriends.filter((friend) => {
      const nickname = friend.nickname.toLocaleLowerCase();
      const friendCode = friend.friendCode ?? "";

      return nickname.includes(query) || friendCode.includes(query);
    });
  }, [dashboard.availableFriends, friendSearch]);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPickerOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [pickerOpen]);

  useEffect(() => {
    if (state.successMessage) {
      setPickerOpen(false);
      setFriendSearch("");
    }
  }, [state.successMessage]);

  return (
    <section className="min-w-0 max-w-full overflow-hidden rounded-[1.25rem] border border-[#8AB68E]/55 bg-[#FEFFF9]/86 p-4 shadow-[0_18px_42px_rgba(21,98,64,0.08)]">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2 text-sm font-extrabold text-[#156240]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8F2E8] text-[#156240] ring-1 ring-[#8AB68E]/60">
              <UserCog className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 break-words">{copy.title}</span>
          </p>
          <p className="mt-1 text-xs font-medium leading-5 text-[#156240]/72">
            {dashboard.role === "CO_MANAGER"
              ? copy.viewerManagerHint
              : copy.availableHint}
          </p>
        </div>
        <span className="inline-flex h-8 max-w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-extrabold text-[#156240] ring-1 ring-[#8AB68E]/55">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="min-w-0 truncate">
            {copy.maxLabel(dashboard.coManagers.length)}
          </span>
        </span>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#156240]/65">
          {copy.current}
        </p>
        {dashboard.coManagers.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#D6D5B2] bg-white/70 px-3 py-2.5 text-sm font-medium text-zinc-500">
            {copy.empty}
          </p>
        ) : (
          <div className="grid gap-2">
            {dashboard.coManagers.map((coManager) => (
              <article
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#D6D5B2]/80 bg-white/84 px-3 py-2.5"
                key={coManager.id}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {coManager.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-[#8AB68E]/50"
                      src={coManager.user.avatarUrl}
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#156240] text-sm font-extrabold text-white ring-1 ring-[#8AB68E]/50">
                      {getInitial(coManager.user.nickname)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-ink">
                      {coManager.user.nickname}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[#156240]/72">
                      <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
                      {copy.managerRole}
                    </p>
                  </div>
                </div>
                {dashboard.canEditManagers ? (
                  <RemoveCoManagerForm
                    activityId={dashboard.activityId}
                    coManagerId={coManager.id}
                    locale={locale}
                  />
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>

      {dashboard.canEditManagers ? (
        <div className="mt-4 grid gap-2">
          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#8AB68E] bg-white px-4 text-sm font-extrabold text-[#156240] shadow-[0_12px_28px_rgba(21,98,64,0.08)] transition hover:-translate-y-0.5 hover:border-[#156240] hover:bg-[#F1F2EC] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none sm:w-fit"
            disabled={!canOpenPicker}
            onClick={() => setPickerOpen(true)}
            type="button"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {isFull ? copy.addDisabledFull : copy.openPicker}
          </button>
          {dashboard.availableFriends.length === 0 && !isFull ? (
            <p className="text-xs font-medium leading-5 text-zinc-500">
              {copy.addEmpty}
            </p>
          ) : null}
          {state.formError ? (
            <p
              className="text-xs font-medium leading-5 text-[#B5301F]"
              role="alert"
            >
              {state.formError}
            </p>
          ) : state.successMessage ? (
            <p
              className="text-xs font-medium leading-5 text-[#156240]"
              role="status"
            >
              {state.successMessage}
            </p>
          ) : null}
          {pickerOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-[#1D1D1B]/34 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-6"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setPickerOpen(false);
                }
              }}
              role="presentation"
            >
              <div
                aria-modal="true"
                className="max-h-[min(86vh,42rem)] w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-[#8AB68E]/65 bg-[#FEFFF9] shadow-[0_30px_90px_rgba(21,98,64,0.26)]"
                role="dialog"
              >
                <div className="flex items-start justify-between gap-4 border-b border-[#D6D5B2]/80 bg-[#F1F2EC]/86 px-4 py-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-extrabold text-[#156240]">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#156240] ring-1 ring-[#8AB68E]/55">
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                      </span>
                      {copy.openPicker}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-5 text-[#156240]/70">
                      {copy.availableHint}
                    </p>
                  </div>
                  <button
                    aria-label={copy.close}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#156240] ring-1 ring-[#8AB68E]/55 transition hover:bg-[#E8F2E8]"
                    onClick={() => setPickerOpen(false)}
                    type="button"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid max-h-[calc(min(86vh,42rem)-5.25rem)] gap-4 overflow-y-auto p-4 sm:grid-cols-[minmax(0,1.25fr)_minmax(15rem,0.75fr)] sm:p-5">
                  {state.formError ? (
                    <p
                      className="rounded-2xl border border-[#DEAAB3] bg-[#FFF5E6] px-3 py-2 text-xs font-semibold leading-5 text-[#B5301F] sm:col-span-2"
                      role="alert"
                    >
                      {state.formError}
                    </p>
                  ) : null}
                  <section className="min-w-0">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#156240]/68">
                        {copy.friendList}
                      </p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#156240] ring-1 ring-[#8AB68E]/45">
                        {filteredFriends.length}
                      </span>
                    </div>
                    <label className="mb-3 flex h-10 items-center gap-2 rounded-full border border-[#D6D5B2] bg-white px-3 text-[#156240] shadow-sm">
                      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <input
                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#156240]/42"
                        onChange={(event) =>
                          setFriendSearch(event.target.value)
                        }
                        placeholder={copy.searchPlaceholder}
                        type="search"
                        value={friendSearch}
                      />
                    </label>
                    {filteredFriends.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-[#D6D5B2] bg-white/72 px-3 py-4 text-sm font-semibold text-zinc-500">
                        {copy.searchEmpty}
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {filteredFriends.map((friend) => (
                          <form action={formAction} key={friend.id} noValidate>
                            <input
                              name="activityId"
                              type="hidden"
                              value={dashboard.activityId}
                            />
                            <input name="locale" type="hidden" value={locale} />
                            <input
                              name="managerProfileId"
                              type="hidden"
                              value={friend.id}
                            />
                            <button
                              className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-[#D6D5B2]/85 bg-white/88 px-3 py-2.5 text-left shadow-[0_10px_24px_rgba(21,98,64,0.06)] transition hover:-translate-y-0.5 hover:border-[#8AB68E] hover:bg-[#F1F2EC] motion-reduce:transition-none"
                              type="submit"
                            >
                              <span className="flex min-w-0 items-center gap-2.5">
                                <FriendAvatar
                                  avatarUrl={friend.avatarUrl}
                                  nickname={friend.nickname}
                                />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-extrabold text-ink">
                                    {friend.nickname}
                                  </span>
                                  {friend.friendCode ? (
                                    <span className="mt-0.5 block text-xs font-semibold text-[#156240]/68">
                                      {friend.friendCode}
                                    </span>
                                  ) : null}
                                </span>
                              </span>
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8F2E8] text-[#156240] ring-1 ring-[#8AB68E]/50 transition group-hover:bg-[#156240] group-hover:text-white">
                                <UserPlus
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              </span>
                            </button>
                          </form>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-[1.35rem] border border-[#8AB68E]/55 bg-white/72 p-3 shadow-[0_16px_34px_rgba(21,98,64,0.08)]">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#156240]/68">
                      {copy.friendCodeLabel}
                    </p>
                    <p className="mt-1 text-xs font-medium leading-5 text-[#156240]/68">
                      {copy.friendCodeHint}
                    </p>
                    <form
                      action={formAction}
                      className="mt-3 grid gap-3"
                      noValidate
                    >
                      <input
                        name="activityId"
                        type="hidden"
                        value={dashboard.activityId}
                      />
                      <input name="locale" type="hidden" value={locale} />
                      <input
                        className="h-11 min-w-0 rounded-full border border-[#D6D5B2] bg-[#FEFFF9] px-4 text-sm font-extrabold text-[#156240] outline-none transition placeholder:text-[#156240]/35 focus:border-[#156240] focus:ring-2 focus:ring-[#8AB68E]/30"
                        inputMode="numeric"
                        maxLength={8}
                        name="managerFriendCode"
                        placeholder={copy.friendCodePlaceholder}
                      />
                      <SubmitAddButton label={copy.addByCode} locale={locale} />
                    </form>
                  </section>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-white/72 px-3 py-2 text-xs font-medium leading-5 text-zinc-500">
          {copy.organizerOnly}
        </p>
      )}
    </section>
  );
}
