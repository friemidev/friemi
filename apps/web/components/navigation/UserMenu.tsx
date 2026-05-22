import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "@chill-club/ui";
import { withLocale } from "@/lib/routes";
import { hasClerkKeys } from "@/lib/clerk";

type UserMenuProps = {
  locale: string;
};

export function UserMenu({ locale }: UserMenuProps) {
  if (!hasClerkKeys()) {
    return (
      <Link href={withLocale(locale, "/sign-in")}>
        <Button variant="secondary">登录</Button>
      </Link>
    );
  }

  return (
    <>
      <SignedIn>
        <UserButton afterSignOutUrl={`/${locale}`} />
      </SignedIn>
      <SignedOut>
        <Link href={withLocale(locale, "/sign-in")}>
          <Button variant="secondary">登录</Button>
        </Link>
      </SignedOut>
    </>
  );
}
