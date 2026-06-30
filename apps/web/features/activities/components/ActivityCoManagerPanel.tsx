"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ShieldCheck, UserCog, UserMinus, UsersRound } from "lucide-react";
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
  addDisabledFull: string;
  addEmpty: string;
  addPlaceholder: string;
  availableHint: string;
  current: string;
  empty: string;
  managerRole: string;
  maxLabel: (count: number) => string;
  organizerOnly: string;
  remove: string;
  removing: string;
  title: string;
  viewerManagerHint: string;
};

const initialState: ManageActivityCoManagersState = {};

function getCopy(locale: string): Copy {
  if (locale === "fr") {
    return {
      add: "Ajouter",
      addDisabledFull: "Limite atteinte",
      addEmpty: "Aucun ami disponible à ajouter.",
      addPlaceholder: "Choisir un ami",
      availableHint: "Les gestionnaires doivent déjà être vos amis.",
      current: "Gestionnaires actuels",
      empty: "Aucun gestionnaire pour le moment.",
      managerRole: "Gestionnaire",
      maxLabel: (count: number) => `${count}/3 gestionnaires`,
      organizerOnly: "Seul l'organisateur peut modifier cette liste.",
      remove: "Retirer",
      removing: "Retrait...",
      title: "Gestionnaires du plan",
      viewerManagerHint:
        "Vous pouvez aider à valider les inscriptions, modifier le plan et l'annuler si nécessaire.",
    };
  }

  if (locale === "en") {
    return {
      add: "Add",
      addDisabledFull: "Limit reached",
      addEmpty: "No available friends to add.",
      addPlaceholder: "Choose a friend",
      availableHint: "Managers must already be your friends.",
      current: "Current managers",
      empty: "No managers yet.",
      managerRole: "Manager",
      maxLabel: (count: number) => `${count}/3 managers`,
      organizerOnly: "Only the organizer can edit this list.",
      remove: "Remove",
      removing: "Removing...",
      title: "Plan managers",
      viewerManagerHint:
        "You can help review requests, edit this plan, and cancel it when needed.",
    };
  }

  return {
    add: "添加",
    addDisabledFull: "已达上限",
    addEmpty: "暂无可添加的好友。",
    addPlaceholder: "选择好友",
    availableHint: "管理人必须已经是你的好友。",
    current: "当前管理人",
    empty: "暂未设置管理人。",
    managerRole: "管理人",
    maxLabel: (count: number) => `${count}/3 位管理人`,
    organizerOnly: "只有发起人可以修改这份名单。",
    remove: "移除",
    removing: "移除中...",
    title: "组局管理人",
    viewerManagerHint: "你可以协助审核报名、编辑组局，并在必要时取消组局。",
  };
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "N";
}

function AddButton({
  disabled,
  full,
  locale,
}: {
  disabled?: boolean;
  full?: boolean;
  locale: string;
}) {
  const { pending } = useFormStatus();
  const copy = getCopy(locale);

  return (
    <Button
      className="h-10 rounded-full bg-[#156240] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(21,98,64,0.16)] hover:bg-[#369758]"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? `${copy.add}...` : full ? copy.addDisabledFull : copy.add}
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
  const [state, formAction] = useActionState(
    addActivityCoManagerAction,
    initialState,
  );
  const isFull = dashboard.coManagers.length >= dashboard.maxManagers;
  const canAdd =
    dashboard.canEditManagers &&
    !isFull &&
    dashboard.availableFriends.length > 0;

  return (
    <section className="rounded-[1.25rem] border border-[#8AB68E]/55 bg-[#FEFFF9]/86 p-4 shadow-[0_18px_42px_rgba(21,98,64,0.08)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-extrabold text-[#156240]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F2E8] text-[#156240] ring-1 ring-[#8AB68E]/60">
              <UserCog className="h-4 w-4" aria-hidden="true" />
            </span>
            {copy.title}
          </p>
          <p className="mt-1 text-xs font-medium leading-5 text-[#156240]/72">
            {dashboard.role === "CO_MANAGER"
              ? copy.viewerManagerHint
              : copy.availableHint}
          </p>
        </div>
        <span className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-extrabold text-[#156240] ring-1 ring-[#8AB68E]/55">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.maxLabel(dashboard.coManagers.length)}
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
        <form action={formAction} className="mt-4 grid gap-2" noValidate>
          <input name="activityId" type="hidden" value={dashboard.activityId} />
          <input name="locale" type="hidden" value={locale} />
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select
              className="h-10 min-w-0 rounded-full border border-[#8AB68E]/70 bg-white px-3 text-sm font-semibold text-[#156240] outline-none transition focus:border-[#156240] focus:ring-2 focus:ring-[#8AB68E]/30"
              disabled={!canAdd}
              name="managerProfileId"
              required
            >
              <option value="">{copy.addPlaceholder}</option>
              {dashboard.availableFriends.map((friend) => (
                <option key={friend.id} value={friend.id}>
                  {friend.nickname}
                  {friend.friendCode ? ` · ${friend.friendCode}` : ""}
                </option>
              ))}
            </select>
            <AddButton disabled={!canAdd} full={isFull} locale={locale} />
          </div>
          {!canAdd && !isFull ? (
            <p className="text-xs font-medium leading-5 text-zinc-500">
              {copy.addEmpty}
            </p>
          ) : null}
          {state.formError ? (
            <p className="text-xs font-medium leading-5 text-[#B5301F]" role="alert">
              {state.formError}
            </p>
          ) : state.successMessage ? (
            <p className="text-xs font-medium leading-5 text-[#156240]" role="status">
              {state.successMessage}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="mt-4 rounded-2xl bg-white/72 px-3 py-2 text-xs font-medium leading-5 text-zinc-500">
          {copy.organizerOnly}
        </p>
      )}
    </section>
  );
}
