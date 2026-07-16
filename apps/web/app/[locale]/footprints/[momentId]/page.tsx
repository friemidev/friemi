import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MomentDetailMobilePage } from "@/features/moments/components/MomentDetailMobilePage";
import { getMomentDetail } from "@/features/moments/queries/getMomentFeed";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildCanonicalUrl,
  buildDetailShareMetadata,
  getCanonicalMetadataBaseUrl,
} from "@/lib/share-metadata";

type MomentDetailPageProps = {
  params: Promise<{
    locale: string;
    momentId: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: MomentDetailPageProps): Promise<Metadata> {
  const { locale, momentId } = await params;
  const title = locale === "zh-CN" ? "足迹详情" : "Moment detail";
  const canonicalUrl = buildCanonicalUrl(
    getCanonicalMetadataBaseUrl(),
    `/${locale}/footprints/${momentId}`,
  );
  const publicMoment = await prisma.moment.findFirst({
    where: {
      deletedAt: null,
      id: momentId,
      visibility: "PUBLIC",
    },
    select: {
      author: {
        select: {
          nickname: true,
        },
      },
      content: true,
      images: {
        orderBy: {
          sortOrder: "asc",
        },
        take: 1,
        select: {
          url: true,
        },
      },
    },
  });

  if (publicMoment) {
    const authorName = publicMoment.author.nickname.trim() || "Friemi";
    const momentTitle =
      locale === "zh-CN"
        ? `${authorName} 的足迹`
        : locale === "fr"
          ? `Moment de ${authorName}`
          : `${authorName}'s moment`;
    const description =
      publicMoment.content?.trim() ||
      (locale === "zh-CN"
        ? "在 Friemi 记录这一刻。"
        : locale === "fr"
          ? "Un moment partagé sur Friemi."
          : "A moment shared on Friemi.");

    return buildDetailShareMetadata({
      canonicalUrl,
      coverImageUrl: publicMoment.images[0]?.url,
      description,
      title: momentTitle,
    });
  }

  return {
    alternates: {
      canonical: canonicalUrl,
    },
    title: `${title} | Friemi`,
  };
}

export default async function MomentDetailPage({
  params,
}: MomentDetailPageProps) {
  const { locale, momentId } = await params;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/footprints/${momentId}`,
  );
  const moment = await getMomentDetail(momentId, profile.id);

  if (!moment) {
    notFound();
  }

  return (
    <MomentDetailMobilePage
      locale={locale}
      moment={moment}
      profile={{
        id: profile.id,
      }}
    />
  );
}
