"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Search, UserCog, UserMinus, UserPlus, UsersRound } from "lucide-react";
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
  addDisabledFull: string;
  addEmpty: string;
  availableHint: string;
  current: string;
  managerRole: string;
  organizerOnly: string;
  remove: string;
  removing: string;
  searchEmpty: string;
  searchPlaceholder: string;
  title: string;
};

const initialState: ManageActivityCoManagersState = {};

function getCopy(locale: string): Copy {
  if (locale === "fr") {
    return {
      add: "Ajouter",
      addDisabledFull: "Limite atteinte",
      addEmpty: "Aucun participant à ajouter.",
      availableHint: "Choisissez parmi les participants validés.",
      current: "Gestionnaires",
      managerRole: "Gestionnaire",
      organizerOnly: "Seul l'organisateur peut modifier cette liste.",
      remove: "Retirer",
      removing: "Retrait...",
      searchEmpty: "Aucun résultat.",
      searchPlaceholder: "Nom ou ID Friemi",
      title: "Ajouter un gestionnaire",
    };
  }

  if (locale === "en") {
    return {
      add: "Add",
      addDisabledFull: "Limit reached",
      addEmpty: "No participants available to add.",
      availableHint: "Choose from confirmed participants.",
      current: "Managers",
      managerRole: "Manager",
      organizerOnly: "Only the organizer can edit this list.",
      remove: "Remove",
      removing: "Removing...",
      searchEmpty: "No matches.",
      searchPlaceholder: "Name or Friemi ID",
      title: "Add manager",
    };
  }

  return {
    add: "添加",
    addDisabledFull: "已达上限",
    addEmpty: "暂无可添加的参局人。",
    availableHint: "从已参局的人中选择。",
    current: "当前管理人",
    managerRole: "管理人",
    organizerOnly: "只有发起人可以调整管理人。",
    remove: "移除",
    removing: "移除中...",
    searchEmpty: "没有匹配的用户。",
    searchPlaceholder: "搜索昵称或个人码",
    title: "添加聚吧管理人",
  };
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "N";
}

function Avatar({
  avatarUrl,
  nickname,
}: {
  avatarUrl: string | null;
  nickname: string;
}) {
  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-[#8AB68E]/45"
      src={avatarUrl}
    />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#156240] text-sm font-bold text-white ring-1 ring-[#8AB68E]/45">
      {getInitial(nickname)}
    </span>
  );
}

function RemoveButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const copy = getCopy(locale);

  return (
    <button
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-[#DEAAB3] bg-white px-3 text-xs font-semibold text-[#B5301F] transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
      {pending ? copy.removing : copy.remove}
    </button>
  );
}

function AddButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const copy = getCopy(locale);

  return (
    <button
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#156240] text-white transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
      disabled={pending}
      title={copy.add}
      type="submit"
    >
      <UserPlus className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{copy.add}</span>
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
    <form action={formAction} className="grid gap-1" noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="coManagerId" type="hidden" value={coManagerId} />
      <input name="locale" type="hidden" value={locale} />
      <RemoveButton locale={locale} />
      {state.formError ? (
        <p className="text-xs font-medium leading-5 text-[#B5301F]" role="alert">
          {state.formError}
        </p>
      ) : null}
    </form>
  );
}

export function ActivityCoManagerPanel({
  dashboard,
  locale,
}: ActivityCoManagerPanelProps) {
  const copy = getCopy(locale);
  const [participantSearch, setParticipantSearch] = useState("");
  const [state, formAction] = useActionState(
    addActivityCoManagerAction,
    initialState,
  );
  const isFull = dashboard.coManagers.length >= dashboard.maxManagers;
  const filteredParticipants = useMemo(() => {
    const query = participantSearch.trim().toLocaleLowerCase();

    if (!query) {
      return dashboard.availableParticipants;
    }

    return dashboard.availableParticipants.filter((participant) => {
      const nickname = participant.nickname.toLocaleLowerCase();
      const friendCode = participant.friendCode ?? "";

      return nickname.includes(query) || friendCode.includes(query);
    });
  }, [dashboard.availableParticipants, participantSearch]);

  useEffect(() => {
    if (state.successMessage) {
      setParticipantSearch("");
    }
  }, [state.successMessage]);

  return (
    <section className="rounded-[1.15rem] border border-[#D6D5B2] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold text-[#156240]">
            <UserCog className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{copy.title}</span>
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#4F574F]">
            {dashboard.canEditManagers ? copy.availableHint : copy.organizerOnly}
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold text-[#E7457A]">
          {dashboard.coManagers.length}/{dashboard.maxManagers}
        </span>
      </div>

      {dashboard.coManagers.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-bold text-[#6C746A]">
            {copy.current}
          </p>
          <div className="grid gap-2">
            {dashboard.coManagers.map((coManager) => (
              <article
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#E7E2D6] bg-[#FEFFF9] px-3 py-2.5"
                key={coManager.id}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar
                    avatarUrl={coManager.user.avatarUrl}
                    nickname={coManager.user.nickname}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#111210]">
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
        </div>
      ) : null}

      {dashboard.canEditManagers ? (
        <div className="mt-3 grid gap-2">
          <label className="flex h-10 items-center gap-2 rounded-full border border-[#D6D5B2] bg-[#FEFFF9] px-3 text-[#156240]">
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#8B907F]"
              onChange={(event) => setParticipantSearch(event.target.value)}
              placeholder={copy.searchPlaceholder}
              type="search"
              value={participantSearch}
            />
          </label>

          {isFull ? (
            <p className="text-xs font-semibold leading-5 text-[#B5301F]">
              {copy.addDisabledFull}
            </p>
          ) : filteredParticipants.length > 0 ? (
            <div className="grid max-h-56 gap-2 overflow-y-auto pr-1">
              {filteredParticipants.map((participant) => (
                <form action={formAction} key={participant.id} noValidate>
                  <input
                    name="activityId"
                    type="hidden"
                    value={dashboard.activityId}
                  />
                  <input name="locale" type="hidden" value={locale} />
                  <input
                    name="managerProfileId"
                    type="hidden"
                    value={participant.id}
                  />
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E7E2D6] bg-white px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar
                        avatarUrl={participant.avatarUrl}
                        nickname={participant.nickname}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#111210]">
                          {participant.nickname}
                        </p>
                        {participant.friendCode ? (
                          <p className="text-xs font-semibold text-[#6C746A]">
                            {participant.friendCode}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <AddButton locale={locale} />
                  </div>
                </form>
              ))}
            </div>
          ) : (
            <p className="text-xs font-semibold leading-5 text-[#6C746A]">
              {dashboard.availableParticipants.length === 0
                ? copy.addEmpty
                : copy.searchEmpty}
            </p>
          )}

          {state.formError ? (
            <p className="text-xs font-medium leading-5 text-[#B5301F]" role="alert">
              {state.formError}
            </p>
          ) : state.successMessage ? (
            <p className="text-xs font-medium leading-5 text-[#156240]" role="status">
              {state.successMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
