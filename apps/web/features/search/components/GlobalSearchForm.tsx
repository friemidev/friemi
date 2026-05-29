import Link from "next/link";
import { Search } from "lucide-react";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  globalSearchQueryMaxLength,
  normalizeGlobalSearchQuery,
} from "../utils/searchQuery";

type GlobalSearchFormProps = {
  className?: string;
  defaultQuery?: string;
  locale: string;
  variant?: "header" | "page";
};

export function GlobalSearchForm({
  className,
  defaultQuery = "",
  locale,
  variant = "header",
}: GlobalSearchFormProps) {
  const t = getCopy(locale).globalSearch;
  const isPage = variant === "page";

  return (
    <form
      action={withLocale(locale, "/search")}
      className={cn(
        "relative flex min-w-0 items-center",
        isPage ? "w-full" : "w-64 xl:w-80",
        className,
      )}
      role="search"
    >
      <label className="sr-only" htmlFor={`global-search-${variant}`}>
        {t.inputLabel}
      </label>
      <Search
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-3 shrink-0 text-zinc-400",
          isPage ? "h-5 w-5" : "h-4 w-4",
        )}
      />
      <input
        id={`global-search-${variant}`}
        name="q"
        type="search"
        defaultValue={normalizeGlobalSearchQuery(defaultQuery)}
        maxLength={globalSearchQueryMaxLength}
        placeholder={t.placeholder}
        className={cn(
          "min-w-0 flex-1 rounded-full border border-black/10 bg-white/85 pl-10 text-ink outline-none shadow-sm transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200",
          isPage ? "h-12 pr-14 text-base sm:pr-32" : "h-10 pr-12 text-sm",
        )}
      />
      <button
        type="submit"
        aria-label={t.submit}
        className={cn(
          "absolute right-1 inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-ink font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300",
          isPage ? "h-10 w-10 px-0 text-sm sm:w-auto sm:px-4" : "h-8 w-8",
        )}
      >
        {isPage ? (
          <>
            <Search className="h-4 w-4 sm:hidden" aria-hidden="true" />
            <span className="hidden sm:inline">{t.submit}</span>
          </>
        ) : (
          <Search className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </form>
  );
}

export function GlobalSearchIconLink({ locale }: { locale: string }) {
  const t = getCopy(locale).globalSearch;

  return (
    <Link
      aria-label={t.mobileOpen}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/75 text-zinc-700 shadow-sm ring-1 ring-black/10 transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 xl:hidden"
      href={withLocale(locale, "/search")}
      title={t.mobileOpen}
    >
      <Search className="h-5 w-5" aria-hidden="true" />
    </Link>
  );
}
