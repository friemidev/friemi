"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button, Input, Textarea } from "@chill-club/ui";
import { trackClientAnalyticsEvent } from "@/features/analytics/client";
import {
  joinActivityAsGuestAction,
  type GuestJoinActivityState,
} from "@/features/guest-participants/actions/joinAsGuest";
import { getSignInHref } from "@/lib/auth-redirect";
import { getCopy } from "@/lib/copy";
import {
  joinActivityAction,
  type JoinActivityState,
} from "../actions/joinActivity";
import { getActivityDetailPath } from "../utils/activityRoutes";
import { CancelParticipationForm } from "./CancelParticipationForm";

type ViewerParticipationStatus =
  | "JOINED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | null;

type JoinActivityFormProps = {
  activityId: string;
  activityTitle: string;
  accessToken?: string | null;
  compactUnauthenticated?: boolean;
  formInstanceId?: string;
  locale: string;
  requiresApproval: boolean;
  isFull: boolean;
  isClosed: boolean;
  isOrganizer: boolean;
  isAuthenticated: boolean;
  viewerParticipationStatus: ViewerParticipationStatus;
};

const initialState: JoinActivityState = {};
const initialGuestState: GuestJoinActivityState = {};

function getGuestJoinCopy(locale: string) {
  if (locale === "fr") {
    return {
      title: "Inscription invité",
      description:
        "Laissez seulement un nom pour vous inscrire. Téléphone, e-mail et WeChat restent optionnels; e-mail ou WeChat aideront à retrouver cette inscription plus tard.",
      displayNameLabel: "Nom ou pseudo",
      displayNamePlaceholder: "Votre nom affiché",
      phoneLabel: "Téléphone",
      phonePlaceholder: "Téléphone, optionnel",
      emailLabel: "E-mail",
      emailPlaceholder: "E-mail, optionnel",
      wechatLabel: "WeChat",
      wechatPlaceholder: "Identifiant WeChat, optionnel",
      contactHint:
        "Les contacts sont optionnels. E-mail ou WeChat facilitent le rattachement a votre compte plus tard.",
      messageLabel: "Message",
      submitApproval: "Envoyer une demande",
      submit: "S'inscrire",
      submitting: "Envoi...",
      loginJoinApproval: "Se connecter pour demander",
      loginJoin: "S'inscrire avec un compte",
      guestJoinApproval: "Demande invité",
      guestJoin: "Continuer en invité",
      appLoginHint:
        "Dans l'app Friemi, l'inscription passe par un compte pour garder vos sorties, notifications et messages au même endroit.",
      signIn: "Se connecter",
      successTitle: "Inscription reçue",
      successDescription:
        "Votre inscription est enregistrée. En créant un compte avec le même e-mail ou WeChat, elle sera rattachée automatiquement.",
      successDescriptionApproval:
        "Votre demande est envoyée. Elle sera visible par l'organisateur et comptera une fois validée.",
    };
  }

  if (locale === "en") {
    return {
      title: "Guest signup",
      description:
        "Leave just a name to join. Phone, email, and WeChat are optional; email or WeChat can link this signup to your account later.",
      displayNameLabel: "Name or nickname",
      displayNamePlaceholder: "Name shown to the organizer",
      phoneLabel: "Phone",
      phonePlaceholder: "Phone, optional",
      emailLabel: "Email",
      emailPlaceholder: "Email, optional",
      wechatLabel: "WeChat",
      wechatPlaceholder: "WeChat ID, optional",
      contactHint:
        "Contact fields are optional. Email or WeChat makes it easier to recover this signup later.",
      messageLabel: "Message",
      submitApproval: "Send request",
      submit: "Join as guest",
      submitting: "Submitting...",
      loginJoinApproval: "Sign in to request",
      loginJoin: "Sign in to join",
      guestJoinApproval: "Guest request",
      guestJoin: "Guest signup",
      appLoginHint:
        "In the Friemi app, joining uses your account so your plans, messages, and notifications stay together.",
      signIn: "Sign in instead",
      successTitle: "Signup received",
      successDescription:
        "Your signup is saved. If you create an account with the same email or WeChat, it will link automatically.",
      successDescriptionApproval:
        "Your request is submitted. The organizer can review it, and it will count once approved.",
    };
  }

  return {
    title: "游客报名",
    description:
      "只填写名字/昵称也可以报名。电话、邮箱、微信都可选；填写邮箱或微信后，之后注册/绑定账号时更容易找回这条报名记录。",
    displayNameLabel: "名字/昵称",
    displayNamePlaceholder: "活动中展示的名字",
    phoneLabel: "电话",
    phonePlaceholder: "电话，可选",
    emailLabel: "邮箱",
    emailPlaceholder: "邮箱，可选",
    wechatLabel: "微信",
    wechatPlaceholder: "微信号，可选",
    contactHint: "联系方式可选；填写邮箱或微信后，更方便之后找回报名。",
    messageLabel: "报名留言",
    submitApproval: "提交游客申请",
    submit: "游客报名",
    submitting: "提交中...",
    loginJoinApproval: "登录申请加入",
    loginJoin: "登录报名",
    guestJoinApproval: "游客申请加入",
    guestJoin: "游客报名",
    appLoginHint:
      "Friemi App 内报名需要登录账号，方便保留组局、消息和通知记录。",
    signIn: "已有账号，去登录",
    successTitle: "报名已提交",
    successDescription:
      "报名记录已保存。以后使用相同邮箱或微信绑定账号，会自动关联到你的账号。",
    successDescriptionApproval:
      "申请已提交给发起人，通过后会计入报名人数。以后使用相同邮箱或微信绑定账号，也会自动关联。",
  };
}

