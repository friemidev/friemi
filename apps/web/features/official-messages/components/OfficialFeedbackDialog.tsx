"use client";

import { MessageSquareText, SendHorizontal, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  submitOfficialFeedbackAction,
  type SubmitOfficialFeedbackState,
} from "@/features/official-messages/actions/officialMessageActions";

const initialState: SubmitOfficialFeedbackState = {};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      cancel: "Fermer",
      description: "Decrivez le probleme ou votre suggestion.",
      label: "Votre message",
      open: "Signaler un probleme",
      placeholder: "Que pouvons-nous ameliorer ?",
      send: "Envoyer",
      sending: "Envoi...",
      sent: "Merci, votre message a ete envoye.",
      title: "Retour a Friemi",
    };
  }

  if (locale === "en") {
    return {
      cancel: "Close",
      description: "Describe the issue or share a suggestion.",
      label: "Your message",
      open: "Report an issue",
      placeholder: "What can we improve?",
      send: "Send feedback",
      sending: "Sending...",
      sent: "Thanks. Your feedback has been sent.",
      title: "Feedback to Friemi",
    };
  }

  return {
    cancel: "关闭",
    description: "请描述遇到的问题或告诉我们你的建议。",
    label: "反馈内容",
    open: "问题反馈",
    placeholder: "请尽量写清出现问题的页面和操作步骤",
    send: "发送反馈",
    sending: "发送中...",
    sent: "反馈已发送，谢谢你的帮助。",
    title: "向 Friemi 反馈",
  };
}

export function OfficialFeedbackDialog({ locale }: { locale: string }) {
  const copy = getCopy(locale);
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    submitOfficialFeedbackAction,
    initialState,
  );
  const [mounted, setMounted] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const dialog = open ? (
    <div
      aria-labelledby="official-feedback-title"
      aria-modal="true"
      className="fixed inset-0 z-[130] flex items-end bg-black/45 px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] md:items-center md:justify-center"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-[1.25rem] bg-[#FEFFF9] p-5 shadow-[0_24px_80px_rgba(17,18,16,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-lg font-bold text-[#111210]"
              id="official-feedback-title"
            >
              {copy.title}
            </h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#6C746A]">
              {copy.description}
            </p>
          </div>
          <button
            aria-label={copy.cancel}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#156240] ring-1 ring-[#D6D5B2]"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="mt-5 grid gap-4" ref={formRef}>
          <input name="locale" type="hidden" value={locale} />
          <label className="grid gap-2">
            <span className="text-xs font-bold text-[#4F574F]">
              {copy.label}
            </span>
            <textarea
              autoFocus
              className="min-h-36 resize-none rounded-lg border border-[#D6D5B2] bg-white px-3 py-3 text-sm font-semibold leading-6 text-[#111210] outline-none focus:border-[#156240]"
              maxLength={2000}
              name="content"
              placeholder={copy.placeholder}
              required
            />
          </label>
          {state.formError ? (
            <p className="text-sm font-semibold text-[#B4233A]" role="alert">
              {state.formError}
            </p>
          ) : state.ok ? (
            <p className="text-sm font-semibold text-[#156240]" role="status">
              {copy.sent}
            </p>
          ) : null}
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-bold text-white disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            <SendHorizontal className="h-4 w-4" />
            {pending ? copy.sending : copy.send}
          </button>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(21,98,64,0.2)] transition active:scale-[0.98]"
        onClick={() => setOpen(true)}
        type="button"
      >
        <MessageSquareText className="h-5 w-5" />
        {copy.open}
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}
