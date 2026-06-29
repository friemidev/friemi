"use client";

import Image from "next/image";
import { useActionState, useEffect, useState } from "react";
import type { HTMLInputTypeAttribute, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { AtSign, Check, Phone, Save, ShieldCheck, X } from "lucide-react";
import { Button, Input } from "@chill-club/ui";
import { getCopy } from "@/lib/copy";
import {
  updateProfileContactBindingsAction,
  type UpdateProfileContactBindingsState,
} from "../actions/updateProfileIdentity";

type ContactBindings = {
  contactEmail: string | null;
  phone: string | null;
  wechatId: string | null;
};

type InputMode =
  | "decimal"
  | "email"
  | "none"
  | "numeric"
  | "search"
  | "tel"
  | "text"
  | "url";

type ProfileContactBindingDialogProps = {
  initialContactEmail?: string | null;
  initialPhone?: string | null;
  initialWechatId?: string | null;
  loginEmail?: string | null;
  locale: string;
  onClose: () => void;
  onSaved: (bindings: ContactBindings) => void;
};

const initialState: UpdateProfileContactBindingsState = {};

export function ProfileContactBindingDialog({
  initialContactEmail = null,
  initialPhone = null,
  initialWechatId = null,
  loginEmail = null,
  locale,
  onClose,
  onSaved,
}: ProfileContactBindingDialogProps) {
  const [state, formAction] = useActionState(
    updateProfileContactBindingsAction,
    initialState,
  );
  const [contactEmail, setContactEmail] = useState(initialContactEmail ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [wechatId, setWechatId] = useState(initialWechatId ?? "");
  const t = getCopy(locale).profile;
  const boundCount = [
    initialContactEmail,
    initialPhone,
    initialWechatId,
  ].filter((value) => Boolean(value?.trim())).length;

  useEffect(() => {
    setContactEmail(initialContactEmail ?? "");
    setPhone(initialPhone ?? "");
    setWechatId(initialWechatId ?? "");
  }, [initialContactEmail, initialPhone, initialWechatId]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    onSaved({
      contactEmail: state.contactEmail ?? null,
      phone: state.phone ?? null,
      wechatId: state.wechatId ?? null,
    });
    const timer = window.setTimeout(onClose, 750);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    onClose,
    onSaved,
    state.contactEmail,
    state.phone,
    state.success,
    state.wechatId,
  ]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-x-0 top-0 bottom-[calc(5.15rem+env(safe-area-inset-bottom))] z-[80] flex items-end justify-center bg-black/35 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-sm sm:items-center sm:p-8 md:inset-0"
      role="dialog"
    >
      <form
        action={formAction}
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border border-[#8AB68E]/45 bg-[#FEFFF9] shadow-2xl shadow-[#156240]/20"
        noValidate
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#D6D5B2] bg-[#FFF5E6] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#156240] text-white shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-semibold tracking-normal text-[#1D1D1B]">
                  {t.contactBindingsTitle}
                </h2>
                <p className="mt-0.5 text-xs font-medium text-[#156240]/75">
                  {boundCount > 0
                    ? t.contactBindingsCount(boundCount)
                    : t.contactBindingsEmpty}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {t.contactBindingsDescription}
            </p>
          </div>
          <button
            aria-label={t.close}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-zinc-600 shadow-sm ring-1 ring-[#D6D5B2] transition hover:bg-[#FEFFF9] hover:text-[#1D1D1B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB68E]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 overflow-y-auto px-5 py-5">
          <input name="locale" type="hidden" value={locale} />

          <div className="rounded-2xl border border-[#D6D5B2] bg-white/75 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#156240]/70">
              {t.loginEmailLabel}
            </p>
            <p className="mt-1 truncate text-sm font-medium text-[#1D1D1B]">
              {loginEmail?.trim() || t.emailFallback}
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {t.loginEmailHint}
            </p>
          </div>

          <ContactField
            icon={<AtSign className="h-4 w-4" />}
            label={t.contactEmailLabel}
            name="contactEmail"
            onChange={setContactEmail}
            placeholder={t.contactEmailPlaceholder}
            type="email"
            value={contactEmail}
          />
          <ContactField
            icon={<Phone className="h-4 w-4" />}
            inputMode="tel"
            label={t.phoneLabel}
            name="phone"
            onChange={setPhone}
            placeholder={t.phonePlaceholder}
            value={phone}
          />
          <ContactField
            icon={<WechatIcon active={Boolean(wechatId.trim())} />}
            label={t.wechatLabel}
            maxLength={80}
            name="wechatId"
            onChange={setWechatId}
            placeholder={t.wechatPlaceholder}
            value={wechatId}
          />

          <p className="rounded-2xl bg-[#FFF5E6] px-3 py-2 text-xs leading-5 text-zinc-600 ring-1 ring-[#D6D5B2]/70">
            {t.contactBindingsPrivacyHint}
          </p>

          {state.formError ? (
            <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {state.formError}
            </p>
          ) : null}
          {state.success ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-sm font-medium text-green-700 ring-1 ring-green-100">
              <Check className="h-4 w-4" />
              {state.linkedCount && state.linkedCount > 0
                ? t.wechatLinkedCount(state.linkedCount)
                : t.contactBindingsSaved}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#D6D5B2] bg-[#FFF5E6] px-5 py-4">
          <Button
            className="h-10 rounded-full bg-white"
            onClick={onClose}
            type="button"
            variant="secondary"
          >
            {t.cancel}
          </Button>
          <ContactBindingsSubmitButton
            label={t.saveContactBindings}
            pendingLabel={t.savingContactBindings}
          />
        </div>
      </form>
    </div>
  );
}

function ContactField({
  icon,
  inputMode,
  label,
  maxLength = 120,
  name,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  icon: ReactNode;
  inputMode?: InputMode;
  label: string;
  maxLength?: number;
  name: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: HTMLInputTypeAttribute;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[#1D1D1B]">{label}</span>
      <span className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-[#8AB68E]/35 bg-white px-3 shadow-sm transition-with-transform focus-within:border-[#369758] focus-within:ring-2 focus-within:ring-[#8AB68E]/20">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F2E3] text-[#156240]">
          {icon}
        </span>
        <Input
          className="h-11 border-0 bg-transparent px-0 shadow-none ring-0 focus-visible:ring-0"
          inputMode={inputMode}
          maxLength={maxLength}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
      </span>
    </label>
  );
}

function ContactBindingsSubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="h-10 rounded-full bg-[#156240] px-4 text-white hover:bg-[#369758]"
      disabled={pending}
      type="submit"
    >
      <Save className="h-4 w-4" />
      {pending ? pendingLabel : label}
    </Button>
  );
}

function WechatIcon({ active }: { active: boolean }) {
  return (
    <Image
      alt=""
      className={
        active
          ? "h-5 w-5 object-contain"
          : "h-5 w-5 object-contain grayscale opacity-40"
      }
      height={20}
      src="/wechat/wechat-icon.png"
      width={20}
    />
  );
}