function useIsAndroidApp() {
  const [isAndroidApp, setIsAndroidApp] = useState(false);

  useEffect(() => {
    setIsAndroidApp(/FriemiAndroid\//i.test(window.navigator.userAgent));
  }, []);

  return isAndroidApp;
}

function SubmitButton({
  locale,
  requiresApproval,
}: {
  locale: string;
  requiresApproval: boolean;
}) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).join;

  return (
    <Button
      type="submit"
      className="min-h-11 h-auto w-full gap-2 rounded-full border-0 bg-coral px-4 py-2 text-center leading-tight text-white shadow-[0_14px_28px_rgba(240,145,130,0.24)] hover:bg-danger"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      <span className="min-w-0 text-center leading-tight">
        {pending
          ? t.submitting
          : requiresApproval
            ? t.submitApproval
            : t.submit}
      </span>
    </Button>
  );
}

function GuestSubmitButton({
  locale,
  requiresApproval,
}: {
  locale: string;
  requiresApproval: boolean;
}) {
  const { pending } = useFormStatus();
  const t = getGuestJoinCopy(locale);

  return (
    <Button
      type="submit"
      className="min-h-11 h-auto w-full gap-2 rounded-full border-0 bg-coral px-4 py-2 text-center leading-tight text-white shadow-[0_14px_28px_rgba(240,145,130,0.24)] hover:bg-danger"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      <span className="min-w-0 text-center leading-tight">
        {pending
          ? t.submitting
          : requiresApproval
            ? t.submitApproval
            : t.submit}
      </span>
    </Button>
  );
}

function PendingSubmitNotice({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).join;

  if (!pending) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-xs font-medium text-moss"
      aria-live="polite"
    >
      <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      <span>{t.submitting}</span>
    </div>
  );
}

function DisabledAction({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 leading-6 text-zinc-500">{description}</p>
    </div>
  );
}

