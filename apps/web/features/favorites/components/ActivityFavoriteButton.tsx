"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { Heart, LoaderCircle } from "lucide-react";
import { Button } from "@chill-club/ui";
import type { AnalyticsSourceSurface } from "@/features/analytics/events";
import { getSignInHref } from "@/lib/auth-redirect";
import {
  toggleActivityFavoriteAction,
  type ToggleActivityFavoriteState,
} from "../actions/toggleActivityFavorite";
import { getFavoriteButtonClassName } from "./favoriteButtonStyles";
import type { FavoriteButtonLabels } from "../types";
import {
  notifyActivityFavoriteUpdated,
  subscribeActivityFavoriteUpdates,
} from "../activityFavoriteUpdates";

type ActivityFavoriteButtonProps = {
  activityId: string;
  favoriteCount: number;
  isAuthenticated: boolean;
  isFavorited: boolean;
  locale: string;
  redirectPath: string;
  sourceSurface?: AnalyticsSourceSurface;
  className?: string;
  labelOverrides?: Partial<FavoriteButtonLabels>;
  compact?: boolean;
  viewerProfileId?: string | null;
};

const initialState: ToggleActivityFavoriteState = {};

function FavoriteTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute right-0 top-full z-30 mt-2 hidden max-w-40 whitespace-nowrap rounded-md bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100 md:block">
      {label}
    </span>
  );
}

function FavoriteCountBadge({
  count,
  compact,
}: {
  count: number;
  compact?: boolean;
}) {
  if (count < 1) {
    return null;
  }

  const displayCount = count > 99 ? "99+" : String(count);

  return (
    <span
      className={`pointer-events-none absolute z-10 rounded-full bg-red-500 py-0.5 text-center font-semibold leading-none text-white shadow-sm ring-1 ring-white/90 ${compact ? "right-0 top-0 min-w-4 px-1 text-[9px]" : "-right-1 -top-1 min-w-5 px-1.5 text-[10px]"}`}
    >
      {displayCount}
    </span>
  );
}

function FavoriteSubmitButton({
  isFavorited,
  pendingAction,
  messages,
  className,
  labelOverrides,
  compact,
}: {
  isFavorited: boolean;
  pendingAction: "favorite" | "unfavorite" | null;
  messages: FavoriteButtonLabels;
  className?: string;
  labelOverrides?: Partial<FavoriteButtonLabels>;
  compact?: boolean;
}) {
  const { pending } = useFormStatus();
  const t = { ...messages, ...labelOverrides };
  const label = pending
    ? pendingAction === "unfavorite"
      ? t.unfavoriting
      : t.favoriting
    : isFavorited
      ? t.unfavorite
      : t.favorite;

  return (
    <span className="group relative inline-flex">
      <Button
        aria-label={label}
        className={getFavoriteButtonClassName(className, {
          isFavorited,
          pending,
          compact,
        })}
        type="submit"
        variant="secondary"
        disabled={pending}
        aria-pressed={isFavorited}
      >
        {pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Heart
            className="h-4 w-4"
            fill={isFavorited ? "currentColor" : "none"}
          />
        )}
      </Button>
      <FavoriteTooltip label={label} />
    </span>
  );
}

