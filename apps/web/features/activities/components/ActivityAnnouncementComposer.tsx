"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { Bell, Loader2, Megaphone, Send, X } from "lucide-react";
import { Button, Textarea } from "@chill-club/ui";
import { cn } from "@/lib/utils";
import {
  sendActivityAnnouncementAction,
  type SendActivityAnnouncementState,
} from "../actions/sendActivityAnnouncement";

type ActivityAnnouncementComposerProps = {
  activityId: string;
  locale: string;
  compact?: boolean;
};

const initialState: SendActivityAnnouncementState = {
  values: {
    content: "",
  },
};

const maxAnnouncementLength = 500;

function getAnnouncementCopy(locale: string) {
  if (locale === "fr") {
    return {
      title: "Annonce de groupe",
      description:
        "Envoyez un message unique a toutes les personnes deja inscrites ou en attente.",
      open: "Ouvrir l'annonce",
      placeholder:
        "Ex. : rendez-vous avance a 18h45, prenez une veste legere, entree par la porte sud.",
      send: "Notifier tout le monde",
      sending: "Envoi...",
      success: "Annonce envoyee aux participants.",
      helper: "Visible ici et dans le centre de notifications.",
      close: "Fermer",
    };
  }

  if (locale === "en") {
    return {
      title: "Group announcement",
      description:
        "Send one update to everyone who already joined or is waiting for approval.",
      open: "Open composer",
      placeholder:
        "Example: meetup moved to 6:45 PM, bring a light jacket, use the south entrance.",
      send: "Notify everyone",
      sending: "Sending...",
      success: "Announcement sent to participants.",
      helper: "It will appear here and in notifications.",
      close: "Close",
    };
  }

  return {
    title: "群公告",
    description: "给已经报名或正在等待审核的人统一发一条通知。",
    open: "发群公告",
    placeholder: "例如：集合时间改到 18:45，请带外套，从南门进入。",
    send: "通知所有参与者",
    sending: "发送中...",
    success: "公告已发送给参与者。",
    helper: "会显示在这里，也会进入通知中心。",
    close: "关闭",
  };
}

function SubmitButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getAnnouncementCopy(locale);

  return (
    <Button
      type="submit"
      className="h-11 w-full gap-2 rounded-full bg-[#156240] text-white hover:bg-[#156240]"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {pending ? t.sending : t.send}
    </Button>
  );
}

export function ActivityAnnouncementComposer({
  activityId,
  locale,
  compact = false,
}: ActivityAnnouncementComposerProps) {
  const descriptionId = useId();
  const [formKey, setFormKey] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(
    sendActivityAnnouncementAction,
    initialState,
  );
  const [contentLength, setContentLength] = useState(0);
  const t = getAnnouncementCopy(locale);

  useEffect(() => {
    setContentLength(state.values?.content?.length ?? 0);
  }, [state.values?.content]);

  useEffect(() => {
    if (state.ok) {
      setFormKey((current) => current + 1);
      setContentLength(0);
      setIsOpen(false);
    }
  }, [state.ok]);

  return (
    <>
      {compact ? (
        <div className="ml-auto flex shrink-0 flex-col items-end gap-2">
          <Button
            type="button"
            className="ml-auto h-9 gap-1.5 rounded-full bg-[#156240] px-3.5 text-sm text-white hover:bg-[#156240] sm:h-10 sm:gap-2 sm:px-4 sm:text-base"
            onClick={() => setIsOpen(true)}
          >
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t.open}
          </Button>

          {state.ok ? (
            <div className="inline-flex max-w-[11.5rem] items-center gap-2 rounded-full border border-[#8AB68E] bg-[#FEFFF9] px-3 py-1.5 text-right text-xs font-semibold text-[#156240] shadow-sm sm:max-w-none">
              <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-[#369758]" />
              <span>{t.success}</span>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEFFF9] text-[#156240] ring-1 ring-[#8AB68E]">
              <Megaphone className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-ink">{t.title}</h3>
              <p className="mt-1 text-sm leading-6 text-[#156240]">
                {t.description}
              </p>
            </div>
          </div>

          {state.ok ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#8AB68E] bg-[#FEFFF9] px-3 py-2 text-sm font-semibold text-[#156240] shadow-sm">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#369758]" />
              <span>{t.success}</span>
            </div>
          ) : null}

          <Button
            type="button"
            className="h-11 w-full gap-2 rounded-full bg-[#156240] text-white hover:bg-[#156240]"
            onClick={() => setIsOpen(true)}
          >
            <Bell className="h-4 w-4" />
            {t.open}
          </Button>
        </>
      )}

      {isOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
        >
          <div
            aria-describedby={descriptionId}
            aria-modal="true"
            className="max-h-[calc(100svh-env(safe-area-inset-bottom)-2rem)] w-full overflow-y-auto rounded-[1.5rem] border border-[#D6D5B2] bg-[#FFF5E6] shadow-2xl sm:max-w-2xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-moss">
                  {t.title}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-normal text-ink">
                  {t.open}
                </h2>
                <p
                  id={descriptionId}
                  className="mt-2 text-sm leading-6 text-zinc-600"
                >
                  {t.description}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-zinc-600 shadow-sm ring-1 ring-black/10 transition hover:bg-zinc-50 hover:text-ink"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">{t.close}</span>
              </button>
            </div>

            <form
              key={formKey}
              action={formAction}
              className="grid gap-4 px-5 py-5"
              noValidate
            >
              <input name="activityId" type="hidden" value={activityId} />
              <input name="locale" type="hidden" value={locale} />

              <label className="grid gap-2">
                <span className="sr-only">{t.title}</span>
                <Textarea
                  name="content"
                  maxLength={maxAnnouncementLength}
                  defaultValue={state.values?.content}
                  placeholder={t.placeholder}
                  className="min-h-32 rounded-2xl border-sand bg-white/92"
                  onChange={(event) =>
                    setContentLength(event.currentTarget.value.length)
                  }
                />
              </label>

              <div className="flex items-center justify-between gap-3 text-xs text-[#8E8383]">
                <span>{t.helper}</span>
                <span
                  className={cn(
                    contentLength >= maxAnnouncementLength
                      ? "text-clay"
                      : "text-[#8E8383]",
                  )}
                >
                  {contentLength}/{maxAnnouncementLength}
                </span>
              </div>

              {state.formError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.formError}
                </p>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <SubmitButton locale={locale} />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 rounded-full px-5"
                  onClick={() => setIsOpen(false)}
                >
                  {t.close}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