function GuestJoinForm({
  activityId,
  accessToken,
  formAction,
  locale,
  requiresApproval,
  state,
}: {
  activityId: string;
  accessToken?: string | null;
  formAction: (payload: FormData) => void;
  locale: string;
  requiresApproval: boolean;
  state: GuestJoinActivityState;
}) {
  const t = getGuestJoinCopy(locale);

  return (
    <form
      action={formAction}
      className="grid gap-3"
      noValidate
      onSubmit={() => {
        trackClientAnalyticsEvent({
          name: "join_started",
          entityId: activityId,
          entityType: "team",
          sourceSurface: "activity_detail",
          properties: {
            requires_approval: requiresApproval,
            signup_mode: "guest",
          },
        });
      }}
    >
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />
      {accessToken ? (
        <input name="accessToken" type="hidden" value={accessToken} />
      ) : null}

      <div className="rounded-md border border-sand bg-white/70 px-3 py-2.5 text-sm">
        <p className="font-semibold text-ink">{t.title}</p>
        <p className="mt-1 leading-5 text-zinc-500">{t.description}</p>
      </div>

      {state.formError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      ) : null}

      <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
        {t.displayNameLabel}
        <Input
          name="displayName"
          defaultValue={state.values?.displayName}
          maxLength={24}
          placeholder={t.displayNamePlaceholder}
          className="h-10 bg-white"
        />
        {state.fieldErrors?.displayName?.[0] ? (
          <span className="text-xs font-medium text-red-600">
            {state.fieldErrors.displayName[0]}
          </span>
        ) : null}
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
          {t.phoneLabel}
          <Input
            name="phone"
            defaultValue={state.values?.phone}
            inputMode="tel"
            maxLength={40}
            placeholder={t.phonePlaceholder}
            className="h-10 bg-white"
          />
          {state.fieldErrors?.phone?.[0] ? (
            <span className="text-xs font-medium text-red-600">
              {state.fieldErrors.phone[0]}
            </span>
          ) : null}
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
          {t.emailLabel}
          <Input
            name="email"
            defaultValue={state.values?.email}
            inputMode="email"
            maxLength={120}
            placeholder={t.emailPlaceholder}
            className="h-10 bg-white"
            type="email"
          />
          {state.fieldErrors?.email?.[0] ? (
            <span className="text-xs font-medium text-red-600">
              {state.fieldErrors.email[0]}
            </span>
          ) : null}
        </label>
      </div>

      <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
        {t.wechatLabel}
        <Input
          name="wechatId"
          defaultValue={state.values?.wechatId}
          maxLength={80}
          placeholder={t.wechatPlaceholder}
          className="h-10 bg-white"
        />
        {state.fieldErrors?.wechatId?.[0] ? (
          <span className="text-xs font-medium text-red-600">
            {state.fieldErrors.wechatId[0]}
          </span>
        ) : null}
      </label>

      <div className="-mt-1 grid gap-1">
        <p className="text-xs leading-5 text-zinc-500">{t.contactHint}</p>
        {state.fieldErrors?.contact?.[0] ? (
          <span className="text-xs font-medium text-red-600">
            {state.fieldErrors.contact[0]}
          </span>
        ) : null}
      </div>

      <label className="grid gap-2 text-sm font-medium text-zinc-700">
        {t.messageLabel}
        <Textarea
          className="min-h-20"
          name="message"
          defaultValue={state.values?.message}
          maxLength={300}
          placeholder={getCopy(locale).join.messagePlaceholder}
        />
        {state.fieldErrors?.message?.[0] ? (
          <span className="text-xs font-medium text-red-600">
            {state.fieldErrors.message[0]}
          </span>
        ) : null}
      </label>

      <PendingSubmitNotice locale={locale} />
      <GuestSubmitButton locale={locale} requiresApproval={requiresApproval} />
      <Link
        className="text-center text-xs font-medium text-zinc-500 underline-offset-4 hover:text-ink hover:underline"
        href={getSignInHref(locale, getActivityDetailPath(activityId))}
      >
        {t.signIn}
      </Link>
    </form>
  );
}

function getParticipationCopy(
  status: Exclude<ViewerParticipationStatus, null>,
  locale: string,
) {
  const t = getCopy(locale).join;

  if (status === "PENDING") {
    return {
      title: t.pendingTitle,
      description: t.pendingDescription,
    };
  }

  return {
    title: t.joinedTitle,
    description: t.joinedDescription,
  };
}

function ParticipationStatusCard({
  description,
  isPending,
  title,
}: {
  description: string;
  isPending: boolean;
  title: string;
}) {
  return (
    <div
      className={
        isPending
          ? "rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm"
          : "rounded-xl border border-[#D6D5B2] bg-white/90 px-3 py-3 text-sm"
      }
    >
      <p
        className={
          isPending ? "font-medium text-amber-900" : "font-medium text-ink"
        }
      >
        {title}
      </p>
      <p
        className={
          isPending
            ? "mt-1 leading-6 text-amber-800"
            : "mt-1 leading-6 text-zinc-500"
        }
      >
        {description}
      </p>
    </div>
  );
}

