"use client";

import { ImagePlus, Plus, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  createPlanetMomentAction,
  sendPlanetMessageAction,
} from "@/features/planets/actions/planetActions";

const maxMomentImageCount = 12;

type PlanetRoomComposerProps = {
  canCreateMoment?: boolean;
  locale: string;
  planetId: string;
  planetSlug: string;
};

export function PlanetRoomComposer({
  canCreateMoment = false,
  locale,
  planetId,
  planetSlug,
}: PlanetRoomComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isMomentComposerOpen, setIsMomentComposerOpen] = useState(false);

  async function uploadImages(files: FileList) {
    const availableSlots = maxMomentImageCount - imageUrls.length;
    const selectedFiles = Array.from(files).slice(0, availableSlots);
    const invalidFile = selectedFiles.find((file) => !file.type.match(/^image\/(jpeg|png|webp)$/));
    if (invalidFile) {
      setUploadError("请选择 JPG、PNG 或 WebP 图片。");
      return;
    }
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadError("");
    try {
      const uploadedUrls: string[] = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/uploads/moment-image", { method: "POST", body: formData });
        const payload = (await response.json().catch(() => null)) as { url?: string } | null;
        const imageUrl = payload?.url;
        if (!response.ok || !imageUrl) {
          setUploadError("有图片上传失败，请稍后重试。");
          break;
        }
        uploadedUrls.push(imageUrl);
      }
      setImageUrls((current) => [...current, ...uploadedUrls].slice(0, maxMomentImageCount));
    } catch {
      setUploadError("图片上传失败，请稍后重试。");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
    <div className="mt-5 border-t border-[#ece8dc] pt-4">
      <form action={sendPlanetMessageAction} className="flex items-center gap-2">
        <input name="locale" type="hidden" value={locale} />
        <input name="planetId" type="hidden" value={planetId} />
        <input name="planetSlug" type="hidden" value={planetSlug} />
        <input className="min-w-0 flex-1 rounded-full border border-[#e5e2da] bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#a5a29a]" maxLength={1000} name="content" placeholder="在群聊里说点什么..." required />
        <button aria-label="发送消息" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#246c4b] text-white" type="submit"><Send className="h-4 w-4" /></button>
      </form>
    </div>

    {canCreateMoment ? (
      <>
        <button
          aria-label="发布精彩瞬间"
          className="fixed bottom-[calc(6.2rem+env(safe-area-inset-bottom))] right-[max(1rem,calc((100vw-28rem)/2+1rem))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#246c4b] text-white shadow-[0_14px_30px_rgba(36,108,75,0.28)] transition active:scale-95"
          onClick={() => setIsMomentComposerOpen(true)}
          type="button"
        >
          <Plus className="h-7 w-7" />
        </button>

        {isMomentComposerOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-12 backdrop-blur-sm sm:items-center sm:pb-4">
            <button
              aria-label="关闭发布精彩瞬间"
              className="absolute inset-0"
              onClick={() => setIsMomentComposerOpen(false)}
              type="button"
            />
            <form action={createPlanetMomentAction} className="relative z-10 w-full max-w-md rounded-[1.5rem] border border-[#e7e0d5] bg-[#fffdfa] p-4 shadow-2xl">
        <input name="locale" type="hidden" value={locale} />
        <input name="planetId" type="hidden" value={planetId} />
        <input name="planetSlug" type="hidden" value={planetSlug} />
        <input name="imageUrls" type="hidden" value={JSON.stringify(imageUrls)} />
        <div className="flex items-center justify-between">
          <p className="text-base font-black text-[#276949]">发布精彩瞬间</p>
          <button aria-label="关闭" className="rounded-full p-2 text-[#8c938b]" onClick={() => setIsMomentComposerOpen(false)} type="button"><X className="h-5 w-5" /></button>
        </div>
        {imageUrls.length ? <div className="mt-3 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto rounded-2xl bg-[#f7f4ed] p-2">{imageUrls.map((imageUrl, index) => <div className={`relative ${index % 5 === 0 ? "row-span-2" : ""}`} key={imageUrl}><img alt="待发布图片" className="h-full min-h-24 w-full rounded-xl object-cover" src={imageUrl} /><button aria-label="移除图片" className="absolute -right-1 -top-1 rounded-full bg-[#7a342d] p-1 text-white" onClick={() => setImageUrls((current) => current.filter((url) => url !== imageUrl))} type="button"><X className="h-3 w-3" /></button></div>)}</div> : null}
        <textarea className="mt-3 min-h-20 w-full resize-none rounded-xl border border-[#e1ddd0] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[#a5a29a]" maxLength={2000} name="content" placeholder="记录这个星球的精彩时刻，也可以只发图片" />
        <div className="mt-2 flex items-center justify-between"><input ref={inputRef} accept="image/jpeg,image/png,image/webp" className="hidden" multiple type="file" onChange={(event) => { const files = event.target.files; if (files) void uploadImages(files); }} /><button className="inline-flex items-center gap-1.5 text-xs font-bold text-[#47715b] disabled:opacity-50" disabled={isUploading || imageUrls.length >= maxMomentImageCount} onClick={() => inputRef.current?.click()} type="button"><ImagePlus className="h-4 w-4" />{isUploading ? "上传中..." : `添加图片 ${imageUrls.length ? `(${imageUrls.length}/${maxMomentImageCount})` : ""}`}</button><button className="rounded-xl bg-[#246c4b] px-4 py-2 text-xs font-black text-white">发布</button></div>
        {uploadError ? <p className="mt-2 text-xs font-semibold text-[#ba4439]">{uploadError}</p> : null}
      </form>
          </div>
        ) : null}
      </>
    ) : null}
    </>
  );
}
