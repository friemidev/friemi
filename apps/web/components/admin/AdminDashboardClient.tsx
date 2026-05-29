"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from "@chill-club/ui";
import type {
  AdminActivityListItem,
  AdminMerchantOption,
  AdminOrganizerOption,
} from "@/lib/admin-scraper";
import { ScraperImportSection } from "@/components/admin/ScraperImportSection";
import { FormField, selectClassName } from "@/components/admin/FormField";
import { ActivityCoverUpload } from "@/features/activities/components/ActivityCoverUpload";

type AdminDashboardClientProps = {
  initialActivities: AdminActivityListItem[];
  initialOrganizers: AdminOrganizerOption[];
  initialMerchants: AdminMerchantOption[];
  locale: string;
};

type ActivityFormState = {
  id?: string;
  title: string;
  description: string;
  itinerary: string;
  type: "PUBLIC_EVENT" | "USER_HOSTED" | "LOCAL" | "TRIP";
  category:
    | "BOARD_GAME"
    | "MOVIE"
    | "MUSIC"
    | "SPORTS"
    | "TRAVEL"
    | "FOOD"
    | "EXHIBITION"
    | "OTHER";
  city: string;
  destination: string;
  address: string;
  latitude: string;
  longitude: string;
  startAt: string;
  endAt: string;
  capacity: string;
  coverImageUrl: string;
  minParticipants: string;
  requiresApproval: boolean;
  priceType: "FREE" | "AA" | "FIXED" | "RANGE";
  priceText: string;
  status:
    | "OPEN"
    | "FULL"
    | "DRAFT"
    | "RECRUITING"
    | "CONFIRMED"
    | "ENDED"
    | "CANCELLED";
  visibility: "PUBLIC" | "LINK_ONLY" | "PRIVATE";
  organizerId: string;
  merchantId: string;
};

type DashboardTab = "activities" | "scraper";

