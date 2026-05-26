"use client";

import { useMemo, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Textarea } from "@chill-club/ui";
import type { AdminActivityListItem, AdminOrganizerOption, ScraperPreviewItem } from "@/lib/admin-scraper";

type AdminDashboardClientProps = {
  initialActivities: AdminActivityListItem[];
  initialOrganizers: AdminOrganizerOption[];
  locale: string;
};

type ActivityFormState = {
  id?: string;
  title: string;
  description: string;
  itinerary: string;
  type: "PUBLIC_EVENT" | "USER_HOSTED" | "LOCAL" | "TRIP";
  category: "BOARD_GAME" | "MOVIE" | "MUSIC" | "SPORTS" | "TRAVEL" | "FOOD" | "EXHIBITION" | "OTHER";
  city: string;
  destination: string;
  address: string;
  startAt: string;
  endAt: string;
  capacity: string;
  minParticipants: string;
  requiresApproval: boolean;
  priceType: "FREE" | "AA" | "FIXED" | "RANGE";
  priceText: string;
  status: "OPEN" | "FULL" | "DRAFT" | "RECRUITING" | "CONFIRMED" | "ENDED" | "CANCELLED";
  visibility: "PUBLIC" | "LINK_ONLY" | "PRIVATE";
  organizerId: string;
};

type ScraperFormState = {
  sources: Record<"sortiraparis" | "playinparis", boolean>;
  mode: "recent" | "range" | "database";
  from: string;
  to: string;
  limit: number;
  maxPages: number;
};

