"use client";

import {
  CheckCircle2,
  MessageSquareText,
  SendHorizontal,
  X,
} from "lucide-react";
import { useActionState, useId, useState } from "react";
import {
  submitOfficialFeedbackAction,
  type SubmitOfficialFeedbackState,
} from "@/features/official-messages/actions/officialMessageActions";
import { getChildSafetyCopy } from "@/features/reports/childSafetyCopy";
import { SafetyDialog } from "@/features/reports/components/SafetyDialog";

const initialState: SubmitOfficialFeedbackState = {};

function getCopy(locale: string) {
  if (locale === "fr")
    return {
      close: "Fermer",
      label: "Votre message",
      placeholder:
        "Indiquez le compte, le contenu ou la page concernés et décrivez le problème.",
      send: "Envoyer",
      sending: "Envoi...",
      sent: "Votre message a été transmis à Friemi.",
    };
  if (locale === "en")
    return {
      close: "Close",
      label: "Your message",
      placeholder:
        "Identify the account, content or page and describe what happened.",
      send: "Send feedback",
      sending: "Sending...",
      sent: "Your feedback has been sent to Friemi.",
    };
  return {
    close: "关闭",
    label: "反馈内容",
    placeholder: "请说明相关账号、内容或页面，以及发生了什么",
    send: "发送反馈",
    sending: "发送中...",
    sent: "反馈已提交给 Friemi。",
  };
}

function FeedbackForm({
  locale,
  onClose,
}: {
  locale: string;
  onClose: () => void;
}) {
  const copy = getCopy(locale);
  const safety = getChildSafetyCopy(locale);
  const titleId = useId();
  const hintId = useId();
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState("GENERAL");
  const [state, formAction, pending] = useActionState(
    submitOfficialFeedbackAction,
    initialState,
  );
  return (
    <SafetyDialog labelledBy={titleId} onClose={onClose}>
      <header className="flex items-start justify-between gap-3 border-b border-sand px-5 py-3">
        <h2 id={titleId} className="self-center text-lg font-bold">
          {safety.feedback}
        </h2>
        <button
          aria-label={copy.close}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-forest focus-visible:outline"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </header>
      {state.ok ? (
        <div className="space-y-5 p-5">
          <p role="status" className="flex items-center gap-2 text-forest">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0" />
            {copy.sent}
          </p>
          <button
            className="min-h-11 w-full rounded-full bg-forest px-4 py-2 font-semibold text-white"
            onClick={onClose}
            type="button"
          >
            {copy.close}
          </button>
        </div>
      ) : (
        <form action={formAction} className="grid gap-4 p-5">
          <input name="locale" type="hidden" value={locale} />
          <label className="grid gap-2 text-sm font-semibold">
            {safety.topic}
            <select
              name="topic"
              value={topic}
              disabled={pending}
              onChange={(event) => setTopic(event.target.value)}
              className="h-11 w-full rounded-lg border border-sand bg-white px-3 text-base"
            >
              <option value="GENERAL">{safety.general}</option>
              <option value="CHILD_SAFETY">{safety.child}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            {copy.label}
            <textarea
              aria-describedby={hintId}
              className="min-h-32 w-full resize-y rounded-lg border border-sand bg-white px-3 py-3 text-base leading-6 outline-none focus:border-forest"
              disabled={pending}
              maxLength={2000}
              minLength={2}
              name="content"
              onChange={(event) => setContent(event.target.value)}
              placeholder={copy.placeholder}
              required
              value={content}
            />
          </label>
          <p id={hintId} className="text-sm leading-6 text-ink/75">
            {safety.hint}
          </p>
          {state.formError ? (
            <p className="text-sm font-semibold text-danger" role="alert">
              {state.formError}
            </p>
          ) : null}
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-forest px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            <SendHorizontal aria-hidden="true" className="h-4 w-4" />
            {pending ? copy.sending : copy.send}
          </button>
        </form>
      )}
    </SafetyDialog>
  );
}

export function OfficialFeedbackDialog({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-5 py-2 text-sm font-bold text-white transition active:scale-[0.98]"
        onClick={() => setOpen(true)}
        type="button"
      >
        <MessageSquareText aria-hidden="true" className="h-5 w-5 shrink-0" />
        {getChildSafetyCopy(locale).feedback}
      </button>
      {open ? (
        <FeedbackForm locale={locale} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