const emptyActivityForm = (
  organizerId = "",
  merchantId = "",
): ActivityFormState => ({
  title: "",
  description: "",
  itinerary: "",
  type: "PUBLIC_EVENT",
  category: "EXHIBITION",
  city: "Paris",
  destination: "",
  address: "",
  latitude: "",
  longitude: "",
  startAt: "",
  endAt: "",
  capacity: "100",
  coverImageUrl: "",
  minParticipants: "",
  requiresApproval: false,
  priceType: "FREE",
  priceText: "免费",
  status: "RECRUITING",
  visibility: "PUBLIC",
  organizerId,
  merchantId,
});

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function dateOnly(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function LoadingLabel({
  loading,
  loadingText,
  children,
}: {
  loading: boolean;
  loadingText: string;
  children: string;
}) {
  if (!loading) return children;
  return (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      {loadingText}
    </>
  );
}

const compactSelectClassName = `${selectClassName} h-9`;

const statusLabels: Record<ActivityFormState["status"], string> = {
  OPEN: "可参与",
  FULL: "已满员",
  DRAFT: "草稿",
  RECRUITING: "可参与",
  CONFIRMED: "已成团",
  ENDED: "已结束",
  CANCELLED: "已取消",
};

function getAdminStatusLabel(status: string) {
  return statusLabels[status as ActivityFormState["status"]] ?? status;
}

function getSourceLabel(source: string | null, sourceUrl: string | null) {
  const normalizedSource = source?.toLowerCase() ?? "";

  if (normalizedSource.includes("sortiraparis")) {
    return "Sortir à Paris";
  }

  if (normalizedSource.includes("playinparis")) {
    return "Play in Paris";
  }

  if (normalizedSource.includes("paris-opendata")) {
    return "Paris OpenData";
  }

  if (source || sourceUrl) {
    return "外部导入";
  }

  return "手动";
}

export function AdminDashboardClient({
  initialActivities,
  initialOrganizers,
  initialMerchants,
  locale,
}: AdminDashboardClientProps) {
  const defaultOrganizerId = initialOrganizers[0]?.id ?? "";
  const [activities, setActivities] = useState(initialActivities);
  const [organizers] = useState(initialOrganizers);
  const [merchants] = useState(initialMerchants);
  const [activityForm, setActivityForm] = useState<ActivityFormState>(
    emptyActivityForm(defaultOrganizerId),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("activities");

  const isSavingActivity = busy === "activity";
  const isActivitySubmitDisabled = isSavingActivity || isCoverUploading;

  async function refreshActivities() {
    const response = await fetch("/api/admin/activities", {
      cache: "no-store",
    });
    const json = await response.json();
    setActivities(json.activities ?? []);
  }

  async function submitActivityForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("activity");

    try {
      const payload = {
        ...activityForm,
        itinerary: activityForm.itinerary.trim() || null,
        destination: activityForm.destination.trim() || null,
        latitude: activityForm.latitude.trim()
          ? Number(activityForm.latitude)
          : null,
        longitude: activityForm.longitude.trim()
          ? Number(activityForm.longitude)
          : null,
        endAt: activityForm.endAt.trim() || null,
        coverImageUrl: activityForm.coverImageUrl.trim() || null,
        minParticipants: activityForm.minParticipants.trim()
          ? Number(activityForm.minParticipants)
          : null,
        capacity: Number(activityForm.capacity),
        requiresApproval: activityForm.requiresApproval,
        organizerId: activityForm.organizerId || defaultOrganizerId,
        merchantId: activityForm.merchantId || null,
      };

      const isEdit = Boolean(activityForm.id);
      const response = isEdit
        ? await fetch(`/api/admin/activities/${activityForm.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!response.ok) {
        toast.error("活动保存失败，请检查表单内容");
        return;
      }

      await refreshActivities();
      setActivityForm(emptyActivityForm(defaultOrganizerId));
      toast.success(isEdit ? "活动已更新" : "活动已创建");
    } catch {
      toast.error("活动保存失败，请稍后重试");
    } finally {
      setBusy(null);
    }
  }

  async function deleteActivity(id: string) {
    setBusy(id);
    try {
      const response = await fetch(`/api/admin/activities/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        toast.error("删除失败");
        return;
      }
      await refreshActivities();
      toast.success("活动已删除");
    } catch {
      toast.error("删除失败，请稍后重试");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <Toaster position="top-center" richColors closeButton />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={activeTab === "activities" ? "primary" : "secondary"}
          onClick={() => setActiveTab("activities")}
        >
          活动库
        </Button>
        <Button
          type="button"
          variant={activeTab === "scraper" ? "primary" : "secondary"}
          onClick={() => setActiveTab("scraper")}
        >
          公共活动导入
        </Button>
      </div>

      {activeTab === "activities" ? (
        <section className="space-y-5">
          <Card>
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
              <CardTitle>活动管理</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
              <form
                className="grid gap-3 sm:gap-4"
                onSubmit={submitActivityForm}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField label="标题">
                    <Input
                      className="h-9"
                      value={activityForm.title}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          title: e.target.value,
                        })
                      }
                    />
                  </FormField>
                  <FormField label="城市">
                    <Input
                      className="h-9"
                      value={activityForm.city}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          city: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>
                <FormField label="活动描述">
                  <Textarea
                    className="min-h-20"
                    value={activityForm.description}
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        description: e.target.value,
                      })
                    }
                  />
                </FormField>
                <FormField label="封面图片（可选）">
                  <ActivityCoverUpload
                    initialUrl={activityForm.coverImageUrl}
                    locale={locale}
                    onChange={(coverImageUrl) =>
                      setActivityForm({ ...activityForm, coverImageUrl })
                    }
                    onUploadingChange={setIsCoverUploading}
                  />
                </FormField>
                <FormField label="行程安排（可选）">
                  <Textarea
                    className="min-h-20"
                    value={activityForm.itinerary}
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        itinerary: e.target.value,
                      })
                    }
                  />
                </FormField>
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField label="地点地址">
                    <Input
                      className="h-9"
                      value={activityForm.address}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          address: e.target.value,
                        })
                      }
                    />
                  </FormField>
                  <FormField label="目的地（Trip 可选）">
                    <Input
                      className="h-9"
                      value={activityForm.destination}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          destination: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField
                    label="纬度（可选）"
                    hint="用于活动详情页地图；可从 OpenStreetMap 复制。"
                  >
                    <Input
                      className="h-9"
                      type="number"
                      step="any"
                      min={-90}
                      max={90}
                      value={activityForm.latitude}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          latitude: e.target.value,
                        })
                      }
                    />
                  </FormField>
                  <FormField
                    label="经度（可选）"
                    hint="填写时建议和纬度同时填写。"
                  >
                    <Input
                      className="h-9"
                      type="number"
                      step="any"
                      min={-180}
                      max={180}
                      value={activityForm.longitude}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          longitude: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField label="开始时间">
                    <Input
                      className="h-9"
                      type="datetime-local"
                      value={activityForm.startAt}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          startAt: e.target.value,
                        })
                      }
                    />
                  </FormField>
                  <FormField label="结束时间（可选）">
                    <Input
                      className="h-9"
                      type="datetime-local"
                      value={activityForm.endAt}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          endAt: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <FormField
                    label="人数上限"
                    hint="例如 100 表示最多 100 人参加"
                  >
                    <Input
                      className="h-9"
                      type="number"
                      min={1}
                      value={activityForm.capacity}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          capacity: e.target.value,
                        })
                      }
                    />
                  </FormField>
                  <FormField label="最少成团人数（可选）">
                    <Input
                      className="h-9"
                      type="number"
                      min={1}
                      value={activityForm.minParticipants}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          minParticipants: e.target.value,
                        })
                      }
                    />
                  </FormField>
                  <FormField
                    label="费用说明"
                    hint="展示给用户的文字，如「免费」「AA 制」"
                  >
                    <Input
                      className="h-9"
                      value={activityForm.priceText}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          priceText: e.target.value,
                        })
                      }
                    />
                  </FormField>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <FormField label="活动类型">
                    <select
                      className={compactSelectClassName}
                      value={activityForm.type}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          type: e.target.value as ActivityFormState["type"],
                        })
                      }
                    >
                      <option value="PUBLIC_EVENT">
                        PUBLIC_EVENT（公开活动）
                      </option>
                      <option value="USER_HOSTED">
                        USER_HOSTED（用户发起）
                      </option>
                      <option value="LOCAL">LOCAL（本地活动）</option>
                      <option value="TRIP">TRIP（出行）</option>
                    </select>
                  </FormField>
                  <FormField label="分类">
                    <select
                      className={compactSelectClassName}
                      value={activityForm.category}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          category: e.target
                            .value as ActivityFormState["category"],
                        })
                      }
                    >
                      <option value="BOARD_GAME">BOARD_GAME</option>
                      <option value="MOVIE">MOVIE</option>
                      <option value="MUSIC">MUSIC</option>
                      <option value="SPORTS">SPORTS</option>
                      <option value="TRAVEL">TRAVEL</option>
                      <option value="FOOD">FOOD</option>
                      <option value="EXHIBITION">EXHIBITION</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </FormField>
                  <FormField label="计费方式">
                    <select
                      className={compactSelectClassName}
                      value={activityForm.priceType}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          priceType: e.target
                            .value as ActivityFormState["priceType"],
                        })
                      }
                    >
                      <option value="FREE">FREE（免费）</option>
                      <option value="AA">AA（均摊）</option>
                      <option value="FIXED">FIXED（固定价）</option>
                      <option value="RANGE">RANGE（价格区间）</option>
                    </select>
                  </FormField>
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <FormField label="活动状态">
                    <select
                      className={compactSelectClassName}
                      value={activityForm.status}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          status: e.target.value as ActivityFormState["status"],
                        })
                      }
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="RECRUITING">RECRUITING</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="OPEN">OPEN</option>
                      <option value="FULL">FULL</option>
                      <option value="ENDED">ENDED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </FormField>
                  <FormField label="可见范围">
                    <select
                      className={compactSelectClassName}
                      value={activityForm.visibility}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          visibility: e.target
                            .value as ActivityFormState["visibility"],
                        })
                      }
                    >
                      <option value="PUBLIC">PUBLIC（公开）</option>
                      <option value="LINK_ONLY">LINK_ONLY（仅链接）</option>
                      <option value="PRIVATE">PRIVATE（私密）</option>
                    </select>
                  </FormField>
                  <FormField label="组织者">
                    <select
                      className={compactSelectClassName}
                      value={activityForm.organizerId}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          organizerId: e.target.value,
                        })
                      }
                    >
                      {organizers.map((organizer) => (
                        <option key={organizer.id} value={organizer.id}>
                          {organizer.nickname}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField
                    label="关联商家（可选）"
                    hint="新增或维护商家请从头像菜单进入「商家管理」。"
                  >
                    <select
                      className={compactSelectClassName}
                      value={activityForm.merchantId}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          merchantId: e.target.value,
                        })
                      }
                    >
                      <option value="">不关联商家</option>
                      {merchants.map((merchant) => (
                        <option key={merchant.id} value={merchant.id}>
                          {merchant.name} · {merchant.city}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={activityForm.requiresApproval}
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        requiresApproval: e.target.checked,
                      })
                    }
                  />
                  需要审核
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={isActivitySubmitDisabled}
                    className="min-w-[7rem]"
                  >
                    <LoadingLabel
                      loading={isActivitySubmitDisabled}
                      loadingText={isCoverUploading ? "上传中…" : "保存中…"}
                    >
                      {activityForm.id ? "保存修改" : "创建活动"}
                    </LoadingLabel>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isActivitySubmitDisabled}
                    onClick={() =>
                      setActivityForm(emptyActivityForm(defaultOrganizerId))
                    }
                  >
                    清空
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
              <CardTitle>数据库活动列表</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
              <div className="max-h-[70vh] overflow-auto rounded-md border border-black/10">
                <table className="min-w-[980px] text-left text-sm">
                  <thead className="bg-zinc-50 text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">标题</th>
                      <th className="px-3 py-2">开始时间</th>
                      <th className="px-3 py-2">状态</th>
                      <th className="px-3 py-2">商家</th>
                      <th className="px-3 py-2">来源</th>
                      <th className="px-3 py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((activity) => (
                      <tr key={activity.id} className="border-t border-black/5">
                        <td className="px-3 py-2">
                          <div className="font-medium text-zinc-950">
                            {activity.title}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {activity.address}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-zinc-600">
                          {dateOnly(activity.startAt)}
                        </td>
                        <td className="px-3 py-2 text-zinc-600">
                          <span className="inline-flex whitespace-nowrap rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
                            {getAdminStatusLabel(activity.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-zinc-600">
                          <span className="whitespace-nowrap">
                            {activity.merchantName ?? "-"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-zinc-600">
                          <span className="whitespace-nowrap">
                            {getSourceLabel(
                              activity.source,
                              activity.sourceUrl,
                            )}
                          </span>
                          {activity.sourceUrl ? (
                            <a
                              className="ml-2 whitespace-nowrap text-sky-700 underline"
                              href={activity.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              原文
                            </a>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                setActivityForm({
                                  id: activity.id,
                                  title: activity.title,
                                  description: activity.description,
                                  itinerary: activity.itinerary ?? "",
                                  type: activity.type,
                                  category:
                                    activity.category as ActivityFormState["category"],
                                  city: activity.city,
                                  destination: activity.destination ?? "",
                                  address: activity.address,
                                  latitude:
                                    activity.latitude === null
                                      ? ""
                                      : String(activity.latitude),
                                  longitude:
                                    activity.longitude === null
                                      ? ""
                                      : String(activity.longitude),
                                  startAt: toDatetimeLocal(activity.startAt),
                                  endAt: toDatetimeLocal(activity.endAt),
                                  capacity: String(activity.capacity),
                                  coverImageUrl: activity.coverImageUrl ?? "",
                                  minParticipants: activity.minParticipants
                                    ? String(activity.minParticipants)
                                    : "",
                                  requiresApproval: activity.requiresApproval,
                                  priceType: activity.priceType,
                                  priceText: activity.priceText,
                                  status:
                                    activity.status as ActivityFormState["status"],
                                  visibility:
                                    activity.visibility as ActivityFormState["visibility"],
                                  organizerId:
                                    activity.organizerId || defaultOrganizerId,
                                  merchantId: activity.merchantId ?? "",
                                })
                              }
                            >
                              编辑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => deleteActivity(activity.id)}
                              disabled={busy === activity.id}
                            >
                              {busy === activity.id ? (
                                <>
                                  <Loader2
                                    className="mr-1 h-4 w-4 animate-spin"
                                    aria-hidden
                                  />
                                  删除中
                                </>
                              ) : (
                                "删除"
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {activeTab === "scraper" ? (
        <ScraperImportSection
          busy={busy}
          onBusyChange={setBusy}
          onImported={refreshActivities}
        />
      ) : null}
    </div>
  );
}
