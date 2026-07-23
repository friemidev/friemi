"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button, Card, CardContent, Input } from "@chill-club/ui";
import { FormField } from "@/components/admin/FormField";
import type { AdminTopNewsItem } from "@/features/home/adminTopNews";
import { cn } from "@/lib/utils";

type TopNewsManagementClientProps = {
  initialItems: AdminTopNewsItem[];
};

type TopNewsEditorItem = Omit<AdminTopNewsItem, "createdAt" | "updatedAt"> & {
  createdAt?: string;
  updatedAt?: string;
};

type TopNewsImageUploadErrorCode =
  | "STORAGE_NOT_CONFIGURED"
  | "MISSING_FILE"
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "INVALID_IMAGE_CONTENT"
  | "BUCKET_NOT_AVAILABLE"
  | "UPLOAD_FAILED"
  | "UNAUTHORIZED";

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageFileSize = 4 * 1024 * 1024;

function createEmptyItem(index: number): TopNewsEditorItem {
  const order = (index + 1) * 10;

  return {
    href: "/updates/v2_4",
    id: `new-${Date.now()}-${index}`,
    imageUrl: "/brand/v2_1/friemi-og-default-1200x630.png",
    isActive: true,
    slug: `top-news-${order}`,
    sortOrder: order,
    titleEn: "New Top News",
    titleFr: "Nouvelle Top News",
    titleZh: "新的 Top News",
  };
}

function sortItems(items: TopNewsEditorItem[]) {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.slug.localeCompare(right.slug);
  });
}

function assignSortOrders(items: TopNewsEditorItem[]) {
  return items.map((item, index) => ({
    ...item,
    sortOrder: (index + 1) * 10,
  }));
}

function normalizeSortOrders(items: TopNewsEditorItem[]) {
  return assignSortOrders(sortItems(items));
}

