"use client";

import Link from "next/link";
import type {
  ChangeEventHandler,
  FormEvent,
  MouseEvent as ReactMouseEvent,
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
  Input,
  Textarea,
} from "@chill-club/ui";
import { activityCategories, type ActivityCategory } from "@chill-club/shared";
import { getCategoryLabel, getCopy } from "@/lib/copy";
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
import { ActivityCoverUpload } from "./ActivityCoverUpload";
import { ActivityPlacePicker } from "./ActivityPlacePicker";

type NewActivityFormProps = {
  activityId?: string;
  cancelHref?: string;
  formId?: string;
  initialValues?: ActivityFormValues;
  locale: string;
  mode?: "create" | "edit";
  showFormActions?: boolean;
};

const initialState: CreateActivityState = {};
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
const primaryFrenchCities = [
  "Paris",
  "Lyon",
  "Marseille",
  "Nice",
  "Toulouse",
  "Bordeaux",
  "Lille",
  "Nantes",
] as const;
const allFrenchCities = [
  "Paris",
  "Lyon",
  "Marseille",
  "Nice",
  "Toulouse",
  "Bordeaux",
  "Lille",
  "Nantes",
  "Strasbourg",
  "Montpellier",
  "Rennes",
  "Grenoble",
  "Dijon",
  "Rouen",
  "Reims",
  "Tours",
  "Nancy",
  "Metz",
  "Avignon",
  "Aix-en-Provence",
  "Brest",
  "Clermont-Ferrand",
  "Angers",
  "Caen",
  "Annecy",
  "Orleans",
  "La Rochelle",
  "Nimes",
  "Perpignan",
  "Saint-Etienne",
  "Toulon",
  "Le Havre",
  "Amiens",
  "Limoges",
  "Besancon",
  "Poitiers",
  "Pau",
  "Cannes",
  "Antibes",
  "Colmar",
  "Villeurbanne",
  "Saint-Denis",
  "Argenteuil",
  "Montreuil",
  "Mulhouse",
  "Roubaix",
  "Tourcoing",
  "Nanterre",
  "Versailles",
  "Creteil",
  "Aubervilliers",
  "Courbevoie",
  "Boulogne-Billancourt",
  "Asnieres-sur-Seine",
  "Rueil-Malmaison",
  "Saint-Maur-des-Fosses",
  "Calais",
  "Beziers",
  "Cergy",
  "Valence",
  "Quimper",
  "Chambery",
  "Niort",
  "Troyes",
  "Lorient",
  "Montauban",
  "Ajaccio",
  "Vannes",
  "Bayonne",
  "La Roche-sur-Yon",
  "Saint-Malo",
] as const;
const selectClassName =
  "h-11 w-full rounded-lg border border-[#D6D5B2] bg-white px-3 text-base font-semibold text-zinc-800 outline-none transition focus:border-[#8AB68E] focus:ring-2 focus:ring-[#8AB68E]/20 sm:h-12 sm:px-4 sm:text-lg";
const compactInputClassName =
  "h-11 rounded-xl border border-[#D8D2C2] bg-white px-3 text-base font-semibold text-zinc-800 shadow-[0_1px_0_rgba(29,29,27,0.03)] placeholder:text-zinc-400 focus:border-[#8AB68E] focus:ring-2 focus:ring-[#8AB68E]/15 sm:h-12 sm:px-4 sm:text-lg";
const compactTextareaClassName =
  "min-h-24 rounded-xl border border-[#D8D2C2] bg-white px-3 py-2.5 text-base font-medium leading-7 text-zinc-800 shadow-[0_1px_0_rgba(29,29,27,0.03)] placeholder:text-zinc-400 focus:border-[#8AB68E] focus:ring-2 focus:ring-[#8AB68E]/15 sm:px-4 sm:py-3 sm:text-lg sm:leading-8";
const longDurationThresholdMs = 24 * 60 * 60 * 1000;

function getCategoryPlaceholder(locale: string) {
  if (locale === "fr") {
    return "Choisir un type";
  }

  if (locale === "en") {
    return "Choose a type";
  }

  return "选择类型";
}

function getActivityCategoryFieldLabel(locale: string) {
  if (locale === "fr" || locale === "en") {
    return "Type";
  }

  return "类型";
}

function getCoverUploadPrompt(locale: string) {
  if (locale === "fr") {
    return "Ajouter une image";
  }

  if (locale === "en") {
    return "Add cover image";
  }

  return "添加活动封面";
}

function getOtherActivityCategoryFieldLabel(locale: string) {
  if (locale === "fr") {
    return "Autre type";
  }

  if (locale === "en") {
    return "Other type";
  }

  return "其他类型";
}

function getPriceModeCopy(locale: string) {
  if (locale === "fr") {
    return {
      free: "Gratuit",
      paid: "Payant",
      paidAmount: "Montant",
    };
  }

  if (locale === "en") {
    return {
      free: "Free",
      paid: "Paid",
      paidAmount: "Amount",
    };
  }

  return {
    free: "免费",
    paid: "收费",
    paidAmount: "金额",
  };
}

type TicketLinkKind = "" | "RESERVE_SPOT" | "VIEW_DETAILS";

