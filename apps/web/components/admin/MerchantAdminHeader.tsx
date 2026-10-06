import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

type MerchantAdminHeaderProps = {
  actions?: React.ReactNode;
  backHref: string;
  backLabel: string;
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  title: string;
};

export function MerchantAdminHeader({
  actions,
  backHref,
  backLabel,
  description,
  eyebrow,
  icon: Icon,
  title,
}: MerchantAdminHeaderProps) {
  return (
    <header className="overflow-hidden rounded-[1.75rem] border border-[#DBE5D8] bg-white shadow-[0_18px_45px_-38px_rgba(29,65,44,0.45)]">
      <div className="flex min-h-16 items-center justify-between gap-3 border-b border-[#E5EBE1] bg-[#F4F8F2] px-5 py-3 sm:px-7">
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[#24583E] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B49]"
          href={backHref}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          {backLabel}
        </Link>
        <span className="hidden text-[11px] font-bold tracking-[0.16em] text-[#63816D] sm:block">
          FRIEMI / ADMIN
        </span>
      </div>
      <div className="flex flex-col gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#E7F2E9] text-[#176B49] sm:h-14 sm:w-14">
            <Icon aria-hidden="true" className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.12em] text-[#176B49]">
              {eyebrow}
            </p>
            <h1 className="mt-1 break-words text-2xl font-bold leading-tight tracking-tight text-[#1D3024] sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#58675B]">
              {description}
            </p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2 lg:shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
