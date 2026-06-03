"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Pin, Reply, Trash2 } from "lucide-react";
import { formatActivityDate } from "@chill-club/shared";
import { Button, Textarea } from "@chill-club/ui";
import { getCopy } from "@/lib/copy";
import {
  createActivityCommentAction,
  deleteActivityCommentAction,
  type CreateActivityCommentState,
  type DeleteActivityCommentState,
  type UpdateActivityCommentState,
  updateActivityCommentAction,
} from "../actions/createActivityComment";
import type {
  ActivityCommentReplyViewModel,
  ActivityCommentViewModel,
} from "../types";

type ActivityCommentThreadProps = {
  activityId: string;
  comment: ActivityCommentViewModel;
  isAuthenticated: boolean;
  locale: string;
  viewerProfileId: string | null;
};

const replyInitialState: CreateActivityCommentState = {
  values: {
    type: "QUESTION",
    content: "",
  },
};

const updateInitialState: UpdateActivityCommentState = {
  values: {
    content: "",
  },
};

const deleteInitialState: DeleteActivityCommentState = {};

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function SubmitButton({
  className,
  label,
  pendingLabel,
  variant = "primary",
}: {
  className?: string;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      className={["h-9 px-3", className].filter(Boolean).join(" ")}
      disabled={pending}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}

function CommentAvatar({
  avatarUrl,
  nickname,
  size = "md",
}: {
  avatarUrl: string | null;
  nickname: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={
        size === "sm"
          ? "flex h-7 w-7 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-moss/10 text-xs font-semibold text-moss"
          : "flex h-9 w-9 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-moss/10 text-sm font-semibold text-moss"
      }
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{getInitial(nickname)}</span>
      )}
    </div>
  );
}

function CommentMeta({
  createdAt,
  editedAt,
  isDeleted,
  locale,
  nickname,
}: {
  createdAt: string;
  editedAt: string | null;
  isDeleted: boolean;
  locale: string;
  nickname: string;
}) {
  const t = getCopy(locale).activityComments;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <p className="max-w-[11rem] truncate font-medium text-ink sm:max-w-[18rem]">
        {nickname}
      </p>
      <span className="text-xs text-zinc-500">
        {formatActivityDate(createdAt, locale)}
      </span>
      {!isDeleted && editedAt ? (
        <span className="text-xs text-zinc-400">{t.edited}</span>
      ) : null}
    </div>
  );
}

