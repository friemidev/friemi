"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@chill-club/ui";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  toggleFollowUserAction,
  type ToggleFollowState,
} from "../actions/toggleFollowUser";
import { getFollowCopy } from "../copy";

type FollowButtonProps = {
  locale: string;
  targetUserProfileId: string;
  redirectPath: string;
  isAuthenticated: boolean;
  isFollowing: boolean;
  buttonClassName?: string;
  fullWidth?: boolean;
};

const initialState: ToggleFollowState = {};

function SubmitButton({
  buttonClassName,
  fullWidth,
  locale,
  isFollowing,
}: {
  buttonClassName?: string;
  fullWidth: boolean;
  locale: string;
  isFollowing: boolean;
}) {
  const { pending } = useFormStatus();
  const t = getFollowCopy(locale);

  let label = t.follow;

  if (pending) {
    label = isFollowing ? t.unfollowing : t.following;
  } else if (isFollowing) {
    label = t.unfollow;
  }

  return (
    <Button
      className={cn(fullWidth ? "w-full" : "w-auto", buttonClassName)}
      type="submit"
      variant={isFollowing ? "secondary" : "primary"}
      disabled={pending}
    >
      {label}
    </Button>
  );
}

export function FollowButton({
  buttonClassName,
  fullWidth = true,
  locale,
  targetUserProfileId,
  redirectPath,
  isAuthenticated,
  isFollowing,
}: FollowButtonProps) {
  const [state, formAction] = useActionState(
    toggleFollowUserAction,
    initialState,
  );
  const t = getFollowCopy(locale);

  if (!isAuthenticated) {
    return (
      <Link href={withLocale(locale, "/sign-in")}>
        <Button
          className={cn(fullWidth ? "w-full" : "w-auto", buttonClassName)}
          variant="secondary"
        >
          {t.signInToFollow}
        </Button>
      </Link>
    );
  }

  return (
    <form action={formAction} className="grid gap-2">
      <input name="locale" type="hidden" value={locale} />
      <input
        name="targetUserProfileId"
        type="hidden"
        value={targetUserProfileId}
      />
      <input name="redirectPath" type="hidden" value={redirectPath} />
      {state.formError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.formError}
        </p>
      ) : null}
      <SubmitButton
        buttonClassName={buttonClassName}
        fullWidth={fullWidth}
        isFollowing={isFollowing}
        locale={locale}
      />
    </form>
  );
}
