import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ensureCurrentUserProfile,
  getOptionalCurrentUserProfileSnapshot,
} from "@/lib/auth";
import { getActivityCopyValuesById } from "@/features/activities/queries/getActivityById";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityCreateCancelControl } from "@/features/activities/components/ActivityCreateCancelControl";
import { NewActivityForm } from "@/features/activities/components/NewActivityForm";
import { MobileNewActivityEntryView } from "@/features/activities/components/MobileNewActivityEntryView";
import { getActivityList } from "@/features/activities/queries/getActivities";
import type { ActivityFormValues } from "@/features/activities/actions/activityActionUtils";
import { normalizeActivityFilterValues } from "@/features/activities/utils/activityFilters";
import { getSignInHref } from "@/lib/auth-redirect";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { buildNoIndexMetadata } from "@/lib/seo";
import {
  canCreateActivityWithTrustScore,
  getActivityCreationTrustRestrictionMessage,
} from "@/features/trust/trustScore";
import { getTrustScore } from "@/features/trust/trustScoreEvents";
import { getLinkablePlanets } from "@/features/activities/queries/getLinkablePlanets";

type NewActivityPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    copyActivityId?: string | string[];
    fromNow?: string | string[];
    mode?: string | string[];
    return?: string | string[];
  }>;
};

export async function generateMetadata({
  params,
}: NewActivityPageProps): Promise<Metadata> {
  const { locale } = await params;

  return buildNoIndexMetadata({
    canonicalPath: withLocale(locale, "/activities/new"),
  });
}

function getMobileCreateHeaderCopy(locale: string) {
  if (locale === "fr") {
    return {
      cancel: "Annuler",
      publish: "Publier",
      title: "Créer une sortie",
    };
  }

  if (locale === "en") {
    return {
      cancel: "Cancel",
      publish: "Publish",
      title: "Create plan",
    };
  }

  return {
    cancel: "取消",
    publish: "发布",
    title: "创建聚吧",
  };
}

