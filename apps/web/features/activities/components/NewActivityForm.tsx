"use client";

import Link from "next/link";
import type {
  FormEvent,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from "@chill-club/ui";
import { activityCategories, type ActivityCategory } from "@chill-club/shared";
import {
  getCategoryLabel,
  getCopy,
  getPriceTypeLabel,
  getTypeLabel,
} from "@/lib/copy";
import { cn } from "@/lib/utils";
import {
  createActivityAction,
  type CreateActivityState,
} from "../actions/createActivity";
import {
  parseParisDateTime,
  type ActivityFormValues,
} from "../actions/activityActionUtils";
import { updateActivityAction } from "../actions/updateActivity";
import { ActivityLinkImportPanel } from "@/features/activity-link-import/components/ActivityLinkImportPanel";
import { ActivityCoverUpload } from "./ActivityCoverUpload";
import { ActivityPlacePicker } from "./ActivityPlacePicker";

type NewActivityFormProps = {
  activityId?: string;
  cancelHref?: string;
  initialValues?: ActivityFormValues;
  locale: string;
  mode?: "create" | "edit";
  showLinkImport?: boolean;
};

const initialState: CreateActivityState = {};
const priceTypeOptions = ["FREE", "AA", "FIXED", "RANGE"] as const;
const visibilityOptions = ["PUBLIC", "PRIVATE"] as const;
const categoryOptions = (
  Object.keys(activityCategories) as ActivityCategory[]
).sort((left, right) => {
  if (left === "OTHER") {
    return 1;
  }

  if (right === "OTHER") {
    return -1;
  }

  return 0;
});
const selectClassName =
  "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400";
const longDurationThresholdMs = 24 * 60 * 60 * 1000;

type LongDurationConfirmation = {
  durationLabel: string;
  endLabel: string;
  startLabel: string;
};

function getLongDurationConfirmCopy(locale: string) {
  if (locale === "fr") {
    return {
      eyebrow: "Vérification avant publication",
      title: "Ce groupe dure plus d'une journée",
      description:
        "La fin du groupe reste alignée sur la fin de l'activité. Confirmez que cette durée longue est bien volontaire avant de publier.",
      start: "Début",
      end: "Fin",
      duration: "Durée",
      cancel: "Revenir modifier",
      confirm: "Confirmer et publier",
      days: (value: string) => `${value} jour(s)`,
    };
  }

  if (locale === "en") {
    return {
      eyebrow: "Check before publishing",
      title: "This crew lasts more than one day",
      description:
        "The crew end time is still aligned with the activity end time. Confirm this long duration is intentional before publishing.",
      start: "Start",
      end: "End",
      duration: "Duration",
      cancel: "Go back",
      confirm: "Confirm and publish",
      days: (value: string) => `${value} day(s)`,
    };
  }

  return {
    eyebrow: "发布前确认",
    title: "这个组局持续超过一天",
    description:
      "默认结束时间仍与活动整体结束时间一致。如果你只是想约其中某一场，可以返回修改结束时间。",
    start: "开始",
    end: "结束",
    duration: "持续时长",
    cancel: "返回修改",
    confirm: "再次确认发起",
    days: (value: string) => `${value} 天`,
  };
}

function formatLongDurationDays(durationMs: number, locale: string) {
  const days = durationMs / longDurationThresholdMs;
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(days) ? 0 : 1,
  }).format(days);
}

function formatLongDurationDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

function getLongDurationConfirmation(
  form: HTMLFormElement,
  locale: string,
): LongDurationConfirmation | null {
  const formData = new FormData(form);
  const startAtValue = formData.get("startAt");
  const endAtValue = formData.get("endAt");

  if (typeof startAtValue !== "string" || typeof endAtValue !== "string") {
    return null;
  }

  const startAt = parseParisDateTime(startAtValue);
  const endAt = endAtValue ? parseParisDateTime(endAtValue) : null;

  if (!startAt || !endAt) {
    return null;
  }

  const durationMs = endAt.getTime() - startAt.getTime();

  if (durationMs <= longDurationThresholdMs) {
    return null;
  }

  const durationValue = formatLongDurationDays(durationMs, locale);
  const copy = getLongDurationConfirmCopy(locale);

  return {
    durationLabel: copy.days(durationValue),
    endLabel: formatLongDurationDate(endAt, locale),
    startLabel: formatLongDurationDate(startAt, locale),
  };
}

