"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@chill-club/ui";
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
  const boundCount = [
    bindings.contactEmail,
    bindings.phone,
    bindings.wechatId,
  ].filter((value) => Boolean(value?.trim())).length;

  return (
    <>
      <section className="rounded-2xl border border-[#D6D5B2] bg-white p-5 shadow-[0_18px_48px_rgba(21,98,64,0.05)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <ShieldCheck
                className="h-5 w-5 text-[#156240]"
                aria-hidden="true"
              />
              {profileCopy.contactBindingsTitle}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-700">
              {profileCopy.contactBindingsDescription}
            </p>
          </div>
          <Button
            type="button"
            className="h-10 rounded-full px-4 text-sm"
            variant={boundCount > 0 ? "secondary" : "primary"}
            onClick={() => setOpen(true)}
          >
            {boundCount > 0
              ? profileCopy.contactBindingsBound
              : profileCopy.contactBindingsUnbound}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <AccountBindingField
            label={profileCopy.contactEmailLabel}
            value={bindings.contactEmail}
          />
          <AccountBindingField
            label={profileCopy.phoneLabel}
            value={bindings.phone}
          />
          <AccountBindingField
            label={profileCopy.wechatLabel}
            value={bindings.wechatId}
          />
        </div>
      </section>

      {open ? (
        <ProfileContactBindingDialog
          initialContactEmail={bindings.contactEmail}
          initialPhone={bindings.phone}
          initialWechatId={bindings.wechatId}
          loginEmail={loginEmail}
          locale={locale}
          onClose={() => setOpen(false)}
          onSaved={setBindings}
        />
      ) : null}
    </>
  );
}

function AccountBindingField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#FEFFF9] p-4 ring-1 ring-[#D6D5B2]">
      <p className="text-xs font-semibold text-[#156240]">{label}</p>
      <p className="mt-2 min-h-5 truncate text-sm font-medium text-ink">
        {value?.trim() || "-"}
      </p>
    </div>
  );
}