function formatUpdatedAt(value?: string) {
  if (!value) {
    return "未保存";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function getImageUploadErrorMessage(error?: string) {
  if (error === "UNSUPPORTED_FILE_TYPE") {
    return "请选择 JPG、PNG 或 WebP 图片";
  }

  if (error === "FILE_TOO_LARGE") {
    return "图片不能超过 4MB";
  }

  if (error === "INVALID_IMAGE_CONTENT") {
    return "图片内容无效，请换一张图片";
  }

  if (error === "UNAUTHORIZED") {
    return "管理员登录状态已失效，请重新登录";
  }

  if (error === "STORAGE_NOT_CONFIGURED" || error === "BUCKET_NOT_AVAILABLE") {
    return "图片存储还没有配置好";
  }

  return "图片上传失败，请稍后重试";
}

export function TopNewsManagementClient({
  initialItems,
}: TopNewsManagementClientProps) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [items, setItems] = useState<TopNewsEditorItem[]>(() =>
    normalizeSortOrders(initialItems),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const activeCount = useMemo(
    () => items.filter((item) => item.isActive).length,
    [items],
  );

  function updateItem(
    id: string,
    patch:
      | Partial<TopNewsEditorItem>
      | ((item: TopNewsEditorItem) => Partial<TopNewsEditorItem>),
  ) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              ...(typeof patch === "function" ? patch(item) : patch),
            }
          : item,
      ),
    );
  }

  function moveItem(id: string, direction: "up" | "down") {
    setItems((currentItems) => {
      const ordered = normalizeSortOrders(currentItems);
      const index = ordered.findIndex((item) => item.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
        return ordered;
      }

      const nextItems = [...ordered];
      [nextItems[index], nextItems[targetIndex]] = [
        nextItems[targetIndex],
        nextItems[index],
      ];

      return assignSortOrders(nextItems);
    });
  }

  async function uploadImage(itemId: string, file: File) {
    if (!allowedImageTypes.includes(file.type)) {
      toast.error(getImageUploadErrorMessage("UNSUPPORTED_FILE_TYPE"));
      return;
    }

    if (file.size > maxImageFileSize) {
      toast.error(getImageUploadErrorMessage("FILE_TOO_LARGE"));
      return;
    }

    setUploadingItemId(itemId);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/top-news/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: TopNewsImageUploadErrorCode;
        url?: string;
      } | null;

      if (!response.ok || !payload?.url) {
        toast.error(getImageUploadErrorMessage(payload?.error));
        return;
      }

      updateItem(itemId, { imageUrl: payload.url });
      toast.success("图片已上传");
    } catch {
      toast.error(getImageUploadErrorMessage());
    } finally {
      setUploadingItemId(null);

      const input = fileInputRefs.current[itemId];
      if (input) {
        input.value = "";
      }
    }
  }

  async function saveItems() {
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/top-news", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: normalizeSortOrders(items),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        items?: AdminTopNewsItem[];
      };

      if (!response.ok || !payload.items) {
        toast.error(payload.error ?? "保存失败，请检查内容");
        return;
      }

      setItems(normalizeSortOrders(payload.items));
      toast.success("Top News 已保存");
    } catch {
      toast.error("保存失败，请稍后重试");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Toaster position="top-center" richColors closeButton />

      <div className="flex flex-col gap-3 rounded-xl border border-[#D6D5B2] bg-[#FEFFF9] p-4 shadow-[0_18px_42px_rgba(17,18,16,0.05)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#156240]">
            当前启用 {activeCount} 条，共 {items.length} 条
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            首页按列表顺序展示。停用的内容会保留在后台，但不会出现在移动首页。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-full border-[#D6D5B2] bg-white px-4"
            onClick={() =>
              setItems((currentItems) =>
                normalizeSortOrders([
                  ...currentItems,
                  createEmptyItem(currentItems.length),
                ]),
              )
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            新增
          </Button>
          <Button
            type="button"
            className="h-10 rounded-full bg-[#156240] px-5 text-white hover:bg-[#0F4E33]"
            disabled={isSaving}
            onClick={saveItems}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            保存全部
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {sortItems(items).map((item, index) => (
          <Card
            key={item.id}
            className={cn(
              "overflow-hidden border-[#D6D5B2] bg-white shadow-sm",
              !item.isActive && "bg-zinc-50 opacity-75",
            )}
          >
            <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_16rem] md:p-5">
              <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                      #{index + 1} · {item.slug}
                    </p>
                    <h2 className="mt-1 truncate text-xl font-semibold tracking-normal text-ink">
                      {item.titleZh}
                    </h2>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-[#8AB68E] hover:text-[#156240] disabled:opacity-40"
                      disabled={index === 0}
                      onClick={() => moveItem(item.id, "up")}
                      title="上移"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-[#8AB68E] hover:text-[#156240] disabled:opacity-40"
                      disabled={index === items.length - 1}
                      onClick={() => moveItem(item.id, "down")}
                      title="下移"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition",
                        item.isActive
                          ? "border-[#8AB68E] bg-[#F1F8EE] text-[#156240]"
                          : "border-zinc-200 bg-white text-zinc-500",
                      )}
                      onClick={() =>
                        updateItem(item.id, (currentItem) => ({
                          isActive: !currentItem.isActive,
                        }))
                      }
                    >
                      {item.isActive ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                      {item.isActive ? "启用" : "停用"}
                    </button>
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-full border border-[#F09182]/60 bg-[#FFF7F5] text-[#B5301F] transition hover:bg-[#F09182]/15"
                      onClick={() =>
                        setItems((currentItems) =>
                          normalizeSortOrders(
                            currentItems.filter(
                              (currentItem) => currentItem.id !== item.id,
                            ),
                          ),
                        )
                      }
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <FormField label="slug">
                    <Input
                      className="h-10"
                      value={item.slug}
                      onChange={(event) =>
                        updateItem(item.id, { slug: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField label="站内链接">
                    <Input
                      className="h-10"
                      placeholder="/updates/v2_4"
                      value={item.href}
                      onChange={(event) =>
                        updateItem(item.id, { href: event.target.value })
                      }
                    />
                  </FormField>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <FormField label="中文标题">
                    <Input
                      className="h-10"
                      value={item.titleZh}
                      onChange={(event) =>
                        updateItem(item.id, { titleZh: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField label="English title">
                    <Input
                      className="h-10"
                      value={item.titleEn}
                      onChange={(event) =>
                        updateItem(item.id, { titleEn: event.target.value })
                      }
                    />
                  </FormField>
                  <FormField label="Titre francais">
                    <Input
                      className="h-10"
                      value={item.titleFr}
                      onChange={(event) =>
                        updateItem(item.id, { titleFr: event.target.value })
                      }
                    />
                  </FormField>
                </div>

                <FormField
                  label="图片"
                  hint="建议使用 16:9 横图，支持 JPG、PNG、WebP，单张最多 4MB。"
                >
                  <input
                    ref={(element) => {
                      fileInputRefs.current[item.id] = element;
                    }}
                    accept={allowedImageTypes.join(",")}
                    className="hidden"
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void uploadImage(item.id, file);
                      }
                    }}
                  />
                  <div className="rounded-2xl border border-[#D6D5B2] bg-[#FEFFF9] p-3 shadow-[0_14px_32px_rgba(17,18,16,0.04)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative h-20 w-full overflow-hidden rounded-xl bg-[#123D31] sm:w-36">
                        {item.imageUrl ? (
                          // Admin-uploaded images can be local paths or HTTPS URLs.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt=""
                            className="h-full w-full object-cover"
                            src={item.imageUrl}
                          />
                        ) : (
                          <div className="grid h-full place-items-center text-white/80">
                            <ImagePlus className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Button
                          type="button"
                          className="h-10 rounded-full bg-[#156240] px-4 text-white hover:bg-[#0F4E33]"
                          disabled={uploadingItemId === item.id}
                          onClick={() =>
                            fileInputRefs.current[item.id]?.click()
                          }
                        >
                          {uploadingItemId === item.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <UploadCloud className="mr-2 h-4 w-4" />
                          )}
                          {uploadingItemId === item.id ? "上传中" : "上传图片"}
                        </Button>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">
                          上传后先预览，点击“保存全部”才会发布到首页。
                        </p>
                      </div>
                    </div>

                    <details className="group mt-3">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-bold text-[#156240] transition hover:text-[#0F4E33] [&::-webkit-details-marker]:hidden">
                        <Link2 className="h-3.5 w-3.5" />
                        高级：粘贴图片地址
                      </summary>
                      <Input
                        className="mt-2 h-10"
                        placeholder="/readme/v2_4/game-tools.png"
                        value={item.imageUrl}
                        onChange={(event) =>
                          updateItem(item.id, { imageUrl: event.target.value })
                        }
                      />
                    </details>
                  </div>
                </FormField>
              </div>

              <div className="min-w-0">
                <div className="overflow-hidden rounded-xl border border-[#D6D5B2] bg-[#123D31] shadow-[0_18px_34px_rgba(18,61,49,0.12)]">
                  <div className="relative aspect-[1.88/1] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/54 via-black/12 to-black/4" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <span className="inline-flex max-w-full rounded-full bg-white/92 px-3 py-1 text-[11px] font-extrabold text-[#123D31] shadow-sm">
                        <span className="truncate">{item.titleZh}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 bg-[#FEFFF9] px-3 py-2 text-xs text-zinc-500">
                    <span>更新 {formatUpdatedAt(item.updatedAt)}</span>
                    <span>排序 {item.sortOrder}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
