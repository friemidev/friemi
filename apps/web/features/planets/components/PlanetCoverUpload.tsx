"use client";
import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
export function PlanetCoverUpload({ name = "coverImageUrl" }: { name?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) return;
    setBusy(true);
    const data = new FormData(); data.append("file", file);
    const response = await fetch("/api/uploads/activity-cover", { method: "POST", body: data });
    const result = await response.json().catch(() => null) as { url?: string } | null;
    if (result?.url) setUrl(result.url);
    setBusy(false);
  }
  return <div className="flex items-center gap-3 rounded-2xl border border-[#dfdbcf] bg-white p-2"><input name={name} type="hidden" value={url} /><input ref={inputRef} accept="image/jpeg,image/png,image/webp" className="hidden" type="file" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); }} /><button className="relative h-16 w-24 overflow-hidden rounded-xl bg-[linear-gradient(135deg,#163250,#507884)]" onClick={() => inputRef.current?.click()} type="button">{url ? <img alt="星球封面" className="h-full w-full object-cover" src={url} /> : <ImagePlus className="mx-auto h-6 w-6 text-white" />}</button><button className="text-xs font-bold text-[#47715b]" onClick={() => inputRef.current?.click()} type="button">{busy ? "上传中..." : url ? "点击更换封面" : "点击上传封面"}</button></div>;
}
