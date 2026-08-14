"use client";

import { useActionState, useEffect, useRef } from "react";
import { SendHorizontal } from "lucide-react";
import {
  publishOfficialMessageAction,
  type PublishOfficialMessageState,
} from "@/features/official-messages/actions/officialMessageActions";

const initialState: PublishOfficialMessageState = {};

export function OfficialMessageComposer({ locale }: { locale: string }) {
  const [state, formAction, pending] = useActionState(
    publishOfficialMessageAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  const copy =
    locale === "fr"
      ? {
          content: "Message",
          hint: "Publie une information officielle visible par tous les utilisateurs.",
          publish: "Publier",
          published: "Message publie.",
          publishing: "Publication...",
          title: "Titre",
        }
      : locale === "en"
        ? {
            content: "Message",
            hint: "Publish one official update visible to every user.",
            publish: "Publish",
            published: "Official message published.",
            publishing: "Publishing...",
            title: "Title",
          }
        : {
            content: "公告内容",
            hint: "发布后所有用户都能在聊聊的“官方”会话中看到。",
            publish: "发布",
            published: "官方消息已发布。",
            publishing: "发布中...",
            title: "标题",
          };

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-4 border-y border-[#E7E2D6] py-5"
    >
      <input name="locale" type="hidden" value={locale} />
      <p className="text-sm font-semibold leading-6 text-[#646A63]">
        {copy.hint}
      </p>
      <label className="grid gap-1.5">
        <span className="text-xs font-bold text-[#4F574F]">{copy.title}</span>
        <input
          className="h-11 border-b border-[#D9D6C6] bg-transparent px-0 text-sm font-semibold text-[#111210] outline-none focus:border-[#156240]"
          maxLength={120}
          name="title"
          required
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-bold text-[#4F574F]">{copy.content}</span>
        <textarea
          className="min-h-36 resize-y border-b border-[#D9D6C6] bg-transparent px-0 py-2 text-sm font-semibold leading-6 text-[#111210] outline-none focus:border-[#156240]"
          maxLength={4000}
          name="content"
          required
        />
      </label>
      {state.formError ? (
        <p className="text-sm font-semibold text-[#B4233A]" role="alert">
          {state.formError}
        </p>
      ) : state.ok ? (
        <p className="text-sm font-semibold text-[#156240]" role="status">
          {copy.published}
        </p>
      ) : null}
      <button
        className="ml-auto inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-bold text-white transition active:scale-95 disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        <SendHorizontal className="h-4 w-4" />
        {pending ? copy.publishing : copy.publish}
      </button>
    </form>
  );
}
