"use client";

import Link from "next/link";
import type {
  ChangeEventHandler,
  FormEvent,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import { useActionState, useEffect, useRef, useState } from "react";
import { flushSync, useFormStatus } from "react-dom";
import {
  CircleAlert,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
} from "lucide-react";
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
  parseActivityLocalDateTime,
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
  "h-11 w-full rounded-lg border border-[#D6D5B2] bg-white px-3 text-base font-semibold text-zinc-800 outline-none transition focus:border-[#8AB68E] focus:ring-2 focus:ring-[#8AB68E]/20 sm:h-12 sm:px-4 sm:text-lg";
const compactInputClassName =
  "h-11 rounded-lg border-[#D6D5B2] bg-white/95 px-3 text-base font-semibold text-zinc-800 placeholder:text-zinc-400 focus:border-[#8AB68E] focus:ring-[#8AB68E]/20 sm:h-12 sm:px-4 sm:text-lg";
const compactTextareaClassName =
  "min-h-24 rounded-lg border-[#D6D5B2] bg-white/95 px-3 py-2.5 text-base font-medium leading-7 text-zinc-800 placeholder:text-zinc-400 focus:border-[#8AB68E] focus:ring-[#8AB68E]/20 sm:px-4 sm:py-3 sm:text-lg sm:leading-8";
const longDurationThresholdMs = 24 * 60 * 60 * 1000;

function getCategoryPlaceholder(locale: string) {
  if (locale === "fr") {
    return "Choisir un thème";
  }

  if (locale === "en") {
    return "Choose a theme";
  }

  return "选择组局主题";
}

type FormSectionTone = "cream" | "mint" | "rose" | "sky";
type TeamFormSectionId =
  | "visibility"
  | "activity-content"
  | "time-location"
  | "people-price";
type FieldErrorMap = NonNullable<CreateActivityState["fieldErrors"]>;

const teamFormSectionOrder: TeamFormSectionId[] = [
  "visibility",
  "activity-content",
  "time-location",
  "people-price",
];

const teamFormSectionFields: Record<TeamFormSectionId, string[]> = {
  visibility: ["visibility"],
  "activity-content": [
    "coverImageUrl",
    "title",
    "description",
    "itinerary",
    "type",
    "category",
    "otherCategoryText",
  ],
  "time-location": [
    "city",
    "destination",
    "address",
    "latitude",
    "longitude",
    "startAt",
    "endAt",
  ],
  "people-price": [
    "capacity",
    "capacityLimitEnabled",
    "minParticipants",
    "priceType",
    "priceText",
    "ticketUrl",
    "ticketLabel",
    "requiresApproval",
  ],
};

const invalidControlClassName =
  "border-[#F09182] bg-[#FFF7F5] ring-2 ring-[#F09182]/15 focus:border-[#F09182] focus:ring-[#F09182]/25";

const formSectionTones: Record<
  FormSectionTone,
  {
    accent: string;
    dot: string;
    header: string;
    section: string;
  }
> = {
  cream: {
    accent: "bg-[#F09182]",
    dot: "bg-[#F09182]",
    header: "border-[#F09182]/55",
    section: "border-[#F09182] bg-[#FEFFF9]",
  },
  mint: {
    accent: "bg-[#369758]",
    dot: "bg-[#369758]",
    header: "border-[#369758]/45",
    section: "border-[#369758] bg-[#F1F2EC]",
  },
  rose: {
    accent: "bg-[#DEAAB3]",
    dot: "bg-[#DEAAB3]",
    header: "border-[#F0D8DC]",
    section: "border-[#F2DDE0] bg-[#FFFDFC]",
  },
  sky: {
    accent: "bg-[#DEEBFF]",
    dot: "bg-[#DEEBFF] ring-1 ring-[#156240]/35",
    header: "border-[#DEEBFF]",
    section: "border-[#DEEBFF] bg-[#FEFFF9]",
  },
};

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

function getFormValidationCopy(locale: string) {
  if (locale === "fr") {
    return {
      errorStepLabel: (count: number) =>
        count > 1 ? `${count} champs à corriger` : "1 champ à corriger",
      formErrorPrefix: "À corriger",
      jumpToStep: "Voir cette étape",
    };
  }

  if (locale === "en") {
    return {
      errorStepLabel: (count: number) =>
        count > 1 ? `${count} fields need attention` : "1 field needs attention",
      formErrorPrefix: "Needs attention",
      jumpToStep: "Open this step",
    };
  }

  return {
    errorStepLabel: (count: number) =>
      count > 1 ? `${count} 个字段待修改` : "1 个字段待修改",
    formErrorPrefix: "需要修改",
    jumpToStep: "查看这一步",
  };
}

function getFieldErrorCount(fieldErrors?: FieldErrorMap) {
  if (!fieldErrors) {
    return 0;
  }

  return Object.values(fieldErrors).filter((errors) => errors?.length).length;
}

function getSectionErrorFields(
  sectionId: TeamFormSectionId,
  fieldErrors?: FieldErrorMap,
) {
  if (!fieldErrors) {
    return [];
  }

  return teamFormSectionFields[sectionId].filter(
    (fieldName) => fieldErrors[fieldName]?.length,
  );
}

function getFirstErroredSection(fieldErrors?: FieldErrorMap) {
  return teamFormSectionOrder.find(
    (sectionId) => getSectionErrorFields(sectionId, fieldErrors).length > 0,
  );
}

function getFirstErroredField(fieldErrors?: FieldErrorMap) {
  const sectionId = getFirstErroredSection(fieldErrors);

  if (!sectionId) {
    return null;
  }

  const fieldName = getSectionErrorFields(sectionId, fieldErrors)[0];

  return fieldName
    ? {
        fieldName,
        sectionId,
      }
    : null;
}

function focusFieldAfterSectionSwitch(
  form: HTMLFormElement | null,
  fieldName: string,
) {
  if (!form) {
    return;
  }

  window.setTimeout(() => {
    const lookupFieldName = fieldName === "longitude" ? "latitude" : fieldName;
    const namedControl = Array.from(
      form.querySelectorAll<HTMLElement>("[name]"),
    ).find((element) => {
      if (element.getAttribute("name") !== lookupFieldName) {
        return false;
      }

      return !(
        element instanceof HTMLInputElement && element.type === "hidden"
      );
    });
    const fieldContainer = Array.from(
      form.querySelectorAll<HTMLElement>("[data-field-name]"),
    ).find((element) => element.dataset.fieldName === lookupFieldName);
    const focusTarget =
      namedControl ??
      fieldContainer?.querySelector<HTMLElement>(
        "button, input:not([type='hidden']), select, textarea",
      ) ??
      fieldContainer;

    (fieldContainer ?? focusTarget)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    focusTarget?.focus({ preventScroll: true });
  }, 80);
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
    timeZone: "UTC",
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

  const startAt = parseActivityLocalDateTime(startAtValue);
  const endAt = endAtValue ? parseActivityLocalDateTime(endAtValue) : null;

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

function getDateTimePickerCopy(locale: string) {
  if (locale === "fr") {
    return {
      choose: "Choisir",
      dateTime: "Date et heure",
      done: "OK",
      nextMonth: "Mois suivant",
      previousMonth: "Mois précédent",
      time: "Heure",
    };
  }

  if (locale === "en") {
    return {
      choose: "Choose",
      dateTime: "Date and time",
      done: "Done",
      nextMonth: "Next month",
      previousMonth: "Previous month",
      time: "Time",
    };
  }

  return {
    choose: "选择",
    dateTime: "日期和时间",
    done: "确定",
    nextMonth: "下个月",
    previousMonth: "上个月",
    time: "时间",
  };
}

function getDateTimeParts(value?: string) {
  const [date = "", time = ""] = value?.split("T") ?? [];

  return {
    date,
    time: time.slice(0, 5),
  };
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDateKey(date: Date) {
  return `${getMonthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

function getTodayDateKey() {
  return getDateKey(new Date());
}

function getDateFromFormField(form: HTMLFormElement | null, name?: string) {
  if (!form || !name) {
    return "";
  }

  const field = form.elements.namedItem(name);

  if (!(field instanceof HTMLInputElement)) {
    return "";
  }

  return getDateTimeParts(field.value).date;
}

function isDateBeforeToday(dateKey: string) {
  return dateKey < getTodayDateKey();
}

function getCalendarCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      date,
      dateKey: getDateKey(date),
      isCurrentMonth: date.getMonth() === month,
    };
  });
}

function getWeekdayLabels(locale: string) {
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      new Date(Date.UTC(2026, 0, 5 + index, 12)),
    ),
  );
}

function formatDateTimeFieldValue(
  dateKey: string,
  time: string,
  locale: string,
) {
  if (!dateKey && !time) {
    return "";
  }

  if (!dateKey) {
    return time;
  }

  const date = new Date(`${dateKey}T${time || "00:00"}:00`);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  if (!time) {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
    }).format(date);
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function clampTimePart(value: string, max: number) {
  const numericValue = Number.parseInt(value, 10);

  if (Number.isNaN(numericValue)) {
    return "";
  }

  return String(Math.min(Math.max(numericValue, 0), max)).padStart(2, "0");
}

function normalizeTimeValue(time: string) {
  const [hour = "", minute = ""] = time.split(":");

  if (!hour && !minute) {
    return "";
  }

  const normalizedHour = hour ? clampTimePart(hour, 23) : "00";
  const normalizedMinute = minute ? clampTimePart(minute, 59) : "00";

  return `${normalizedHour}:${normalizedMinute}`;
}

function DateTimePickerField({
  defaultValue,
  fallbackDateFieldName,
  hasError = false,
  locale,
  name,
}: {
  defaultValue?: string;
  fallbackDateFieldName?: string;
  hasError?: boolean;
  locale: string;
  name: string;
}) {
  const initialParts = getDateTimeParts(defaultValue);
  const initialMonthDate = initialParts.date
    ? new Date(`${initialParts.date}T12:00:00`)
    : new Date();
  const [dateKey, setDateKey] = useState(initialParts.date);
  const [isOpen, setIsOpen] = useState(false);
  const [monthDate, setMonthDate] = useState(
    Number.isNaN(initialMonthDate.getTime()) ? new Date() : initialMonthDate,
  );
  const pickerRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(initialParts.time);
  const copy = getDateTimePickerCopy(locale);
  const normalizedTime = normalizeTimeValue(time);
  const hasCompleteTime = /^\d{2}:\d{2}$/.test(normalizedTime);
  const value =
    dateKey && hasCompleteTime ? `${dateKey}T${normalizedTime}` : "";
  const calendarCells = getCalendarCells(monthDate);
  const displayValue =
    formatDateTimeFieldValue(dateKey, normalizedTime, locale) || copy.choose;
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(monthDate);
  const weekdayLabels = getWeekdayLabels(locale);
  const [selectedHour = "", selectedMinute = ""] = time.split(":");

  function openPicker() {
    if (!dateKey) {
      const fallbackDate =
        getDateFromFormField(
          pickerRef.current?.closest("form") ?? null,
          fallbackDateFieldName,
        ) || getTodayDateKey();
      const fallbackMonthDate = new Date(`${fallbackDate}T12:00:00`);

      setDateKey(fallbackDate);

      if (!Number.isNaN(fallbackMonthDate.getTime())) {
        setMonthDate(fallbackMonthDate);
      }
    }

    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsideInteraction(event: MouseEvent | TouchEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        pickerRef.current &&
        !pickerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideInteraction);
    document.addEventListener("touchstart", closeOnOutsideInteraction);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideInteraction);
      document.removeEventListener("touchstart", closeOnOutsideInteraction);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function moveMonth(offset: number) {
    setMonthDate(
      (currentDate) =>
        new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1),
    );
  }

  function updateTimePart(part: "hour" | "minute", nextValue: string) {
    const [currentHour = "", currentMinute = ""] = time.split(":");
    const normalizedValue = nextValue.replace(/\D/g, "").slice(0, 2);
    const nextHour = part === "hour" ? normalizedValue : currentHour;
    const nextMinute = part === "minute" ? normalizedValue : currentMinute;

    if (!nextHour && !nextMinute) {
      setTime("");
      return;
    }

    setTime(`${nextHour}:${nextMinute}`);
  }

  function handleTimeBlur(part: "hour" | "minute", nextValue: string) {
    const normalizedValue = clampTimePart(nextValue, part === "hour" ? 23 : 59);
    const [currentHour = "", currentMinute = ""] = time.split(":");
    const nextHour = part === "hour" ? normalizedValue : currentHour;
    const nextMinute = part === "minute" ? normalizedValue : currentMinute;

    if (!nextHour && !nextMinute) {
      setTime("");
      return;
    }

    setTime(normalizeTimeValue(`${nextHour}:${nextMinute}`));
  }

  function handleDone() {
    if (time) {
      setTime(normalizeTimeValue(time));
    }

    setIsOpen(false);
  }

  return (
    <div className="relative" data-field-name={name} ref={pickerRef}>
      <input name={name} type="hidden" value={value} />
      <button
        type="button"
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-xl border-2 border-[#D6D5B2] bg-white px-3 text-left text-base font-semibold text-zinc-800 shadow-sm transition hover:border-[#8AB68E] focus:border-[#8AB68E] focus:outline-none focus:ring-4 focus:ring-[#8AB68E]/15 sm:h-12 sm:px-4 sm:text-lg",
          hasError && invalidControlClassName,
        )}
        aria-expanded={isOpen}
        aria-invalid={hasError}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            return;
          }

          openPicker();
        }}
      >
        <span className={cn(!value && "text-zinc-400")}>{displayValue}</span>
        <CalendarDays className="h-5 w-5 shrink-0 text-[#156240]" aria-hidden />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[90] w-[min(21rem,calc(100vw-2rem))] rounded-xl border-2 border-[#8AB68E] bg-[#FEFFF9] p-2.5 shadow-[0_18px_48px_rgba(29,29,27,0.16)] max-sm:!fixed max-sm:!bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] max-sm:!left-3 max-sm:!right-3 max-sm:!top-auto max-sm:!w-auto max-sm:!translate-x-0 max-sm:overflow-y-auto max-sm:p-3 sm:p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink sm:text-base">
              {copy.dateTime}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-full border border-[#D6D5B2] bg-white text-[#156240] transition hover:border-[#8AB68E] sm:h-8 sm:w-8"
                aria-label={copy.previousMonth}
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-full border border-[#D6D5B2] bg-white text-[#156240] transition hover:border-[#8AB68E] sm:h-8 sm:w-8"
                aria-label={copy.nextMonth}
                onClick={() => moveMonth(1)}
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <p className="mt-1.5 text-center text-base font-semibold text-[#156240]">
            {monthLabel}
          </p>

          <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-sm font-semibold text-zinc-600">
            {weekdayLabels.map((weekdayLabel) => (
              <span key={weekdayLabel}>{weekdayLabel}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-0.5">
            {calendarCells.map((cell) => {
              const isSelected = cell.dateKey === dateKey;
              const isPastDate = isDateBeforeToday(cell.dateKey);
              const isDisabled = !cell.isCurrentMonth || isPastDate;

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  disabled={isDisabled}
                  className={cn(
                    "grid h-7 place-items-center rounded-md text-sm font-semibold transition disabled:cursor-not-allowed sm:h-8 sm:text-base",
                    !isDisabled
                      ? "text-zinc-800 hover:bg-[#F1F2EC]"
                      : "text-zinc-300 opacity-45",
                    isSelected &&
                      !isDisabled &&
                      "bg-[#369758] text-white hover:bg-[#369758]",
                  )}
                  onClick={() => {
                    if (!isDisabled) {
                      setDateKey(cell.dateKey);
                    }
                  }}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 rounded-xl border border-[#D6D5B2] bg-white px-2.5 py-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#156240] sm:text-base">
              <Clock3 className="h-4 w-4" aria-hidden />
              {copy.time}
            </div>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <input
                aria-label="hour"
                className="h-10 rounded-lg border-2 border-[#D6D5B2] bg-[#FEFFF9] px-3 text-center text-base font-bold text-zinc-800 outline-none transition focus:border-[#8AB68E] focus:ring-4 focus:ring-[#8AB68E]/15"
                inputMode="numeric"
                onBlur={(event) => handleTimeBlur("hour", event.target.value)}
                onChange={(event) => updateTimePart("hour", event.target.value)}
                placeholder="18"
                type="text"
                value={selectedHour}
              />
              <span className="text-lg font-bold text-[#156240]">:</span>
              <input
                aria-label="minute"
                className="h-10 rounded-lg border-2 border-[#D6D5B2] bg-[#FEFFF9] px-3 text-center text-base font-bold text-zinc-800 outline-none transition focus:border-[#8AB68E] focus:ring-4 focus:ring-[#8AB68E]/15"
                inputMode="numeric"
                onBlur={(event) => handleTimeBlur("minute", event.target.value)}
                onChange={(event) =>
                  updateTimePart("minute", event.target.value)
                }
                placeholder="00"
                type="text"
                value={selectedMinute}
              />
            </div>
          </div>

          <button
            type="button"
            className="mt-2.5 h-10 w-full rounded-full bg-[#369758] text-base font-semibold text-white transition hover:bg-[#156240]"
            onClick={handleDone}
          >
            {copy.done}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FormSection({
  children,
  errorCount = 0,
  title,
  tone = "cream",
}: {
  children: ReactNode;
  errorCount?: number;
  title: string;
  tone?: FormSectionTone;
}) {
  const toneClassNames = formSectionTones[tone];
  const hasErrors = errorCount > 0;

  return (
    <section
      className={cn(
        "relative min-w-0 overflow-visible rounded-2xl border-2 p-3 pl-4 shadow-[0_8px_24px_rgba(21,98,64,0.05)] ring-1 ring-white/80 sm:border-[3px] sm:p-3.5 sm:pl-5",
        hasErrors
          ? "border-[#F09182] bg-[#FEFFF9] shadow-[0_12px_30px_rgba(240,145,130,0.12)]"
          : toneClassNames.section,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-2 rounded-l-[0.85rem]",
          hasErrors ? "bg-[#F09182]" : toneClassNames.accent,
        )}
      />
      <div
        className={cn(
          "flex items-center gap-2 border-b pb-2.5",
          hasErrors ? "border-[#F09182]/40" : toneClassNames.header,
        )}
      >
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            hasErrors ? "bg-[#F09182]" : toneClassNames.dot,
          )}
        />
        <h3 className="text-base font-semibold leading-6 text-ink sm:text-lg sm:leading-7">
          {title}
        </h3>
        {hasErrors ? (
          <span className="ml-auto inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full border border-[#F09182]/45 bg-[#FFF7F5] px-2 text-xs font-bold text-[#B5301F]">
            <CircleAlert className="h-3.5 w-3.5" aria-hidden />
            {errorCount}
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 sm:gap-3.5">{children}</div>
    </section>
  );
}

function TeamFormSectionSwitcher({
  activeSection,
  errorCounts,
  locale,
  onSelect,
  sections,
}: {
  activeSection: TeamFormSectionId;
  errorCounts: Record<TeamFormSectionId, number>;
  locale: string;
  onSelect: (id: TeamFormSectionId) => void;
  sections: Array<{
    description: string;
    id: TeamFormSectionId;
    mobileTitle?: string;
    title: string;
  }>;
}) {
  const validationCopy = getFormValidationCopy(locale);

  return (
    <div className="w-full min-w-0 rounded-[1.7rem] border border-[#D6D5B2]/80 bg-[#FFFCF8] p-2 shadow-[0_12px_30px_rgba(21,98,64,0.06)]">
      <div className="grid grid-cols-4 gap-1.5 lg:hidden">
        {sections.map((section, index) => {
          const active = activeSection === section.id;
          const errorCount = errorCounts[section.id];
          const hasErrors = errorCount > 0;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              aria-pressed={active}
              aria-describedby={
                hasErrors ? `${section.id}-step-error-mobile` : undefined
              }
              className={cn(
                "relative flex min-h-10 min-w-0 items-center justify-center rounded-full border px-1 py-1.5 text-center text-[0.66rem] font-semibold leading-[1.12] transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-1.5 sm:text-xs",
                active
                  ? "border-[#369758] bg-[#F1F2EC] text-[#156240] shadow-[0_8px_18px_rgba(54,151,88,0.12)]"
                  : "border-[#D6D5B2] bg-white text-zinc-700 hover:border-[#8AB68E] hover:bg-[#FEFFF9]",
                hasErrors &&
                  "border-[#F09182] bg-[#FFF7F5] pr-2 text-[#B5301F] ring-2 ring-[#F09182]/14 hover:border-[#F09182]",
              )}
            >
              <span className="block whitespace-normal break-words">
                {index + 1}. {section.mobileTitle ?? section.title}
              </span>
              {hasErrors ? (
                <>
                  <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#B5301F] text-[0.68rem] font-black leading-none text-white shadow-[0_6px_14px_rgba(181,48,31,0.22)]">
                    !
                  </span>
                  <span className="sr-only" id={`${section.id}-step-error-mobile`}>
                    {validationCopy.errorStepLabel(errorCount)}
                  </span>
                </>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="hidden gap-2 lg:grid lg:grid-cols-4">
        {sections.map((section, index) => {
          const active = activeSection === section.id;
          const errorCount = errorCounts[section.id];
          const hasErrors = errorCount > 0;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              aria-pressed={active}
              aria-describedby={
                hasErrors ? `${section.id}-step-error-desktop` : undefined
              }
              className={cn(
                "relative flex min-w-[6.4rem] shrink-0 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                active
                  ? "border-[#369758] bg-[#F1F2EC] text-[#156240] shadow-[0_8px_18px_rgba(54,151,88,0.12)]"
                  : "border-[#D6D5B2] bg-[#FFFCF8] text-zinc-600 hover:border-[#8AB68E] hover:bg-white",
                hasErrors &&
                  "border-[#F09182] bg-[#FFF7F5] text-[#B5301F] ring-2 ring-[#F09182]/14 hover:border-[#F09182]",
              )}
            >
              <span className="truncate">{index + 1}. {section.title}</span>
              {hasErrors ? (
                <>
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B5301F] px-1 text-[0.68rem] font-black leading-none text-white">
                    !
                  </span>
                  <span className="sr-only" id={`${section.id}-step-error-desktop`}>
                    {validationCopy.errorStepLabel(errorCount)}
                  </span>
                </>
              ) : null}
            </button>
          );
        })}
      </div>

    </div>
  );
}

function SettingCheckbox({
  checked,
  defaultChecked,
  description,
  name,
  onChange,
  title,
}: {
  checked?: boolean;
  defaultChecked?: boolean;
  description: string;
  name: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  title: string;
}) {
  return (
    <label className="group grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border border-[#D6D5B2]/85 bg-white/72 p-3 text-base text-zinc-700 transition hover:border-[#8AB68E] hover:bg-white has-[:checked]:border-[#8AB68E] has-[:checked]:bg-[#F1F2EC] has-[:checked]:shadow-sm">
      <input
        checked={checked}
        className="peer sr-only"
        defaultChecked={defaultChecked}
        name={name}
        onChange={onChange}
        type="checkbox"
      />
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#8E8383]/70 bg-white text-white transition peer-checked:border-[#156240] peer-checked:bg-[#156240] peer-checked:[&>svg]:opacity-100">
        <Check className="h-3.5 w-3.5 opacity-0 transition" />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold leading-6 text-ink sm:text-lg sm:leading-7">
          {title}
        </span>
        <span className="mt-1 block text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8">
          {description}
        </span>
      </span>
    </label>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p
      className="inline-flex w-fit max-w-full items-start gap-1.5 rounded-lg border border-[#F09182]/45 bg-[#FFF7F5] px-2.5 py-1.5 text-xs font-semibold leading-5 text-[#B5301F]"
      role="alert"
    >
      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{errors[0]}</span>
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
      className="mx-auto min-w-[11rem] gap-2 rounded-full bg-[#369758] px-6 text-white shadow-[0_10px_24px_rgba(54,151,88,0.22)] hover:bg-[#156240] sm:mx-0 sm:min-w-0"
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
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[#1D1D1B]/42 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)] backdrop-blur-sm"
      role="presentation"
    >
      <div
        aria-describedby="long-duration-confirm-description"
        aria-labelledby="long-duration-confirm-title"
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-[1.35rem] border border-[#8AB68E] bg-[#FFF5E6] shadow-[0_24px_80px_rgba(29,29,27,0.18)]"
        role="alertdialog"
      >
        <div className="border-b border-[#D6D5B2] bg-[linear-gradient(135deg,#FEFFF9,#FEFFF9)] px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#156240]">
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

          <div className="grid gap-2 rounded-2xl border border-[#D6D5B2] bg-white/75 p-3 text-sm">
            <div className="grid gap-1 rounded-xl bg-[#FEFFF9] px-3 py-2 ring-1 ring-[#8AB68E]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#156240]">
                {copy.start}
              </span>
              <span className="font-semibold text-ink">
                {confirmation.startLabel}
              </span>
            </div>
            <div className="grid gap-1 rounded-xl bg-[#FEFFF9] px-3 py-2 ring-1 ring-[#8AB68E]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#156240]">
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

          <div className="grid gap-2 pt-1 lg:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              className="h-11 rounded-full border-[#8AB68E] bg-white"
              disabled={pending}
              onClick={onClose}
            >
              {copy.cancel}
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full bg-[#369758] text-white hover:bg-[#156240]"
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

function StepSwitchActions({
  activeSection,
  locale,
  onPrevious,
  onNext,
}: {
  activeSection: TeamFormSectionId;
  locale: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const isFirst = activeSection === "visibility";
  const isLast = activeSection === "people-price";
  const t = getCopy(locale).form;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#D6D5B2]/80 bg-white/78 px-3 py-3">
      <button
        type="button"
        onClick={onPrevious}
        disabled={isFirst}
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition",
          isFirst
            ? "cursor-not-allowed border border-[#E8E1CF] bg-[#F8F6EE] text-zinc-400"
            : "border border-[#D6D5B2] bg-white text-zinc-700 hover:border-[#8AB68E] hover:text-[#156240]",
        )}
      >
        {t.previousStep}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={isLast}
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition",
          isLast
            ? "cursor-not-allowed border border-[#E8E1CF] bg-[#F8F6EE] text-zinc-400"
            : "bg-[#369758] text-white shadow-[0_8px_18px_rgba(54,151,88,0.16)] hover:bg-[#156240]",
        )}
      >
        {t.nextStep}
      </button>
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
  const [category, setCategory] = useState(values?.category ?? "");
  const [visibility, setVisibility] = useState(
    values?.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
  );
  const [priceType, setPriceType] = useState(values?.priceType ?? "FREE");
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const skipLongDurationConfirmRef = useRef(false);
  const [longDurationConfirmation, setLongDurationConfirmation] =
    useState<LongDurationConfirmation | null>(null);
  const t = getCopy(locale);
  const validationCopy = getFormValidationCopy(locale);
  const publicEventTeamFormCopy = values?.publicEventId
    ? getPublicEventTeamFormCopy(locale)
    : null;
  const isPublicEventTeam = Boolean(publicEventTeamFormCopy);
  const [isCapacityLimited, setIsCapacityLimited] = useState(
    values?.capacityLimitEnabled ?? Number(values?.capacity ?? 0) > 0,
  );
  const [activeSection, setActiveSection] =
    useState<TeamFormSectionId>("visibility");
  const lastHandledErrorVersionRef = useRef<number | undefined>(undefined);
  const sectionErrorCounts = {
    visibility: getSectionErrorFields("visibility", state.fieldErrors).length,
    "activity-content": getSectionErrorFields(
      "activity-content",
      state.fieldErrors,
    ).length,
    "time-location": getSectionErrorFields(
      "time-location",
      state.fieldErrors,
    ).length,
    "people-price": getSectionErrorFields("people-price", state.fieldErrors)
      .length,
  } satisfies Record<TeamFormSectionId, number>;
  const totalFieldErrorCount = getFieldErrorCount(state.fieldErrors);
  const formSections: Array<{
    description: string;
    id: TeamFormSectionId;
    mobileTitle?: string;
    title: string;
  }> = [
    {
      description: t.form.sectionVisibilityDescription,
      id: "visibility",
      mobileTitle: t.form.sectionVisibilityMobileTitle,
      title: t.form.sectionVisibilityTitle,
    },
    {
      description: t.form.sectionActivityContentDescription,
      id: "activity-content",
      mobileTitle: t.form.sectionActivityContentMobileTitle,
      title: t.form.sectionActivityContentTitle,
    },
    {
      description: t.form.sectionTimeLocationDescription,
      id: "time-location",
      mobileTitle: t.form.sectionTimeLocationMobileTitle,
      title: t.form.sectionTimeLocationTitle,
    },
    {
      description: t.form.sectionPeoplePriceDescription,
      id: "people-price",
      mobileTitle: t.form.sectionPeoplePriceMobileTitle,
      title: t.form.sectionPeoplePriceTitle,
    },
  ];
  const isSectionActive = (sectionId: TeamFormSectionId) =>
    activeSection === sectionId;

  useEffect(() => {
    if (!state.version || lastHandledErrorVersionRef.current === state.version) {
      return;
    }

    const firstError = getFirstErroredField(state.fieldErrors);

    if (!firstError) {
      return;
    }

    lastHandledErrorVersionRef.current = state.version;
    setActiveSection(firstError.sectionId);
    focusFieldAfterSectionSwitch(formRef.current, firstError.fieldName);
  }, [state.fieldErrors, state.version]);

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
    const form = formRef.current;
    skipLongDurationConfirmRef.current = true;
    flushSync(() => {
      setLongDurationConfirmation(null);
    });
    window.setTimeout(() => {
      form?.requestSubmit();
      window.setTimeout(() => {
        skipLongDurationConfirmRef.current = false;
      }, 0);
    }, 0);
  }

  function goToNextSection() {
    const currentIndex = teamFormSectionOrder.indexOf(activeSection);
    const nextSection =
      teamFormSectionOrder[
        Math.min(currentIndex + 1, teamFormSectionOrder.length - 1)
      ];
    setActiveSection(nextSection);
  }

  function goToPreviousSection() {
    const currentIndex = teamFormSectionOrder.indexOf(activeSection);
    const previousSection = teamFormSectionOrder[Math.max(currentIndex - 1, 0)];
    setActiveSection(previousSection);
  }

  return (
    <Card className="w-full min-w-0 overflow-visible border-[#D6D5B2] bg-[#FEFFF9]/70 shadow-[0_14px_42px_rgba(21,98,64,0.065)]">
      <CardHeader className="border-b border-[#D6D5B2]/70 bg-white/68 px-4 py-3 sm:px-5">
        <CardTitle className="text-lg sm:text-xl">
          {publicEventTeamFormCopy?.cardTitle ?? t.form.basicInfo}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 bg-[linear-gradient(180deg,#FEFFF9_0%,#FFF5E6_100%)] p-3 sm:p-5">
        <form
          key={`${state.version ?? 0}-${prefillVersion}`}
          action={formAction}
          className="grid min-w-0 gap-5 sm:gap-6"
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
              className="grid gap-3 rounded-2xl border border-[#F09182]/55 bg-[#FFF7F5] px-3 py-3 text-sm text-[#B5301F] shadow-[0_10px_24px_rgba(240,145,130,0.1)] sm:px-4"
              role="alert"
            >
              <div className="flex items-start gap-2">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="font-semibold">{state.formError}</p>
                  {totalFieldErrorCount > 0 ? (
                    <p className="mt-1 text-xs font-medium text-[#B5301F]/80">
                      {validationCopy.errorStepLabel(totalFieldErrorCount)}
                    </p>
                  ) : null}
                </div>
              </div>
              {totalFieldErrorCount > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formSections
                    .filter((section) => sectionErrorCounts[section.id] > 0)
                    .map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#F09182]/45 bg-white px-3 text-xs font-bold text-[#B5301F] transition hover:border-[#B5301F]"
                        aria-label={`${validationCopy.jumpToStep}: ${section.title}`}
                        onClick={() => {
                          setActiveSection(section.id);
                          const [firstField] = getSectionErrorFields(
                            section.id,
                            state.fieldErrors,
                          );

                          if (firstField) {
                            focusFieldAfterSectionSwitch(
                              formRef.current,
                              firstField,
                            );
                          }
                        }}
                      >
                        <span>{section.mobileTitle ?? section.title}</span>
                        <span aria-hidden>!</span>
                      </button>
                    ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {mode === "create" && showLinkImport ? (
            <ActivityLinkImportPanel
              locale={locale}
              onApply={applyImportedValues}
            />
          ) : null}

          <TeamFormSectionSwitcher
            activeSection={activeSection}
            errorCounts={sectionErrorCounts}
            locale={locale}
            onSelect={setActiveSection}
            sections={formSections}
          />

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

          <div className={cn("min-w-0", !isSectionActive("visibility") && "hidden")}>
            <FormSection
              errorCount={sectionErrorCounts.visibility}
              title={t.form.visibilityTitle}
              tone="mint"
            >
            <div className="grid gap-3 lg:grid-cols-2">
              {visibilityOptions.map((option) => {
                const active = visibility === option;
                const isPrivate = option === "PRIVATE";

                return (
                  <label
                    key={option}
                    className={cn(
                      "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border p-3 text-base transition",
                      active
                        ? "border-[#8AB68E] bg-[#F1F2EC] shadow-sm"
                        : "border-[#D6D5B2] bg-white/84 hover:border-[#8AB68E] hover:bg-white",
                    )}
                  >
                    <input
                      className="mt-1 accent-[#156240]"
                      name="visibility"
                      type="radio"
                      value={option}
                      checked={active}
                      onChange={() => setVisibility(option)}
                    />
                    <span className="min-w-0">
                      <span className="block text-base font-semibold leading-6 text-ink sm:text-lg sm:leading-7">
                        {isPrivate
                          ? t.form.visibilityPrivate
                          : t.form.visibilityPublic}
                      </span>
                      <span className="mt-1 block text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8">
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
          </div>

          <div className={cn("min-w-0", !isSectionActive("activity-content") && "hidden")}>
            <FormSection
              errorCount={sectionErrorCounts["activity-content"]}
              title={
                publicEventTeamFormCopy?.activityContent ?? t.form.activityContent
              }
              tone="sky"
            >
            <div
              className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
              data-field-name="coverImageUrl"
            >
              <span>{t.form.coverImage}</span>
              <ActivityCoverUpload
                initialUrl={values?.coverImageUrl}
                locale={locale}
                onUploadingChange={setIsCoverUploading}
              />
              <FieldError errors={state.fieldErrors?.coverImageUrl} />
            </div>

            <label
              className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
              data-field-name="title"
            >
              {publicEventTeamFormCopy?.title ?? t.form.title}
              <Input
                className={cn(
                  compactInputClassName,
                  state.fieldErrors?.title?.length && invalidControlClassName,
                )}
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

            <label
              className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
              data-field-name="description"
            >
              {publicEventTeamFormCopy?.description ?? t.form.description}
              <Textarea
                className={cn(
                  compactTextareaClassName,
                  state.fieldErrors?.description?.length &&
                    invalidControlClassName,
                )}
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

            <label
              className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
              data-field-name="itinerary"
            >
              {publicEventTeamFormCopy?.itinerary ?? t.form.itinerary}
              <Textarea
                className={cn(
                  compactTextareaClassName,
                  "min-h-[72px]",
                  state.fieldErrors?.itinerary?.length &&
                    invalidControlClassName,
                )}
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
              <div className="grid gap-4 lg:grid-cols-2">
                <label
                  className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
                  data-field-name="type"
                >
                  {t.form.type}
                  <Select
                    name="type"
                    aria-invalid={Boolean(state.fieldErrors?.type)}
                    className={cn(
                      state.fieldErrors?.type?.length &&
                        invalidControlClassName,
                    )}
                    onChange={(event) => setActivityType(event.target.value)}
                    required
                    value={activityType}
                  >
                    <option value="LOCAL">
                      {getTypeLabel("LOCAL", locale)}
                    </option>
                    <option value="TRIP">{getTypeLabel("TRIP", locale)}</option>
                  </Select>
                  <span className="text-base font-normal leading-7 text-zinc-600 sm:text-lg sm:leading-8">
                    {t.form.typeHint}
                  </span>
                  <FieldError errors={state.fieldErrors?.type} />
                </label>

                <label
                  className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
                  data-field-name="category"
                >
                  {t.form.category}
                  <Select
                    name="category"
                    aria-invalid={Boolean(state.fieldErrors?.category)}
                    className={cn(
                      state.fieldErrors?.category?.length &&
                        invalidControlClassName,
                    )}
                    onChange={(event) => setCategory(event.target.value)}
                    required
                    value={category}
                  >
                    <option value="" disabled>
                      {getCategoryPlaceholder(locale)}
                    </option>
                    {categoryOptions.map((value) => (
                      <option key={value} value={value}>
                        {getCategoryLabel(value, locale)}
                      </option>
                    ))}
                  </Select>
                  <span className="text-base font-normal leading-7 text-zinc-600 sm:text-lg sm:leading-8">
                    {t.form.categoryHint}
                  </span>
                  <FieldError errors={state.fieldErrors?.category} />
                </label>
              </div>
            ) : null}

            {!isPublicEventTeam && category === "OTHER" ? (
              <label
                className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
                data-field-name="otherCategoryText"
              >
                {t.form.otherCategory}
                <Input
                  className={cn(
                    compactInputClassName,
                    state.fieldErrors?.otherCategoryText?.length &&
                      invalidControlClassName,
                  )}
                  name="otherCategoryText"
                  aria-invalid={Boolean(state.fieldErrors?.otherCategoryText)}
                  defaultValue={values?.otherCategoryText}
                  maxLength={40}
                  placeholder={t.form.otherCategoryPlaceholder}
                  required
                />
                <span className="text-base font-normal leading-7 text-zinc-600 sm:text-lg sm:leading-8">
                  {t.form.otherCategoryHint}
                </span>
                <FieldError errors={state.fieldErrors?.otherCategoryText} />
              </label>
            ) : null}
            </FormSection>
          </div>

          <div className={cn("min-w-0", !isSectionActive("time-location") && "hidden")}>
            <FormSection
              errorCount={sectionErrorCounts["time-location"]}
              title={publicEventTeamFormCopy?.timeLocation ?? t.form.timeLocation}
              tone="cream"
            >
            <label
              className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
              data-field-name="city"
            >
              {t.form.city}
              <Input
                className={cn(
                  compactInputClassName,
                  state.fieldErrors?.city?.length && invalidControlClassName,
                )}
                name="city"
                aria-invalid={Boolean(state.fieldErrors?.city)}
                defaultValue={values?.city ?? "Paris"}
                required
              />
              <FieldError errors={state.fieldErrors?.city} />
            </label>

            {activityType === "TRIP" ? (
              <label
                className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
                data-field-name="destination"
              >
                {t.form.destination}
                <Input
                  className={cn(
                    compactInputClassName,
                    state.fieldErrors?.destination?.length &&
                      invalidControlClassName,
                  )}
                  name="destination"
                  aria-invalid={Boolean(state.fieldErrors?.destination)}
                  defaultValue={values?.destination}
                  placeholder={t.form.destinationPlaceholder}
                  required
                />
                <span className="text-base font-normal leading-7 text-zinc-600 sm:text-lg sm:leading-8">
                  {t.form.destinationHint}
                </span>
                <FieldError errors={state.fieldErrors?.destination} />
              </label>
            ) : null}

            <label
              className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
              data-field-name="address"
            >
              {t.form.address}
              <Input
                className={cn(
                  compactInputClassName,
                  state.fieldErrors?.address?.length &&
                    invalidControlClassName,
                )}
                name="address"
                aria-invalid={Boolean(state.fieldErrors?.address)}
                defaultValue={values?.address}
                placeholder="République, Paris"
                required
              />
              <FieldError errors={state.fieldErrors?.address} />
            </label>

            <SettingCheckbox
              defaultChecked={values?.hideAddressFromNonParticipants}
              description={t.form.hideAddressFromNonParticipantsHint}
              name="hideAddressFromNonParticipants"
              title={t.form.hideAddressFromNonParticipants}
            />

            <div data-field-name="latitude">
              <ActivityPlacePicker
                initialAddress={values?.address}
                initialLatitude={values?.latitude}
                initialLongitude={values?.longitude}
                latitudeErrors={state.fieldErrors?.latitude}
                locale={locale}
                longitudeErrors={state.fieldErrors?.longitude}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg">
                {t.form.startAt}
                <DateTimePickerField
                  defaultValue={values?.startAt}
                  hasError={Boolean(state.fieldErrors?.startAt?.length)}
                  locale={locale}
                  name="startAt"
                />
                <span className="text-base font-normal leading-7 text-zinc-600 sm:text-lg sm:leading-8">
                  {t.form.startAtHint}
                </span>
                <FieldError errors={state.fieldErrors?.startAt} />
              </label>

              <label className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg">
                {t.form.endAt}
                <DateTimePickerField
                  defaultValue={values?.endAt}
                  fallbackDateFieldName="startAt"
                  hasError={Boolean(state.fieldErrors?.endAt?.length)}
                  locale={locale}
                  name="endAt"
                />
                <span className="text-base font-normal leading-7 text-zinc-600 sm:text-lg sm:leading-8">
                  {t.form.endAtHint}
                </span>
                <FieldError errors={state.fieldErrors?.endAt} />
              </label>
            </div>
            </FormSection>
          </div>

          <div className={cn("min-w-0", !isSectionActive("people-price") && "hidden")}>
            <FormSection
              errorCount={sectionErrorCounts["people-price"]}
              title={publicEventTeamFormCopy?.peoplePrice ?? t.form.peoplePrice}
              tone="rose"
            >
            <SettingCheckbox
              checked={isCapacityLimited}
              description={t.form.capacityLimitHint}
              name="capacityLimitEnabled"
              onChange={(event) => setIsCapacityLimited(event.target.checked)}
              title={t.form.capacityLimitToggle}
            />

            {isCapacityLimited ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <label
                  className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
                  data-field-name="capacity"
                >
                  {publicEventTeamFormCopy?.capacity ?? t.form.capacity}
                  <Input
                    className={cn(
                      compactInputClassName,
                      state.fieldErrors?.capacity?.length &&
                        invalidControlClassName,
                    )}
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

                <label
                  className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
                  data-field-name="minParticipants"
                >
                  {publicEventTeamFormCopy?.minParticipants ??
                    t.form.minParticipants}
                  <Input
                    className={cn(
                      compactInputClassName,
                      state.fieldErrors?.minParticipants?.length &&
                        invalidControlClassName,
                    )}
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

            <div className="grid gap-4 lg:grid-cols-2">
              <label
                className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
                data-field-name="priceType"
              >
                {t.form.priceType}
                <Select
                  name="priceType"
                  aria-invalid={Boolean(state.fieldErrors?.priceType)}
                  className={cn(
                    state.fieldErrors?.priceType?.length &&
                      invalidControlClassName,
                  )}
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

              <label
                className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
                data-field-name="priceText"
              >
                {publicEventTeamFormCopy?.priceText ?? t.form.priceText}
                <Input
                  className={cn(
                    compactInputClassName,
                    state.fieldErrors?.priceText?.length &&
                      invalidControlClassName,
                  )}
                  name="priceText"
                  aria-invalid={Boolean(state.fieldErrors?.priceText)}
                  defaultValue={values?.priceText}
                  placeholder={t.form.priceTextPlaceholder}
                  required={priceType !== "FREE"}
                />
                <FieldError errors={state.fieldErrors?.priceText} />
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label
                className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
                data-field-name="ticketUrl"
              >
                {t.form.ticketUrl}
                <Input
                  className={cn(
                    compactInputClassName,
                    state.fieldErrors?.ticketUrl?.length &&
                      invalidControlClassName,
                  )}
                  name="ticketUrl"
                  aria-invalid={Boolean(state.fieldErrors?.ticketUrl)}
                  defaultValue={values?.ticketUrl}
                  inputMode="url"
                  placeholder={t.form.ticketUrlPlaceholder}
                  type="url"
                />
                <span className="text-base font-normal leading-7 text-zinc-600 sm:text-lg sm:leading-8">
                  {t.form.ticketHint}
                </span>
                <FieldError errors={state.fieldErrors?.ticketUrl} />
              </label>

              <label
                className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
                data-field-name="ticketLabel"
              >
                {t.form.ticketLabel}
                <Input
                  className={cn(
                    compactInputClassName,
                    state.fieldErrors?.ticketLabel?.length &&
                      invalidControlClassName,
                  )}
                  name="ticketLabel"
                  aria-invalid={Boolean(state.fieldErrors?.ticketLabel)}
                  defaultValue={values?.ticketLabel}
                  maxLength={40}
                  placeholder={t.form.ticketLabelPlaceholder}
                />
                <span className="text-base font-normal leading-7 text-zinc-600 sm:text-lg sm:leading-8">
                  {t.form.ticketLabelPlaceholder}
                </span>
                <FieldError errors={state.fieldErrors?.ticketLabel} />
              </label>
            </div>

            <SettingCheckbox
              defaultChecked={values?.requiresApproval}
              description={t.form.requiresApprovalHint}
              name="requiresApproval"
              title={t.form.requiresApproval}
            />
            </FormSection>
          </div>

          {mode === "create" && activeSection !== "people-price" ? (
            <StepSwitchActions
              activeSection={activeSection}
              locale={locale}
              onNext={goToNextSection}
              onPrevious={goToPreviousSection}
            />
          ) : (
            <FormActions
              cancelHref={cancelHref}
              isCoverUploading={isCoverUploading}
              locale={locale}
              mode={mode}
            />
          )}

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
