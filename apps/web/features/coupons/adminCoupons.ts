import { prisma } from "@/lib/prisma";
import { createCouponToken } from "./couponDefaults";
import {
  getPlatformCouponTemplate,
  platformCouponTemplates,
} from "./platformCouponTemplates";

export type AdminCouponTemplate = {
  accentColor: string;
  backgroundColor: string;
  description: string;
  expiresAt: string | null;
  foregroundColor: string;
  id: string;
  imageUrl: string | null;
  isActive: boolean;
  merchantId: string;
  platformTemplateKey: string | null;
  slug: string;
  terms: string | null;
  title: string;
};

export type AdminCouponTemplateInput = {
  accentColor: string;
  backgroundColor: string;
  description: string;
  expiresAt?: string | null;
  foregroundColor: string;
  terms?: string | null;
  title: string;
};

function slugifyCouponTitle(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function syncPlatformTemplates() {
  await prisma.$transaction(
    platformCouponTemplates.map((template) =>
      prisma.couponTemplate.upsert({
        where: { key: template.key },
        create: {
          accentColor: template.accentColor,
          backgroundColor: template.backgroundColor,
          defaultTerms: template.terms,
          description: template.description,
          foregroundColor: template.foregroundColor,
          imageUrl: template.imageUrl,
          key: template.key,
          slug: template.slug,
          title: template.title,
        },
        update: {
          accentColor: template.accentColor,
          backgroundColor: template.backgroundColor,
          defaultTerms: template.terms,
          description: template.description,
          foregroundColor: template.foregroundColor,
          imageUrl: template.imageUrl,
          isActive: true,
          slug: template.slug,
          title: template.title,
        },
      }),
    ),
  );
}

function serializeBinding(binding: {
  id: string;
  isActive: boolean;
  merchantId: string;
  template: {
    accentColor: string;
    backgroundColor: string;
    defaultTerms: string | null;
    description: string;
    foregroundColor: string;
    imageUrl: string | null;
    key: string;
    slug: string;
    title: string;
  };
}): AdminCouponTemplate {
  const isPlatformTemplate = Boolean(
    getPlatformCouponTemplate(binding.template.key),
  );
  return {
    accentColor: binding.template.accentColor,
    backgroundColor: binding.template.backgroundColor,
    description: binding.template.description,
    expiresAt: null,
    foregroundColor: binding.template.foregroundColor,
    id: binding.id,
    imageUrl: binding.template.imageUrl,
    isActive: binding.isActive,
    merchantId: binding.merchantId,
    platformTemplateKey: isPlatformTemplate ? binding.template.key : null,
    slug: binding.template.slug,
    terms: binding.template.defaultTerms,
    title: binding.template.title,
  };
}

const bindingSelect = {
  id: true,
  isActive: true,
  merchantId: true,
  template: {
    select: {
      accentColor: true,
      backgroundColor: true,
      defaultTerms: true,
      description: true,
      foregroundColor: true,
      imageUrl: true,
      key: true,
      slug: true,
      title: true,
    },
  },
} as const;

export async function getAdminCouponTemplates() {
  await syncPlatformTemplates();
  const bindings = await prisma.merchantCouponTemplate.findMany({
    orderBy: [{ merchantId: "asc" }, { createdAt: "asc" }],
    select: bindingSelect,
  });
  return bindings.map(serializeBinding);
}

export async function createAdminCouponTemplate(
  merchantId: string,
  input: AdminCouponTemplateInput,
) {
  const merchant = await prisma.merchant.findFirst({
    where: { id: merchantId, isActive: true },
    select: { id: true },
  });
  if (!merchant) throw new Error("MERCHANT_NOT_FOUND");

  const title = input.title.trim();
  const suffix = createCouponToken().slice(0, 10).toLowerCase();
  const baseSlug = slugifyCouponTitle(title) || "coupon";
  const binding = await prisma.merchantCouponTemplate.create({
    data: {
      merchant: { connect: { id: merchantId } },
      template: {
        create: {
          accentColor: input.accentColor,
          backgroundColor: input.backgroundColor,
          defaultTerms: input.terms?.trim() || null,
          description: input.description.trim(),
          foregroundColor: input.foregroundColor,
          key: `custom-${suffix}`,
          slug: `${baseSlug}-${suffix}`.slice(0, 80),
          title,
        },
      },
    },
    select: bindingSelect,
  });
  return serializeBinding(binding);
}

export async function bindPlatformCouponTemplate(
  merchantId: string,
  platformTemplateKey: string,
) {
  const [merchant, platformTemplate] = await Promise.all([
    prisma.merchant.findFirst({
      where: { id: merchantId, isActive: true },
      select: { id: true },
    }),
    Promise.resolve(getPlatformCouponTemplate(platformTemplateKey)),
  ]);
  if (!merchant) throw new Error("MERCHANT_NOT_FOUND");
  if (!platformTemplate) throw new Error("COUPON_TEMPLATE_NOT_FOUND");

  const binding = await prisma.$transaction(async (tx) => {
    const template = await tx.couponTemplate.upsert({
      where: { key: platformTemplate.key },
      create: {
        accentColor: platformTemplate.accentColor,
        backgroundColor: platformTemplate.backgroundColor,
        defaultTerms: platformTemplate.terms,
        description: platformTemplate.description,
        foregroundColor: platformTemplate.foregroundColor,
        imageUrl: platformTemplate.imageUrl,
        key: platformTemplate.key,
        slug: platformTemplate.slug,
        title: platformTemplate.title,
      },
      update: {
        accentColor: platformTemplate.accentColor,
        backgroundColor: platformTemplate.backgroundColor,
        defaultTerms: platformTemplate.terms,
        description: platformTemplate.description,
        foregroundColor: platformTemplate.foregroundColor,
        imageUrl: platformTemplate.imageUrl,
        isActive: true,
        slug: platformTemplate.slug,
        title: platformTemplate.title,
      },
      select: { id: true },
    });
    return tx.merchantCouponTemplate.upsert({
      where: {
        merchantId_templateId: { merchantId, templateId: template.id },
      },
      create: { merchantId, templateId: template.id },
      update: { isActive: true },
      select: bindingSelect,
    });
  });
  return serializeBinding(binding);
}
