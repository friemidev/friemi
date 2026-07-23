"use client";

import { Check, WandSparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ActivityCategory } from "@chill-club/shared";
import { Button, Textarea } from "@chill-club/ui";
import { getCategoryLabel } from "@/lib/copy";
import { cn } from "@/lib/utils";
import {
  parseActivityTextImport,
  type ActivityTextImportDraft,
  type ActivityTextImportFieldKey,
  type ActivityTextImportResult,
} from "../utils/activityTextImport";

type ActivityTextImportPanelProps = {
  locale: string;
  onApply: (draft: ActivityTextImportDraft) => void;
};

type TextImportCopy = {
  applied: string;
  apply: string;
  clear: string;
  close: string;
  empty: string;
  found: (count: number) => string;
  parse: string;
  placeholder: string;
  tag: string;
  title: string;
  trigger: string;
};

const importFieldLabels: Record<
  ActivityTextImportFieldKey,
  { en: string; fr: string; zh: string }
> = {
  address: { en: "Address", fr: "Adresse", zh: "地点" },
  capacity: { en: "Seats", fr: "Places", zh: "人数" },
  capacityLimitEnabled: { en: "Seat limit", fr: "Limite", zh: "人数限制" },
  category: { en: "Type", fr: "Type", zh: "类型" },
  city: { en: "City", fr: "Ville", zh: "城市" },
  description: { en: "Description", fr: "Description", zh: "说明" },
  destination: { en: "Destination", fr: "Destination", zh: "目的地" },
  endAt: { en: "End", fr: "Fin", zh: "结束" },
  minParticipants: { en: "Minimum", fr: "Minimum", zh: "成局" },
  priceText: { en: "Amount", fr: "Montant", zh: "费用" },
  priceType: { en: "Price", fr: "Prix", zh: "费用类型" },
  requiresApproval: { en: "Approval", fr: "Validation", zh: "审核" },
  startAt: { en: "Start", fr: "Début", zh: "开始" },
  ticketLabel: { en: "Link CTA", fr: "Bouton", zh: "链接按钮" },
  ticketUrl: { en: "Link", fr: "Lien", zh: "链接" },
  title: { en: "Title", fr: "Titre", zh: "标题" },
  type: { en: "Format", fr: "Format", zh: "形式" },
  visibility: { en: "Visibility", fr: "Visibilité", zh: "可见范围" },
};

