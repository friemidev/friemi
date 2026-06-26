"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@chill-club/ui";
import { getSignInHref } from "@/lib/auth-redirect";
import {
  claimAutoCreatedActivityAction,
  type ClaimAutoCreatedActivityState,
} from "../actions/claimAutoCreatedActivity";

type ClaimAutoCreatedActivityButtonProps = {
  activityId: string;
  isAuthenticated: boolean;
  locale: string;
  redirectPath: string;
};

const initialState: ClaimAutoCreatedActivityState = {};

function getClaimCopy(locale: string) {
  if (locale === "fr") {
    return {
      claim: "Reclamer l'equipe",
      claiming: "Reclamation...",
      helper: "Reclamez cette equipe pour modifier l'horaire et le lieu.",
      signIn: "Connectez-vous pour reclamer",
    };
  }

  if (locale === "en") {
    return {
      claim: "Claim this team",
      claiming: "Claiming...",
      helper: "Claim this team to edit the time and location.",
      signIn: "Sign in to claim",
    };
  }

  return {
    claim: "认领组局",
    claiming: "认领中...",
    helper: "认领后你可以修改时间、地点和组局信息。",
    signIn: "登录后认领",
  };
}

function SubmitButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getClaimCopy(locale);

  return (
    <Button
      className="h-10 rounded-full border border-[#d5bf8c] bg-[#fff3d8] px-4 text-sm font-semibold text-[#7b5b1b] shadow-none hover:bg-[#ffefcf]"
      disabled={pending}
      type="submit"
      variant="secondary"
    >
      <span className="inline-flex items-center gap-1.5">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Flag className="h-4 w-4" />
        )}
        {pending ? t.claiming : t.claim}
      </span>
    </Button>
  );
}

export function ClaimAutoCreatedActivityButton({
  activityId,
  isAuthenticated,
  locale,
  redirectPath,
}: ClaimAutoCreatedActivityButtonProps) {
  const router = useRouter();
  const t = getClaimCopy(locale);
  const [state, formAction] = useActionState(
    claimAutoCreatedActivityAction,
    initialState,
  );

  useEffect(() => {
    if (!state.ok) {
      return;
    }

    router.refresh();
  }, [router, state.ok]);

  if (!isAuthenticated) {
    return (
      <div className="grid gap-2">
        <p className="text-xs leading-5 text-zinc-500">{t.helper}</p>
        <Link href={getSignInHref(locale, redirectPath)}>
          <Button
            className="h-10 rounded-full border border-[#d5bf8c] bg-[#fff3d8] px-4 text-sm font-semibold text-[#7b5b1b] shadow-none hover:bg-[#ffefcf]"
            variant="secondary"
          >
            <Flag className="h-4 w-4" />
            {t.signIn}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-2">
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />
      <input name="redirectPath" type="hidden" value={redirectPath} />
      <p className="text-xs leading-5 text-zinc-500">{t.helper}</p>
      <SubmitButton locale={locale} />
      {state.formError ? (
        <p className="text-xs leading-5 text-red-600">{state.formError}</p>
      ) : null}
    </form>
  );
}
