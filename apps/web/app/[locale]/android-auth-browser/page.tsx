import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import {
  androidAuthFlowPattern,
  androidAuthProofPattern,
  normalizeAndroidAuthTarget,
} from "@/features/auth/androidAuthFlow";
import { AndroidAuthBrowserComplete } from "@/features/auth/components/AndroidAuthBrowserComplete";
import { getSignInHref } from "@/lib/auth-redirect";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default async function AndroidAuthBrowserPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ flow?: string; challenge?: string; target?: string }>;
}) {
  const { locale } = await params;
  const { flow, challenge, target: rawTarget } = await searchParams;
  if (
    typeof flow !== "string" ||
    !androidAuthFlowPattern.test(flow) ||
    typeof challenge !== "string" ||
    !androidAuthProofPattern.test(challenge)
  )
    notFound();
  if (/\bFriemiAndroid\//i.test((await headers()).get("user-agent") ?? "")) {
    const copy =
      locale === "zh-CN"
        ? {
            title: "需要更新 Friemi",
            body: "此版本无法完成浏览器登录返回，请更新 Android App 后重试。",
            back: "返回",
          }
        : locale === "fr"
          ? {
              title: "Mise à jour nécessaire",
              body: "Cette version ne peut pas terminer la connexion depuis le navigateur. Mettez à jour l'app Android puis réessayez.",
              back: "Retour",
            }
          : {
              title: "Update Friemi",
              body: "This version cannot finish browser sign-in. Update the Android app and try again.",
              back: "Back",
            };
    return (
      <main className="auth-page-shell flex min-h-svh items-center justify-center bg-white px-5 py-10">
        <div className="w-full max-w-sm space-y-5 text-center">
          <h1 className="text-xl font-bold text-[#1D1D1B]">{copy.title}</h1>
          <p role="alert" className="text-sm leading-6 text-[#B5301F]">
            {copy.body}
          </p>
          <Link
            href={`/${locale}/home`}
            prefetch={false}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#156240] px-5 py-3 text-sm font-bold text-white"
          >
            {copy.back}
          </Link>
        </div>
      </main>
    );
  }
  const target = normalizeAndroidAuthTarget(
    locale,
    typeof rawTarget === "string" ? rawTarget : undefined,
  );
  if (!(await auth()).userId)
    redirect(
      getSignInHref(
        locale,
        `/${locale}/android-auth-browser?${new URLSearchParams({ flow, challenge, target })}`,
      ),
    );
  const user = await currentUser();
  const account =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Friemi";
  return (
    <AndroidAuthBrowserComplete
      locale={locale}
      flow={flow}
      challenge={challenge}
      target={target}
      account={account}
    />
  );
}
