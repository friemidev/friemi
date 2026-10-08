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
      <div className="flex min-w-0 items-center gap-3">
        <Link
          aria-label={backLabel}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-ink transition hover:bg-sand/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          href={backHref}
          title={backLabel}
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {title}
        </h1>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {description ? (
        <p className="max-w-2xl pl-14 text-sm leading-6 text-ink/70">
          {description}
        </p>
      ) : null}
    </header>
  );
}
