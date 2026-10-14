"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  LoaderCircle,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { RetainedImage } from "@/components/media/RetainedImage";
import { cn } from "@/lib/utils";
import {
  activityRoomAssistantAvatar,
  activityRoomWelcomeTemplateMaxLength,
  defaultActivityRoomWelcomeTemplate,
  getActivityRoomAssistantCopy,
  normalizeActivityRoomWelcomeTemplate,
  renderActivityRoomWelcome,
} from "../assistant";
import {
  updateActivityRoomWelcomeAction,
  type ActivityRoomWelcomeActionState,
} from "../actions/updateRoomWelcome";

type WelcomeEditorActionState = ActivityRoomWelcomeActionState & {
  editorSessionId?: number;
};

export const ActivityRoomWelcomeActionContext = createContext(
  updateActivityRoomWelcomeAction,
);

export function ActivityRoomWelcomeEditor({
  activityId,
  activityTitle,
  initialTemplate = defaultActivityRoomWelcomeTemplate,
  locale,
  presentation = "row",
}: {
  activityId: string;
  activityTitle: string;
  initialTemplate?: string;
  locale: string;
  presentation?: "inline" | "row";
}) {
  const copy = getActivityRoomAssistantCopy(locale);
  const router = useRouter();
  const editorId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editorSessionRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState(initialTemplate);
  const [savedTemplate, setSavedTemplate] = useState(initialTemplate);
  const [saved, setSaved] = useState(false);
  const saveAction = useContext(ActivityRoomWelcomeActionContext);
  const [state, action, pending] = useActionState(
    async (
      _previous: WelcomeEditorActionState,
      data: FormData,
    ): Promise<WelcomeEditorActionState> => {
      const editorSessionId = Number(data.get("editorSessionId"));
      try {
        return { ...(await saveAction({}, data)), editorSessionId };
      } catch {
        return { formError: copy.failed, editorSessionId };
      }
    },
    {},
  );
  const formError =
    state.editorSessionId === editorSessionRef.current
      ? state.formError
      : undefined;

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open && mounted) dialogRef.current?.showModal();
  }, [open, mounted]);
  useEffect(() => setSavedTemplate(initialTemplate), [initialTemplate]);
  useEffect(() => {
    if (!state.ok || !state.template) return;
    setSavedTemplate(state.template);
    if (
      state.editorSessionId === editorSessionRef.current &&
      normalizeActivityRoomWelcomeTemplate(inputRef.current?.value ?? "") ===
        state.template
    ) {
      setSaved(true);
      dialogRef.current?.close();
    }
    router.refresh();
  }, [state, router]);

  function insertVariable(variable: "nickname" | "activityName") {
    const input = inputRef.current;
    const start = input?.selectionStart ?? template.length;
    const end = input?.selectionEnd ?? start;
    const token = `{${variable}}`;
    const next = template.slice(0, start) + token + template.slice(end);
    if (next.length > activityRoomWelcomeTemplateMaxLength) return;
    setTemplate(next);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "touch-manipulation text-forest transition active:bg-meadow/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-meadow",
          presentation === "inline"
            ? "inline-flex min-h-11 w-[4.25rem] shrink-0 self-center flex-col items-center justify-center gap-1 rounded-md text-[10px] font-medium leading-4 sm:w-auto sm:flex-row sm:px-2 sm:text-xs"
            : "flex min-h-14 w-full items-center gap-3 px-4 text-left text-sm font-medium",
        )}
        onClick={() => {
          editorSessionRef.current += 1;
          setSaved(false);
          setTemplate(savedTemplate);
          setOpen(true);
        }}
      >
        {presentation === "inline" ? (
          saved ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <PencilLine className="h-4 w-4 shrink-0" />
          )
        ) : (
          <Bot className="h-5 w-5 shrink-0" />
        )}
        <span className="min-w-0 break-words">
          {presentation === "inline" ? copy.edit : copy.settings}
        </span>
        {presentation === "row" ? (
          saved ? (
            <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-forest" />
          ) : (
            <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-ink/50" />
          )
        ) : null}
      </button>
      {saved ? (
        <span className="sr-only" role="status">
          {copy.saved}
        </span>
      ) : null}
      {mounted && open
        ? createPortal(
            <dialog
              ref={dialogRef}
              aria-labelledby={`welcome-title-${editorId}`}
              className="fixed inset-x-0 bottom-auto z-[100] mx-auto my-0 max-h-[calc(var(--friemi-modal-viewport-height,100dvh)-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto overscroll-contain rounded-lg border border-fog bg-white p-0 text-ink shadow-xl backdrop:bg-black/35"
              style={{
                top: "calc(var(--friemi-modal-viewport-offset-top, 0px) + var(--friemi-modal-viewport-height, 100dvh) / 2)",
                transform: "translateY(-50%)",
              }}
              onClose={() => {
                editorSessionRef.current += 1;
                setOpen(false);
                requestAnimationFrame(() => triggerRef.current?.focus());
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") event.stopPropagation();
              }}
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                const rect = event.currentTarget.getBoundingClientRect();
                if (
                  event.clientX < rect.left ||
                  event.clientX > rect.right ||
                  event.clientY < rect.top ||
                  event.clientY > rect.bottom
                ) {
                  event.currentTarget.close();
                }
              }}
            >
              <header className="flex items-center gap-3 border-b border-fog px-4 py-3">
                <Bot className="h-5 w-5 text-forest" />
                <h2
                  id={`welcome-title-${editorId}`}
                  className="min-w-0 flex-1 text-base font-bold"
                >
                  {copy.title}
                </h2>
                <button
                  type="button"
                  aria-label={copy.close}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink/60 active:bg-fog"
                  onClick={() => dialogRef.current?.close()}
                >
                  <X className="h-5 w-5" />
                </button>
              </header>
              <form action={action} className="space-y-4 p-4">
                <input type="hidden" name="activityId" value={activityId} />
                <input type="hidden" name="locale" value={locale} />
                <input
                  type="hidden"
                  name="editorSessionId"
                  value={editorSessionRef.current}
                />
                <label className="block text-sm font-semibold">
                  {copy.title}
                  <textarea
                    ref={inputRef}
                    name="template"
                    className="mt-2 min-h-32 w-full resize-y rounded-md border border-fog p-3 text-base font-normal leading-6 focus:border-meadow focus:outline-none focus:ring-2 focus:ring-meadow/20"
                    value={template}
                    onChange={(event) => setTemplate(event.target.value)}
                    maxLength={activityRoomWelcomeTemplateMaxLength}
                    rows={4}
                    required
                    aria-describedby={`welcome-error-${editorId}`}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {(["nickname", "activityName"] as const).map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-fog px-3 text-sm text-forest active:bg-meadow/10"
                      onClick={() => insertVariable(variable)}
                    >
                      <Plus className="h-4 w-4" />
                      {copy[variable]}
                    </button>
                  ))}
                  <span className="ml-auto text-xs tabular-nums text-ink/60">
                    {template.length}/{activityRoomWelcomeTemplateMaxLength}
                  </span>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink/60">
                    {copy.preview}
                  </p>
                  <div className="flex min-w-0 items-start gap-2.5">
                    <RetainedImage
                      src={activityRoomAssistantAvatar}
                      alt={copy.name}
                      width={36}
                      height={36}
                      className="mt-5 h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[11px] font-bold text-ink/60">
                        {copy.name}
                      </p>
                      <p className="whitespace-pre-wrap break-words rounded-lg border border-fog px-3.5 py-2 text-sm leading-6">
                        {renderActivityRoomWelcome(
                          template,
                          copy.sampleName,
                          activityTitle,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <p
                  id={`welcome-error-${editorId}`}
                  role={formError ? "alert" : undefined}
                  className="text-sm text-danger"
                >
                  {formError}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-fog pt-3">
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center gap-2 text-sm text-ink/60"
                    onClick={() =>
                      setTemplate(defaultActivityRoomWelcomeTemplate)
                    }
                  >
                    <RotateCcw className="h-4 w-4" />
                    {copy.reset}
                  </button>
                  <button
                    type="submit"
                    disabled={
                      pending || !normalizeActivityRoomWelcomeTemplate(template)
                    }
                    aria-busy={pending}
                    className="inline-flex min-h-11 items-center gap-2 rounded-md bg-forest px-4 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
                  >
                    {pending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {pending ? copy.saving : copy.save}
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
