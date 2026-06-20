"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Save, X } from "lucide-react";
import { Button, Input } from "@chill-club/ui";
import { getCopy } from "@/lib/copy";
import {
  updateProfileWechatAction,
  type UpdateProfileWechatState,
} from "../actions/updateProfileIdentity";

type ProfileWechatBindingDialogProps = {
  initialWechatId?: string | null;
  locale: string;
  onClose: () => void;
  onSaved: (wechatId: string | null) => void;
};

const initialState: UpdateProfileWechatState = {};

export function ProfileWechatBindingDialog({
  initialWechatId = null,
  locale,
  onClose,
  onSaved,
}: ProfileWechatBindingDialogProps) {
  const [state, formAction] = useActionState(
    updateProfileWechatAction,
    initialState,
  );
  const [wechatValue, setWechatValue] = useState(initialWechatId ?? "");
  const t = getCopy(locale).profile;
  const isBound = Boolean(initialWechatId?.trim());

  useEffect(() => {
    setWechatValue(initialWechatId ?? "");
  }, [initialWechatId]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    onSaved(state.wechatId ?? null);
    const timer = window.setTimeout(onClose, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [onClose, onSaved, state.success, state.wechatId]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur-sm sm:items-center sm:p-8"
      role="dialog"
    >
      <form
        action={formAction}
        className="flex max-h-[calc(100svh-env(safe-area-inset-bottom)-3rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-sand bg-white shadow-2xl shadow-black/15"
        noValidate
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-sand bg-[#fffaf1] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <WechatMark active={isBound} />
              <h2 className="text-base font-semibold tracking-normal text-ink">
                {isBound ? t.editWechat : t.bindWechat}
              </h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {t.wechatDialogDescription}
            </p>
          </div>
          <button
            aria-label={t.close}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-zinc-600 shadow-sm ring-1 ring-sand transition hover:bg-paper hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sand-strong"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 overflow-y-auto px-5 py-5">
          <input name="locale" type="hidden" value={locale} />
          <label className="grid gap-2">
            <span className="text-sm font-medium text-ink">
              {t.wechatLabel}
            </span>
            <Input
              className="h-11 bg-white"
              maxLength={80}
              name="wechatId"
              onChange={(event) => setWechatValue(event.target.value)}
              placeholder={t.wechatPlaceholder}
              value={wechatValue}
            />
          </label>

          <p className="rounded-2xl bg-[#f8f1e7] px-3 py-2 text-xs leading-5 text-zinc-600 ring-1 ring-sand/70">
            {t.wechatPrivacyHint}
          </p>

          {state.formError ? (
            <p className="text-sm text-red-600">{state.formError}</p>
          ) : null}
          {state.success ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-sm font-medium text-green-700 ring-1 ring-green-100">
              <Check className="h-4 w-4" />
              {state.linkedCount && state.linkedCount > 0
                ? t.wechatLinkedCount(state.linkedCount)
                : t.wechatSaved}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-sand bg-[#fffaf1] px-5 py-4">
          <Button
            className="h-10 rounded-full bg-white"
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            {t.cancel}
          </Button>
          <WechatSubmitButton
            label={t.saveWechat}
            pendingLabel={t.savingWechat}
          />
        </div>
      </form>
    </div>
  );
}

function WechatSubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="h-10 rounded-full bg-moss px-4 text-white hover:bg-moss/90"
      disabled={pending}
      type="submit"
    >
      <Save className="h-4 w-4" />
      {pending ? pendingLabel : label}
    </Button>
  );
}

function WechatMark({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={
        active
          ? "inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#bfe5c8]"
          : "inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 ring-1 ring-zinc-200"
      }
    >
      <Image
        alt=""
        className={active ? "h-6 w-6 object-contain" : "h-6 w-6 object-contain grayscale opacity-35"}
        height={24}
        src="/wechat/wechat-icon.png"
        width={24}
      />
    </span>
  );
}