function getPublicEventTeamFormCopy(locale: string) {
  if (locale === "fr") {
    return {
      cardTitle: "Détails du groupe",
      activityContent: "Comment vous voulez y aller",
      title: "Nom du groupe",
      titlePlaceholder: "Ex. Sortie groupée après le travail",
      description: "Message pour les personnes qui veulent venir",
      descriptionPlaceholder:
        "Expliquez le point de rendez-vous, l'ambiance et les détails utiles.",
      itinerary: "Notes de rendez-vous",
      itineraryPlaceholder:
        "Ex. on se retrouve devant l'entrée, puis café après l'événement.",
      timeLocation: "Rendez-vous",
      peoplePrice: "Places et budget",
      capacity: "Places dans le groupe",
      minParticipants: "Minimum souhaité",
      priceText: "Budget prévu",
    };
  }

  if (locale === "en") {
    return {
      cardTitle: "Crew details",
      activityContent: "How you want to go",
      title: "Crew name",
      titlePlaceholder: "Example: After-work group for this event",
      description: "Message for people who want to join",
      descriptionPlaceholder:
        "Explain the meetup point, vibe, and useful details.",
      itinerary: "Meetup notes",
      itineraryPlaceholder:
        "Example: meet at the entrance, then coffee after the event.",
      timeLocation: "Meetup time and place",
      peoplePrice: "Seats and budget",
      capacity: "Crew size",
      minParticipants: "Minimum group size",
      priceText: "Budget note",
    };
  }

  return {
    cardTitle: "组局信息",
    activityContent: "这次怎么约",
    title: "组局标题",
    titlePlaceholder: "例如：下班后一起去看展",
    description: "给想加入的人看的说明",
    descriptionPlaceholder: "说明集合方式、同行氛围和需要提前知道的信息。",
    itinerary: "集合备注",
    itineraryPlaceholder: "例如：入口处集合，结束后附近喝咖啡。",
    timeLocation: "集合时间和地点",
    peoplePrice: "组局人数和费用",
    capacity: "组局人数上限",
    minParticipants: "最少同行人数",
    priceText: "费用说明",
  };
}

function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={
        className ? `${selectClassName} ${className}` : selectClassName
      }
      {...props}
    />
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-zinc-100 pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p className="text-xs font-medium text-red-600" role="alert">
      {errors[0]}
    </p>
  );
}

function SubmitButton({
  disabled = false,
  locale,
  mode,
}: {
  disabled?: boolean;
  locale: string;
  mode: "create" | "edit";
}) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).form;

  return (
    <Button
      type="submit"
      className="w-full gap-2 sm:w-auto"
      disabled={pending || disabled}
      aria-busy={pending || disabled}
    >
      {pending || disabled ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      <span className="truncate">
        {disabled && !pending
          ? t.coverUploading
          : pending
            ? mode === "edit"
              ? t.saving
              : t.creating
            : mode === "edit"
              ? t.save
              : t.create}
      </span>
    </Button>
  );
}

function PendingFormNotice({
  locale,
  mode,
}: {
  locale: string;
  mode: "create" | "edit";
}) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).form;

  if (!pending) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-moss/20 bg-moss/10 px-3 py-2 text-xs font-medium text-moss"
      aria-live="polite"
    >
      <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      <span>{mode === "edit" ? t.saving : t.creating}</span>
    </div>
  );
}

