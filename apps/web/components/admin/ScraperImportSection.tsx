"use client";

import { useMemo, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from "@chill-club/ui";
import type { ScraperImportMode, ScraperPreviewItem } from "@/lib/admin-scraper";
import { FormField, selectClassName } from "@/components/admin/FormField";

type ScraperFormState = {
  sources: Record<"sortiraparis" | "playinparis", boolean>;
  mode: "recent" | "range" | "database";
  from: string;
  to: string;
  limit: number;
  maxPages: number;
};

type ScraperImportSectionProps = {
  busy: string | null;
  onBusyChange: (value: string | null) => void;
  onImported: () => Promise<void>;
};

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

function statusLabel(status: ScraperPreviewItem["duplicateStatus"]) {
  if (status === "existing") return "已有";
  if (status === "duplicate") return "相似";
  return "新增";
}

const importModeLabels: Record<ScraperImportMode, string> = {
  create_only: "只新增",
  update_only: "只更新",
  upsert: "新增或更新",
  skip_existing: "忽略已有",
};

const compactSelectClassName = `${selectClassName} h-9`;

function LoadingLabel({ loading, loadingText, children }: { loading: boolean; loadingText: string; children: string }) {
  if (!loading) return children;
  return (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      {loadingText}
    </>
  );
}

export function ScraperImportSection({ busy, onBusyChange, onImported }: ScraperImportSectionProps) {
  const [scraperForm, setScraperForm] = useState<ScraperFormState>({
    sources: { sortiraparis: true, playinparis: true },
    mode: "database",
    from: todayPlusDays(-7),
    to: todayPlusDays(30),
    limit: 20,
    maxPages: 3,
  });
  const [previewItems, setPreviewItems] = useState<ScraperPreviewItem[]>([]);
  const [itemOverrides, setItemOverrides] = useState<Record<string, ScraperPreviewItem>>({});
  const [selectedPreviewIds, setSelectedPreviewIds] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<ScraperImportMode>("create_only");
  const [mergeDuplicates, setMergeDuplicates] = useState(true);
  const [editingItem, setEditingItem] = useState<ScraperPreviewItem | null>(null);

  const isPreviewing = busy === "preview";
  const isImporting = busy === "import";
  const isBusy = isPreviewing || isImporting;

  const resolvedPreviewItems = useMemo(
    () => previewItems.map((item) => itemOverrides[item.id] ?? item),
    [previewItems, itemOverrides],
  );

  const selectedPreviewItems = useMemo(
    () => resolvedPreviewItems.filter((item) => selectedPreviewIds.includes(item.id)),
    [resolvedPreviewItems, selectedPreviewIds],
  );

  const previewCount = resolvedPreviewItems.length;
  const newCount = resolvedPreviewItems.filter((item) => item.duplicateStatus === "new").length;
  const duplicateCount = resolvedPreviewItems.filter((item) => item.duplicateStatus !== "new").length;
  const isDatabaseMode = scraperForm.mode === "database";

  function applySelection(ids: string[]) {
    setSelectedPreviewIds(ids);
  }

  function selectAll() {
    applySelection(resolvedPreviewItems.map((item) => item.id));
  }

  function selectNewOnly() {
    applySelection(resolvedPreviewItems.filter((item) => item.duplicateStatus === "new").map((item) => item.id));
  }

  function selectUpdatable() {
    applySelection(
      resolvedPreviewItems
        .filter((item) => item.duplicateStatus === "existing" || item.duplicateStatus === "duplicate")
        .map((item) => item.id),
    );
  }

  function selectNone() {
    applySelection([]);
  }

  async function previewScraper() {
    onBusyChange("preview");
    try {
      const sources = Object.entries(scraperForm.sources)
        .filter(([, enabled]) => enabled)
        .map(([source]) => source);

      if (sources.length === 0) {
        toast.error("请至少选择一个抓取来源");
        return;
      }

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
      if (!response.ok) {
        toast.error(json.error ?? "预览失败，请稍后重试");
        return;
      }

      const items = (json.items ?? []) as ScraperPreviewItem[];
      setPreviewItems(items);
      setItemOverrides({});
      applySelection(items.filter((item) => item.duplicateStatus === "new").map((item) => item.id));
      toast.success(`预览完成：共 ${items.length} 条（新增 ${items.filter((i) => i.duplicateStatus === "new").length} 条）`);
    } catch {
      toast.error("预览失败，请检查网络或稍后重试");
    } finally {
      onBusyChange(null);
    }
  }

  async function importSelected() {
    onBusyChange("import");
    try {
      const response = await fetch("/api/admin/scraper/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedPreviewItems,
          mode: importMode,
          mergeDuplicates,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        toast.error(json.error ?? "导入失败，请稍后重试");
        return;
      }

      await onImported();
      const mergedText = json.merged ? `，合并来源 ${json.merged} 条` : "";
      toast.success(`导入完成：成功 ${json.imported ?? 0} 条，跳过 ${json.skipped ?? 0} 条${mergedText}`);
    } catch {
      toast.error("导入失败，请检查网络或稍后重试");
    } finally {
      onBusyChange(null);
    }
  }

  function saveEditedItem() {
    if (!editingItem) return;
    setItemOverrides((current) => ({ ...current, [editingItem.id]: editingItem }));
    setEditingItem(null);
    toast.success("已保存本条编辑");
  }

  return (
    <Card>
      <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
        <CardTitle>公共活动导入</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
        <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-3 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium">先预览，再导入</p>
            <p className="leading-6">
              公共活动通过服务端读取外部 API。请先预览并选择要导入的活动，避免频繁请求公共数据源。
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="抓取来源">
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={scraperForm.sources.sortiraparis}
                  onChange={(e) => setScraperForm({ ...scraperForm, sources: { ...scraperForm.sources, sortiraparis: e.target.checked } })}
                />
                Sortir à Paris
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={scraperForm.sources.playinparis}
                  onChange={(e) => setScraperForm({ ...scraperForm, sources: { ...scraperForm.sources, playinparis: e.target.checked } })}
                />
                Play in Paris
              </label>
            </div>
          </FormField>
          <FormField label="时间策略" hint="决定从什么时间范围开始预览">
            <select
              className={compactSelectClassName}
              value={scraperForm.mode}
              onChange={(e) => setScraperForm({ ...scraperForm, mode: e.target.value as ScraperFormState["mode"] })}
            >
              <option value="database">从数据库最后记录后开始</option>
              <option value="recent">最近区间</option>
              <option value="range">自定义范围</option>
            </select>
          </FormField>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <FormField label="最多抓取条数" hint="合并各来源后的总上限">
            <Input className="h-9" type="number" min={1} max={100} value={scraperForm.limit} onChange={(e) => setScraperForm({ ...scraperForm, limit: Number(e.target.value) })} />
          </FormField>
          <FormField
            label="开始时间"
            hint={isDatabaseMode ? "数据库模式会自动从最新活动后开始。" : undefined}
          >
            <Input
              className="h-9 disabled:bg-zinc-100 disabled:text-zinc-400"
              type="datetime-local"
              value={scraperForm.from}
              disabled={isDatabaseMode}
              onChange={(e) => setScraperForm({ ...scraperForm, from: e.target.value })}
            />
          </FormField>
          <FormField label="结束时间" hint="作为本次预览的上限，避免一次拉取过多。">
            <Input className="h-9" type="datetime-local" value={scraperForm.to} onChange={(e) => setScraperForm({ ...scraperForm, to: e.target.value })} />
          </FormField>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <FormField label="每个来源最大列表页数" hint="控制外部 API 请求量，例如 3 表示最多读 3 页。">
            <Input className="h-9" type="number" min={1} max={20} value={scraperForm.maxPages} onChange={(e) => setScraperForm({ ...scraperForm, maxPages: Number(e.target.value) })} />
          </FormField>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={previewScraper} disabled={isBusy} className="min-w-[8.5rem]">
            <LoadingLabel loading={isPreviewing} loadingText="预览中…">
              预览活动
            </LoadingLabel>
          </Button>
          <Button type="button" variant="secondary" disabled={isBusy} onClick={() => { setPreviewItems([]); setItemOverrides({}); selectNone(); }}>
            清空预览
          </Button>
          <Button
            type="button"
            onClick={importSelected}
            disabled={isBusy || selectedPreviewItems.length === 0}
            className="min-w-[9.5rem]"
          >
            <LoadingLabel loading={isImporting} loadingText="导入中…">
              {`导入选中 (${selectedPreviewItems.length})`}
            </LoadingLabel>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-md border border-black/10 bg-zinc-50 px-3 py-3 text-sm">
          <FormField label="导入模式" className="min-w-[10rem]">
            <select className={compactSelectClassName} value={importMode} onChange={(e) => setImportMode(e.target.value as ScraperImportMode)}>
              {(Object.keys(importModeLabels) as ScraperImportMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  {importModeLabels[mode]}
                </option>
              ))}
            </select>
          </FormField>
          <label className="flex items-center gap-2 pt-6 text-zinc-700">
            <input type="checkbox" checked={mergeDuplicates} onChange={(e) => setMergeDuplicates(e.target.checked)} />
            相似内容合并到已有活动
          </label>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Button type="button" variant="secondary" onClick={selectAll} disabled={previewCount === 0 || isBusy}>
            全选
          </Button>
          <Button type="button" variant="secondary" onClick={selectNewOnly} disabled={previewCount === 0 || isBusy}>
            只选新增
          </Button>
          <Button type="button" variant="secondary" onClick={selectUpdatable} disabled={previewCount === 0 || isBusy}>
            只选可更新
          </Button>
          <Button type="button" variant="secondary" onClick={selectNone} disabled={previewCount === 0 || isBusy}>
            清空选择
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-zinc-600">
          <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1">
            预览 {previewCount} 条
          </span>
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
            新增 {newCount} 条
          </span>
          <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-amber-700">
            重复/相似 {duplicateCount} 条
          </span>
        </div>

        <div className="relative overflow-auto rounded-md border border-black/10">
          {isBusy ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-white/80 text-sm text-zinc-700">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              {isPreviewing ? "正在读取公共活动，请稍候…" : "正在导入，请稍候…"}
            </div>
          ) : null}
          <table className="min-w-[980px] text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-3 py-2">选择</th>
                <th className="px-3 py-2">状态</th>
                <th className="px-3 py-2">标题</th>
                <th className="px-3 py-2">日期</th>
                <th className="px-3 py-2">来源</th>
                <th className="px-3 py-2">原文</th>
                <th className="px-3 py-2">重复命中</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {resolvedPreviewItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center">
                    <p className="font-medium text-zinc-800">还没有预览结果</p>
                    <p className="mt-2 text-sm text-zinc-500">
                      点击“预览活动”后，系统会先展示新增和相似活动，再由你选择是否导入。
                    </p>
                  </td>
                </tr>
              ) : null}
              {resolvedPreviewItems.map((item) => (
                <tr
                  key={item.id}
                  className={
                    item.duplicateStatus === "duplicate"
                      ? "border-t border-black/5 bg-amber-50"
                      : item.duplicateStatus === "existing"
                        ? "border-t border-black/5 bg-zinc-50"
                        : "border-t border-black/5"
                  }
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedPreviewIds.includes(item.id)}
                      disabled={isBusy}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelectedPreviewIds((current) =>
                          checked ? [...current, item.id] : current.filter((id) => id !== item.id),
                        );
                      }}
                    />
                  </td>
                  <td className={`px-3 py-2 font-medium ${statusColor(item.duplicateStatus)}`}>{statusLabel(item.duplicateStatus)}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-zinc-950">{item.title}</div>
                    <div className="text-xs text-zinc-500">{item.address}</div>
                    {itemOverrides[item.id] ? <div className="text-xs text-sky-600">已编辑</div> : null}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">
                    {dateOnly(item.startAt)} {item.endAt ? `~ ${dateOnly(item.endAt)}` : ""}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{item.source}</td>
                  <td className="px-3 py-2">
                    <a className="text-sky-700 underline" href={item.sourceUrl} target="_blank" rel="noreferrer">
                      打开
                    </a>
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{item.duplicateOfTitle ?? "-"}</td>
                  <td className="px-3 py-2">
                    <Button type="button" variant="secondary" disabled={isBusy} onClick={() => setEditingItem(itemOverrides[item.id] ?? item)}>
                      编辑
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editingItem ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-6">
              <h3 className="text-lg font-semibold text-zinc-950">导入前编辑</h3>
              <p className="mt-1 text-sm text-zinc-500">修改仅影响本次导入，不会写回爬虫源站。</p>
              <div className="mt-4 grid gap-3">
                <FormField label="标题">
                  <Input value={editingItem.title} onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })} />
                </FormField>
                <FormField label="描述">
                  <Textarea className="min-h-20" value={editingItem.description} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} />
                </FormField>
                <FormField label="行程（可选）">
                  <Textarea className="min-h-20" value={editingItem.itinerary ?? ""} onChange={(e) => setEditingItem({ ...editingItem, itinerary: e.target.value || null })} />
                </FormField>
                <FormField label="地址">
                  <Input value={editingItem.address} onChange={(e) => setEditingItem({ ...editingItem, address: e.target.value })} />
                </FormField>
                <FormField label="原文链接">
                  <Input value={editingItem.sourceUrl} onChange={(e) => setEditingItem({ ...editingItem, sourceUrl: e.target.value })} />
                </FormField>
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField label="开始时间">
                    <Input type="datetime-local" value={toDatetimeLocal(editingItem.startAt)} onChange={(e) => setEditingItem({ ...editingItem, startAt: new Date(e.target.value).toISOString() })} />
                  </FormField>
                  <FormField label="结束时间">
                    <Input type="datetime-local" value={toDatetimeLocal(editingItem.endAt)} onChange={(e) => setEditingItem({ ...editingItem, endAt: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                  </FormField>
                </div>
                <FormField label="人数上限">
                  <Input type="number" min={1} value={editingItem.capacity} onChange={(e) => setEditingItem({ ...editingItem, capacity: Number(e.target.value) })} />
                </FormField>
                <FormField label="费用说明">
                  <Input value={editingItem.priceText} onChange={(e) => setEditingItem({ ...editingItem, priceText: e.target.value })} />
                </FormField>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>
                  取消
                </Button>
                <Button type="button" onClick={saveEditedItem}>
                  保存
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
