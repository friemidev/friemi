"use client";

import { useState } from "react";
import { ProfileContactBindingDialog } from "@/features/profile/components/ProfileContactBindingDialog";
import { getCopy } from "@/lib/copy";

type AccountContactBindingsSectionProps = {
  initialContactEmail?: string | null;
  initialPhone?: string | null;
  initialWechatId?: string | null;
  loginEmail?: string | null;
  locale: string;
};

type ContactBindings = {
  contactEmail: string | null;
  phone: string | null;
  wechatId: string | null;
};

export function AccountContactBindingsSection({
  initialContactEmail = null,
  initialPhone = null,
  initialWechatId = null,
  loginEmail = null,
  locale,
}: AccountContactBindingsSectionProps) {
  const [open, setOpen] = useState(false);
  const [bindings, setBindings] = useState<ContactBindings>({
    contactEmail: initialContactEmail,
    phone: initialPhone,
    wechatId: initialWechatId,
  });
  const profileCopy = getCopy(locale).profile;
  const manageLabel =
    locale === "fr" ? "Gérer" : locale === "en" ? "Manage" : "管理绑定";
  const missingLabel =
    locale === "fr" ? "Non lié" : locale === "en" ? "Not linked" : "未绑定";

  return (
    <>
      <section aria-labelledby="account-security-bindings-heading">
        <div className="flex items-center justify-between gap-4">
          <h2
            className="px-2 text-sm font-bold text-ink/70"
            id="account-security-bindings-heading"
          >
            {profileCopy.contactBindingsTitle}
          </h2>
          <button
            type="button"
            className="min-h-11 rounded-full bg-fog px-4 text-sm font-semibold text-forest transition hover:bg-sand/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            onClick={() => setOpen(true)}
          >
            {manageLabel}
          </button>
        </div>

        <div className="mt-2 space-y-0.5">
          <AccountBindingField
            label={profileCopy.contactEmailLabel}
            missing={missingLabel}
            value={bindings.contactEmail}
          />
          <AccountBindingField
            label={profileCopy.phoneLabel}
            missing={missingLabel}
            value={bindings.phone}
          />
          <AccountBindingField
            label={profileCopy.wechatLabel}
            missing={missingLabel}
            value={bindings.wechatId}
          />
        </div>
      </section>

      {open ? (
        <div className="[&_input]:text-base">
          <ProfileContactBindingDialog
            initialContactEmail={bindings.contactEmail}
            initialPhone={bindings.phone}
            initialWechatId={bindings.wechatId}
            loginEmail={loginEmail}
            locale={locale}
            onClose={() => setOpen(false)}
            onSaved={setBindings}
          />
        </div>
      ) : null}
    </>
  );
}

function AccountBindingField({
  label,
  missing,
  value,
}: {
  label: string;
  missing: string;
  value?: string | null;
}) {
  return (
    <div className="flex min-h-14 min-w-0 items-center justify-between gap-4 rounded-xl px-2 py-2">
      <p className="shrink-0 text-sm font-medium text-ink/70">{label}</p>
      <p
        className={`min-w-0 break-all text-right text-sm font-semibold ${value?.trim() ? "text-ink" : "text-ink/70"}`}
      >
        {value?.trim() || missing}
      </p>
    </div>
  );
}
