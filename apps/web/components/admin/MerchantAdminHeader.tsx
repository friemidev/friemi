import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type MerchantAdminHeaderProps = {
  actions?: React.ReactNode;
  backHref: string;
  backLabel: string;
  description?: string;
  title: string;
};

export function MerchantAdminHeader({
  actions,
  backHref,
  backLabel,
  description,
  title,
}: MerchantAdminHeaderProps) {
  return (
    <header className="space-y-3">
      <Link
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#24583E] transition hover:text-[#176B49] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B49]"
        href={backHref}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {backLabel}
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold leading-tight tracking-tight text-[#1D3024] sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#58675B]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 sm:shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
