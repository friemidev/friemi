"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, Save } from "lucide-react";
import { Button, Input } from "@chill-club/ui";
import { getCopy } from "@/lib/copy";
import {
  updateProfileIdentityAction,
  type UpdateProfileIdentityState,
} from "../actions/updateProfileIdentity";

type ProfileIdentityFormProps = {
  friendCode: string;
  locale: string;
  nickname: string;
};

const initialState: UpdateProfileIdentityState = {};

export function ProfileIdentityForm({
  friendCode,
  locale,
  nickname,
}: ProfileIdentityFormProps) {
  const [state, formAction] = useActionState(
    updateProfileIdentityAction,
    initialState,
  );
  const [nicknameValue, setNicknameValue] = useState(nickname);
  const [copied, setCopied] = useState(false);
  const t = getCopy(locale).profile;

  useEffect(() => {
    setNicknameValue(nickname);
  }, [nickname]);

  async function copyFriendCode() {
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-3 rounded-lg border border-black/10 bg-white/70 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500">
            {t.friendCodeLabel}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-[0.18em] text-ink">
            {friendCode}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm ring-1 ring-black/10 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
          aria-label={copied ? t.friendCodeCopied : t.copyFriendCode}
          title={copied ? t.friendCodeCopied : t.copyFriendCode}
          onClick={copyFriendCode}
        >
          {copied ? (
            <Check className="h-4 w-4 text-moss" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>

      <form action={formAction} className="grid gap-2" noValidate>
        <input name="locale" type="hidden" value={locale} />
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-zinc-500">
            {t.nicknameLabel}
          </span>
          <Input
            name="nickname"
            value={nicknameValue}
            maxLength={24}
            placeholder={t.nicknamePlaceholder}
            className="h-10 bg-white"
            onChange={(event) => setNicknameValue(event.target.value)}
          />
        </label>
        {state.formError ? (
          <p className="text-xs text-red-600">{state.formError}</p>
        ) : null}
        <ProfileIdentitySubmitButton
          label={t.saveNickname}
          pendingLabel={t.savingNickname}
        />
      </form>
    </div>
  );
}

function ProfileIdentitySubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      variant="secondary"
      className="h-10 gap-2 whitespace-nowrap bg-white"
    >
      <Save className="h-4 w-4" />
      {pending ? pendingLabel : label}
    </Button>
  );
}