export default async function NewActivityPage({
  params,
  searchParams,
}: NewActivityPageProps) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const copyActivityId = Array.isArray(resolvedSearchParams.copyActivityId)
    ? resolvedSearchParams.copyActivityId[0]
    : resolvedSearchParams.copyActivityId;
  const fromNow = Array.isArray(resolvedSearchParams.fromNow)
    ? resolvedSearchParams.fromNow[0]
    : resolvedSearchParams.fromNow;
  const mode = Array.isArray(resolvedSearchParams.mode)
    ? resolvedSearchParams.mode[0]
    : resolvedSearchParams.mode;
  const returnModeParam = Array.isArray(resolvedSearchParams.return)
    ? resolvedSearchParams.return[0]
    : resolvedSearchParams.return;
  const cancelReturnMode = returnModeParam === "history" ? "history" : "path";
  const showForm =
    mode === "form" || Boolean(copyActivityId) || Boolean(fromNow);
  const profile = await (copyActivityId
    ? ensureCurrentUserProfile(
        locale,
        `/activities/new?copyActivityId=${encodeURIComponent(copyActivityId)}${
          cancelReturnMode === "history" ? "&return=history" : ""
        }`,
      )
    : fromNow
      ? ensureCurrentUserProfile(
          locale,
          `/activities/new?mode=form&fromNow=${encodeURIComponent(fromNow)}`,
        )
      : getOptionalCurrentUserProfileSnapshot());
  const nowInvite =
    fromNow && profile
      ? await prisma.nowInvite.findFirst({
          where: {
            id: fromNow,
            organizerId: profile.id,
            linkedActivityId: null,
          },
          select: {
            id: true,
            title: true,
            note: true,
            category: true,
            city: true,
            area: true,
          },
        })
      : null;
  const nowPrefill: ActivityFormValues | undefined = nowInvite
    ? {
        title: nowInvite.title,
        description: nowInvite.note || nowInvite.title,
        itinerary: "",
        coverImageUrl: "",
        type: "LOCAL",
        category: ["COFFEE", "FOOD", "DRINK", "TEA"].includes(
          nowInvite.category,
        )
          ? "FOOD"
          : ["PARK", "WALK", "SHOP", "ADVENTURE"].includes(nowInvite.category)
            ? "WANDER"
            : ["MOVIE", "SHOW"].includes(nowInvite.category)
              ? "AUDIO_VISUAL"
              : nowInvite.category === "GAME"
                ? "BOARD_GAME"
                : nowInvite.category === "SPORT"
                  ? "SPORTS"
                  : "OTHER",
        visibility: "PUBLIC",
        otherCategoryText: "",
        city: nowInvite.city,
        destination: "",
        address: nowInvite.area,
        hideAddressFromNonParticipants: false,
        latitude: "",
        longitude: "",
        startAt: "",
        endAt: "",
        capacity: "",
        capacityLimitEnabled: false,
        minParticipants: "",
        requiresApproval: false,
        priceType: "FREE",
        priceText: "",
        ticketUrl: "",
        ticketLabel: "",
      }
    : undefined;
  const initialValues =
    copyActivityId && profile
      ? await getActivityCopyValuesById(copyActivityId, profile.id)
      : nowPrefill;
  const trustScore = profile ? await getTrustScore(prisma, profile.id) : null;
  const creationRestricted =
    trustScore !== null && !canCreateActivityWithTrustScore(trustScore);
  const creationRestrictionMessage = creationRestricted
    ? getActivityCreationTrustRestrictionMessage(locale)
    : null;
  const linkablePlanets =
    profile && showForm ? await getLinkablePlanets(profile.id) : [];
  const activityPreviewList = showForm
    ? null
    : await getActivityList(
        normalizeActivityFilterValues({
          page: "1",
          relation: "ALL",
          sort: "soonest",
          timeStates: "UPCOMING,ONGOING",
          view: "card",
        }),
        {
          pageSize: 6,
          publicInfoOnly: true,
          viewerProfileId: profile?.id ?? null,
        },
      ).catch((error: unknown) => {
        console.error("Failed to load mobile new activity preview", error);
        return null;
      });

  if (copyActivityId && !initialValues) {
    notFound();
  }

  const formId = "new-activity-form";
  const headerCopy = getMobileCreateHeaderCopy(locale);
  const formContent = (
    <PageContainer
      className="max-w-3xl space-y-5 max-md:px-6"
      mobileSafeBottom
      mobileSafeTop
    >
      <div className="grid grid-cols-[minmax(3rem,max-content)_minmax(0,1fr)_minmax(3rem,max-content)] items-center gap-2 py-1">
        <ActivityCreateCancelControl
          className="max-w-[5.5rem] justify-self-start truncate whitespace-nowrap text-sm font-semibold text-zinc-600 transition hover:text-[#156240]"
          fallbackHref={withLocale(locale, "/activities/new")}
          label={headerCopy.cancel}
          returnMode={cancelReturnMode}
        />
        <h1 className="truncate text-center text-lg font-semibold text-ink">
          {headerCopy.title}
        </h1>
        <button
          className="inline-flex h-9 max-w-[5.75rem] items-center justify-center justify-self-end overflow-hidden whitespace-nowrap rounded-full bg-[#006F52] px-3 text-sm font-semibold leading-none text-white shadow-[0_8px_18px_rgba(0,111,82,0.18)] transition hover:bg-[#075f49] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600 disabled:shadow-none"
          disabled={creationRestricted}
          form={formId}
          type="submit"
        >
          <span className="truncate">{headerCopy.publish}</span>
        </button>
      </div>

      {creationRestrictionMessage ? (
        <div
          className="rounded-md border border-[#E8D39F] bg-[#FFF8DF] px-4 py-3 text-sm font-semibold leading-6 text-[#785C16]"
          role="alert"
        >
          {creationRestrictionMessage}
        </div>
      ) : null}

      <NewActivityForm
        nowInviteId={nowInvite?.id}
        formId={formId}
        isAuthenticated={Boolean(profile)}
        locale={locale}
        initialValues={initialValues ?? undefined}
        linkablePlanets={linkablePlanets}
        submissionDisabled={creationRestricted}
        signInHref={getSignInHref(
          locale,
          copyActivityId
            ? `/activities/new?copyActivityId=${encodeURIComponent(copyActivityId)}${
                cancelReturnMode === "history" ? "&return=history" : ""
              }`
            : showForm
              ? "/activities/new?mode=form"
              : "/activities/new",
        )}
      />
    </PageContainer>
  );

  if (showForm) {
    return formContent;
  }

  return (
    <>
      <MobileNewActivityEntryView
        activities={activityPreviewList?.activities ?? []}
        creationRestricted={creationRestricted}
        creationRestrictionMessage={creationRestrictionMessage}
        locale={locale}
      />
      <div className="friemi-native-app-desktop-only hidden md:block">
        {formContent}
      </div>
    </>
  );
}
