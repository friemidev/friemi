"use client";

import { ImagePlus, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  createPlanetMomentAction,
  sendPlanetMessageAction,
} from "@/features/planets/actions/planetActions";

type PlanetRoomComposerProps = {
  locale: string;
  planetId: string;
  planetSlug: string;
};

export function PlanetRoomComposer({ locale, planetId, planetSlug }: PlanetRoomComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function uploadImage(file: File) {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setUploadError("请选择 JPG、PNG 或 WebP 图片。");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/uploads/moment-image", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => null)) as { url?: string } | null;
      const imageUrl = payload?.url;
      if (!response.ok || !imageUrl) {
        setUploadError("图片上传失败，请稍后重试。");
        return;
      }
      setImageUrls((current) => [...current, imageUrl].slice(0, 4));
    } catch {
      setUploadError("图片上传失败，请稍后重试。");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-5 space-y-4 border-t border-[#ece8dc] pt-4">
      <form action={sendPlanetMessageAction} className="flex items-center gap-2">
        <input name="locale" type="hidden" value={locale} />
        <input name="planetId" type="hidden" value={planetId} />
        <input name="planetSlug" type="hidden" value={planetSlug} />
        <input className="min-w-0 flex-1 rounded-full border border-[#e5e2da] bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#a5a29a]" maxLength={1000} name="content" placeholder="在群聊里说点什么..." required />
        <button aria-label="发送消息" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#246c4b] text-white" type="submit"><Send className="h-4 w-4" /></button>
      </form>

      <form action={createPlanetMomentAction} className="rounded-2xl border border-[#e7e0d5] bg-[#fffdfa] p-3">
        <input name="locale" type="hidden" value={locale} />
        <input name="planetId" type="hidden" value={planetId} />
        <input name="planetSlug" type="hidden" value={planetSlug} />
        <input name="imageUrls" type="hidden" value={JSON.stringify(imageUrls)} />
        <div className="flex items-center justify-between"><p className="text-xs font-black text-[#276949]">发布精彩瞬间</p><span className="text-[10px] font-semibold text-[#8c938b]">图文记录</span></div>
        {imageUrls.length ? <div className="mt-3 grid grid-cols-4 gap-2">{imageUrls.map((imageUrl) => <div className="relative aspect-square" key={imageUrl}><img alt="待发布图片" className="h-full w-full rounded-lg object-cover" src={imageUrl} /><button aria-label="移除图片" className="absolute -right-1 -top-1 rounded-full bg-[#7a342d] p-1 text-white" onClick={() => setImageUrls((current) => current.filter((url) => url !== imageUrl))} type="button"><X className="h-3 w-3" /></button></div>)}</div> : null}
        <textarea className="mt-3 min-h-20 w-full resize-none rounded-xl border border-[#e1ddd0] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[#a5a29a]" maxLength={2000} name="content" placeholder="记录这个星球的精彩时刻，也可以只发图片" />
        <div className="mt-2 flex items-center justify-between"><input ref={inputRef} accept="image/jpeg,image/png,image/webp" className="hidden" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} /><button className="inline-flex items-center gap-1.5 text-xs font-bold text-[#47715b] disabled:opacity-50" disabled={isUploading || imageUrls.length >= 4} onClick={() => inputRef.current?.click()} type="button"><ImagePlus className="h-4 w-4" />{isUploading ? "上传中..." : `添加图片 ${imageUrls.length ? `(${imageUrls.length}/4)` : ""}`}</button><button className="rounded-xl bg-[#246c4b] px-4 py-2 text-xs font-black text-white">发布</button></div>
        {uploadError ? <p className="mt-2 text-xs font-semibold text-[#ba4439]">{uploadError}</p> : null}
      </form>
    </div>
  );
}
