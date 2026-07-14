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
    <Button
      type="submit"
      className="h-10 w-full rounded-full px-5 font-semibold sm:w-auto"
      disabled={pending}
    >
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
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-3 rounded-[1.15rem] bg-[#FEFFF9]/76 p-3 shadow-sm ring-1 ring-[#D6D5B2]/70 sm:gap-4 sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0"
      noValidate
    >
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />

      {state.formError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="text-xs font-black uppercase tracking-[0.08em] text-[#156240]/70 sm:text-sm sm:normal-case sm:tracking-normal sm:text-zinc-700">
          {t.typeLabel}
        </legend>
        <div className="grid grid-cols-3 gap-1.5 rounded-full bg-[#F1F2EC] p-1">
          {commentTypes.map((type) => (
            <label
              key={type}
              className="cursor-pointer rounded-full text-center text-xs font-bold text-zinc-500 transition has-[:checked]:bg-white has-[:checked]:text-[#156240] has-[:checked]:shadow-sm sm:text-sm"
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

      <label className="grid gap-2 text-sm font-semibold text-zinc-700">
        {t.contentLabel}
        <Textarea
          className="min-h-24 rounded-[1rem] border-[#D6D5B2] bg-white/88 text-base shadow-none"
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
