import { AndroidAuthCompleteRedirect } from "@/features/auth/components/AndroidAuthCompleteRedirect";
import {
  androidAuthCompleteTargetParamName,
  normalizeAuthRedirectTarget,
} from "@/lib/auth-redirect";

export const dynamic = "force-dynamic";

type AndroidAuthCompletePageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    [androidAuthCompleteTargetParamName]?: string | string[];
  }>;
};

export default async function AndroidAuthCompletePage({
  params,
  searchParams,
}: AndroidAuthCompletePageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const target = normalizeAuthRedirectTarget(
    locale,
    query?.[androidAuthCompleteTargetParamName],
  );

  return <AndroidAuthCompleteRedirect locale={locale} target={target} />;
}
