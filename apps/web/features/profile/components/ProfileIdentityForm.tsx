"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy, Pencil, Save, X } from "lucide-react";
import { Button, Input, Textarea } from "@chill-club/ui";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import {
  updateProfileIdentityAction,
  type UpdateProfileIdentityState,
} from "../actions/updateProfileIdentity";
import { defaultProfileAvatars } from "../defaultAvatars";
import { useViewerProfile } from "./ViewerProfileProvider";

type ProfileIdentityFormProps = {
  avatarUrl?: string | null;
  bio?: string | null;
  friendCode: string;
  locale: string;
  nickname: string;
};

const initialState: UpdateProfileIdentityState = {};

export function ProfileIdentityForm({
  avatarUrl = null,
  bio = null,
  friendCode,
  locale,
  nickname,
}: ProfileIdentityFormProps) {
  const { setNickname } = useViewerProfile();
  const router = useRouter();
  const [state, formAction] = useActionState(
    updateProfileIdentityAction,
    initialState,
  );
  const [editing, setEditing] = useState(false);
  const [avatarValue, setAvatarValue] = useState<string | null>(
    defaultProfileAvatars.find((avatar) => avatar.src === avatarUrl)?.src ??
      null,
  );
  const [bioValue, setBioValue] = useState(bio ?? "");
  const [nicknameValue, setNicknameValue] = useState(nickname);
  const [copied, setCopied] = useState(false);
  const t = getCopy(locale).profile;
  const editLabel =
    locale === "en"
      ? "Edit nickname"
      : locale === "fr"
        ? "Modifier"
        : "编辑昵称";
  const cancelLabel =
    locale === "en" ? "Cancel" : locale === "fr" ? "Annuler" : "取消";
  const bioLabel =
    locale === "en" ? "Bio" : locale === "fr" ? "Bio" : "简介";
  const bioPlaceholder =
    locale === "en"
      ? "Write a short intro"
      : locale === "fr"
        ? "Ajoutez une courte présentation"
        : "简单介绍一下自己";

  useEffect(() => {
    setNicknameValue(nickname);
  }, [nickname]);

  useEffect(() => {
    setAvatarValue(
      defaultProfileAvatars.find((avatar) => avatar.src === avatarUrl)?.src ??
        null,
    );
  }, [avatarUrl]);

  useEffect(() => {
    setBioValue(bio ?? "");
  }, [bio]);

  useEffect(() => {
    if (!state.success || !state.nickname) {
      return;
    }

    setNickname(state.nickname);
    if (state.bio !== undefined) {
      setBioValue(state.bio ?? "");
    }
    if (state.avatarUrl !== undefined) {
      setAvatarValue(state.avatarUrl ?? "");
    }
    setNicknameValue(state.nickname);
    setEditing(false);
    router.refresh();
  }, [
    router,
    setNickname,
    state.avatarUrl,
    state.bio,
    state.nickname,
    state.success,
  ]);

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
    <div className="grid gap-2 rounded-xl border border-sand bg-white/70 px-3 py-2.5 shadow-sm shadow-black/[0.02]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500">
            {t.friendCodeLabel}
          </p>
          <p className="mt-0.5 font-mono text-base font-semibold tracking-[0.18em] text-ink">
            {friendCode}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm ring-1 ring-sand transition hover:bg-team-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-sand-strong"
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
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm ring-1 ring-sand transition hover:bg-team-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-sand-strong"
            onClick={() => setEditing((current) => !current)}
          >
            {editing ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
            {editing ? cancelLabel : editLabel}
          </button>
        </div>
      </div>

      {editing ? (
        <form
          action={formAction}
          className="grid gap-2 border-t border-sand pt-2"
          noValidate
        >
          <input name="locale" type="hidden" value={locale} />
          <input name="afterSave" type="hidden" value="refresh" />
          {avatarValue ? (
            <input name="avatarUrl" type="hidden" value={avatarValue} />
          ) : null}
          <div className="grid gap-2">
            <span className="text-xs font-medium text-zinc-500">
              {locale === "en" ? "Avatar" : locale === "fr" ? "Avatar" : "头像"}
            </span>
            <div className="flex flex-wrap gap-2">
              {defaultProfileAvatars.map((avatar) => {
                const selected = avatarValue === avatar.src;

                return (
                  <button
                    key={avatar.key}
                    type="button"
                    aria-label={avatar.key}
                    className={cn(
                      "relative h-10 w-10 overflow-hidden rounded-full bg-white ring-1 ring-sand transition active:scale-95",
                      selected
                        ? "ring-2 ring-[#156240] ring-offset-2"
                        : "hover:ring-[#8AB68E]",
                    )}
                    onClick={() => setAvatarValue(avatar.src)}
                  >
                    {/* Default avatar assets are local public SVGs. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatar.src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
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
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-zinc-500">
              {bioLabel}
            </span>
            <Textarea
              name="bio"
              value={bioValue}
              maxLength={160}
              placeholder={bioPlaceholder}
              className="min-h-20 resize-none bg-white"
              onChange={(event) => setBioValue(event.target.value)}
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
      ) : null}
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
