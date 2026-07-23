import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { mobileHomeTopNewsCacheTag } from "@/features/home/queries/getMobileHomeTopNews";
import { getFallbackTopNewsConfigItems } from "@/features/home/topNewsConfig";
import { prisma } from "@/lib/prisma";

export type AdminTopNewsItem = {
  createdAt: string;
  href: string;
  id: string;
  imageUrl: string;
  isActive: boolean;
  slug: string;
  sortOrder: number;
  titleEn: string;
  titleFr: string;
  titleZh: string;
  updatedAt: string;
};

const sitePathSchema = z
  .string()
  .trim()
  .min(1, "路径不能为空")
  .max(500, "路径过长")
  .regex(/^\/(?!\/).*/, "请输入站内路径，例如 /updates/v2_4");

const imagePathSchema = z
  .string()
  .trim()
  .min(1, "图片不能为空")
  .max(1000, "图片地址过长")
  .refine(
    (value) => /^\/(?!\/).*/.test(value) || /^https:\/\/.+/i.test(value),
    "图片需为站内路径或 HTTPS 图片地址",
  );

const topNewsInputSchema = z.object({
  href: sitePathSchema,
  id: z.string().trim().optional(),
  imageUrl: imagePathSchema,
  isActive: z.coerce.boolean(),
  slug: z
    .string()
    .trim()
    .min(1, "slug 不能为空")
    .max(80, "slug 过长")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 只能包含小写字母、数字和单横线"),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  titleEn: z.string().trim().min(1, "英文标题不能为空").max(80),
  titleFr: z.string().trim().min(1, "法文标题不能为空").max(80),
  titleZh: z.string().trim().min(1, "中文标题不能为空").max(80),
});

const topNewsUpdateSchema = z.object({
  items: z.array(topNewsInputSchema).max(12, "最多维护 12 条 Top News"),
});

function serializeAdminTopNewsItem(row: {
  createdAt: Date;
  href: string;
  id: string;
  imageUrl: string;
  isActive: boolean;
  slug: string;
  sortOrder: number;
  titleEn: string;
  titleFr: string;
  titleZh: string;
  updatedAt: Date;
}): AdminTopNewsItem {
  return {
    createdAt: row.createdAt.toISOString(),
    href: row.href,
    id: row.id,
    imageUrl: row.imageUrl,
    isActive: row.isActive,
    slug: row.slug,
    sortOrder: row.sortOrder,
    titleEn: row.titleEn,
    titleFr: row.titleFr,
    titleZh: row.titleZh,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getPersistedId(id: string | undefined) {
  const trimmedId = id?.trim();

  return trimmedId && !trimmedId.startsWith("new-") ? trimmedId : null;
}

function assertUniqueSlugs(items: Array<{ slug: string }>) {
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.slug)) {
      throw new Error(`重复 slug：${item.slug}`);
    }

    seen.add(item.slug);
  }
}

function isMissingTopNewsTableError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

function getFallbackAdminTopNewsItems(): AdminTopNewsItem[] {
  const timestamp = new Date(0).toISOString();

  return getFallbackTopNewsConfigItems()
    .sort((left, right) => left.order - right.order)
    .map((item) => ({
      createdAt: timestamp,
      href: item.href,
      id: item.id,
      imageUrl: item.image,
      isActive: item.active,
      slug: item.id,
      sortOrder: item.order,
      titleEn: item.title.en,
      titleFr: item.title.fr,
      titleZh: item.title["zh-CN"],
      updatedAt: timestamp,
    }));
}

export async function getAdminTopNewsItems() {
  try {
    const rows = await prisma.topNewsItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
    });

    return rows.map(serializeAdminTopNewsItem);
  } catch (error) {
    if (isMissingTopNewsTableError(error)) {
      console.error("TopNewsItem table is missing; using fallback admin items");
      return getFallbackAdminTopNewsItems();
    }

    throw error;
  }
}

export async function replaceAdminTopNewsItems(rawInput: unknown) {
  const result = topNewsUpdateSchema.safeParse(rawInput);

  if (!result.success) {
    return {
      error: result.error.issues[0]?.message ?? "Top News 内容无效",
      items: null,
    };
  }

  const { items } = result.data;

  try {
    assertUniqueSlugs(items);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Top News 内容无效",
      items: null,
    };
  }

  try {
    const savedRows = await prisma.$transaction(async (tx) => {
      const keptIds: string[] = [];

      for (const item of items) {
        const persistedId = getPersistedId(item.id);
        const data = {
          href: item.href,
          imageUrl: item.imageUrl,
          isActive: item.isActive,
          slug: item.slug,
          sortOrder: item.sortOrder,
          titleEn: item.titleEn,
          titleFr: item.titleFr,
          titleZh: item.titleZh,
        };
        const row = persistedId
          ? await tx.topNewsItem.update({
              where: {
                id: persistedId,
              },
              data,
            })
          : await tx.topNewsItem.create({
              data,
            });

        keptIds.push(row.id);
      }

      await tx.topNewsItem.deleteMany({
        where:
          keptIds.length > 0
            ? {
                id: {
                  notIn: keptIds,
                },
              }
            : {},
      });

      return tx.topNewsItem.findMany({
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
      });
    });

    revalidateTag(mobileHomeTopNewsCacheTag);

    return {
      error: null,
      items: savedRows.map(serializeAdminTopNewsItem),
    };
  } catch (error) {
    console.error("Failed to replace admin top news items", error);

    return {
      error: isMissingTopNewsTableError(error)
        ? "Top News 数据表不存在，请先执行 Prisma 迁移"
        : "保存失败，请检查 slug 是否重复或稍后重试",
      items: null,
    };
  }
}