function getTicketLinkKindCopy(locale: string) {
  if (locale === "fr") {
    return {
      details: "Lien de détails",
      detailsCta: "Voir les détails",
      reserve: "Lien de réservation",
      reserveCta: "Réserver une place",
      title: "Lien externe",
    };
  }

  if (locale === "en") {
    return {
      details: "Details link",
      detailsCta: "View details",
      reserve: "Spot link",
      reserveCta: "Save a spot",
      title: "External link",
    };
  }

  return {
    details: "详情链接",
    detailsCta: "查看详情",
    reserve: "抢位置链接",
    reserveCta: "抢位置",
    title: "外部链接",
  };
}

function getInitialTicketLinkKind(
  values?: Partial<ActivityFormValues>,
): TicketLinkKind {
  if (!values?.ticketUrl) {
    return "";
  }

  if (values.ticketLabel === "VIEW_DETAILS") {
    return "VIEW_DETAILS";
  }

  return "RESERVE_SPOT";
}

function normalizePriceTypeForSimpleMode(priceType?: string) {
  return priceType === "FREE" ? "FREE" : "FIXED";
}

function getCityPickerCopy(locale: string) {
  if (locale === "fr") {
    return {
      close: "Fermer",
      more: "Plus de villes",
      title: "Choisir une ville",
    };
  }

  if (locale === "en") {
    return {
      close: "Close",
      more: "More cities",
      title: "Choose a city",
    };
  }

  return {
    close: "关闭",
    more: "更多城市",
    title: "选择城市",
  };
}

type TeamFormSectionId =
  | "activity-content"
  | "time-location"
  | "people-price";
type FieldErrorMap = NonNullable<CreateActivityState["fieldErrors"]>;

const teamFormSectionOrder: TeamFormSectionId[] = [
  "activity-content",
  "time-location",
  "people-price",
];

