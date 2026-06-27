"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";

type PaginationControlProps =
  | {
      basePath: string;
      currentPage: number;
      locale: string;
      mode: "link";
      query?: Record<string, string | number | boolean | null | undefined>;
      totalPages: number;
    }
  | {
      currentPage: number;
      locale: string;
      mode: "callback";
      onPageChange: (page: number) => void;
      scrollTargetId?: string;
      totalPages: number;
    };

type PageItem = number | "ellipsis";

function getPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);

  if (currentPage <= 4) {
    [2, 3, 4, 5].forEach((page) => pages.add(page));
  } else if (currentPage >= totalPages - 3) {
    [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1].forEach(
      (page) => pages.add(page),
    );
  } else {
    pages.add(currentPage - 1);
    pages.add(currentPage + 1);
  }

  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  return sortedPages.flatMap((page, index) => {
    const previousPage = sortedPages[index - 1];

    if (!previousPage || page - previousPage === 1) {
      return [page];
    }

    return ["ellipsis" as const, page];
  });
}

function getValidatedPage(value: string, totalPages: number) {
  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  const parsed = Number.parseInt(trimmedValue, 10);

  if (parsed < 1 || parsed > totalPages) {
    return null;
  }

  return parsed;
}

export function PaginationControl(props: PaginationControlProps) {
  const { currentPage, locale, totalPages } = props;
  const t = getCopy(locale).activityPagination;
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState(false);
  const pageItems = useMemo(
    () => getPageItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  if (totalPages <= 1) {
    return null;
  }

  const progressPercent = Math.round((currentPage / totalPages) * 100);
  const previousPage = Math.max(currentPage - 1, 1);
  const nextPage = Math.min(currentPage + 1, totalPages);
  const previousDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  const getHref = (page: number) => {
    if (props.mode !== "link") {
      return "#";
    }

    const params = new URLSearchParams();

    Object.entries(props.query ?? {}).forEach(([key, value]) => {
      if (
        value === null ||
        value === undefined ||
        value === "" ||
        value === false
      ) {
        return;
      }

      params.set(key, String(value));
    });

    if (page > 1) {
      params.set("page", String(page));
    } else {
      params.delete("page");
    }

    const queryString = params.toString();

    return queryString ? `${props.basePath}?${queryString}` : props.basePath;
  };

  const goToPage = (page: number) => {
    if (props.mode === "link") {
      window.location.assign(getHref(page));
      return;
    }

    props.onPageChange(page);

    if (props.scrollTargetId) {
      requestAnimationFrame(() => {
        document
          .getElementById(props.scrollTargetId ?? "")
          ?.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    }
  };

  const renderPageLink = (page: number) => {
    const isCurrent = page === currentPage;
    const className = cn(
      "hidden h-8 min-w-8 items-center justify-center rounded-full px-2.5 text-sm font-semibold transition min-[520px]:inline-flex",
      isCurrent
        ? "bg-[#049d73] text-white shadow-sm"
        : "text-[#405b4d] hover:bg-white",
    );

    if (props.mode === "link") {
      return (
        <Link
          key={page}
          href={getHref(page)}
          prefetch={false}
          aria-current={isCurrent ? "page" : undefined}
          className={className}
        >
          {page}
        </Link>
      );
    }

    return (
      <button
        key={page}
        type="button"
        aria-current={isCurrent ? "page" : undefined}
        className={className}
        onClick={() => goToPage(page)}
      >
        {page}
      </button>
    );
  };

  const sideButtonClassName =
    "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-semibold text-[#315b48] ring-1 ring-sand-strong transition hover:bg-white disabled:cursor-not-allowed disabled:text-zinc-400 disabled:ring-sand";

  const sideButton = (
    page: number,
    disabled: boolean,
    direction: "previous" | "next",
  ) => {
    const content =
      direction === "previous" ? (
        <>
          <ChevronLeft className="h-4 w-4 shrink-0" />
          {t.previous}
        </>
      ) : (
        <>
          {t.next}
          <ChevronRight className="h-4 w-4 shrink-0" />
        </>
      );

    if (props.mode === "link") {
      return disabled ? (
        <span
          className={cn(
            sideButtonClassName,
            "justify-self-stretch bg-white/35 opacity-70",
          )}
        >
          {content}
        </span>
      ) : (
        <Link
          href={getHref(page)}
          prefetch={false}
          className={cn(sideButtonClassName, "justify-self-stretch")}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        type="button"
        className={cn(sideButtonClassName, "justify-self-stretch")}
        disabled={disabled}
        onClick={() => goToPage(page)}
      >
        {content}
      </button>
    );
  };

  return (
    <nav
      aria-label={t.ariaLabel}
      className="mx-auto flex w-full max-w-[46rem] flex-col items-stretch gap-2 border-t border-sand pt-3 sm:flex-row sm:items-center sm:justify-center sm:gap-3"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-full bg-white p-1 ring-1 ring-sand sm:inline-flex sm:grid-cols-none sm:justify-center">
        {sideButton(previousPage, previousDisabled, "previous")}
        <div className="min-w-20 text-center min-[520px]:hidden">
          <p className="text-xs font-semibold text-[#315b48]">
            {t.pageSummary(currentPage, totalPages)}
          </p>
          <div className="mx-auto mt-1 h-1 w-14 overflow-hidden rounded-full bg-sand">
            <div
              className="h-full rounded-full bg-[#049d73]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className="hidden items-center justify-center gap-0.5 min-[520px]:flex">
          {pageItems.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex h-8 min-w-7 items-center justify-center text-sm font-semibold text-zinc-400"
                aria-hidden="true"
              >
                ...
              </span>
            ) : (
              renderPageLink(item)
            ),
          )}
        </div>
        {sideButton(nextPage, nextDisabled, "next")}
      </div>

      <form
        className="flex flex-wrap items-center justify-center gap-1.5 text-xs sm:flex-nowrap"
        onSubmit={(event) => {
          event.preventDefault();
          const page = getValidatedPage(inputValue, totalPages);

          if (!page) {
            setError(true);
            return;
          }

          setError(false);
          setInputValue("");
          goToPage(page);
        }}
      >
        <span className="text-xs font-medium text-[#587465]">
          {t.jumpLabel}
        </span>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label={t.jumpInputLabel}
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            setError(false);
          }}
          placeholder={String(currentPage)}
          className={cn(
            "h-8 w-14 rounded-full border bg-white px-2 text-center text-sm font-semibold text-ink outline-none transition focus:border-[#049d73] focus:ring-2 focus:ring-[#049d73]/18",
            error ? "border-[#d96f55]" : "border-sand-strong",
          )}
        />
        <span className="text-xs text-zinc-500">
          {t.totalPages(totalPages)}
        </span>
        <button
          type="submit"
          className="inline-flex h-8 items-center justify-center rounded-full bg-[#006e4d] px-3.5 text-xs font-semibold text-white transition hover:bg-[#049d73]"
        >
          {t.jumpAction}
        </button>
        {error ? (
          <span className="basis-full text-center text-xs text-[#b95f49]">
            {t.invalidPage(totalPages)}
          </span>
        ) : null}
      </form>
    </nav>
  );
}
