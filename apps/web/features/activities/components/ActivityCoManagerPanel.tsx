"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Search, UserCog, UserMinus } from "lucide-react";
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
  managerRole: string;
  noCurrent: string;
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
      managerRole: "Gestionnaire",
      noCurrent: "Aucun gestionnaire.",
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
      managerRole: "Manager",
      noCurrent: "No managers yet.",
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
    managerRole: "管理员",
    noCurrent: "暂无管理员。",
    organizerOnly: "只有聚吧创建人可以调整管理员。",
    remove: "移除",
    removing: "移除中...",
    searchEmpty: "没有匹配的用户。",
    searchPlaceholder: "搜索昵称或个人码",
    title: "添加聚吧管理员",
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
      className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-[#8AB68E]/45"
      src={avatarUrl}
    />
  ) : (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#156240] text-sm font-bold text-white ring-1 ring-[#8AB68E]/45">
      {getInitial(nickname)}
    </span>
  );
}

function RemoveButton({
  disabled,
  locale,
}: {
  disabled: boolean;
  locale: string;
}) {
  const { pending } = useFormStatus();
  const copy = getCopy(locale);

  return (
    <button
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#DEAAB3] bg-white px-3.5 text-xs font-bold text-[#B5301F] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled || pending}
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
      <Plus className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">{copy.add}</span>
    </button>
  );
}

function AddSlotButton({
  disabled,
  isOpen,
  locale,
  onClick,
}: {
  disabled: boolean;
  isOpen: boolean;
  locale: string;
  onClick: () => void;
}) {
  const copy = getCopy(locale);

  return (
    <button
      aria-expanded={isOpen}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF4D57] text-white shadow-[0_10px_22px_rgba(255,77,87,0.22)] transition active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-[#F0C7C9] disabled:shadow-none"
      disabled={disabled}
      onClick={onClick}
      title={copy.add}
      type="button"
    >
      <Plus className="h-7 w-7" aria-hidden="true" />
      <span className="sr-only">{copy.add}</span>
    </button>
  );
}

function RemoveCoManagerForm({
  activityId,
  coManagerId,
  disabled,
  formAction,
  locale,
}: {
  activityId: string;
  coManagerId: string;
  disabled: boolean;
  formAction: (payload: FormData) => void;
  locale: string;
}) {
  return (
    <form action={formAction} noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="coManagerId" type="hidden" value={coManagerId} />
      <input name="locale" type="hidden" value={locale} />
      <RemoveButton disabled={disabled} locale={locale} />
    </form>
  );
}

export function ActivityCoManagerPanel({
  dashboard,
  locale,
}: ActivityCoManagerPanelProps) {
  const router = useRouter();
  const copy = getCopy(locale);
  const [isAdding, setIsAdding] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [selectedCoManagerId, setSelectedCoManagerId] = useState(
    dashboard.coManagers[0]?.id ?? "",
  );
  const [addState, addFormAction] = useActionState(
    addActivityCoManagerAction,
    initialState,
  );
  const [removeState, removeFormAction] = useActionState(
    removeActivityCoManagerAction,
    initialState,
  );
  const isFull = dashboard.coManagers.length >= dashboard.maxManagers;
  const selectedCoManager =
    dashboard.coManagers.find(
      (coManager) => coManager.id === selectedCoManagerId,
    ) ??
    dashboard.coManagers[0] ??
    null;
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
    if (addState.successMessage) {
      setParticipantSearch("");
      setIsAdding(false);
      router.refresh();
    }
  }, [addState.successMessage, router]);

  useEffect(() => {
    if (removeState.successMessage) {
      router.refresh();
    }
  }, [removeState.successMessage, router]);

  useEffect(() => {
    const hasSelection = dashboard.coManagers.some(
      (coManager) => coManager.id === selectedCoManagerId,
    );

    if (!hasSelection) {
      setSelectedCoManagerId(dashboard.coManagers[0]?.id ?? "");
    }
  }, [dashboard.coManagers, selectedCoManagerId]);

  return (
    <section className="rounded-[1.15rem] border border-[#D6D5B2] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold text-[#156240]">
            <UserCog className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{copy.title}</span>
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#4F574F]">
            {dashboard.canEditManagers
              ? copy.availableHint
              : copy.organizerOnly}
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold text-[#E7457A]">
          {dashboard.coManagers.length}/{dashboard.maxManagers}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-[1rem] border border-[#E7E2D6] bg-[#FEFFF9] px-3 py-2.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
          {dashboard.coManagers.length > 0 ? (
            dashboard.coManagers.map((coManager) => {
              const isSelected = coManager.id === selectedCoManager?.id;

              return (
                <button
                  aria-pressed={isSelected}
                  className={`group flex min-w-0 max-w-[7.25rem] items-center gap-2 rounded-full border bg-white py-1 pl-1 pr-2 text-left transition active:scale-[0.98] ${
                    isSelected
                      ? "border-[#156240] shadow-[0_6px_18px_rgba(21,98,64,0.12)]"
                      : "border-[#EFE8DE]"
                  }`}
                  key={coManager.id}
                  onClick={() => setSelectedCoManagerId(coManager.id)}
                  type="button"
                >
                  <Avatar
                    avatarUrl={coManager.user.avatarUrl}
                    nickname={coManager.user.nickname}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#111210]">
                      {coManager.user.nickname}
                    </p>
                    <p className="text-[0.68rem] font-bold leading-4 text-[#156240]">
                      {copy.managerRole}
                    </p>
                  </div>
                </button>
              );
            })
          ) : (
            <p className="py-2 text-xs font-semibold text-[#6C746A]">
              {copy.noCurrent}
            </p>
          )}

          {dashboard.canEditManagers ? (
            <AddSlotButton
              disabled={isFull}
              isOpen={isAdding}
              locale={locale}
              onClick={() => setIsAdding((value) => !value)}
            />
          ) : null}
        </div>

        {dashboard.canEditManagers ? (
          <RemoveCoManagerForm
            activityId={dashboard.activityId}
            coManagerId={selectedCoManager?.id ?? ""}
            disabled={!selectedCoManager}
            formAction={removeFormAction}
            locale={locale}
          />
        ) : null}
      </div>

      {dashboard.canEditManagers ? (
        <div className="mt-3 grid gap-2">
          {isFull ? (
            <p className="px-1 text-xs font-semibold leading-5 text-[#B5301F]">
              {copy.addDisabledFull}
            </p>
          ) : null}

          {isAdding && !isFull ? (
            <>
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

              {filteredParticipants.length > 0 ? (
                <div className="grid max-h-44 gap-1.5 overflow-y-auto pr-1">
                  {filteredParticipants.map((participant) => (
                    <form
                      action={addFormAction}
                      key={participant.id}
                      noValidate
                    >
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
                      <div className="flex items-center justify-between gap-3 rounded-[0.9rem] border border-[#ECE6DC] bg-white px-2.5 py-2">
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
            </>
          ) : null}

          {addState.formError || removeState.formError ? (
            <p
              className="text-xs font-medium leading-5 text-[#B5301F]"
              role="alert"
            >
              {addState.formError ?? removeState.formError}
            </p>
          ) : null}

          {addState.successMessage || removeState.successMessage ? (
            <p
              className="text-xs font-medium leading-5 text-[#156240]"
              role="status"
            >
              {addState.successMessage ?? removeState.successMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
