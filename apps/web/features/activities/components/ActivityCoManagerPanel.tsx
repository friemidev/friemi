"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, UserMinus } from "lucide-react";
import {
  addActivityCoManagerAction,
  removeActivityCoManagerAction,
  type ManageActivityCoManagersState,
} from "../actions/manageActivityCoManagers";
import type {
  ActivityCoManagerDashboardViewModel,
  ActivityCoManagerUserViewModel,
  ActivityCoManagerViewModel,
} from "../queries/getActivityCoManagerDashboard";

type ActivityCoManagerPanelProps = {
  dashboard: ActivityCoManagerDashboardViewModel;
  locale: string;
};

type Copy = {
  add: string;
  addEmpty: string;
  done: string;
  remove: string;
  removing: string;
  title: string;
};

const initialState: ManageActivityCoManagersState = {};

function getCopy(locale: string): Copy {
  if (locale === "fr") {
    return {
      add: "Ajouter",
      addEmpty: "Aucun participant disponible.",
      done: "Terminer",
      remove: "Retirer",
      removing: "Retrait...",
      title: "Gestionnaires",
    };
  }

  if (locale === "en") {
    return {
      add: "Add",
      addEmpty: "No participants available.",
      done: "Done",
      remove: "Remove",
      removing: "Removing...",
      title: "Managers",
    };
  }

  return {
    add: "添加",
    addEmpty: "暂无可添加的参与者。",
    done: "完成",
    remove: "移除",
    removing: "移除中...",
    title: "聚吧管理员",
  };
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "N";
}

