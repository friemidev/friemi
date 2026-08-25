"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button, Input } from "@chill-club/ui";
import {
  updateProfileIdentityAction,
  type UpdateProfileIdentityState,
} from "../actions/updateProfileIdentity";
import { ProfileAvatarPicker } from "./ProfileAvatarPicker";

type ProfileSetupFormProps = {
  avatarUrl?: string | null;
  locale: string;
  nickname: string;
  returnTo: string;
};

const initialState: UpdateProfileIdentityState = {};

function getProfileSetupCopy(locale: string) {
  if (locale === "fr") {
    return {
      avatar: "Choisissez votre avatar",
      continue: "Continuer",
      error: "Vérifiez votre pseudo puis réessayez.",
      nickname: "Pseudo",
      nicknameHint: "Vous pourrez le modifier une fois toutes les 24 heures.",
      nicknamePlaceholder: "Votre pseudo",
      saving: "Enregistrement...",
      skip: "Configurer plus tard",
    };
  }

  if (locale === "en") {
    return {
      avatar: "Choose your avatar",
      continue: "Continue",
      error: "Check your nickname and try again.",
      nickname: "Nickname",
      nicknameHint: "You can change it once every 24 hours.",
      nicknamePlaceholder: "Your nickname",
      saving: "Saving...",
      skip: "Set up later",
    };
  }

  return {
    avatar: "选择头像",
    continue: "进入 Friemi",
    error: "请检查昵称后重试。",
    nickname: "昵称",
    nicknameHint: "昵称每24小时可修改一次。",
    nicknamePlaceholder: "输入你的昵称",
    saving: "正在保存...",
    skip: "稍后设置",
  };
}

export function ProfileSetupForm({
  avatarUrl = null,
  locale,
  nickname,
  returnTo,
}: ProfileSetupFormProps) {
  const copy = getProfileSetupCopy(locale);
  const [state, formAction] = useActionState(
    updateProfileIdentityAction,
    initialState,
  );
  const [avatarValue, setAvatarValue] = useState<string | null>(avatarUrl);
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <input name="afterSave" type="hidden" value="redirect" />
      <input name="locale" type="hidden" value={locale} />
      <input name="returnTo" type="hidden" value={returnTo} />
      {avatarDirty && avatarValue ? (
        <input name="avatarUrl" type="hidden" value={avatarValue} />
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-sm font-bold text-[#1D1D1B]">{copy.avatar}</h2>
        <ProfileAvatarPicker
          initial={nickname.charAt(0).toUpperCase()}
          locale={locale}
          name={nickname}
          onChange={(nextAvatarUrl) => {
            setAvatarValue(nextAvatarUrl);
            setAvatarDirty(true);
          }}
          onUploadingChange={setIsAvatarUploading}
          value={avatarValue}
          variant="sheet"
        />
      </section>

      <label className="grid gap-2 border-t border-[#ECEBE3] pt-5">
        <span className="text-sm font-bold text-[#1D1D1B]">
          {copy.nickname}
        </span>
        <Input
          autoComplete="nickname"
          className="h-12 bg-white"
          defaultValue={nickname}
          maxLength={24}
          name="nickname"
          placeholder={copy.nicknamePlaceholder}
        />
        <span className="text-xs font-medium text-[#767A70]">
          {copy.nicknameHint}
        </span>
      </label>

      {state.formError ? (
        <p className="text-sm font-semibold text-red-600">
          {state.formError || copy.error}
        </p>
      ) : null}

      <div className="grid gap-3">
        <ProfileSetupSubmitButton
          disabled={isAvatarUploading}
          label={copy.continue}
          pendingLabel={copy.saving}
        />
        <Link
          className="inline-flex h-11 items-center justify-center text-sm font-semibold text-[#697066]"
          href={returnTo}
        >
          {copy.skip}
        </Link>
      </div>
    </form>
  );
}

function ProfileSetupSubmitButton({
  disabled,
  label,
  pendingLabel,
}: {
  disabled: boolean;
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="h-12 gap-2 rounded-full"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      )}
      {pending ? pendingLabel : label}
    </Button>
  );
}
