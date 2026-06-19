"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@chill-club/ui";
import { getSignInHref } from "@/lib/auth-redirect";

type AuthRedirectSignInButtonProps = {
  label: string;
  locale: string;
};

export function AuthRedirectSignInButton({
  label,
  locale,
}: AuthRedirectSignInButtonProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hash, setHash] = useState("");
  const search = searchParams.toString();
  const redirectTarget = `${pathname}${search ? `?${search}` : ""}${hash}`;

  useEffect(() => {
    const syncHash = () => {
      setHash(window.location.hash);
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  return (
    <Link href={getSignInHref(locale, redirectTarget)}>
      <Button variant="secondary">{label}</Button>
    </Link>
  );
}