function Avatar({
  avatarUrl,
  className,
  nickname,
}: {
  avatarUrl: string | null;
  className: string;
  nickname: string;
}) {
  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      className={`${className} shrink-0 rounded-full object-cover`}
      src={avatarUrl}
    />
  ) : (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-full bg-[#156240] text-sm font-bold text-white`}
    >
      {getInitial(nickname)}
    </span>
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
      aria-label={copy.add}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-45 ${
        isOpen
          ? "bg-[#156240] text-white ring-4 ring-[#D8E8DC]"
          : "bg-[#FF4D57] text-white"
      }`}
      disabled={disabled}
      onClick={onClick}
      title={copy.add}
      type="button"
    >
      <Plus className="h-7 w-7" aria-hidden="true" />
    </button>
  );
}

function RemoveManagerAvatarButton({
  coManager,
  locale,
}: {
  coManager: ActivityCoManagerViewModel;
  locale: string;
}) {
  const { pending } = useFormStatus();
  const copy = getCopy(locale);

  return (
    <button
      aria-label={`${copy.remove} ${coManager.user.nickname}`}
      className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-2 ring-[#E7457A] transition active:scale-[0.96] disabled:cursor-wait disabled:opacity-55"
      disabled={pending}
      title={`${copy.remove} ${coManager.user.nickname}`}
      type="submit"
    >
      <Avatar
        avatarUrl={coManager.user.avatarUrl}
        className="h-12 w-12"
        nickname={coManager.user.nickname}
      />
      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E7457A] text-white ring-2 ring-white">
        <UserMinus className="h-3 w-3" aria-hidden="true" />
      </span>
      {pending ? <span className="sr-only">{copy.removing}</span> : null}
    </button>
  );
}

function AddParticipantButton({
  locale,
  participant,
}: {
  locale: string;
  participant: ActivityCoManagerUserViewModel;
}) {
  const { pending } = useFormStatus();
  const copy = getCopy(locale);

  return (
    <button
      aria-label={`${copy.add} ${participant.nickname}`}
      className="grid min-w-0 justify-items-center gap-1 text-center transition active:scale-[0.97] disabled:cursor-wait disabled:opacity-50"
      disabled={pending}
      title={`${copy.add} ${participant.nickname}`}
      type="submit"
    >
      <span className="relative">
        <Avatar
          avatarUrl={participant.avatarUrl}
          className="h-11 w-11 ring-1 ring-[#D8E8DC]"
          nickname={participant.nickname}
        />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#156240] text-white ring-2 ring-white">
          <Plus className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      </span>
      <span className="w-full truncate text-[10px] font-semibold leading-4 text-[#4F574F]">
        {participant.nickname}
      </span>
    </button>
  );
}

export function ActivityCoManagerPanel({
  dashboard,
  locale,
}: ActivityCoManagerPanelProps) {
  const router = useRouter();
  const copy = getCopy(locale);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [addState, addFormAction] = useActionState(
    addActivityCoManagerAction,
    initialState,
  );
  const [removeState, removeFormAction] = useActionState(
    removeActivityCoManagerAction,
    initialState,
  );

  useEffect(() => {
    if (addState.successMessage) {
      setIsAdding(false);
      router.refresh();
    }
  }, [addState.successMessage, router]);

  useEffect(() => {
    if (removeState.successMessage) {
      setIsRemoving(false);
      router.refresh();
    }
  }, [removeState.successMessage, router]);

  useEffect(() => {
    if (dashboard.coManagers.length === 0) {
      setIsRemoving(false);
    }
  }, [dashboard.coManagers.length]);

  return (
    <section className="py-1">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#156240]">{copy.title}</h2>
        <span className="text-xs font-bold text-[#8B907F]">
          {dashboard.coManagers.length}/{dashboard.maxManagers}
        </span>
      </div>

      <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
        <div className="grid shrink-0 grid-cols-3 gap-3">
          {Array.from({ length: dashboard.maxManagers }, (_, index) => {
            const coManager = dashboard.coManagers[index];

            if (coManager) {
              return dashboard.canEditManagers && isRemoving ? (
                <form action={removeFormAction} key={coManager.id} noValidate>
                  <input
                    name="activityId"
                    type="hidden"
                    value={dashboard.activityId}
                  />
                  <input
                    name="coManagerId"
                    type="hidden"
                    value={coManager.id}
                  />
                  <input name="locale" type="hidden" value={locale} />
                  <RemoveManagerAvatarButton
                    coManager={coManager}
                    locale={locale}
                  />
                </form>
              ) : (
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-1 ring-[#D8E8DC]"
                  key={coManager.id}
                  title={coManager.user.nickname}
                >
                  <Avatar
                    avatarUrl={coManager.user.avatarUrl}
                    className="h-12 w-12"
                    nickname={coManager.user.nickname}
                  />
                  <span className="sr-only">{coManager.user.nickname}</span>
                </span>
              );
            }

            return dashboard.canEditManagers && !isRemoving ? (
              <AddSlotButton
                disabled={false}
                isOpen={isAdding}
                key={`empty-${index}`}
                locale={locale}
                onClick={() => {
                  setIsRemoving(false);
                  setIsAdding((current) => !current);
                }}
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-dashed border-[#D5D8D2] text-[#B8BCB5]"
                key={`empty-${index}`}
              >
                {dashboard.canEditManagers ? (
                  <Plus className="h-5 w-5" />
                ) : null}
              </span>
            );
          })}
        </div>

        {dashboard.canEditManagers && dashboard.coManagers.length > 0 ? (
          <button
            aria-pressed={isRemoving}
            className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 px-1 text-xs font-bold transition active:scale-[0.97] ${
              isRemoving ? "text-[#156240]" : "text-[#B5301F]"
            }`}
            onClick={() => {
              setIsAdding(false);
              setIsRemoving((current) => !current);
            }}
            type="button"
          >
            <UserMinus className="h-4 w-4" aria-hidden="true" />
            {isRemoving ? copy.done : copy.remove}
          </button>
        ) : null}
      </div>

      {dashboard.canEditManagers && isAdding ? (
        <div className="mt-4 border-t border-[#EFEFEA] pt-4">
          {dashboard.availableParticipants.length > 0 ? (
            <div className="grid max-h-48 grid-cols-4 gap-x-3 gap-y-4 overflow-y-auto pr-1">
              {dashboard.availableParticipants.map((participant) => (
                <form action={addFormAction} key={participant.id} noValidate>
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
                  <AddParticipantButton
                    locale={locale}
                    participant={participant}
                  />
                </form>
              ))}
            </div>
          ) : (
            <p className="text-xs font-semibold leading-5 text-[#6C746A]">
              {copy.addEmpty}
            </p>
          )}
        </div>
      ) : null}

      {addState.formError || removeState.formError ? (
        <p className="mt-3 text-xs font-medium leading-5 text-[#B5301F]" role="alert">
          {addState.formError ?? removeState.formError}
        </p>
      ) : null}

      {addState.successMessage || removeState.successMessage ? (
        <p className="mt-3 text-xs font-medium leading-5 text-[#156240]" role="status">
          {addState.successMessage ?? removeState.successMessage}
        </p>
      ) : null}
    </section>
  );
}
