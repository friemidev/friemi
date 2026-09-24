"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, RotateCcw } from "lucide-react";
import {
  joinWerewolfRoomAction,
  type WerewolfRoomActionState,
} from "@/features/game-tools/actions/werewolfRoomActions";

const initialState: WerewolfRoomActionState = {};

function AutoJoinSubmit({
  joiningLabel,
  retryLabel,
  showRetry,
}: {
  joiningLabel: string;
  retryLabel: string;
  showRetry: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F1F2E3] px-6 text-sm font-bold text-[#153B31] shadow-[0_14px_38px_rgba(0,0,0,0.22)] disabled:cursor-wait"
      disabled={pending}
      type="submit"
    >
      {pending || !showRetry ? (
        <LoaderCircle className="h-5 w-5 animate-spin" />
      ) : (
        <RotateCcw className="h-4 w-4" />
      )}
      {showRetry && !pending ? retryLabel : joiningLabel}
    </button>
  );
}

export function WerewolfAutoJoinRoom({
  joiningLabel,
  locale,
  retryLabel,
  roomId,
}: {
  joiningLabel: string;
  locale: string;
  retryLabel: string;
  roomId: string;
}) {
  const [state, formAction] = useActionState(
    joinWerewolfRoomAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current || !formRef.current) {
      return;
    }

    submittedRef.current = true;
    formRef.current.requestSubmit();
  }, []);

  return (
    <main className="fixed inset-0 z-[70] grid min-h-[100dvh] place-items-center bg-[#062A24] px-6 text-center">
      <form
        action={formAction}
        className="grid justify-items-center gap-4"
        onSubmit={() => {
          submittedRef.current = true;
        }}
        ref={formRef}
      >
        <input name="locale" type="hidden" value={locale} />
        <input name="roomId" type="hidden" value={roomId} />
        <AutoJoinSubmit
          joiningLabel={joiningLabel}
          retryLabel={retryLabel}
          showRetry={Boolean(state.formError)}
        />
        {state.formError ? (
          <p className="max-w-xs text-sm font-semibold leading-6 text-[#F1F2E3]">
            {state.formError}
          </p>
        ) : null}
      </form>
    </main>
  );
}