function RejoinNotice({
  locale,
  status,
}: {
  locale: string;
  status: "REJECTED";
}) {
  const t = getCopy(locale).join;
  const copy = {
    title: t.rejectedTitle,
    description: t.rejectedDescription,
  };

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
      <p className="font-medium text-amber-900">{copy.title}</p>
      <p className="mt-1 leading-6 text-amber-800">{copy.description}</p>
    </div>
  );
}

function GuestJoinEntry({
  accessToken,
  activityId,
  formInstanceId,
  formAction,
  locale,
  requiresApproval,
  state,
}: {
  activityId: string;
  accessToken?: string | null;
  formInstanceId?: string;
  formAction: (payload: FormData) => void;
  locale: string;
  requiresApproval: boolean;
  state: GuestJoinActivityState;
}) {
  const t = getGuestJoinCopy(locale);
  const loginJoinLabel = requiresApproval ? t.loginJoinApproval : t.loginJoin;
  const guestJoinLabel = requiresApproval ? t.guestJoinApproval : t.guestJoin;
  const [showGuestForm, setShowGuestForm] = useState(false);
  const isAndroidApp = useIsAndroidApp();
  const guestFormId = `guest-join-form-${activityId}${formInstanceId ? `-${formInstanceId}` : ""}`;

  if (isAndroidApp) {
    return (
      <div className="grid gap-2.5">
        <Link
          className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-full border border-transparent bg-coral px-3 py-2 text-center text-sm font-semibold leading-tight text-white shadow-[0_12px_24px_rgba(240,145,130,0.22)] transition hover:bg-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/35"
          href={getSignInHref(locale, getActivityDetailPath(activityId))}
        >
          <span className="min-w-0 leading-tight">{loginJoinLabel}</span>
        </Link>
        <p className="rounded-2xl border border-[#D6D5B2]/75 bg-[#FEFFF9] px-3 py-2 text-xs font-medium leading-5 text-[#156240]/75">
          {t.appLoginHint}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-full border border-transparent bg-coral px-3 py-2 text-center text-sm font-semibold leading-tight text-white shadow-[0_12px_24px_rgba(240,145,130,0.22)] transition hover:bg-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/35"
          href={getSignInHref(locale, getActivityDetailPath(activityId))}
        >
          <span className="min-w-0 leading-tight">{loginJoinLabel}</span>
        </Link>
        <button
          type="button"
          aria-controls={guestFormId}
          aria-expanded={showGuestForm}
          className={
            showGuestForm
              ? "inline-flex min-h-11 min-w-0 items-center justify-center rounded-full border border-[#8AB68E] bg-white px-3 py-2 text-center text-sm font-semibold leading-tight text-[#156240] transition hover:bg-[#FEFFF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/25"
              : "inline-flex min-h-11 min-w-0 items-center justify-center rounded-full border border-sand bg-white px-3 py-2 text-center text-sm font-semibold leading-tight text-zinc-600 transition hover:border-[#8AB68E] hover:bg-[#FEFFF9] hover:text-[#156240] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/20"
          }
          onClick={() => setShowGuestForm(true)}
        >
          <span className="min-w-0 leading-tight">{guestJoinLabel}</span>
        </button>
      </div>

      {showGuestForm ? (
        <div id={guestFormId}>
          <GuestJoinForm
            accessToken={accessToken}
            activityId={activityId}
            formAction={formAction}
            locale={locale}
            requiresApproval={requiresApproval}
            state={state}
          />
        </div>
      ) : null}
    </div>
  );
}

export function JoinActivityForm({
  activityId,
  activityTitle,
  accessToken = null,
  formInstanceId,
  locale,
  requiresApproval,
  isFull,
  isClosed,
  isOrganizer,
  isAuthenticated,
  viewerParticipationStatus,
}: JoinActivityFormProps) {
  const [state, formAction] = useActionState(joinActivityAction, initialState);
  const [guestState, guestFormAction] = useActionState(
    joinActivityAsGuestAction,
    initialGuestState,
  );
  const [effectiveParticipationStatus, setEffectiveParticipationStatus] =
    useState<ViewerParticipationStatus>(viewerParticipationStatus);
  const [joinedAsGuest, setJoinedAsGuest] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const t = getCopy(locale).join;

  useEffect(() => {
    setEffectiveParticipationStatus(viewerParticipationStatus);
    setJoinedAsGuest(false);
  }, [viewerParticipationStatus]);

  useEffect(() => {
    if (!state.success || !state.participantStatus) {
      return;
    }

    setEffectiveParticipationStatus(state.participantStatus);
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition, state.participantStatus, state.success]);

  useEffect(() => {
    if (!guestState.success || !guestState.guestStatus) {
      return;
    }

    setJoinedAsGuest(true);
    setEffectiveParticipationStatus(guestState.guestStatus);
    startTransition(() => {
      router.refresh();
    });
  }, [guestState.guestStatus, guestState.success, router, startTransition]);

  if (isClosed) {
    return (
      <DisabledAction title={t.closedTitle} description={t.closedDescription} />
    );
  }

  if (
    effectiveParticipationStatus &&
    effectiveParticipationStatus !== "REJECTED" &&
    effectiveParticipationStatus !== "CANCELLED"
  ) {
    const copy = getParticipationCopy(effectiveParticipationStatus, locale);

    return (
      <div className="grid gap-2.5">
        <ParticipationStatusCard
          description={copy.description}
          isPending={effectiveParticipationStatus === "PENDING"}
          title={copy.title}
        />
        {joinedAsGuest ? (
          <p className="px-1 text-xs leading-5 text-zinc-500">
            {effectiveParticipationStatus === "PENDING"
              ? getGuestJoinCopy(locale).successDescriptionApproval
              : getGuestJoinCopy(locale).successDescription}
          </p>
        ) : (
          <CancelParticipationForm
            activityId={activityId}
            activityTitle={activityTitle}
            locale={locale}
            onCancelled={() => setEffectiveParticipationStatus(null)}
          />
        )}
      </div>
    );
  }

  if (isFull) {
    return (
      <DisabledAction title={t.fullTitle} description={t.fullDescription} />
    );
  }

  if (!isAuthenticated) {
    return (
      <GuestJoinEntry
        accessToken={accessToken}
        activityId={activityId}
        formInstanceId={formInstanceId}
        formAction={guestFormAction}
        locale={locale}
        requiresApproval={requiresApproval}
        state={guestState}
      />
    );
  }

  if (isOrganizer) {
    return (
      <DisabledAction
        title={t.organizerTitle}
        description={t.organizerDescription}
      />
    );
  }

  return (
    <form
      action={formAction}
      className="grid gap-3"
      noValidate
      onSubmit={() => {
        trackClientAnalyticsEvent({
          name: "join_started",
          entityId: activityId,
          entityType: "team",
          sourceSurface: "activity_detail",
          properties: {
            requires_approval: requiresApproval,
          },
        });
      }}
    >
      <input name="activityId" type="hidden" value={activityId} />
      <input name="locale" type="hidden" value={locale} />
      {accessToken ? (
        <input name="accessToken" type="hidden" value={accessToken} />
      ) : null}

      {effectiveParticipationStatus === "REJECTED" ? (
        <RejoinNotice locale={locale} status={effectiveParticipationStatus} />
      ) : null}

      {state.formError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      ) : null}

      <label className="grid gap-2 text-sm font-medium text-zinc-700">
        {t.messageLabel}
        <Textarea
          className="min-h-24"
          name="message"
          defaultValue={state.values?.message}
          maxLength={300}
          placeholder={t.messagePlaceholder}
        />
        <span className="text-xs font-normal text-zinc-500">
          {requiresApproval ? t.messageHintApproval : t.messageHint}
        </span>
        {state.fieldErrors?.message?.[0] ? (
          <span className="text-xs font-medium text-red-600">
            {state.fieldErrors.message[0]}
          </span>
        ) : null}
      </label>

      <PendingSubmitNotice locale={locale} />
      <SubmitButton locale={locale} requiresApproval={requiresApproval} />
    </form>
  );
}
