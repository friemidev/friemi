"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Heart } from "lucide-react";
import { Button } from "@chill-club/ui";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  toggleActivityFavoriteAction,
  type ToggleActivityFavoriteState,
} from "../actions/toggleActivityFavorite";
import { getActivityFavoriteCopy } from "../copy";

type ActivityFavoriteButtonProps = {
  activityId: string;
  isAuthenticated: boolean;
  isFavorited: boolean;
  locale: string;
  redirectPath: string;
  className?: string;
};

const initialState: ToggleActivityFavoriteState = {};

function FavoriteTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute right-0 top-full z-30 mt-2 max-w-40 whitespace-nowrap rounded-md bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100">
      {label}
    </span>
  );
}

function FavoriteSubmitButton({
  isFavorited,
  locale,
  className,
}: {
  isFavorited: boolean;
  locale: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const t = getActivityFavoriteCopy(locale);
  const label = pending
    ? isFavorited
      ? t.unfavoriting
      : t.favoriting
    : isFavorited
      ? t.unfavorite
      : t.favorite;

  return (
    <span className="group relative inline-flex">
      <Button
        aria-label={label}
        className={cn(
          "h-10 w-10 rounded-full bg-white/95 p-0 text-zinc-950 shadow-sm ring-1 ring-black/10 hover:bg-white",
          isFavorited ? "text-red-500" : null,
          className,
        )}
        type="submit"
        variant="secondary"
        disabled={pending}
      >
        <Heart
          className="h-4 w-4"
          fill={isFavorited ? "currentColor" : "none"}
        />
      </Button>
      <FavoriteTooltip label={label} />
    </span>
  );
}

export function ActivityFavoriteButton({
  activityId,
  isAuthenticated,
  isFavorited,
  locale,
  redirectPath,
  className,
}: ActivityFavoriteButtonProps) {
  const [state, formAction] = useActionState(
    toggleActivityFavoriteAction,
    initialState,
  );
  const t = getActivityFavoriteCopy(locale);

  if (!isAuthenticated) {
    return (
      <span className="group relative inline-flex">
        <Link href={withLocale(locale, "/sign-in")}>
          <Button
            aria-label={t.signInToFavorite}
            className={cn(
              "h-10 w-10 rounded-full bg-white/95 p-0 text-zinc-950 shadow-sm ring-1 ring-black/10 hover:bg-white",
              className,
            )}
            type="button"
            variant="secondary"
          >
            <Heart className="h-4 w-4" />
          </Button>
        </Link>
        <FavoriteTooltip label={t.signInToFavorite} />
      </span>
    );
  }

  return (
    <form action={formAction} className="grid justify-start gap-2">
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />
      <input name="redirectPath" type="hidden" value={redirectPath} />
      {state.formError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.formError}
        </p>
      ) : null}
      <FavoriteSubmitButton
        className={className}
        isFavorited={isFavorited}
        locale={locale}
      />
    </form>
  );
}
