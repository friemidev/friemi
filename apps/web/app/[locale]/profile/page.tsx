import { ensureCurrentUserProfile } from "@/lib/auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";

type ProfilePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale);

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">个人空间</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {profile.nickname}，这里会管理你发起和参与的活动。
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <EmptyState title="我发起的活动" description="创建活动功能接入后，这里会展示你发布的活动。" />
        <EmptyState title="我参与的活动" description="报名功能接入后，这里会展示你的报名记录。" />
      </section>
    </PageContainer>
  );
}
