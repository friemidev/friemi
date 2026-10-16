"use client";
import { useSession } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DoudizhuEntryClient } from "./DoudizhuEntryClient";
import { getDoudizhuCopy } from "../doudizhuCopy";
import s from "./DoudizhuGame.module.css";
/** Account-scoped pending commands must never be submitted by a new session. */
export function DoudizhuEntryGuard(
  props: Parameters<typeof DoudizhuEntryClient>[0],
) {
  const { session, isLoaded } = useSession(),
    router = useRouter(),
    current = session?.user.id,
    matches = current === props.initialClerkUserId;
  useEffect(() => {
    if (isLoaded && !matches) router.refresh();
  }, [isLoaded, current, matches, router]);
  if (!isLoaded || !matches)
    return (
      <div className={s.game}>
        <p className={s.feedback}>{getDoudizhuCopy(props.locale).loading}</p>
        <a className={s.button} href={`/${props.locale}/game-tools/doudizhu`}>
          {getDoudizhuCopy(props.locale).refresh}
        </a>
      </div>
    );
  return <DoudizhuEntryClient key={current ?? "guest"} {...props} />;
}
