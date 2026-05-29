"use client";

import Link from "next/link";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
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
import {
  createActivityAction,
  type CreateActivityState,
} from "../actions/createActivity";
import type { ActivityFormValues } from "../actions/activityActionUtils";
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
};

const initialState: CreateActivityState = {};
const priceTypeOptions = ["FREE", "AA", "FIXED", "RANGE"] as const;
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
      className="w-full sm:w-auto"
      disabled={pending || disabled}
    >
      {disabled && !pending
        ? t.coverUploading
        : pending
          ? mode === "edit"
            ? t.saving
            : t.creating
          : mode === "edit"
            ? t.save
            : t.create}
    </Button>
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
  );
}

export function NewActivityForm({
  activityId,
  cancelHref,
  initialValues,
  locale,
  mode = "create",
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
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const t = getCopy(locale);

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

    setPrefillVersion((currentVersion) => currentVersion + 1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.form.basicInfo}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          key={`${state.version ?? 0}-${prefillVersion}`}
          action={formAction}
          className="grid gap-6"
          noValidate
        >
          <input name="locale" type="hidden" value={locale} />
          {activityId ? (
            <input name="activityId" type="hidden" value={activityId} />
          ) : null}

          {state.formError ? (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {state.formError}
            </div>
          ) : null}

          {mode === "create" ? (
            <ActivityLinkImportPanel
              locale={locale}
              onApply={applyImportedValues}
            />
          ) : null}

          <FormSection title={t.form.activityContent}>
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
              {t.form.title}
              <Input
                name="title"
                aria-invalid={Boolean(state.fieldErrors?.title)}
                defaultValue={values?.title}
                placeholder={t.form.titlePlaceholder}
                required
              />
              <FieldError errors={state.fieldErrors?.title} />
            </label>

            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              {t.form.description}
              <Textarea
                name="description"
                aria-invalid={Boolean(state.fieldErrors?.description)}
                defaultValue={values?.description}
                placeholder={t.form.descriptionPlaceholder}
                required
              />
              <FieldError errors={state.fieldErrors?.description} />
            </label>

            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              {t.form.itinerary}
              <Textarea
                name="itinerary"
                aria-invalid={Boolean(state.fieldErrors?.itinerary)}
                defaultValue={values?.itinerary}
                placeholder={t.form.itineraryPlaceholder}
              />
              <FieldError errors={state.fieldErrors?.itinerary} />
            </label>

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
                  <option value="LOCAL">{getTypeLabel("LOCAL", locale)}</option>
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

            {category === "OTHER" ? (
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

          <FormSection title={t.form.timeLocation}>
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

          <FormSection title={t.form.peoplePrice}>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                {t.form.capacity}
                <Input
                  name="capacity"
                  aria-invalid={Boolean(state.fieldErrors?.capacity)}
                  type="number"
                  min={2}
                  max={100}
                  defaultValue={values?.capacity ?? 6}
                  required
                />
                <FieldError errors={state.fieldErrors?.capacity} />
              </label>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                {t.form.minParticipants}
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

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                {t.form.priceType}
                <Select
                  name="priceType"
                  aria-invalid={Boolean(state.fieldErrors?.priceType)}
                  defaultValue={values?.priceType}
                  required
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
                {t.form.priceText}
                <Input
                  name="priceText"
                  aria-invalid={Boolean(state.fieldErrors?.priceText)}
                  defaultValue={values?.priceText}
                  placeholder={t.form.priceTextPlaceholder}
                  required
                />
                <FieldError errors={state.fieldErrors?.priceText} />
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
        </form>
      </CardContent>
    </Card>
  );
}
