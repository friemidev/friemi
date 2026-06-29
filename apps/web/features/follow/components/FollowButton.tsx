"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@chill-club/ui";
import { getSignInHref } from "@/lib/auth-redirect";
import { cn } from "@/lib/utils";
import {
  toggleFollowUserAction,
  type ToggleFollowState,
} from "../actions/toggleFollowUser";
import { getFollowCopy } from "../copy";

type FollowButtonProps = {
  activeButtonClassName?: string;
  activeLabel?: string;
  buttonClassName?: string;
  fullWidth?: boolean;
  icon?: LucideIcon;
  isAuthenticated: boolean;
  isFollowing: boolean;
  locale: string;
  onStateChange?: (isFollowing: boolean) => void;
  redirectPath: string;
  targetUserProfileId: string;
};

const initialState: ToggleFollowState = {};

function SubmitButton({
  activeButtonClassName,
  activeLabel,
  buttonClassName,
  fullWidth,
  icon: Icon,
  isDisabled,
  isFollowing,
  locale,
}: {
  activeButtonClassName?: string;
  activeLabel?: string;
  buttonClassName?: string;
  fullWidth: boolean;
  icon?: LucideIcon;
  isDisabled: boolean;
  isFollowing: boolean;
  locale: string;
}) {
  const t = getFollowCopy(locale);
  const label = isFollowing ? activeLabel ?? t.unfollow : t.follow;

  return (
    <Button
      className={cn(
        fullWidth ? "w-full" : "w-auto",
        isFollowing && activeButtonClassName
          ? activeButtonClassName
          : buttonClassName,
      )}
      type="submit"
      variant={isFollowing ? "secondary" : "primary"}
      disabled={isDisabled}
    >
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap leading-none">
        {Icon ? <Icon className="h-3 w-3" /> : null}
        {label}
      </span>
    </Button>
  );
}

export function FollowButton({
  activeButtonClassName,
  activeLabel,
  buttonClassName,
  fullWidth = true,
  icon,
  isAuthenticated,
  isFollowing,
  locale,
  onStateChange,
  redirectPath,
  targetUserProfileId,
}: FollowButtonProps) {
  const [state, formAction] = useActionState(
    toggleFollowUserAction,
    initialState,
  );
  const t = getFollowCopy(locale);
  const Icon = icon;
  const [optimisticIsFollowing, setOptimisticIsFollowing] = useState(isFollowing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const effectiveIsFollowing = state.isFollowing ?? optimisticIsFollowing;

  useEffect(() => {
    setOptimisticIsFollowing(isFollowing);
  }, [isFollowing]);

  useEffect(() => {
    if (state.formError) {
      setOptimisticIsFollowing(isFollowing);
      setIsSubmitting(false);
      return;
    }

    if (typeof state.isFollowing === "boolean") {
      onStateChange?.(state.isFollowing);
      setIsSubmitting(false);
      return;
    }

    if (state.ok) {
      setIsSubmitting(false);
    }
  }, [isFollowing, onStateChange, state.formError, state.isFollowing, state.ok]);

  if (!isAuthenticated) {
    return (
      <Link href={getSignInHref(locale, redirectPath)}>
        <Button
          className={cn(fullWidth ? "w-full" : "w-auto", buttonClassName)}
          variant="secondary"
        >
          <span className="inline-flex items-center gap-1">
            {Icon ? <Icon className="h-3 w-3" /> : null}
            {t.signInToFollow}
          </span>
        </Button>
      </Link>
    );
  }

  return (
    <form
      action={formAction}
      className="inline-grid gap-1 justify-items-center"
      onSubmit={() => {
        setOptimisticIsFollowing((current) => !current);
        setIsSubmitting(true);
      }}
    >
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
        activeButtonClassName={activeButtonClassName}
        activeLabel={activeLabel}
        buttonClassName={buttonClassName}
        fullWidth={fullWidth}
        icon={icon}
        isDisabled={isSubmitting}
        isFollowing={effectiveIsFollowing}
        locale={locale}
      />
    </form>
  );
}