export function ActivityTextImportPanel({
  locale,
  onApply,
}: ActivityTextImportPanelProps) {
  const copy = getTextImportCopy(locale);
  const [sourceText, setSourceText] = useState("");
  const [result, setResult] = useState<ActivityTextImportResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const trimmedText = sourceText.trim();
  const canApply = Boolean(result?.fields.length);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  function handleParse() {
    if (!trimmedText) {
      setResult(null);
      setApplied(false);
      return;
    }

    setResult(parseActivityTextImport(trimmedText));
    setApplied(false);
  }

  function handleApply() {
    if (!result?.fields.length) {
      return;
    }

    onApply(result.draft);
    setApplied(true);
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex h-8 max-w-[8.25rem] shrink-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border border-[#8AB68E]/70 bg-[#E7F1E7] px-2.5 text-xs font-black leading-none text-[#156240] shadow-[0_8px_18px_rgba(21,98,64,0.08)] transition hover:border-[#156240] hover:bg-[#DDECDD] focus:outline-none focus:ring-2 focus:ring-[#8AB68E]/35 sm:h-9 sm:max-w-[9rem] sm:px-3 sm:text-sm"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
      >
        <WandSparkles
          className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
          aria-hidden
        />
        <span className="min-w-0 truncate">{copy.trigger}</span>
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center overflow-hidden bg-[#1D1D1B]/42 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-sm sm:items-center sm:p-6"
          role="presentation"
          onClick={() => setIsOpen(false)}
        >
          <section
            aria-labelledby="activity-text-import-title"
            aria-modal="true"
            className="max-h-[calc(100svh-env(safe-area-inset-bottom)-1.5rem)] w-full max-w-[min(32rem,calc(100vw-1.5rem))] overflow-y-auto overflow-x-hidden rounded-[1.15rem] border border-[#D6D5B2] bg-[#FEFFF9] shadow-[0_24px_80px_rgba(29,29,27,0.22)]"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid min-w-0 gap-4 px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7F1E7] text-[#156240]">
                    <WandSparkles className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h2
                      className="truncate text-base font-black text-ink sm:text-lg"
                      id="activity-text-import-title"
                    >
                      {copy.title}
                    </h2>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="max-w-[5.5rem] truncate whitespace-nowrap rounded-full border border-[#8AB68E]/60 bg-white px-2.5 py-1 text-xs font-bold text-[#156240]">
                    {copy.tag}
                  </span>
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-full border border-[#D6D5B2] bg-white text-zinc-600 transition hover:border-[#8AB68E] hover:text-[#156240]"
                    aria-label={copy.close}
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>

              <Textarea
                className="min-h-36 rounded-xl border border-[#D8D2C2] bg-white px-3 py-2.5 text-base font-medium leading-7 text-zinc-800 shadow-[0_1px_0_rgba(29,29,27,0.03)] placeholder:text-zinc-400 focus:border-[#8AB68E] focus:ring-2 focus:ring-[#8AB68E]/15"
                onChange={(event) => {
                  setSourceText(event.target.value);
                  setResult(null);
                  setApplied(false);
                }}
                placeholder={copy.placeholder}
                value={sourceText}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  className="h-10 max-w-full whitespace-nowrap rounded-full bg-[#369758] px-4 text-sm font-bold text-white hover:bg-[#156240]"
                  disabled={!trimmedText}
                  onClick={handleParse}
                >
                  <WandSparkles
                    className="mr-1.5 h-4 w-4 shrink-0"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">{copy.parse}</span>
                </Button>
                {sourceText ? (
                  <button
                    type="button"
                    className="inline-flex h-10 max-w-full items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border border-[#D6D5B2] bg-white px-3 text-sm font-bold text-zinc-700 transition hover:border-[#8AB68E] hover:text-[#156240]"
                    onClick={() => {
                      setSourceText("");
                      setResult(null);
                      setApplied(false);
                    }}
                  >
                    <X className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="min-w-0 truncate">{copy.clear}</span>
                  </button>
                ) : null}
              </div>

              {result ? (
                <div className="grid min-w-0 gap-3 overflow-hidden border-t border-[#E9E2CE] pt-3">
                  {result.fields.length ? (
                    <>
                      <div className="flex min-w-0 flex-wrap gap-2 overflow-hidden">
                        {result.fields.map((field) => (
                          <span
                            key={field.key}
                            className="inline-flex max-w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-full bg-[#F1F2EC] px-3 py-1.5 text-xs font-bold text-zinc-700 ring-1 ring-[#D6D5B2]"
                          >
                            <span className="shrink-0 text-[#156240]">
                              {getImportFieldLabel(field.key, locale)}
                            </span>
                            <span className="min-w-0 max-w-[min(15rem,52vw)] truncate">
                              {formatImportValue(
                                field.key,
                                field.value,
                                locale,
                              )}
                            </span>
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#156240]">
                          {applied
                            ? copy.applied
                            : copy.found(result.fields.length)}
                        </span>
                        <Button
                          type="button"
                          className={cn(
                            "h-10 max-w-full whitespace-nowrap rounded-full px-4 text-sm font-bold",
                            applied
                              ? "bg-[#E7F1E7] text-[#156240] hover:bg-[#E7F1E7]"
                              : "bg-[#1D1D1B] text-white hover:bg-[#156240]",
                          )}
                          disabled={!canApply}
                          onClick={handleApply}
                        >
                          {applied ? (
                            <Check
                              className="mr-1.5 h-4 w-4 shrink-0"
                              aria-hidden
                            />
                          ) : null}
                          <span className="min-w-0 truncate">{copy.apply}</span>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm font-semibold text-zinc-500">
                      {copy.empty}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function getTextImportCopy(locale: string): TextImportCopy {
  if (locale === "fr") {
    return {
      applied: "Rempli",
      apply: "Remplir",
      clear: "Effacer",
      close: "Fermer",
      empty: "Aucun champ reconnu.",
      found: (count) => `${count} champs reconnus`,
      parse: "Reconnaître",
      placeholder:
        "Collez un message déjà rédigé : titre, heure, lieu, places, budget...",
      tag: "Local",
      title: "Importer un texte",
      trigger: "Reconnaître",
    };
  }

  if (locale === "en") {
    return {
      applied: "Filled",
      apply: "Fill form",
      clear: "Clear",
      close: "Close",
      empty: "No fields detected.",
      found: (count) => `${count} fields detected`,
      parse: "Detect",
      placeholder:
        "Paste a prepared invite: title, time, place, seats, price...",
      tag: "Local",
      title: "Import from text",
      trigger: "Smart detect",
    };
  }

  return {
    applied: "已填入",
    apply: "填入表单",
    clear: "清空",
    close: "关闭",
    empty: "未识别到可填字段。",
    found: (count) => `识别到 ${count} 项`,
    parse: "识别",
    placeholder: "粘贴已写好的组局文案：标题、时间、地点、人数、费用...",
    tag: "本地识别",
    title: "从文案导入",
    trigger: "智能识别",
  };
}

function getImportFieldLabel(key: ActivityTextImportFieldKey, locale: string) {
  const labels = importFieldLabels[key];

  if (locale === "fr") {
    return labels.fr;
  }

  if (locale === "en") {
    return labels.en;
  }

  return labels.zh;
}

function formatImportValue(
  key: ActivityTextImportFieldKey,
  value: string | boolean,
  locale: string,
) {
  if (typeof value === "boolean") {
    return formatBoolean(value, locale);
  }

  if (key === "category") {
    return getCategoryLabel(value as ActivityCategory, locale);
  }

  if (key === "type") {
    return value === "TRIP"
      ? locale === "fr"
        ? "Voyage"
        : locale === "en"
          ? "Trip"
          : "旅行搭子"
      : locale === "fr"
        ? "Local"
        : locale === "en"
          ? "Local"
          : "本地局";
  }

  if (key === "visibility") {
    return value === "PRIVATE"
      ? locale === "fr"
        ? "Privé"
        : locale === "en"
          ? "Private"
          : "私人局"
      : locale === "fr"
        ? "Public"
        : locale === "en"
          ? "Public"
          : "开放局";
  }

  if (key === "priceType") {
    return value === "FREE"
      ? locale === "fr"
        ? "Gratuit"
        : locale === "en"
          ? "Free"
          : "免费"
      : locale === "fr"
        ? "Payant"
        : locale === "en"
          ? "Paid"
          : "收费";
  }

  if (key === "description") {
    return locale === "fr"
      ? "Texte complet"
      : locale === "en"
        ? "Full text"
        : "原文";
  }

  if (key === "startAt" || key === "endAt") {
    return value.replace("T", " ");
  }

  return value;
}

function formatBoolean(value: boolean, locale: string) {
  if (locale === "fr") {
    return value ? "Oui" : "Non";
  }

  if (locale === "en") {
    return value ? "Yes" : "No";
  }

  return value ? "是" : "否";
}