function EditCommentForm({
  activityId,
  commentId,
  initialContent,
  locale,
  onCancel,
}: {
  activityId: string;
  commentId: string;
  initialContent: string;
  locale: string;
  onCancel: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const [state, formAction] = useActionState(updateActivityCommentAction, {
    ...updateInitialState,
    values: {
      content: initialContent,
    },
  });
  const t = getCopy(locale).activityComments;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state.ok) {
      onCancel();
      router.refresh();
    }
  }, [onCancel, router, state.ok]);

  return (
    <form action={formAction} className="mt-3 grid gap-2">
      <input type="hidden" name="activityId" value={activityId} />
      <input type="hidden" name="commentId" value={commentId} />
      <input type="hidden" name="locale" value={locale} />
      <Textarea
        ref={textareaRef}
        className="min-h-24"
        defaultValue={state.values?.content ?? initialContent}
        maxLength={500}
        name="content"
      />
      {state.formError ? (
        <p role="alert" className="text-xs font-medium text-red-600">
          {state.formError}
        </p>
      ) : null}
      {state.fieldErrors?.content?.[0] ? (
        <p role="alert" className="text-xs font-medium text-red-600">
          {state.fieldErrors.content[0]}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          className="h-9 px-3"
          onClick={onCancel}
        >
          {t.cancel}
        </Button>
        <SubmitButton label={t.saveEdit} pendingLabel={t.savingEdit} />
      </div>
    </form>
  );
}

function DeleteCommentForm({
  activityId,
  commentId,
  locale,
  onCancel,
}: {
  activityId: string;
  commentId: string;
  locale: string;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    deleteActivityCommentAction,
    deleteInitialState,
  );
  const t = getCopy(locale).activityComments;

  useEffect(() => {
    if (state.ok) {
      onCancel();
      router.refresh();
    }
  }, [onCancel, router, state.ok]);

  return (
    <form
      action={formAction}
      className="mt-3 rounded-md border border-clay/20 bg-clay/5 p-3 text-sm"
    >
      <input type="hidden" name="activityId" value={activityId} />
      <input type="hidden" name="commentId" value={commentId} />
      <input type="hidden" name="locale" value={locale} />
      <p className="text-zinc-700">{t.deleteConfirm}</p>
      {state.formError ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {state.formError}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          className="h-9 px-3"
          onClick={onCancel}
        >
          {t.cancel}
        </Button>
        <SubmitButton
          className="text-clay ring-clay/25 hover:bg-clay/10"
          label={t.confirmDelete}
          pendingLabel={t.deleting}
          variant="secondary"
        />
      </div>
    </form>
  );
}

function ReplyCommentForm({
  activityId,
  locale,
  onCancel,
  parentId,
}: {
  activityId: string;
  locale: string;
  onCancel: () => void;
  parentId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const [state, formAction] = useActionState(
    createActivityCommentAction,
    replyInitialState,
  );
  const t = getCopy(locale).activityComments;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onCancel();
      router.refresh();
    }
  }, [onCancel, router, state.ok]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 grid gap-2">
      <input type="hidden" name="activityId" value={activityId} />
      <input type="hidden" name="parentId" value={parentId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="type" value="QUESTION" />
      <Textarea
        ref={textareaRef}
        className="min-h-24"
        defaultValue={state.ok ? "" : state.values?.content}
        maxLength={500}
        name="content"
        placeholder={t.replyPlaceholder}
      />
      {state.formError ? (
        <p role="alert" className="text-xs font-medium text-red-600">
          {state.formError}
        </p>
      ) : null}
      {state.fieldErrors?.content?.[0] ? (
        <p role="alert" className="text-xs font-medium text-red-600">
          {state.fieldErrors.content[0]}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          className="h-9 px-3"
          onClick={onCancel}
        >
          {t.cancel}
        </Button>
        <SubmitButton label={t.replySubmit} pendingLabel={t.replying} />
      </div>
    </form>
  );
}

function CommentActions({
  canManage,
  canReply,
  locale,
  onDelete,
  onEdit,
  onReply,
}: {
  canManage: boolean;
  canReply: boolean;
  locale: string;
  onDelete: () => void;
  onEdit: () => void;
  onReply: () => void;
}) {
  const t = getCopy(locale).activityComments;

  if (!canReply && !canManage) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium">
      {canReply ? (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600 transition hover:bg-zinc-200"
          onClick={onReply}
        >
          <Reply className="h-3.5 w-3.5" aria-hidden="true" />
          {t.reply}
        </button>
      ) : null}
      {canManage ? (
        <>
          <button
            type="button"
            className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600 transition hover:bg-zinc-200"
            onClick={onEdit}
          >
            {t.edit}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-clay/10 px-2.5 py-1 text-clay transition hover:bg-clay/15"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t.delete}
          </button>
        </>
      ) : null}
    </div>
  );
}

function ReplyItem({
  activityId,
  isAuthenticated,
  locale,
  reply,
  viewerProfileId,
}: {
  activityId: string;
  isAuthenticated: boolean;
  locale: string;
  reply: ActivityCommentReplyViewModel;
  viewerProfileId: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const t = getCopy(locale).activityComments;
  const canManage =
    isAuthenticated && viewerProfileId === reply.author.id && !reply.isDeleted;

  return (
    <div className="flex gap-2 py-3">
      <CommentAvatar
        avatarUrl={reply.author.avatarUrl}
        nickname={reply.author.nickname}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <CommentMeta
          createdAt={reply.createdAt}
          editedAt={reply.editedAt}
          isDeleted={reply.isDeleted}
          locale={locale}
          nickname={reply.author.nickname}
        />
        {reply.isDeleted ? (
          <p className="mt-2 text-sm italic text-zinc-400">
            {t.deletedComment}
          </p>
        ) : isEditing ? (
          <EditCommentForm
            activityId={activityId}
            commentId={reply.id}
            initialContent={reply.content}
            locale={locale}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-zinc-700">
            {reply.content}
          </p>
        )}
        {isDeleting ? (
          <DeleteCommentForm
            activityId={activityId}
            commentId={reply.id}
            locale={locale}
            onCancel={() => setIsDeleting(false)}
          />
        ) : !isEditing ? (
          <CommentActions
            canManage={canManage}
            canReply={false}
            locale={locale}
            onDelete={() => {
              setIsDeleting(true);
              setIsEditing(false);
            }}
            onEdit={() => {
              setIsEditing(true);
              setIsDeleting(false);
            }}
            onReply={() => undefined}
          />
        ) : null}
      </div>
    </div>
  );
}

export function ActivityCommentThread({
  activityId,
  comment,
  isAuthenticated,
  locale,
  viewerProfileId,
}: ActivityCommentThreadProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const t = getCopy(locale).activityComments;
  const canManage =
    isAuthenticated &&
    viewerProfileId === comment.author.id &&
    !comment.isDeleted;
  const canReply = isAuthenticated && !comment.isDeleted;

  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <CommentAvatar
          avatarUrl={comment.author.avatarUrl}
          nickname={comment.author.nickname}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <CommentMeta
              createdAt={comment.createdAt}
              editedAt={comment.editedAt}
              isDeleted={comment.isDeleted}
              locale={locale}
              nickname={comment.author.nickname}
            />
            {!comment.isDeleted ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                {t.types[comment.type]}
              </span>
            ) : null}
            {comment.pinnedByOrganizer && !comment.isDeleted ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                <Pin className="h-3 w-3" />
                {t.pinned}
              </span>
            ) : null}
          </div>

          {comment.isDeleted ? (
            <p className="mt-3 text-sm italic text-zinc-400">
              {t.deletedComment}
            </p>
          ) : isEditing ? (
            <EditCommentForm
              activityId={activityId}
              commentId={comment.id}
              initialContent={comment.content}
              locale={locale}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-700">
              {comment.content}
            </p>
          )}

          {isDeleting ? (
            <DeleteCommentForm
              activityId={activityId}
              commentId={comment.id}
              locale={locale}
              onCancel={() => setIsDeleting(false)}
            />
          ) : !isEditing ? (
            <CommentActions
              canManage={canManage}
              canReply={canReply}
              locale={locale}
              onDelete={() => {
                setIsDeleting(true);
                setIsEditing(false);
                setIsReplying(false);
              }}
              onEdit={() => {
                setIsEditing(true);
                setIsDeleting(false);
                setIsReplying(false);
              }}
              onReply={() => {
                setIsReplying((value) => !value);
                setIsDeleting(false);
                setIsEditing(false);
              }}
            />
          ) : null}

          {isReplying ? (
            <ReplyCommentForm
              activityId={activityId}
              locale={locale}
              onCancel={() => setIsReplying(false)}
              parentId={comment.id}
            />
          ) : null}

          {comment.replies.length > 0 ? (
            <div className="mt-4 rounded-r-md border-l-2 border-moss/20 bg-moss/[0.03] pl-3 sm:pl-4">
              {comment.replies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  activityId={activityId}
                  isAuthenticated={isAuthenticated}
                  locale={locale}
                  reply={reply}
                  viewerProfileId={viewerProfileId}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
