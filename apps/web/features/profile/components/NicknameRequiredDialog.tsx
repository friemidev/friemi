"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { Save } from "lucide-react";
import { Button, Input } from "@chill-club/ui";
import { getCopy } from "@/lib/copy";
import {
  updateProfileIdentityAction,
  type UpdateProfileIdentityState,
} from "../actions/updateProfileIdentity";

type NicknameRequiredDialogProps = {
  locale: string;
};

const initialState: UpdateProfileIdentityState = {};

export function NicknameRequiredDialog({
  locale,
}: NicknameRequiredDialogProps) {
  const pathname = usePathname();
  const [state, formAction] = useActionState(
    updateProfileIdentityAction,
    initialState,
  );
  const t = getCopy(locale).profile;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nickname-required-title"
    >
      <div className="w-full rounded-t-2xl border border-black/10 bg-paper p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
        <p className="text-sm font-medium text-moss">{t.nicknameLabel}</p>
        <h2
          id="nickname-required-title"
          className="mt-1 text-2xl font-semibold tracking-normal text-ink"
        >
          {t.nicknameSetupTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          {t.nicknameSetupDescription}
        </p>

        <form action={formAction} className="mt-5 grid gap-3" noValidate>
          <input name="locale" type="hidden" value={locale} />
          <input name="returnTo" type="hidden" value={pathname} />
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-ink">
              {t.nicknameLabel}
            </span>
            <Input
              name="nickname"
              autoFocus
              maxLength={24}
              placeholder={t.nicknamePlaceholder}
              className="h-11 bg-white"
            />
          </label>
          {state.formError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {state.formError}
            </p>
          ) : null}
          <Button type="submit" className="h-11 gap-2">
            <Save className="h-4 w-4" />
            {t.saveNickname}
          </Button>
        </form>
      </div>
    </div>
  );
}
