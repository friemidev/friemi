"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { CommentType } from "@prisma/client";
import { Button, Textarea } from "@chill-club/ui";
import { getCopy } from "@/lib/copy";
import {
  createActivityCommentAction,
  type CreateActivityCommentState,
} from "../actions/createActivityComment";

type ActivityCommentFormProps = {
  activityId: string;
  locale: string;
};

const initialState: CreateActivityCommentState = {
  values: {
    type: "QUESTION",
    content: "",
  },
};

const commentTypes: CommentType[] = ["QUESTION", "SUGGESTION", "REVIEW"];

function SubmitButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).activityComments;

  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? t.submitting : t.submit}
    </Button>
  );
}

export function ActivityCommentForm({
  activityId,
  locale,
}: ActivityCommentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(
    createActivityCommentAction,
    initialState,
  );
  const t = getCopy(locale).activityComments;

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-4" noValidate>
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />

      {state.formError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-zinc-700">
          {t.typeLabel}
        </legend>
        <div className="grid grid-cols-3 gap-2 rounded-md bg-zinc-100 p-1">
          {commentTypes.map((type) => (
            <label
              key={type}
              className="cursor-pointer rounded-[5px] text-center text-sm font-medium text-zinc-600 transition has-[:checked]:bg-white has-[:checked]:text-ink has-[:checked]:shadow-sm"
            >
              <input
                className="sr-only"
                type="radio"
                name="type"
                value={type}
                defaultChecked={(state.values?.type ?? "QUESTION") === type}
              />
              <span className="block whitespace-nowrap px-2 py-2">
                {t.types[type]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="grid gap-2 text-sm font-medium text-zinc-700">
        {t.contentLabel}
        <Textarea
          className="min-h-28"
          name="content"
          defaultValue={state.ok ? "" : state.values?.content}
          maxLength={500}
          placeholder={t.contentPlaceholder}
        />
        <span className="text-xs font-normal leading-5 text-zinc-500">
          {t.contentHint}
        </span>
        {state.fieldErrors?.content?.[0] ? (
          <span className="text-xs font-medium text-red-600">
            {state.fieldErrors.content[0]}
          </span>
        ) : null}
      </label>

      <div className="flex justify-end">
        <SubmitButton locale={locale} />
      </div>
    </form>
  );
}
