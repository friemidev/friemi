"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircle, Trash2 } from "lucide-react";
import { deleteNowInviteAction } from "./actions";
import { getNowCopy } from "./now";

export function NowDeleteInviteButton({
  inviteId,
  title,
  locale,
  preview = false,
}: {
  inviteId: string;
  title: string;
  locale: string;
  preview?: boolean;
}) {
  const copy = getNowCopy(locale);
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteNowInviteAction, {});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${copy.deleteInvite}：${title}`}
        title={copy.deleteInvite}
        aria-haspopup="dialog"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/60 transition hover:bg-danger/10 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest active:bg-danger/10"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={18} aria-hidden="true" />
      </button>
      {open
        ? createPortal(
            <dialog
              ref={dialogRef}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby={headingId}
              aria-describedby={descriptionId}
              className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto overscroll-contain rounded-3xl bg-white p-5 text-ink shadow-xl backdrop:bg-ink/40"
              onCancel={(event) => {
                if (pending) event.preventDefault();
                else setOpen(false);
              }}
            >
              <form
                action={preview ? undefined : action}
                onSubmit={
                  preview ? (event) => event.preventDefault() : undefined
                }
              >
                <input type="hidden" name="inviteId" value={inviteId} />
                <input type="hidden" name="locale" value={locale} />
                <h2 id={headingId} className="text-xl font-bold">
                  {copy.deleteConfirmTitle}
                </h2>
                <p className="mt-3 break-words rounded-xl bg-fog px-3 py-2.5 text-sm font-semibold">
                  {title}
                </p>
                <div
                  id={descriptionId}
                  className="mt-3 text-sm leading-6 text-ink/70"
                >
                  <p>{copy.deleteConfirmDescription}</p>
                  <p className="mt-1">{copy.deleteRelatedHint}</p>
                </div>
                {preview ? (
                  <p className="mt-3 text-xs leading-5 text-ink/70">
                    {copy.deletePreview}
                  </p>
                ) : null}
                {state.error ? (
                  <p
                    role="alert"
                    className="mt-3 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger"
                  >
                    {state.error}
                  </p>
                ) : null}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    autoFocus
                    type="button"
                    disabled={pending}
                    onClick={() => setOpen(false)}
                    className="min-h-11 rounded-full border border-sand bg-white px-3 text-sm font-semibold text-forest disabled:opacity-60"
                  >
                    {copy.deleteCancel}
                  </button>
                  <button
                    type="submit"
                    disabled={pending || preview}
                    aria-busy={pending}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-danger px-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {pending ? (
                      <LoaderCircle
                        size={16}
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 size={16} aria-hidden="true" />
                    )}
                    {pending ? copy.deleting : copy.deleteConfirm}
                  </button>
                </div>
              </form>
            </dialog>,
            document.body,
          )
        : null}
    </>
  );
}