function LongDurationConfirmDialog({
  confirmation,
  locale,
  onClose,
  onConfirm,
}: {
  confirmation: LongDurationConfirmation;
  locale: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { pending } = useFormStatus();
  const copy = getLongDurationConfirmCopy(locale);

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-[#1b160f]/45 px-4 py-6 backdrop-blur-sm"
      role="presentation"
    >
      <div
        aria-describedby="long-duration-confirm-description"
        aria-labelledby="long-duration-confirm-title"
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-[1.35rem] border border-[#e0c9a9] bg-[#fffaf2] shadow-[0_24px_80px_rgba(46,31,12,0.24)]"
        role="alertdialog"
      >
        <div className="border-b border-[#ecdcc2] bg-[linear-gradient(135deg,#fff8ed,#fffdf8)] px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b6a35]">
            {copy.eyebrow}
          </p>
          <h2
            className="mt-2 text-xl font-semibold leading-tight text-ink"
            id="long-duration-confirm-title"
          >
            {copy.title}
          </h2>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:px-6">
          <p
            className="text-sm leading-6 text-zinc-600"
            id="long-duration-confirm-description"
          >
            {copy.description}
          </p>

          <div className="grid gap-2 rounded-2xl border border-[#ead8bb] bg-white/75 p-3 text-sm">
            <div className="grid gap-1 rounded-xl bg-[#fff8ec] px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9b6a35]">
                {copy.start}
              </span>
              <span className="font-semibold text-ink">
                {confirmation.startLabel}
              </span>
            </div>
            <div className="grid gap-1 rounded-xl bg-[#fff8ec] px-3 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9b6a35]">
                {copy.end}
              </span>
              <span className="font-semibold text-ink">
                {confirmation.endLabel}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
                {copy.duration}
              </span>
              <span className="text-base font-bold text-red-700">
                {confirmation.durationLabel}
              </span>
            </div>
          </div>

          <div className="grid gap-2 pt-1 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              className="h-11 rounded-full border-[#e0c9a9] bg-white"
              disabled={pending}
              onClick={onClose}
            >
              {copy.cancel}
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full bg-[#101010] text-white hover:bg-[#242424]"
              disabled={pending}
              onClick={onConfirm}
            >
              {copy.confirm}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormActions({
  cancelHref,
  isCoverUploading,
  locale,
  mode,
}: {
  cancelHref?: string;
  isCoverUploading: boolean;
  locale: string;
  mode: "create" | "edit";
}) {
  const t = getCopy(locale).form;

  return (
    <div className="grid gap-3">
      <PendingFormNotice locale={locale} mode={mode} />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {mode === "edit" && cancelHref ? (
          <Link
            className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50 sm:w-auto"
            href={cancelHref}
          >
            {t.cancelEdit}
          </Link>
        ) : null}
        <SubmitButton disabled={isCoverUploading} locale={locale} mode={mode} />
      </div>
    </div>
  );
}

export function NewActivityForm({
  activityId,
  cancelHref,
  initialValues,
  locale,
  mode = "create",
  showLinkImport = true,
}: NewActivityFormProps) {
  const action = mode === "edit" ? updateActivityAction : createActivityAction;
  const [state, formAction] = useActionState(action, initialState);
  const [importedValues, setImportedValues] = useState<
    Partial<ActivityFormValues> | undefined
  >();
  const [prefillVersion, setPrefillVersion] = useState(0);
  const values = state.values ?? importedValues ?? initialValues;
  const [activityType, setActivityType] = useState(values?.type ?? "LOCAL");
  const [category, setCategory] = useState(values?.category ?? "BOARD_GAME");
  const [visibility, setVisibility] = useState(
    values?.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
  );
  const [priceType, setPriceType] = useState(values?.priceType ?? "FIXED");
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const skipLongDurationConfirmRef = useRef(false);
  const [longDurationConfirmation, setLongDurationConfirmation] =
    useState<LongDurationConfirmation | null>(null);
  const t = getCopy(locale);
  const publicEventTeamFormCopy = values?.publicEventId
    ? getPublicEventTeamFormCopy(locale)
    : null;
  const isPublicEventTeam = Boolean(publicEventTeamFormCopy);
  const [isCapacityLimited, setIsCapacityLimited] = useState(
    values?.capacityLimitEnabled ?? Number(values?.capacity ?? 0) > 0,
  );

  function applyImportedValues(nextValues: Partial<ActivityFormValues>) {
    setImportedValues((currentValues) => ({
      ...currentValues,
      ...nextValues,
    }));

    if (nextValues.type) {
      setActivityType(nextValues.type);
    }

    if (nextValues.category) {
      setCategory(nextValues.category);
    }

    if (nextValues.priceType) {
      setPriceType(nextValues.priceType);
    }

    setPrefillVersion((currentVersion) => currentVersion + 1);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (skipLongDurationConfirmRef.current) {
      skipLongDurationConfirmRef.current = false;
      return;
    }

    if (mode !== "create") {
      return;
    }

    const confirmation = getLongDurationConfirmation(
      event.currentTarget,
      locale,
    );

    if (!confirmation) {
      return;
    }

    event.preventDefault();
    setLongDurationConfirmation(confirmation);
  }

  function confirmLongDurationSubmit() {
    skipLongDurationConfirmRef.current = true;
    setLongDurationConfirmation(null);
    window.requestAnimationFrame(() => {
      formRef.current?.requestSubmit();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {publicEventTeamFormCopy?.cardTitle ?? t.form.basicInfo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          key={`${state.version ?? 0}-${prefillVersion}`}
          action={formAction}
          className="grid gap-6"
          onSubmit={handleSubmit}
          noValidate
          ref={formRef}
        >
          <input name="locale" type="hidden" value={locale} />
          {activityId ? (
            <input name="activityId" type="hidden" value={activityId} />
          ) : null}
          {values?.publicEventId ? (
            <input
              name="publicEventId"
              type="hidden"
              value={values.publicEventId}
            />
          ) : null}

          {state.formError ? (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {state.formError}
            </div>
          ) : null}

          {mode === "create" && showLinkImport ? (
            <ActivityLinkImportPanel
              locale={locale}
              onApply={applyImportedValues}
            />
          ) : null}

          {values?.importSourceUrl ? (
            <input
              name="importSourceUrl"
              type="hidden"
              value={values.importSourceUrl}
            />
          ) : null}
          {isPublicEventTeam ? (
            <>
              <input name="type" type="hidden" value={activityType} />
              <input name="category" type="hidden" value={category} />
              <input
                name="otherCategoryText"
                type="hidden"
                value={values?.otherCategoryText ?? ""}
              />
            </>
          ) : null}

          <FormSection title={t.form.visibilityTitle}>
            <div className="grid gap-3 sm:grid-cols-2">
              {visibilityOptions.map((option) => {
                const active = visibility === option;
                const isPrivate = option === "PRIVATE";

                return (
                  <label
                    key={option}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition",
                      active
                        ? "border-[#d09a77] bg-[#fff3ea] shadow-sm"
                        : "border-zinc-200 bg-white hover:border-[#d9c0ad]",
                    )}
                  >
                    <input
                      className="mt-1"
                      name="visibility"
                      type="radio"
                      value={option}
                      checked={active}
                      onChange={() => setVisibility(option)}
                    />
                    <span>
                      <span className="block font-semibold text-ink">
                        {isPrivate
                          ? t.form.visibilityPrivate
                          : t.form.visibilityPublic}
                      </span>
                      <span className="mt-1 block leading-6 text-zinc-500">
                        {isPrivate
                          ? t.form.visibilityPrivateHint
                          : t.form.visibilityPublicHint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <FieldError errors={state.fieldErrors?.visibility} />
          </FormSection>

          <FormSection
            title={
              publicEventTeamFormCopy?.activityContent ?? t.form.activityContent
            }
          >
            <div className="grid gap-2 text-sm font-medium text-zinc-700">
              <span>{t.form.coverImage}</span>
              <ActivityCoverUpload
                initialUrl={values?.coverImageUrl}
                locale={locale}
                onUploadingChange={setIsCoverUploading}
              />
              <FieldError errors={state.fieldErrors?.coverImageUrl} />
            </div>

            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              {publicEventTeamFormCopy?.title ?? t.form.title}
              <Input
                name="title"
                aria-invalid={Boolean(state.fieldErrors?.title)}
                defaultValue={values?.title}
                placeholder={
                  publicEventTeamFormCopy?.titlePlaceholder ??
                  t.form.titlePlaceholder
                }
                required
              />
              <FieldError errors={state.fieldErrors?.title} />
            </label>

            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              {publicEventTeamFormCopy?.description ?? t.form.description}
              <Textarea
                name="description"
                aria-invalid={Boolean(state.fieldErrors?.description)}
                defaultValue={values?.description}
                placeholder={
                  publicEventTeamFormCopy?.descriptionPlaceholder ??
                  t.form.descriptionPlaceholder
                }
                required
              />
              <FieldError errors={state.fieldErrors?.description} />
            </label>

            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              {publicEventTeamFormCopy?.itinerary ?? t.form.itinerary}
              <Textarea
                name="itinerary"
                aria-invalid={Boolean(state.fieldErrors?.itinerary)}
                defaultValue={values?.itinerary}
                placeholder={
                  publicEventTeamFormCopy?.itineraryPlaceholder ??
                  t.form.itineraryPlaceholder
                }
              />
              <FieldError errors={state.fieldErrors?.itinerary} />
            </label>

            {!isPublicEventTeam ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-zinc-700">
                  {t.form.type}
                  <Select
                    name="type"
                    aria-invalid={Boolean(state.fieldErrors?.type)}
                    onChange={(event) => setActivityType(event.target.value)}
                    required
                    value={activityType}
                  >
                    <option value="LOCAL">
                      {getTypeLabel("LOCAL", locale)}
                    </option>
                    <option value="TRIP">{getTypeLabel("TRIP", locale)}</option>
                  </Select>
                  <span className="text-xs font-normal text-zinc-500">
                    {t.form.typeHint}
                  </span>
                  <FieldError errors={state.fieldErrors?.type} />
                </label>

                <label className="grid gap-2 text-sm font-medium text-zinc-700">
                  {t.form.category}
                  <Select
                    name="category"
                    aria-invalid={Boolean(state.fieldErrors?.category)}
                    onChange={(event) => setCategory(event.target.value)}
                    required
                    value={category}
                  >
                    {categoryOptions.map((value) => (
                      <option key={value} value={value}>
                        {getCategoryLabel(value, locale)}
                      </option>
                    ))}
                  </Select>
                  <span className="text-xs font-normal text-zinc-500">
                    {t.form.categoryHint}
                  </span>
                  <FieldError errors={state.fieldErrors?.category} />
                </label>
              </div>
            ) : null}

            {!isPublicEventTeam && category === "OTHER" ? (
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                {t.form.otherCategory}
                <Input
                  name="otherCategoryText"
                  aria-invalid={Boolean(state.fieldErrors?.otherCategoryText)}
                  defaultValue={values?.otherCategoryText}
                  maxLength={40}
                  placeholder={t.form.otherCategoryPlaceholder}
                  required
                />
                <span className="text-xs font-normal text-zinc-500">
                  {t.form.otherCategoryHint}
                </span>
                <FieldError errors={state.fieldErrors?.otherCategoryText} />
              </label>
            ) : null}
          </FormSection>

          <FormSection
            title={publicEventTeamFormCopy?.timeLocation ?? t.form.timeLocation}
          >
            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              {t.form.city}
              <Input
                name="city"
                aria-invalid={Boolean(state.fieldErrors?.city)}
                defaultValue={values?.city ?? "Paris"}
                required
              />
              <FieldError errors={state.fieldErrors?.city} />
            </label>

            {activityType === "TRIP" ? (
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                {t.form.destination}
                <Input
                  name="destination"
                  aria-invalid={Boolean(state.fieldErrors?.destination)}
                  defaultValue={values?.destination}
                  placeholder={t.form.destinationPlaceholder}
                  required
                />
                <span className="text-xs font-normal text-zinc-500">
                  {t.form.destinationHint}
                </span>
                <FieldError errors={state.fieldErrors?.destination} />
              </label>
            ) : null}

            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              {t.form.address}
              <Input
                name="address"
                aria-invalid={Boolean(state.fieldErrors?.address)}
                defaultValue={values?.address}
                placeholder="République, Paris"
                required
              />
              <FieldError errors={state.fieldErrors?.address} />
            </label>

            <ActivityPlacePicker
              initialAddress={values?.address}
              initialLatitude={values?.latitude}
              initialLongitude={values?.longitude}
              latitudeErrors={state.fieldErrors?.latitude}
              locale={locale}
              longitudeErrors={state.fieldErrors?.longitude}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                {t.form.startAt}
                <Input
                  name="startAt"
                  aria-invalid={Boolean(state.fieldErrors?.startAt)}
                  defaultValue={values?.startAt}
                  type="datetime-local"
                  required
                />
                <span className="text-xs font-normal text-zinc-500">
                  {t.form.startAtHint}
                </span>
                <FieldError errors={state.fieldErrors?.startAt} />
              </label>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                {t.form.endAt}
                <Input
                  name="endAt"
                  aria-invalid={Boolean(state.fieldErrors?.endAt)}
                  defaultValue={values?.endAt}
                  type="datetime-local"
                />
                <span className="text-xs font-normal text-zinc-500">
                  {t.form.endAtHint}
                </span>
                <FieldError errors={state.fieldErrors?.endAt} />
              </label>
            </div>
          </FormSection>

          <FormSection
            title={publicEventTeamFormCopy?.peoplePrice ?? t.form.peoplePrice}
          >
            <label className="flex items-start gap-3 rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
              <input
                checked={isCapacityLimited}
                className="mt-1"
                name="capacityLimitEnabled"
                onChange={(event) =>
                  setIsCapacityLimited(event.target.checked)
                }
                type="checkbox"
              />
              <span>
                <span className="font-medium text-ink">
                  {t.form.capacityLimitToggle}
                </span>
                <span className="mt-1 block text-zinc-500">
                  {t.form.capacityLimitHint}
                </span>
              </span>
            </label>

            {isCapacityLimited ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-zinc-700">
                  {publicEventTeamFormCopy?.capacity ?? t.form.capacity}
                  <Input
                    name="capacity"
                    aria-invalid={Boolean(state.fieldErrors?.capacity)}
                    type="number"
                    min={2}
                    max={100}
                    defaultValue={
                      Number(values?.capacity ?? 0) > 0 ? values?.capacity : ""
                    }
                    placeholder={t.form.capacityPlaceholder}
                    required
                  />
                  <FieldError errors={state.fieldErrors?.capacity} />
                </label>

                <label className="grid gap-2 text-sm font-medium text-zinc-700">
                  {publicEventTeamFormCopy?.minParticipants ??
                    t.form.minParticipants}
                  <Input
                    name="minParticipants"
                    aria-invalid={Boolean(state.fieldErrors?.minParticipants)}
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={values?.minParticipants}
                    placeholder={t.form.minParticipantsPlaceholder}
                  />
                  <FieldError errors={state.fieldErrors?.minParticipants} />
                </label>
              </div>
            ) : (
              <>
                <input name="capacity" type="hidden" value="0" />
                <input name="minParticipants" type="hidden" value="" />
              </>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                {t.form.priceType}
                <Select
                  name="priceType"
                  aria-invalid={Boolean(state.fieldErrors?.priceType)}
                  onChange={(event) => setPriceType(event.target.value)}
                  required
                  value={priceType}
                >
                  {priceTypeOptions.map((value) => (
                    <option key={value} value={value}>
                      {getPriceTypeLabel(value, locale)}
                    </option>
                  ))}
                </Select>
                <FieldError errors={state.fieldErrors?.priceType} />
              </label>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                {publicEventTeamFormCopy?.priceText ?? t.form.priceText}
                <Input
                  name="priceText"
                  aria-invalid={Boolean(state.fieldErrors?.priceText)}
                  defaultValue={values?.priceText}
                  placeholder={t.form.priceTextPlaceholder}
                  required={priceType !== "FREE"}
                />
                <FieldError errors={state.fieldErrors?.priceText} />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                {t.form.ticketUrl}
                <Input
                  name="ticketUrl"
                  aria-invalid={Boolean(state.fieldErrors?.ticketUrl)}
                  defaultValue={values?.ticketUrl}
                  inputMode="url"
                  placeholder={t.form.ticketUrlPlaceholder}
                  type="url"
                />
                <span className="text-xs font-normal text-zinc-500">
                  {t.form.ticketHint}
                </span>
                <FieldError errors={state.fieldErrors?.ticketUrl} />
              </label>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                {t.form.ticketLabel}
                <Input
                  name="ticketLabel"
                  aria-invalid={Boolean(state.fieldErrors?.ticketLabel)}
                  defaultValue={values?.ticketLabel}
                  maxLength={40}
                  placeholder={t.form.ticketLabelPlaceholder}
                />
                <span className="text-xs font-normal text-zinc-500">
                  {t.form.ticketLabelPlaceholder}
                </span>
                <FieldError errors={state.fieldErrors?.ticketLabel} />
              </label>
            </div>

            <label className="flex items-start gap-3 rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
              <input
                className="mt-1"
                name="requiresApproval"
                type="checkbox"
                defaultChecked={values?.requiresApproval}
              />
              <span>
                <span className="font-medium text-ink">
                  {t.form.requiresApproval}
                </span>
                <span className="mt-1 block text-zinc-500">
                  {t.form.requiresApprovalHint}
                </span>
              </span>
            </label>
          </FormSection>

          <FormActions
            cancelHref={cancelHref}
            isCoverUploading={isCoverUploading}
            locale={locale}
            mode={mode}
          />

          {longDurationConfirmation ? (
            <LongDurationConfirmDialog
              confirmation={longDurationConfirmation}
              locale={locale}
              onClose={() => setLongDurationConfirmation(null)}
              onConfirm={confirmLongDurationSubmit}
            />
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
