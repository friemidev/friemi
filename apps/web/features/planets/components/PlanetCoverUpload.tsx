"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import {
  acceptedImageInputTypes,
  getImageUploadClientValidationError,
} from "@/lib/image-upload-policy";

export function PlanetCoverUpload({
  locale,
  name = "coverImageUrl",
}: {
  locale: string;
  name?: string;
}) {
  const copy =
    locale === "fr"
      ? {
          alt: "Couverture de la planète",
          change: "Changer la couverture",
          upload: "Ajouter une couverture",
          uploading: "Importation...",
        }
      : locale === "en"
        ? {
            alt: "Planet cover",
            change: "Change cover",
            upload: "Upload cover",
            uploading: "Uploading...",
          }
        : {
            alt: "星球封面",
            change: "点击更换封面",
            upload: "点击上传封面",
            uploading: "上传中...",
          };
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (getImageUploadClientValidationError(file)) {
      return;
    }

    setBusy(true);

    try {
      const data = new FormData();
      data.append("file", file);

      const response = await fetch("/api/uploads/activity-cover", {
        method: "POST",
        body: data,
      });
      const result = (await response.json().catch(() => null)) as {
        url?: string;
      } | null;

      if (result?.url) {
        setUrl(result.url);
      }
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#dfdbcf] bg-white p-2">
      <input name={name} type="hidden" value={url} />
      <input
        ref={inputRef}
        accept={acceptedImageInputTypes}
        className="hidden"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void upload(file);
          }
        }}
      />
      <button
        className="relative h-16 w-24 overflow-hidden rounded-xl bg-[linear-gradient(135deg,#163250,#507884)]"
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {url ? (
          <img
            alt={copy.alt}
            className="h-full w-full object-cover"
            src={url}
          />
        ) : (
          <ImagePlus className="mx-auto h-6 w-6 text-white" />
        )}
      </button>
      <button
        className="text-xs font-bold text-[#47715b]"
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {busy ? copy.uploading : url ? copy.change : copy.upload}
      </button>
    </div>
  );
}
