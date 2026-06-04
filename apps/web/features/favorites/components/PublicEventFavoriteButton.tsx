"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { Heart } from "lucide-react";
import { Button } from "@chill-club/ui";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  togglePublicEventFavoriteAction,
  type TogglePublicEventFavoriteState,
} from "../actions/togglePublicEventFavorite";
import type { FavoriteButtonLabels } from "../types";

type PublicEventFavoriteButtonProps = {
  publicEventId: string;
  isAuthenticated: boolean;
  isFavorited: boolean;
  locale: string;
  redirectPath: string;
  className?: string;
  labelOverrides?: Partial<FavoriteButtonLabels>;
};

const initialState: TogglePublicEventFavoriteState = {};

function FavoriteTooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute right-0 top-full z-30 mt-2 max-w-40 whitespace-nowrap rounded-md bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100">
      {label}
    </span>
  );
}

function FavoriteSubmitButton({
  isFavorited,
  pendingAction,
  messages,
  className,
  labelOverrides,
}: {
  isFavorited: boolean;
  pendingAction: "favorite" | "unfavorite" | null;
  messages: FavoriteButtonLabels;
  className?: string;
  labelOverrides?: Partial<FavoriteButtonLabels>;
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

export function PublicEventFavoriteButton({
  publicEventId,
  isAuthenticated,
  isFavorited,
  locale,
  redirectPath,
  className,
  labelOverrides,
}: PublicEventFavoriteButtonProps) {
  const tMessages = useTranslations("favorites.common");
  const router = useRouter();
  const [state, formAction] = useActionState(
    togglePublicEventFavoriteAction,
    initialState,
  );
  const [, startRefreshTransition] = useTransition();
  const [displayIsFavorited, setDisplayIsFavorited] = useState(isFavorited);
  const [hasOptimisticUpdate, setHasOptimisticUpdate] = useState(false);
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
    setDisplayIsFavorited(isFavorited);
    setHasOptimisticUpdate(false);
    setPendingAction(null);
  }, [isFavorited]);

  useEffect(() => {
    if (state.formError && hasOptimisticUpdate) {
      setDisplayIsFavorited(isFavorited);
      setHasOptimisticUpdate(false);
      setPendingAction(null);
    }
  }, [hasOptimisticUpdate, isFavorited, state.formError]);

  useEffect(() => {
    if (!state.ok || !state.updatedAt) {
      return;
    }

    setDisplayIsFavorited(Boolean(state.isFavorited));
    setHasOptimisticUpdate(false);
    setPendingAction(null);
    startRefreshTransition(() => {
      router.refresh();
    });
  }, [
    router,
    startRefreshTransition,
    state.isFavorited,
    state.ok,
    state.updatedAt,
  ]);

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
    <form
      action={formAction}
      className="grid justify-start gap-2"
      onSubmit={() => {
        setPendingAction(displayIsFavorited ? "unfavorite" : "favorite");
        setDisplayIsFavorited((current) => !current);
        setHasOptimisticUpdate(true);
      }}
    >
      <input name="publicEventId" type="hidden" value={publicEventId} />
      <input name="locale" type="hidden" value={locale} />
      <input name="redirectPath" type="hidden" value={redirectPath} />
      {state.formError ? (
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
      />
    </form>
  );
}
