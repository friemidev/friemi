"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { SendHorizontal } from "lucide-react";
import { Button, Textarea } from "@chill-club/ui";
import {
  sendDirectMessageAction,
  type DirectMessageActionState,
} from "../actions/directMessageActions";
import { getDirectMessagesCopy } from "../copy";

type MessageComposerProps = {
  conversationId: string;
  locale: string;
};

const initialState: DirectMessageActionState = {
  values: {
    body: "",
  },
};

function SubmitButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getDirectMessagesCopy(locale);

  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-11 shrink-0 gap-2 px-4"
    >
      <SendHorizontal className="h-4 w-4" />
      <span className="hidden whitespace-nowrap sm:inline">
        {pending ? t.sending : t.send}
      </span>
      <span className="sr-only sm:hidden">{pending ? t.sending : t.send}</span>
    </Button>
  );
}

export function MessageComposer({
  conversationId,
  locale,
}: MessageComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    sendDirectMessageAction,
    initialState,
  );
  const t = getDirectMessagesCopy(locale);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="sticky bottom-[4.75rem] z-20 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:bottom-0 md:rounded-b-lg"
      noValidate
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="conversationId" type="hidden" value={conversationId} />
      {state.formError ? (
        <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      ) : null}
      <div className="flex min-w-0 items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t.messagePlaceholder}</span>
          <Textarea
            key={state.messageId ?? "new-message"}
            name="body"
            maxLength={1000}
            defaultValue={state.ok ? "" : state.values?.body}
            placeholder={t.messagePlaceholder}
            className="max-h-36 min-h-11 resize-none bg-white py-2.5"
          />
        </label>
        <SubmitButton locale={locale} />
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{t.messageHint}</p>
      {state.fieldErrors?.body?.[0] ? (
        <p className="mt-1 text-xs font-medium text-red-600">
          {state.fieldErrors.body[0]}
        </p>
      ) : null}
    </form>
  );
}
