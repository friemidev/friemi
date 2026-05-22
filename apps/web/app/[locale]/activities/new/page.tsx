import { requireUser } from "@/lib/auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from "@chill-club/ui";

type NewActivityPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function NewActivityPage({ params }: NewActivityPageProps) {
  const { locale } = await params;
  await requireUser(locale);

  return (
    <PageContainer className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">发起活动</h1>
        <p className="mt-2 text-sm text-zinc-600">当前是表单 UI 和 zod schema 占位，下一阶段接入真实创建逻辑。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基础信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5">
            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              标题
              <Input name="title" placeholder="例如：周五下班后桌游局" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              描述
              <Textarea name="description" placeholder="介绍活动内容、适合人群、注意事项" />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                分类
                <Input name="category" placeholder="BOARD_GAME" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                城市
                <Input name="city" defaultValue="Paris" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              地址
              <Input name="address" placeholder="République, Paris" />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                开始时间
                <Input name="startAt" type="datetime-local" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                人数上限
                <Input name="capacity" type="number" min={2} defaultValue={6} />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              费用说明
              <Input name="priceText" placeholder="免费 / AA 预计 10 欧 / 门票自理" />
            </label>
            <Button type="button">保存占位</Button>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
