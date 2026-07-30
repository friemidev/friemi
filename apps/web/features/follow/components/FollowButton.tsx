"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  inactiveLabel?: string;
  isAuthenticated: boolean;
  isFollowing: boolean;
  locale: string;
  onStateChange?: (isFollowing: boolean) => void;
  redirectPath: string;
  targetUserProfileId: string;
  unfollowConfirm?: {
    cancelLabel: string;
    confirmLabel: string;
    description?: string;
    title: string;
  };
};

const initialState: ToggleFollowState = {};

function SubmitButton({
  activeButtonClassName,
  activeLabel,
  buttonClassName,
  fullWidth,
  icon: Icon,
  inactiveLabel,
  isDisabled,
  isFollowing,
  locale,
}: {
  activeButtonClassName?: string;
  activeLabel?: string;
  buttonClassName?: string;
  fullWidth: boolean;
  icon?: LucideIcon;
  inactiveLabel?: string;
  isDisabled: boolean;
  isFollowing: boolean;
  locale: string;
}) {
  const t = getFollowCopy(locale);
  const label = isFollowing
    ? (activeLabel ?? t.unfollow)
    : (inactiveLabel ?? t.follow);

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
  inactiveLabel,
  isAuthenticated,
  isFollowing,
  locale,
  onStateChange,
  redirectPath,
  targetUserProfileId,
  unfollowConfirm,
}: FollowButtonProps) {
  const [state, formAction] = useActionState(
    toggleFollowUserAction,
    initialState,
  );
  const t = getFollowCopy(locale);
  const Icon = icon;
  const formRef = useRef<HTMLFormElement | null>(null);
  const skipConfirmRef = useRef(false);
  const [optimisticIsFollowing, setOptimisticIsFollowing] =
    useState(isFollowing);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const effectiveIsFollowing = state.isFollowing ?? optimisticIsFollowing;

  useEffect(() => {
    setOptimisticIsFollowing(isFollowing);
  }, [isFollowing]);

  useEffect(() => {
    setMounted(true);
  }, []);

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
  }, [
    isFollowing,
    onStateChange,
    state.formError,
    state.isFollowing,
    state.ok,
  ]);

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

  const confirmDialog =
    mounted && confirmOpen && unfollowConfirm
      ? createPortal(
          <div
            className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/35 px-5"
            role="presentation"
          >
            <div
              aria-modal="true"
              className="w-full max-w-[19rem] rounded-[1.4rem] border border-[#E8B8B1] bg-white p-4 shadow-[0_18px_42px_rgba(17,18,16,0.2)]"
              role="dialog"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF0EE] text-lg font-black text-[#D94A38]">
                !
              </div>
              <h2 className="text-base font-black text-[#111210]">
                {unfollowConfirm.title}
              </h2>
              {unfollowConfirm.description ? (
                <p className="mt-2 text-sm font-semibold leading-5 text-[#6C746A]">
                  {unfollowConfirm.description}
                </p>
              ) : null}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  className="h-10 rounded-full border border-[#D6D5B2] bg-white text-sm font-black text-[#156240] active:scale-[0.98]"
                  onClick={() => setConfirmOpen(false)}
                  type="button"
                >
                  {unfollowConfirm.cancelLabel}
                </button>
                <button
                  className="h-10 rounded-full bg-[#E86D60] text-sm font-black text-white shadow-[0_10px_22px_rgba(232,109,96,0.22)] active:scale-[0.98]"
                  onClick={() => {
                    skipConfirmRef.current = true;
                    setConfirmOpen(false);
                    window.requestAnimationFrame(() => {
                      formRef.current?.requestSubmit();
                    });
                  }}
                  type="button"
                >
                  {unfollowConfirm.confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <form
        action={formAction}
        className="inline-grid gap-1 justify-items-center"
        ref={formRef}
        onSubmit={(event) => {
          if (
            effectiveIsFollowing &&
            unfollowConfirm &&
            !skipConfirmRef.current
          ) {
            event.preventDefault();
            setConfirmOpen(true);
            return;
          }

          skipConfirmRef.current = false;
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
          inactiveLabel={inactiveLabel}
          isDisabled={isSubmitting}
          isFollowing={effectiveIsFollowing}
          locale={locale}
        />
      </form>
      {confirmDialog}
    </>
  );
}