const teamFormSectionFields: Record<TeamFormSectionId, string[]> = {
  "activity-content": [
    "visibility",
    "coverImageUrl",
    "title",
    "description",
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
      jumpToStep: "Aller au champ",
    };
  }

  if (locale === "en") {
    return {
      errorStepLabel: (count: number) =>
        count > 1 ? `${count} fields need attention` : "1 field needs attention",
      formErrorPrefix: "Needs attention",
      jumpToStep: "Go to field",
    };
  }

  return {
    errorStepLabel: (count: number) =>
      count > 1 ? `${count} 个字段待修改` : "1 个字段待修改",
    formErrorPrefix: "需要修改",
    jumpToStep: "定位字段",
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

function getDateTimeRangePickerCopy(locale: string) {
  if (locale === "fr") {
    return {
      addEnd: "Ajouter une fin",
      endOptional: "Fin optionnelle",
      removeEnd: "Retirer",
      start: "Début",
    };
  }

  if (locale === "en") {
    return {
      addEnd: "Add end time",
      endOptional: "Optional end",
      removeEnd: "Remove",
      start: "Start",
    };
  }

  return {
    addEnd: "添加结束时间",
    endOptional: "结束时间可选",
    removeEnd: "移除",
    start: "开始",
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

function DateTimeRangePickerField({
  endDefaultValue,
  endErrors,
  endLabel,
  endName,
  locale,
  startDefaultValue,
  startErrors,
  startLabel,
  startName,
}: {
  endDefaultValue?: string;
  endErrors?: string[];
  endLabel: string;
  endName: string;
  locale: string;
  startDefaultValue?: string;
  startErrors?: string[];
  startLabel: string;
  startName: string;
}) {
  const startInitialParts = getDateTimeParts(startDefaultValue);
  const endInitialParts = getDateTimeParts(endDefaultValue);
  const initialMonthDate = startInitialParts.date
    ? new Date(`${startInitialParts.date}T12:00:00`)
    : endInitialParts.date
      ? new Date(`${endInitialParts.date}T12:00:00`)
      : new Date();
  const [endDateKey, setEndDateKey] = useState(endInitialParts.date);
  const [endTime, setEndTime] = useState(endInitialParts.time);
  const [isOpen, setIsOpen] = useState(false);
  const [monthDate, setMonthDate] = useState(
    Number.isNaN(initialMonthDate.getTime()) ? new Date() : initialMonthDate,
  );
  const [startDateKey, setStartDateKey] = useState(startInitialParts.date);
  const [startTime, setStartTime] = useState(
    startInitialParts.time || endInitialParts.time,
  );
  const pickerRef = useRef<HTMLDivElement>(null);
  const baseCopy = getDateTimePickerCopy(locale);
  const rangeCopy = getDateTimeRangePickerCopy(locale);
  const calendarCells = getCalendarCells(monthDate);
  const weekdayLabels = getWeekdayLabels(locale);
  const normalizedStartTime = normalizeTimeValue(startTime);
  const normalizedEndTime = normalizeTimeValue(endTime);
  const hasCompleteStartTime = /^\d{2}:\d{2}$/.test(normalizedStartTime);
  const hasCompleteEndTime = /^\d{2}:\d{2}$/.test(normalizedEndTime);
  const startValue =
    startDateKey && hasCompleteStartTime
      ? `${startDateKey}T${normalizedStartTime}`
      : "";
  const endValue =
    endDateKey && hasCompleteEndTime
      ? `${endDateKey}T${normalizedEndTime}`
      : "";
  const [selectedHour = "", selectedMinute = ""] = startTime.split(":");
  const [selectedEndHour = "", selectedEndMinute = ""] = endTime.split(":");
  const displayStart =
    formatDateTimeFieldValue(startDateKey, normalizedStartTime, locale) ||
    baseCopy.choose;
  const displayEnd = endValue
    ? formatDateTimeFieldValue(endDateKey, normalizedEndTime, locale)
    : "";
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(monthDate);
  const hasError = Boolean(startErrors?.length || endErrors?.length);

  function getDateForMonth(dateKey: string) {
    const nextDate = new Date(`${dateKey}T12:00:00`);

    return Number.isNaN(nextDate.getTime()) ? null : nextDate;
  }

  function syncMonthToDate(dateKey: string) {
    const nextDate = getDateForMonth(dateKey);

    if (nextDate) {
      setMonthDate(nextDate);
    }
  }

  function openPicker() {
    const fallbackDate = startDateKey || getTodayDateKey();

    if (!startDateKey) {
      setStartDateKey(fallbackDate);
    }

    syncMonthToDate(fallbackDate);
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

  function selectDate(nextDateKey: string) {
    if (!startDateKey || endDateKey) {
      setStartDateKey(nextDateKey);
      setEndDateKey("");
      return;
    }

    if (nextDateKey <= startDateKey) {
      setStartDateKey(nextDateKey);
      setEndDateKey("");
      setEndTime("");
      return;
    }

    if (!endTime) {
      setEndTime(startTime);
    }

    setEndDateKey(nextDateKey);
  }

  function updateTimePart(
    target: "start" | "end",
    part: "hour" | "minute",
    nextValue: string,
  ) {
    const currentTime = target === "end" ? endTime : startTime;
    const [currentHour = "", currentMinute = ""] = currentTime.split(":");
    const normalizedValue = nextValue.replace(/\D/g, "").slice(0, 2);
    const nextHour = part === "hour" ? normalizedValue : currentHour;
    const nextMinute = part === "minute" ? normalizedValue : currentMinute;

    if (!nextHour && !nextMinute) {
      if (target === "end") {
        setEndTime("");
      } else {
        setStartTime("");
      }
      return;
    }

    if (target === "end") {
      setEndTime(`${nextHour}:${nextMinute}`);
    } else {
      setStartTime(`${nextHour}:${nextMinute}`);
    }
  }

  function handleTimeBlur(
    target: "start" | "end",
    part: "hour" | "minute",
    nextValue: string,
  ) {
    const normalizedValue = clampTimePart(nextValue, part === "hour" ? 23 : 59);
    const currentTime = target === "end" ? endTime : startTime;
    const [currentHour = "", currentMinute = ""] = currentTime.split(":");
    const nextHour = part === "hour" ? normalizedValue : currentHour;
    const nextMinute = part === "minute" ? normalizedValue : currentMinute;

    if (!nextHour && !nextMinute) {
      if (target === "end") {
        setEndTime("");
      } else {
        setStartTime("");
      }
      return;
    }

    if (target === "end") {
      setEndTime(normalizeTimeValue(`${nextHour}:${nextMinute}`));
    } else {
      setStartTime(normalizeTimeValue(`${nextHour}:${nextMinute}`));
    }
  }

  function clearEnd() {
    setEndDateKey("");
    setEndTime("");
    syncMonthToDate(startDateKey || getTodayDateKey());
  }

  function handleDone(event?: ReactMouseEvent<HTMLButtonElement>) {
    event?.preventDefault();
    event?.stopPropagation();

    if (startTime) {
      setStartTime(normalizeTimeValue(startTime));
    }

    if (endTime) {
      setEndTime(normalizeTimeValue(endTime));
    }

    setIsOpen(false);
  }

  return (
    <div className="relative grid gap-2" data-field-name={startName} ref={pickerRef}>
      <input name={startName} type="hidden" value={startValue} />
      <input name={endName} type="hidden" value={endValue} />
      <button
        type="button"
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border-2 border-[#D6D5B2] bg-white px-3 py-2 text-left text-base font-semibold text-zinc-800 shadow-sm transition hover:border-[#8AB68E] focus:border-[#8AB68E] focus:outline-none focus:ring-4 focus:ring-[#8AB68E]/15 sm:min-h-12 sm:px-4 sm:text-lg",
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
        <span className="min-w-0">
          <span className={cn("block truncate", !startValue && "text-zinc-400")}>
            {displayStart}
          </span>
          {displayEnd ? (
            <span className="mt-0.5 block truncate text-xs font-semibold text-[#156240] sm:text-sm">
              {endLabel} · {displayEnd}
            </span>
          ) : null}
        </span>
        <CalendarDays className="h-5 w-5 shrink-0 text-[#156240]" aria-hidden />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[90] w-[min(22rem,calc(100vw-2rem))] rounded-xl border-2 border-[#8AB68E] bg-[#FEFFF9] p-2.5 shadow-[0_18px_48px_rgba(29,29,27,0.16)] max-sm:!fixed max-sm:!bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] max-sm:!left-3 max-sm:!right-3 max-sm:!top-auto max-sm:!w-auto max-sm:!translate-x-0 max-sm:overflow-y-auto max-sm:p-3 sm:p-3">
          {endDateKey ? (
            <button
              type="button"
              className="mb-2 text-xs font-semibold text-zinc-500 underline-offset-4 hover:text-[#156240] hover:underline"
              onClick={clearEnd}
            >
              {rangeCopy.removeEnd}
            </button>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink sm:text-base">
              {baseCopy.dateTime}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-full border border-[#D6D5B2] bg-white text-[#156240] transition hover:border-[#8AB68E] sm:h-8 sm:w-8"
                aria-label={baseCopy.previousMonth}
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-full border border-[#D6D5B2] bg-white text-[#156240] transition hover:border-[#8AB68E] sm:h-8 sm:w-8"
                aria-label={baseCopy.nextMonth}
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
              const isRangeStart = cell.dateKey === startDateKey;
              const isRangeEnd = cell.dateKey === endDateKey;
              const isInRange =
                Boolean(startDateKey && endDateKey) &&
                cell.dateKey > startDateKey &&
                cell.dateKey < endDateKey;
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
                    isInRange &&
                      !isDisabled &&
                      "bg-[#E4F0DF] text-[#156240]",
                    (isRangeStart || isRangeEnd) &&
                      !isDisabled &&
                      "bg-[#369758] text-white hover:bg-[#369758]",
                  )}
                  onClick={() => {
                    if (!isDisabled) {
                      selectDate(cell.dateKey);
                    }
                  }}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 rounded-xl border border-[#D6D5B2] bg-white px-2.5 py-2.5">
            <div className="grid gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#156240] sm:text-base">
                  <Clock3 className="h-4 w-4" aria-hidden />
                  {startLabel || rangeCopy.start}
                </div>
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                  <input
                    aria-label="start hour"
                    className="h-10 rounded-lg border-2 border-[#D6D5B2] bg-[#FEFFF9] px-3 text-center text-base font-bold text-zinc-800 outline-none transition focus:border-[#8AB68E] focus:ring-4 focus:ring-[#8AB68E]/15"
                    inputMode="numeric"
                    onBlur={(event) =>
                      handleTimeBlur("start", "hour", event.target.value)
                    }
                    onChange={(event) =>
                      updateTimePart("start", "hour", event.target.value)
                    }
                    placeholder="18"
                    type="text"
                    value={selectedHour}
                  />
                  <span className="text-lg font-bold text-[#156240]">:</span>
                  <input
                    aria-label="start minute"
                    className="h-10 rounded-lg border-2 border-[#D6D5B2] bg-[#FEFFF9] px-3 text-center text-base font-bold text-zinc-800 outline-none transition focus:border-[#8AB68E] focus:ring-4 focus:ring-[#8AB68E]/15"
                    inputMode="numeric"
                    onBlur={(event) =>
                      handleTimeBlur("start", "minute", event.target.value)
                    }
                    onChange={(event) =>
                      updateTimePart("start", "minute", event.target.value)
                    }
                    placeholder="00"
                    type="text"
                    value={selectedMinute}
                  />
                </div>
              </div>

              {endDateKey ? (
                <div className="border-t border-[#D6D5B2] pt-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#156240] sm:text-base">
                    <Clock3 className="h-4 w-4" aria-hidden />
                    {endLabel}
                  </div>
                  <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <input
                      aria-label="end hour"
                      className="h-10 rounded-lg border-2 border-[#D6D5B2] bg-[#FEFFF9] px-3 text-center text-base font-bold text-zinc-800 outline-none transition focus:border-[#8AB68E] focus:ring-4 focus:ring-[#8AB68E]/15"
                      inputMode="numeric"
                      onBlur={(event) =>
                        handleTimeBlur("end", "hour", event.target.value)
                      }
                      onChange={(event) =>
                        updateTimePart("end", "hour", event.target.value)
                      }
                      placeholder="19"
                      type="text"
                      value={selectedEndHour}
                    />
                    <span className="text-lg font-bold text-[#156240]">:</span>
                    <input
                      aria-label="end minute"
                      className="h-10 rounded-lg border-2 border-[#D6D5B2] bg-[#FEFFF9] px-3 text-center text-base font-bold text-zinc-800 outline-none transition focus:border-[#8AB68E] focus:ring-4 focus:ring-[#8AB68E]/15"
                      inputMode="numeric"
                      onBlur={(event) =>
                        handleTimeBlur("end", "minute", event.target.value)
                      }
                      onChange={(event) =>
                        updateTimePart("end", "minute", event.target.value)
                      }
                      placeholder="00"
                      type="text"
                      value={selectedEndMinute}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            className="mt-2.5 h-10 w-full rounded-full bg-[#369758] text-base font-semibold text-white transition hover:bg-[#156240]"
            onClick={handleDone}
          >
            {baseCopy.done}
          </button>
        </div>
      ) : null}

      <FieldError errors={startErrors} />
      <div data-field-name={endName} tabIndex={-1}>
        <FieldError errors={endErrors} />
      </div>
    </div>
  );
}

function MobileOptionPickerField({
  ariaInvalid = false,
  label,
  onValueChange,
  options,
  placeholder,
  value,
}: {
  ariaInvalid?: boolean;
  label: string;
  onValueChange: (value: string) => void;
  options: Array<{
    label: string;
    value: string;
  }>;
  placeholder: string;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);

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

  return (
    <div className="relative md:hidden" ref={pickerRef}>
      <button
        type="button"
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-xl border-2 border-[#D6D5B2] bg-white px-3 text-left text-base font-semibold text-zinc-800 shadow-sm transition hover:border-[#8AB68E] focus:border-[#8AB68E] focus:outline-none focus:ring-4 focus:ring-[#8AB68E]/15",
          ariaInvalid && invalidControlClassName,
        )}
        aria-expanded={isOpen}
        aria-invalid={ariaInvalid}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className={cn(!selectedOption && "text-zinc-400")}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronRight
          className={cn(
            "h-5 w-5 shrink-0 text-[#156240] transition",
            isOpen && "rotate-90",
          )}
          aria-hidden
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[90] w-[min(21rem,calc(100vw-2rem))] rounded-xl border-2 border-[#8AB68E] bg-[#FEFFF9] p-3 shadow-[0_18px_48px_rgba(29,29,27,0.16)] max-sm:!fixed max-sm:!bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] max-sm:!left-3 max-sm:!right-3 max-sm:!top-auto max-sm:!w-auto max-sm:!translate-x-0">
          <p className="px-1 text-sm font-semibold text-ink">{label}</p>
          <div className="relative mt-3 max-h-60 overflow-y-auto rounded-2xl border border-[#D6D5B2] bg-white py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="pointer-events-none absolute inset-x-2 top-1/2 h-12 -translate-y-1/2 rounded-xl bg-[#F1F2EC]/72 ring-1 ring-[#8AB68E]/30" />
            <div className="relative grid snap-y snap-mandatory gap-1 px-2 py-12">
              {options.map((option) => {
                const active = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "flex h-11 snap-center items-center justify-between rounded-xl px-4 text-left text-base font-semibold transition",
                      active
                        ? "bg-[#369758] text-white shadow-[0_8px_18px_rgba(21,98,64,0.18)]"
                        : "text-zinc-700 hover:bg-[#F1F2EC]",
                    )}
                    onClick={() => {
                      onValueChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    <span>{option.label}</span>
                    {active ? <Check className="h-4 w-4" aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CityPickerField({
  errors,
  label,
  locale,
  onCityChange,
  required = false,
  value,
}: {
  errors?: string[];
  label: string;
  locale: string;
  onCityChange: (city: string) => void;
  required?: boolean;
  value: string;
}) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const copy = getCityPickerCopy(locale);
  const selectedCity = value.trim() || "Paris";

  useEffect(() => {
    if (!isMoreOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMoreOpen]);

  function selectCity(city: string) {
    onCityChange(city);
    setIsMoreOpen(false);
    window.setTimeout(() => {
      hiddenInputRef.current?.dispatchEvent(
        new Event("input", { bubbles: true }),
      );
    }, 0);
  }

  return (
    <div
      className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
      data-field-name="city"
    >
      <span>
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      <input
        ref={hiddenInputRef}
        name="city"
        type="hidden"
        value={selectedCity}
      />
      <button
        type="button"
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-xl border-2 border-[#D6D5B2] bg-white px-3 text-left text-base font-semibold text-zinc-800 shadow-sm transition hover:border-[#8AB68E] focus:border-[#8AB68E] focus:outline-none focus:ring-4 focus:ring-[#8AB68E]/15",
          errors?.length && invalidControlClassName,
        )}
        aria-expanded={isMoreOpen}
        aria-invalid={Boolean(errors?.length)}
        onClick={() => setIsMoreOpen(true)}
      >
        <span>{selectedCity}</span>
        <ChevronRight className="h-5 w-5 shrink-0 text-[#156240]" aria-hidden />
      </button>
      <FieldError errors={errors} />

      {isMoreOpen ? (
        <div
          aria-labelledby="city-picker-title"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="max-h-[calc(100svh-env(safe-area-inset-bottom)-2rem)] w-full overflow-hidden rounded-[1.5rem] border-2 border-[#8AB68E] bg-[#FEFFF9] p-4 shadow-2xl sm:max-w-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                className="text-lg font-semibold text-ink"
                id="city-picker-title"
              >
                {copy.title}
              </h2>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-full border border-[#D6D5B2] bg-white px-3 text-sm font-semibold text-[#156240] transition hover:border-[#8AB68E]"
                onClick={() => setIsMoreOpen(false)}
              >
                {copy.close}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {primaryFrenchCities.map((city) => {
                const active = selectedCity === city;

                return (
                  <button
                    key={city}
                    type="button"
                    className={cn(
                      "h-9 rounded-full border px-3 text-sm font-semibold transition",
                      active
                        ? "border-[#369758] bg-[#369758] text-white"
                        : "border-[#D6D5B2] bg-white text-zinc-700 hover:border-[#8AB68E] hover:text-[#156240]",
                    )}
                    onClick={() => selectCity(city)}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid max-h-[48svh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {allFrenchCities.map((city) => {
                const active = selectedCity === city;

                return (
                  <button
                    key={city}
                    type="button"
                    className={cn(
                      "flex h-10 items-center justify-between rounded-xl border px-3 text-left text-sm font-semibold transition",
                      active
                        ? "border-[#369758] bg-[#369758] text-white"
                        : "border-[#D6D5B2] bg-white text-zinc-700 hover:border-[#8AB68E] hover:text-[#156240]",
                    )}
                    onClick={() => selectCity(city)}
                  >
                    <span>{city}</span>
                    {active ? (
                      <Check className="h-4 w-4 shrink-0" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FormSection({
  children,
  errorCount = 0,
}: {
  children: ReactNode;
  errorCount?: number;
}) {
  const hasErrors = errorCount > 0;

  return (
    <section
      className={cn(
        "min-w-0 border-b border-[#E9E2CE] pb-5 last:border-b-0 last:pb-0",
        hasErrors && "rounded-2xl bg-[#FFF7F5]/72 px-3 py-3 ring-1 ring-[#F09182]/45",
      )}
    >
      {hasErrors ? (
        <div className="mb-3 flex items-center gap-2">
          <span className="ml-auto inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full bg-[#F09182]/14 px-2 text-xs font-bold text-[#B5301F]">
            <CircleAlert className="h-3.5 w-3.5" aria-hidden />
            {errorCount}
          </span>
        </div>
      ) : null}
      <div className="grid gap-4">{children}</div>
    </section>
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
  description?: string;
  name: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  title: string;
}) {
  return (
    <label className="group grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-3 py-1 text-base text-zinc-700">
      <input
        checked={checked}
        className="peer sr-only"
        defaultChecked={defaultChecked}
        name={name}
        onChange={onChange}
        type="checkbox"
      />
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#CFC7AE] bg-white text-white transition peer-checked:border-[#156240] peer-checked:bg-[#156240] peer-checked:[&>svg]:opacity-100">
        <Check className="h-3.5 w-3.5 opacity-0 transition" />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-semibold leading-6 text-ink">
          {title}
        </span>
        {description ? (
          <span className="mt-1 block text-sm leading-6 text-zinc-600">
            {description}
          </span>
        ) : null}
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

function RequiredMark() {
  return (
    <span className="ml-0.5 text-[#D9402F]" aria-hidden="true">
      *
    </span>
  );
}

function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center">
      {children}
      <RequiredMark />
    </span>
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
      className="mx-auto h-12 w-full min-w-[11rem] gap-2 rounded-full bg-[#369758] px-6 text-base font-black text-white shadow-[0_12px_28px_rgba(54,151,88,0.24)] hover:bg-[#156240] sm:mx-0 sm:w-auto sm:min-w-0"
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
    <div className="grid gap-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)] md:pb-0">
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
  formId,
  initialValues,
  locale,
  mode = "create",
  showFormActions = true,
}: NewActivityFormProps) {
  const action = mode === "edit" ? updateActivityAction : createActivityAction;
  const [state, formAction] = useActionState(action, initialState);
  const values = state.values ?? initialValues;
  const activityType = values?.type ?? "LOCAL";
  const [category, setCategory] = useState(values?.category ?? "");
  const [city, setCity] = useState(values?.city?.trim() || "Paris");
  const [visibility, setVisibility] = useState(
    values?.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
  );
  const [priceType, setPriceType] = useState(
    normalizePriceTypeForSimpleMode(values?.priceType ?? "FREE"),
  );
  const [ticketLinkKind, setTicketLinkKind] = useState<TicketLinkKind>(() =>
    getInitialTicketLinkKind(values),
  );
  const [ticketUrl, setTicketUrl] = useState(values?.ticketUrl ?? "");
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
  const ticketLinkCopy = getTicketLinkKindCopy(locale);
  const isPublicEventTeam = Boolean(publicEventTeamFormCopy);
  const [isCapacityLimited, setIsCapacityLimited] = useState(
    values?.capacityLimitEnabled ?? Number(values?.capacity ?? 0) > 0,
  );
  const lastHandledErrorVersionRef = useRef<number | undefined>(undefined);
  const sectionErrorCounts = {
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
  useEffect(() => {
    if (!state.version || lastHandledErrorVersionRef.current === state.version) {
      return;
    }

    const firstError = getFirstErroredField(state.fieldErrors);

    if (!firstError) {
      return;
    }

    lastHandledErrorVersionRef.current = state.version;
    focusFieldAfterSectionSwitch(formRef.current, firstError.fieldName);
  }, [state.fieldErrors, state.version]);

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

  return (
    <Card className="w-full min-w-0 overflow-visible border-0 bg-transparent shadow-none">
      <CardContent className="min-w-0 bg-transparent p-0">
        <form
          key={state.version ?? 0}
          action={formAction}
          className="grid min-w-0 gap-5 sm:gap-6"
          id={formId}
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

          <div className="min-w-0">
            <FormSection
              errorCount={sectionErrorCounts["activity-content"]}
            >
            <div className="grid gap-2" data-field-name="coverImageUrl">
              <ActivityCoverUpload
                buttonOnlyUntilUploaded
                initialUrl={values?.coverImageUrl}
                label={getCoverUploadPrompt(locale)}
                locale={locale}
                onUploadingChange={setIsCoverUploading}
                splitPreviewBelow
              />
              <FieldError errors={state.fieldErrors?.coverImageUrl} />
            </div>

            <label
              className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
              data-field-name="title"
            >
              <RequiredLabel>
                {publicEventTeamFormCopy?.title ?? t.form.title}
              </RequiredLabel>
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

            <div className="grid gap-3" data-field-name="visibility">
              <div className="grid grid-cols-2 gap-2">
                {visibilityOptions.map((option) => {
                  const active = visibility === option;
                  const isPrivate = option === "PRIVATE";

                  return (
                    <label
                      key={option}
                      className={cn(
                        "flex h-11 cursor-pointer items-center justify-center rounded-full border px-4 text-base font-semibold transition",
                        active
                          ? "border-[#369758] bg-[#369758] text-white shadow-[0_8px_18px_rgba(21,98,64,0.16)]"
                          : "border-[#D6D5B2] bg-white/84 text-zinc-700 hover:border-[#8AB68E] hover:text-[#156240]",
                      )}
                    >
                      <input
                        className="sr-only"
                        name="visibility"
                        type="radio"
                        value={option}
                        checked={active}
                        onChange={() => setVisibility(option)}
                      />
                      <span>
                        {isPrivate
                          ? t.form.visibilityPrivate
                          : t.form.visibilityPublic}
                      </span>
                    </label>
                  );
                })}
              </div>
              <FieldError errors={state.fieldErrors?.visibility} />
            </div>

            <label
              className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
              data-field-name="description"
            >
              <span>
                {publicEventTeamFormCopy?.description ?? t.form.description}
              </span>
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
              />
              <FieldError errors={state.fieldErrors?.description} />
            </label>

            <input name="itinerary" type="hidden" value="" />

            <div className="grid gap-3">
              {!isPublicEventTeam ? (
                <>
                <input name="type" type="hidden" value={activityType} />
                <input name="category" type="hidden" value={category} />
                <div
                  className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
                  data-field-name="category"
                >
                  <RequiredLabel>
                    {getActivityCategoryFieldLabel(locale)}
                  </RequiredLabel>
                  <MobileOptionPickerField
                    ariaInvalid={Boolean(state.fieldErrors?.category)}
                    label={getActivityCategoryFieldLabel(locale)}
                    onValueChange={setCategory}
                    options={categoryOptions.map((option) => ({
                      label: getCategoryLabel(option, locale),
                      value: option,
                    }))}
                    placeholder={getCategoryPlaceholder(locale)}
                    value={category}
                  />
                  <Select
                    aria-invalid={Boolean(state.fieldErrors?.category)}
                    className={cn(
                      "hidden md:block",
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
                  <FieldError errors={state.fieldErrors?.category} />
                </div>
                </>
              ) : (
                <span />
              )}
            </div>

            {!isPublicEventTeam && category === "OTHER" ? (
              <label
                className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
                data-field-name="otherCategoryText"
              >
                <RequiredLabel>
                  {getOtherActivityCategoryFieldLabel(locale)}
                </RequiredLabel>
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
                <FieldError errors={state.fieldErrors?.otherCategoryText} />
              </label>
            ) : null}
            </FormSection>
          </div>

          <div className="min-w-0">
            <FormSection
              errorCount={sectionErrorCounts["time-location"]}
            >
            <CityPickerField
              errors={state.fieldErrors?.city}
              label={t.form.city}
              locale={locale}
              onCityChange={setCity}
              required
              value={city}
            />

            {activityType === "TRIP" ? (
              <label
                className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
                data-field-name="destination"
              >
                <RequiredLabel>{t.form.destination}</RequiredLabel>
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
                <FieldError errors={state.fieldErrors?.destination} />
              </label>
            ) : null}

            <div data-field-name="latitude">
              <ActivityPlacePicker
                addressErrors={state.fieldErrors?.address}
                addressFooter={
                  <label className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-full border border-[#D6D5B2] bg-white/82 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#8AB68E] hover:bg-white has-[:checked]:border-[#8AB68E] has-[:checked]:bg-[#F1F2EC] has-[:checked]:text-[#156240]">
                    <input
                      className="peer sr-only"
                      defaultChecked={values?.hideAddressFromNonParticipants}
                      name="hideAddressFromNonParticipants"
                      type="checkbox"
                    />
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-[#8E8383]/70 bg-white text-white transition peer-checked:border-[#156240] peer-checked:bg-[#156240] peer-checked:[&>svg]:opacity-100">
                      <Check className="h-3 w-3 opacity-0 transition" />
                    </span>
                    <span className="min-w-0 truncate">
                      {t.form.hideAddressFromNonParticipants}
                    </span>
                  </label>
                }
                addressInputClassName={cn(
                  compactInputClassName,
                  state.fieldErrors?.address?.length &&
                    invalidControlClassName,
                )}
                addressLabel={t.form.address}
                addressPlaceholder="République, Paris"
                addressRequired
                initialAddress={values?.address}
                initialLatitude={values?.latitude}
                initialLongitude={values?.longitude}
                latitudeErrors={state.fieldErrors?.latitude}
                locale={locale}
                longitudeErrors={state.fieldErrors?.longitude}
              />
            </div>

            <div className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg">
              <RequiredLabel>{t.form.startAt}</RequiredLabel>
              <DateTimeRangePickerField
                endDefaultValue={values?.endAt}
                endErrors={state.fieldErrors?.endAt}
                endLabel={t.form.endAt}
                endName="endAt"
                locale={locale}
                startDefaultValue={values?.startAt}
                startErrors={state.fieldErrors?.startAt}
                startLabel={t.form.startAt}
                startName="startAt"
              />
            </div>
            </FormSection>
          </div>

          <div className="min-w-0">
            <FormSection
              errorCount={sectionErrorCounts["people-price"]}
            >
            <SettingCheckbox
              checked={isCapacityLimited}
              name="capacityLimitEnabled"
              onChange={(event) => setIsCapacityLimited(event.target.checked)}
              title={t.form.capacityLimitToggle}
            />

            {isCapacityLimited ? (
              <div className="grid max-w-sm gap-3">
                <label
                  className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg"
                  data-field-name="capacity"
                >
                  <RequiredLabel>
                    {publicEventTeamFormCopy?.capacity ?? t.form.capacity}
                  </RequiredLabel>
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
                <input name="minParticipants" type="hidden" value="" />
              </div>
            ) : (
              <>
                <input name="capacity" type="hidden" value="0" />
                <input name="minParticipants" type="hidden" value="" />
              </>
            )}

            <div className="grid gap-3" data-field-name="priceType">
              <span className="text-base font-semibold text-zinc-700 sm:text-lg">
                {t.form.priceType}
              </span>
              <input name="priceType" type="hidden" value={priceType} />
              <div
                className={cn(
                  "grid items-start gap-2",
                  priceType === "FREE"
                    ? "grid-cols-2 sm:grid-cols-[10rem_10rem]"
                    : "grid-cols-[0.78fr_0.78fr_1.18fr]",
                )}
              >
                {(["FREE", "FIXED"] as const).map((value) => {
                  const active = priceType === value;
                  const priceModeCopy = getPriceModeCopy(locale);

                  return (
                    <button
                      key={value}
                      type="button"
                      className={cn(
                        "h-11 rounded-full border px-4 text-base font-semibold transition",
                        active
                          ? "border-[#369758] bg-[#369758] text-white shadow-[0_8px_18px_rgba(21,98,64,0.16)]"
                          : "border-[#D6D5B2] bg-white/84 text-zinc-700 hover:border-[#8AB68E] hover:text-[#156240]",
                      )}
                      aria-pressed={active}
                      onClick={() => setPriceType(value)}
                    >
                      {value === "FREE"
                        ? priceModeCopy.free
                        : priceModeCopy.paid}
                    </button>
                  );
                })}

                {priceType !== "FREE" ? (
                  <label
                    className="grid gap-2"
                    data-field-name="priceText"
                  >
                    <span className="sr-only">
                      {publicEventTeamFormCopy?.priceText ?? t.form.priceText}
                    </span>
                    <Input
                      className={cn(
                        compactInputClassName,
                        state.fieldErrors?.priceText?.length &&
                          invalidControlClassName,
                      )}
                      name="priceText"
                      aria-invalid={Boolean(state.fieldErrors?.priceText)}
                      defaultValue={
                        values?.priceType === "FREE" ? "" : values?.priceText
                      }
                      placeholder={getPriceModeCopy(locale).paidAmount}
                      required
                    />
                    <FieldError errors={state.fieldErrors?.priceText} />
                  </label>
                ) : (
                  <input name="priceText" type="hidden" value="" />
                )}
              </div>
              <FieldError errors={state.fieldErrors?.priceType} />
            </div>

            <div className="grid gap-3" data-field-name="ticketUrl">
              <span className="text-base font-semibold text-zinc-700 sm:text-lg">
                {ticketLinkCopy.title}
              </span>
              <input
                name="ticketLabel"
                type="hidden"
                value={ticketLinkKind}
              />
              {!ticketLinkKind ? (
                <>
                  <input name="ticketUrl" type="hidden" value="" />
                </>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["RESERVE_SPOT", ticketLinkCopy.reserve],
                    ["VIEW_DETAILS", ticketLinkCopy.details],
                  ] as const
                ).map(([value, label]) => {
                  const active = ticketLinkKind === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      className={cn(
                        "h-11 rounded-full border px-3 text-sm font-semibold transition sm:text-base",
                        active
                          ? "border-[#369758] bg-[#369758] text-white shadow-[0_8px_18px_rgba(21,98,64,0.16)]"
                          : "border-[#D6D5B2] bg-white/84 text-zinc-700 hover:border-[#8AB68E] hover:text-[#156240]",
                      )}
                      aria-pressed={active}
                      onClick={() =>
                        setTicketLinkKind((currentKind) =>
                          currentKind === value ? "" : value,
                        )
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {ticketLinkKind ? (
                <label className="grid gap-2">
                  <span className="sr-only">{t.form.ticketUrl}</span>
                  <Input
                    className={cn(
                      compactInputClassName,
                      state.fieldErrors?.ticketUrl?.length &&
                        invalidControlClassName,
                    )}
                    name="ticketUrl"
                    aria-invalid={Boolean(state.fieldErrors?.ticketUrl)}
                    inputMode="url"
                    onChange={(event) => setTicketUrl(event.target.value)}
                    placeholder={t.form.ticketUrlPlaceholder}
                    required
                    type="url"
                    value={ticketUrl}
                  />
                </label>
              ) : null}

              <FieldError errors={state.fieldErrors?.ticketUrl} />
              <FieldError errors={state.fieldErrors?.ticketLabel} />
            </div>

            <SettingCheckbox
              defaultChecked={values?.requiresApproval}
              name="requiresApproval"
              title={t.form.requiresApproval}
            />
            </FormSection>
          </div>

          {showFormActions ? (
            <FormActions
              cancelHref={cancelHref}
              isCoverUploading={isCoverUploading}
              locale={locale}
              mode={mode}
            />
          ) : null}

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
