"use client";

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

type NewActivityFormProps = {
  locale: string;
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

  return <p className="text-xs font-medium text-red-600">{errors[0]}</p>;
}

function SubmitButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getCopy(locale).form;

  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? t.creating : t.create}
    </Button>
  );
}

export function NewActivityForm({ locale }: NewActivityFormProps) {
  const [state, formAction] = useActionState(
    createActivityAction,
    initialState,
  );
  const values = state.values;
  const [activityType, setActivityType] = useState(values?.type ?? "LOCAL");
  const [category, setCategory] = useState(values?.category ?? "BOARD_GAME");
  const t = getCopy(locale);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.form.basicInfo}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          key={state.version ?? 0}
          action={formAction}
          className="grid gap-6"
          noValidate
        >
          <input name="locale" type="hidden" value={locale} />

          {state.formError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.formError}
            </div>
          ) : null}

          <FormSection title={t.form.activityContent}>
            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              {t.form.title}
              <Input
                name="title"
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
                defaultValue={values?.address}
                placeholder="République, Paris"
                required
              />
              <FieldError errors={state.fieldErrors?.address} />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                {t.form.startAt}
                <Input
                  name="startAt"
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

          <SubmitButton locale={locale} />
        </form>
      </CardContent>
    </Card>
  );
}