const emptyActivityForm = (organizerId = "") : ActivityFormState => ({
  title: "",
  description: "",
  itinerary: "",
  type: "PUBLIC_EVENT",
  category: "EXHIBITION",
  city: "Paris",
  destination: "",
  address: "",
  startAt: "",
  endAt: "",
  capacity: "100",
  minParticipants: "",
  requiresApproval: false,
  priceType: "FREE",
  priceText: "免费",
  status: "RECRUITING",
  visibility: "PUBLIC",
  organizerId,
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

function todayPlusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDatetimeLocal(date.toISOString());
}

function dateOnly(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function statusColor(status: ScraperPreviewItem["duplicateStatus"]) {
  if (status === "existing") return "text-zinc-500";
  if (status === "duplicate") return "text-amber-600";
  return "text-emerald-600";
}

export function AdminDashboardClient({ initialActivities, initialOrganizers, locale }: AdminDashboardClientProps) {
  const defaultOrganizerId = initialOrganizers[0]?.id ?? "";
  const [activities, setActivities] = useState(initialActivities);
  const [organizers] = useState(initialOrganizers);
  const [activityForm, setActivityForm] = useState<ActivityFormState>(emptyActivityForm(defaultOrganizerId));
  const [scraperForm, setScraperForm] = useState<ScraperFormState>({
    sources: { sortiraparis: true, playinparis: true },
    mode: "database",
    from: todayPlusDays(-7),
    to: todayPlusDays(30),
    limit: 20,
    maxPages: 3,
  });
  const [previewItems, setPreviewItems] = useState<ScraperPreviewItem[]>([]);
  const [selectedPreviewIds, setSelectedPreviewIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);

  const selectedPreviewItems = useMemo(
    () => previewItems.filter((item) => selectedPreviewIds.includes(item.id)),
    [previewItems, selectedPreviewIds],
  );

  async function refreshActivities() {
    const response = await fetch("/api/admin/activities", { cache: "no-store" });
    const json = await response.json();
    setActivities(json.activities ?? []);
    if (json.organizers?.length) {
      // keep existing organizers fallback if server returns them later
    }
  }

  async function submitActivityForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("activity");
    setMessage("");
    const payload = {
      ...activityForm,
      itinerary: activityForm.itinerary.trim() || null,
      destination: activityForm.destination.trim() || null,
      endAt: activityForm.endAt.trim() || null,
      minParticipants: activityForm.minParticipants.trim() ? Number(activityForm.minParticipants) : null,
      capacity: Number(activityForm.capacity),
      requiresApproval: activityForm.requiresApproval,
      organizerId: activityForm.organizerId || defaultOrganizerId,
    };

    const response = activityForm.id
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
      setMessage("活动保存失败，请检查表单内容。");
      setBusy(null);
      return;
    }

    await refreshActivities();
    setActivityForm(emptyActivityForm(defaultOrganizerId));
    setMessage(activityForm.id ? "活动已更新。" : "活动已创建。");
    setBusy(null);
  }

  async function deleteActivity(id: string) {
    setBusy(id);
    setMessage("");
    await fetch(`/api/admin/activities/${id}`, { method: "DELETE" });
    await refreshActivities();
    setBusy(null);
    setMessage("活动已删除。");
  }

  async function previewScraper() {
    setBusy("preview");
    setMessage("");
    const sources = Object.entries(scraperForm.sources).filter(([, enabled]) => enabled).map(([source]) => source);
    const response = await fetch("/api/admin/scraper/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sources,
        mode: scraperForm.mode,
        from: scraperForm.from || null,
        to: scraperForm.to || null,
        limit: scraperForm.limit,
        maxPages: scraperForm.maxPages,
      }),
    });
    const json = await response.json();
    setPreviewItems(json.items ?? []);
    setSelectedPreviewIds((json.items ?? []).filter((item: ScraperPreviewItem) => item.duplicateStatus === "new").map((item: ScraperPreviewItem) => item.id));
    setBusy(null);
    setMessage(`已抓取 ${json.items?.length ?? 0} 条候选活动。`);
  }

  async function importSelected() {
    setBusy("import");
    setMessage("");
    const items = selectedPreviewItems;
    const response = await fetch("/api/admin/scraper/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const json = await response.json();
    await refreshActivities();
    setMessage(`已导入 ${json.imported ?? 0} 条活动。`);
    setBusy(null);
  }

  const previewCount = previewItems.length;
  const newCount = previewItems.filter((item) => item.duplicateStatus === "new").length;
  const duplicateCount = previewItems.filter((item) => item.duplicateStatus !== "new").length;

  return (
    <div className="space-y-8">
      {message ? <div className="rounded-md border border-black/10 bg-white px-4 py-3 text-sm text-zinc-700">{message}</div> : null}

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>活动管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-3" onSubmit={submitActivityForm}>
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="标题" value={activityForm.title} onChange={(e) => setActivityForm({ ...activityForm, title: e.target.value })} />
                <Input placeholder="城市" value={activityForm.city} onChange={(e) => setActivityForm({ ...activityForm, city: e.target.value })} />
              </div>
              <Textarea placeholder="描述" value={activityForm.description} onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })} />
              <Textarea placeholder="行程（可选）" value={activityForm.itinerary} onChange={(e) => setActivityForm({ ...activityForm, itinerary: e.target.value })} />
              <div className="grid gap-3 md:grid-cols-2">
                <Input placeholder="地点地址" value={activityForm.address} onChange={(e) => setActivityForm({ ...activityForm, address: e.target.value })} />
                <Input placeholder="目的地（Trip 可选）" value={activityForm.destination} onChange={(e) => setActivityForm({ ...activityForm, destination: e.target.value })} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input type="datetime-local" value={activityForm.startAt} onChange={(e) => setActivityForm({ ...activityForm, startAt: e.target.value })} />
                <Input type="datetime-local" value={activityForm.endAt} onChange={(e) => setActivityForm({ ...activityForm, endAt: e.target.value })} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input type="number" min={1} placeholder="人数上限" value={activityForm.capacity} onChange={(e) => setActivityForm({ ...activityForm, capacity: e.target.value })} />
                <Input type="number" min={1} placeholder="最少成团" value={activityForm.minParticipants} onChange={(e) => setActivityForm({ ...activityForm, minParticipants: e.target.value })} />
                <Input placeholder="费用说明" value={activityForm.priceText} onChange={(e) => setActivityForm({ ...activityForm, priceText: e.target.value })} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <select className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm" value={activityForm.type} onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value as ActivityFormState["type"] })}>
                  <option value="PUBLIC_EVENT">PUBLIC_EVENT</option>
                  <option value="USER_HOSTED">USER_HOSTED</option>
                  <option value="LOCAL">LOCAL</option>
                  <option value="TRIP">TRIP</option>
                </select>
                <select className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm" value={activityForm.category} onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value as ActivityFormState["category"] })}>
                  <option value="BOARD_GAME">BOARD_GAME</option>
                  <option value="MOVIE">MOVIE</option>
                  <option value="MUSIC">MUSIC</option>
                  <option value="SPORTS">SPORTS</option>
                  <option value="TRAVEL">TRAVEL</option>
                  <option value="FOOD">FOOD</option>
                  <option value="EXHIBITION">EXHIBITION</option>
                  <option value="OTHER">OTHER</option>
                </select>
                <select className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm" value={activityForm.priceType} onChange={(e) => setActivityForm({ ...activityForm, priceType: e.target.value as ActivityFormState["priceType"] })}>
                  <option value="FREE">FREE</option>
                  <option value="AA">AA</option>
                  <option value="FIXED">FIXED</option>
                  <option value="RANGE">RANGE</option>
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <select className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm" value={activityForm.status} onChange={(e) => setActivityForm({ ...activityForm, status: e.target.value as ActivityFormState["status"] })}>
                  <option value="DRAFT">DRAFT</option>
                  <option value="RECRUITING">RECRUITING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="OPEN">OPEN</option>
                  <option value="FULL">FULL</option>
                  <option value="ENDED">ENDED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <select className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm" value={activityForm.visibility} onChange={(e) => setActivityForm({ ...activityForm, visibility: e.target.value as ActivityFormState["visibility"] })}>
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="LINK_ONLY">LINK_ONLY</option>
                  <option value="PRIVATE">PRIVATE</option>
                </select>
                <select className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm" value={activityForm.organizerId} onChange={(e) => setActivityForm({ ...activityForm, organizerId: e.target.value })}>
                  {organizers.map((organizer) => (
                    <option key={organizer.id} value={organizer.id}>
                      {organizer.nickname}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input type="checkbox" checked={activityForm.requiresApproval} onChange={(e) => setActivityForm({ ...activityForm, requiresApproval: e.target.checked })} />
                需要审核
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy === "activity"}>
                  {activityForm.id ? "保存修改" : "创建活动"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setActivityForm(emptyActivityForm(defaultOrganizerId))}>
                  清空
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>数据库活动列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-auto rounded-md border border-black/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-3 py-2">标题</th>
                    <th className="px-3 py-2">开始时间</th>
                    <th className="px-3 py-2">状态</th>
                    <th className="px-3 py-2">来源</th>
                    <th className="px-3 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <tr key={activity.id} className="border-t border-black/5">
                      <td className="px-3 py-2">
                        <div className="font-medium text-zinc-950">{activity.title}</div>
                        <div className="text-xs text-zinc-500">{activity.address}</div>
                      </td>
                      <td className="px-3 py-2 text-zinc-600">{dateOnly(activity.startAt)}</td>
                      <td className="px-3 py-2 text-zinc-600">{activity.status}</td>
                      <td className="px-3 py-2 text-zinc-600">{activity.organizerNickname}</td>
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
                                category: activity.category as ActivityFormState["category"],
                                city: activity.city,
                                destination: activity.destination ?? "",
                                address: activity.address,
                                startAt: toDatetimeLocal(activity.startAt),
                                endAt: toDatetimeLocal(activity.endAt),
                                capacity: String(activity.capacity),
                                minParticipants: activity.minParticipants ? String(activity.minParticipants) : "",
                                requiresApproval: activity.requiresApproval,
                                priceType: activity.priceType,
                                priceText: activity.priceText,
                                status: activity.status as ActivityFormState["status"],
                                visibility: activity.visibility as ActivityFormState["visibility"],
                                organizerId: activity.organizerId || defaultOrganizerId,
                              })
                            }
                          >
                            编辑
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => deleteActivity(activity.id)} disabled={busy === activity.id}>
                            删除
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

      <Card>
        <CardHeader>
          <CardTitle>爬虫导入</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="flex items-center gap-2 text-sm text-zinc-700"><input type="checkbox" checked={scraperForm.sources.sortiraparis} onChange={(e) => setScraperForm({ ...scraperForm, sources: { ...scraperForm.sources, sortiraparis: e.target.checked } })} /> Sortir à Paris</label>
            <label className="flex items-center gap-2 text-sm text-zinc-700"><input type="checkbox" checked={scraperForm.sources.playinparis} onChange={(e) => setScraperForm({ ...scraperForm, sources: { ...scraperForm.sources, playinparis: e.target.checked } })} /> Play in Paris</label>
            <select className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm" value={scraperForm.mode} onChange={(e) => setScraperForm({ ...scraperForm, mode: e.target.value as ScraperFormState["mode"] })}>
              <option value="database">从数据库最后记录后开始</option>
              <option value="recent">最近区间</option>
              <option value="range">自定义范围</option>
            </select>
            <Input type="number" min={1} max={100} value={scraperForm.limit} onChange={(e) => setScraperForm({ ...scraperForm, limit: Number(e.target.value) })} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Input type="datetime-local" value={scraperForm.from} onChange={(e) => setScraperForm({ ...scraperForm, from: e.target.value })} />
            <Input type="datetime-local" value={scraperForm.to} onChange={(e) => setScraperForm({ ...scraperForm, to: e.target.value })} />
            <Input type="number" min={1} value={scraperForm.maxPages} onChange={(e) => setScraperForm({ ...scraperForm, maxPages: Number(e.target.value) })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={previewScraper} disabled={busy === "preview"}>开始抓取</Button>
            <Button type="button" variant="secondary" onClick={() => setPreviewItems([])}>清空结果</Button>
            <Button type="button" variant="secondary" onClick={importSelected} disabled={busy === "import" || previewItems.length === 0}>导入新活动</Button>
          </div>
          <div className="text-sm text-zinc-600">结果：{previewCount} 条，新增 {newCount} 条，重复 {duplicateCount} 条。</div>
          <div className="overflow-auto rounded-md border border-black/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-3 py-2">选择</th>
                  <th className="px-3 py-2">状态</th>
                  <th className="px-3 py-2">标题</th>
                  <th className="px-3 py-2">日期</th>
                  <th className="px-3 py-2">来源</th>
                  <th className="px-3 py-2">重复命中</th>
                </tr>
              </thead>
              <tbody>
                {previewItems.map((item) => (
                  <tr key={item.id} className={item.duplicateStatus === "duplicate" ? "border-t border-black/5 bg-amber-50" : item.duplicateStatus === "existing" ? "border-t border-black/5 bg-zinc-50" : "border-t border-black/5"}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedPreviewIds.includes(item.id)}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setSelectedPreviewIds((current) =>
                            checked ? [...current, item.id] : current.filter((id) => id !== item.id),
                          );
                        }}
                      />
                    </td>
                    <td className={`px-3 py-2 font-medium ${statusColor(item.duplicateStatus)}`}>{item.duplicateStatus}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-950">{item.title}</div>
                      <div className="text-xs text-zinc-500">{item.address}</div>
                    </td>
                    <td className="px-3 py-2 text-zinc-600">{dateOnly(item.startAt)} {item.endAt ? `~ ${dateOnly(item.endAt)}` : ""}</td>
                    <td className="px-3 py-2 text-zinc-600">{item.source}</td>
                    <td className="px-3 py-2 text-zinc-600">{item.duplicateOfTitle ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



