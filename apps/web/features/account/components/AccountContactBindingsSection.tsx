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
      <section className="border-t border-[#ECEBE3] py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              <ShieldCheck
                className="h-5 w-5 text-[#156240]"
                aria-hidden="true"
              />
              {profileCopy.contactBindingsTitle}
            </h2>
          </div>
          <Button
            type="button"
            className="h-9 rounded-full px-4 text-xs"
            variant="secondary"
            onClick={() => setOpen(true)}
          >
            {boundCount > 0
              ? profileCopy.contactBindingsBound
              : profileCopy.contactBindingsUnbound}
          </Button>
        </div>

        <div className="mt-3 divide-y divide-[#ECEBE3]">
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
    <div className="flex min-h-12 min-w-0 items-center justify-between gap-4 py-3">
      <p className="shrink-0 text-sm font-medium text-[#697066]">{label}</p>
      <p className="min-w-0 truncate text-right text-sm font-semibold text-ink">
        {value?.trim() || "-"}
      </p>
    </div>
  );
}