export function ActivityFavoriteButton({
  activityId,
  favoriteCount,
  isAuthenticated,
  isFavorited,
  locale,
  redirectPath,
  sourceSurface = "activity_detail",
  className,
  labelOverrides,
  compact = false,
  viewerProfileId,
}: ActivityFavoriteButtonProps) {
  const tMessages = useTranslations("favorites.common");
  const [state, formAction] = useActionState(
    async (previousState: ToggleActivityFavoriteState, formData: FormData) => {
      try {
        return await toggleActivityFavoriteAction(previousState, formData);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        return { formError: tMessages("failed") };
      }
    },
    initialState,
  );
  const [displayIsFavorited, setDisplayIsFavorited] = useState(isFavorited);
  const [displayFavoriteCount, setDisplayFavoriteCount] =
    useState(favoriteCount);
  const pendingRef = useRef(false);
  const confirmed = useRef({ isFavorited, favoriteCount });
  const [pendingAction, setPendingAction] = useState<
    "favorite" | "unfavorite" | null
  >(null);
  const t = {
    favorite: tMessages("favorite"),
    unfavorite: tMessages("unfavorite"),
    favoriting: tMessages("favoriting"),
    unfavoriting: tMessages("unfavoriting"),
    signInToFavorite: tMessages("signInToFavorite"),
    ...labelOverrides,
  };

  useEffect(() => {
    confirmed.current = { isFavorited, favoriteCount };
    if (pendingRef.current) return;
    setDisplayIsFavorited(isFavorited);
    setDisplayFavoriteCount(favoriteCount);
    setPendingAction(null);
  }, [favoriteCount, isFavorited]);

  useEffect(() => {
    return subscribeActivityFavoriteUpdates(
      activityId,
      viewerProfileId,
      (snapshot) => {
        confirmed.current = {
          favoriteCount: snapshot.favoriteCount,
          isFavorited:
            snapshot.viewerProfileId === viewerProfileId
              ? snapshot.isFavorited
              : confirmed.current.isFavorited,
        };
        if (pendingRef.current) return;
        setDisplayFavoriteCount(confirmed.current.favoriteCount);
        setDisplayIsFavorited(confirmed.current.isFavorited);
      },
    );
  }, [activityId, viewerProfileId]);

  useEffect(() => {
    if (state.formError && pendingRef.current) {
      pendingRef.current = false;
      setDisplayIsFavorited(confirmed.current.isFavorited);
      setDisplayFavoriteCount(confirmed.current.favoriteCount);
      setPendingAction(null);
      if (compact) window.alert(state.formError);
    }
  }, [compact, state]);

  useEffect(() => {
    if (!state.ok || !state.updatedAt) {
      return;
    }

    setDisplayIsFavorited(Boolean(state.isFavorited));
    setDisplayFavoriteCount((current) =>
      typeof state.favoriteCount === "number" ? state.favoriteCount : current,
    );
    pendingRef.current = false;
    setPendingAction(null);
    if (typeof state.favoriteCount === "number" && state.viewerProfileId) {
      confirmed.current = {
        isFavorited: Boolean(state.isFavorited),
        favoriteCount: state.favoriteCount,
      };
      notifyActivityFavoriteUpdated({
        activityId,
        viewerProfileId: state.viewerProfileId,
        favoriteCount: state.favoriteCount,
        isFavorited: Boolean(state.isFavorited),
        updatedAt: state.updatedAt,
      });
    }
  }, [
    state.favoriteCount,
    state.isFavorited,
    state.ok,
    state.updatedAt,
    state.viewerProfileId,
    activityId,
  ]);

  if (!isAuthenticated) {
    return (
      <span
        className="group relative inline-flex"
        data-activity-favorite-id={activityId}
        data-favorite-count={displayFavoriteCount}
      >
        <Link
          href={getSignInHref(locale, redirectPath)}
          aria-label={t.signInToFavorite}
          title={t.signInToFavorite}
          className={`friemi-pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral ${getFavoriteButtonClassName(className, { compact })}`}
        >
          <Heart className="h-4 w-4" aria-hidden="true" />
        </Link>
        <FavoriteCountBadge count={displayFavoriteCount} compact={compact} />
        <FavoriteTooltip label={t.signInToFavorite} />
      </span>
    );
  }

  return (
    <form
      action={formAction}
      className="relative inline-flex"
      data-activity-favorite-id={activityId}
      data-favorite-count={displayFavoriteCount}
      onSubmit={(event) => {
        if (pendingRef.current) {
          event.preventDefault();
          return;
        }
        const nextIsFavorited = !displayIsFavorited;
        pendingRef.current = true;

        setPendingAction(displayIsFavorited ? "unfavorite" : "favorite");
        setDisplayIsFavorited((current) => !current);
        setDisplayFavoriteCount((current) =>
          Math.max(0, current + (nextIsFavorited ? 1 : -1)),
        );
      }}
    >
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />
      <input name="redirectPath" type="hidden" value={redirectPath} />
      <input name="sourceSurface" type="hidden" value={sourceSurface} />
      {state.formError && !compact ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.formError}
        </p>
      ) : null}
      <FavoriteSubmitButton
        className={className}
        isFavorited={displayIsFavorited}
        messages={t}
        pendingAction={pendingAction}
        labelOverrides={labelOverrides}
        compact={compact}
      />
      <FavoriteCountBadge count={displayFavoriteCount} compact={compact} />
    </form>
  );
}
