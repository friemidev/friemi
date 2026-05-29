"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Link as LinkIcon, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@chill-club/ui";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { ActivityCopyButton } from "./ActivityCopyButton";

type ActivityShareToolsProps = {
  activityTitle: string;
  categoryLabel: string;
  coverImageUrl?: string | null;
  dateLabel: string;
  description: string;
  locationLabel: string;
  locale: string;
  priceLabel: string;
};

type DrawLineOptions = {
  color?: string;
  font: string;
  maxLines: number;
};

type DrawInfoCardOptions = {
  height?: number;
  lineHeight?: number;
  maxLines?: number;
  valueFont?: string;
};

function sanitizeFileName(value: string) {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 60) || "activity"
  );
}

function getUrlHost(value: string) {
  try {
    return new URL(value).host.replace(/^www\./, "");
  } catch {
    return "Next Fun Club";
  }
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  options: DrawLineOptions,
) {
  context.fillStyle = options.color ?? "#18181b";
  context.font = options.font;

  const chars = [...text.trim().replace(/\s+/g, " ")];
  const lines: string[] = [];
  let currentLine = "";

  for (const char of chars) {
    const nextLine = `${currentLine}${char}`;
    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = char.trimStart();

    if (lines.length === options.maxLines) {
      break;
    }
  }

  if (currentLine && lines.length < options.maxLines) {
    lines.push(currentLine);
  }

  if (chars.join("") !== lines.join("")) {
    const lastIndex = lines.length - 1;
    let lastLine = lines[lastIndex] ?? "";
    while (
      lastLine.length > 0 &&
      context.measureText(`${lastLine}...`).width > maxWidth
    ) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[lastIndex] = `${lastLine}...`;
  }

  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });

  return y + lines.length * lineHeight;
}

function drawPill(
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
) {
  context.font = "700 28px sans-serif";
  const width = context.measureText(label).width + 44;
  context.fillStyle = "#eef6ea";
  context.beginPath();
  context.roundRect(x, y, width, 52, 26);
  context.fill();
  context.fillStyle = "#3f5f46";
  context.fillText(label, x + 22, y + 35);

  return width;
}

function drawInfoCard(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  options: DrawInfoCardOptions = {},
) {
  const height = options.height ?? 142;
  const lineHeight = options.lineHeight ?? 40;
  const maxLines = options.maxLines ?? 1;
  const valueFont = options.valueFont ?? "700 34px sans-serif";

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.roundRect(x, y, width, height, 20);
  context.fill();

  context.font = "700 26px sans-serif";
  context.fillStyle = "#52525b";
  context.fillText(label, x + 26, y + 42);
  context.font = valueFont;
  context.fillStyle = "#18181b";

  drawWrappedText(context, value, x + 26, y + 88, width - 52, lineHeight, {
    font: valueFont,
    maxLines,
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function loadFetchedImage(src: string) {
  const response = await fetch(src, {
    mode: "cors",
    referrerPolicy: "no-referrer",
  });

  if (!response.ok) {
    throw new Error("Cover image fetch failed");
  }

  const objectUrl = URL.createObjectURL(await response.blob());

  try {
    return {
      image: await loadImage(objectUrl),
      objectUrl,
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    x,
    y,
    width,
    height,
  );
}

export function ActivityShareTools({
  activityTitle,
  categoryLabel,
  coverImageUrl,
  dateLabel,
  description,
  locationLabel,
  locale,
  priceLabel,
}: ActivityShareToolsProps) {
  const t = getCopy(locale).activityShare;
  const [activityUrl, setActivityUrl] = useState("");
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<
    "idle" | "downloading" | "failed"
  >("idle");
  const posterFileName = useMemo(
    () =>
      `${sanitizeFileName(activityTitle)}-${sanitizeFileName(dateLabel).slice(
        0,
        36,
      )}-next-fun-club.png`,
    [activityTitle, dateLabel],
  );

  useEffect(() => {
    setActivityUrl(window.location.href);
  }, []);

  async function handleDownloadPoster() {
    if (!activityUrl) {
      return;
    }

    setDownloadState("downloading");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas context is not available");
      }

      context.fillStyle = "#f5f1e8";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#dbeaf1";
      context.fillRect(0, 0, canvas.width, 360);
      let hasCoverBackground = false;

      if (coverImageUrl) {
        try {
          const { image, objectUrl } = await loadFetchedImage(coverImageUrl);
          drawImageCover(context, image, 0, 0, canvas.width, 360);
          URL.revokeObjectURL(objectUrl);
          context.fillStyle = "rgba(0, 0, 0, 0.38)";
          context.fillRect(0, 0, canvas.width, 360);
          hasCoverBackground = true;
        } catch {
          context.fillStyle = "#bb603f";
          context.fillRect(0, 0, 140, 360);
        }
      } else {
        context.fillStyle = "#bb603f";
        context.fillRect(0, 0, 140, 360);
      }

      context.fillStyle = "#18181b";
      context.beginPath();
      context.roundRect(72, 72, 76, 76, 14);
      context.fill();
      context.fillStyle = "#ffffff";
      context.font = "800 30px sans-serif";
      context.fillText("NF", 90, 121);
      context.font = "700 28px sans-serif";
      context.fillStyle = hasCoverBackground ? "#ffffff" : "#3f5f46";
      context.fillText("Next Fun Club", 176, 120);

      drawPill(context, categoryLabel, 72, 286);

      drawWrappedText(context, activityTitle, 72, 440, 936, 68, {
        font: "800 62px sans-serif",
        maxLines: 2,
      });

      drawWrappedText(context, description, 72, 616, 936, 38, {
        color: "#52525b",
        font: "400 30px sans-serif",
        maxLines: 2,
      });

      const cardWidth = 448;
      drawInfoCard(context, t.posterTime, dateLabel, 72, 710, cardWidth, {
        height: 158,
        maxLines: 2,
      });
      drawInfoCard(context, t.posterPrice, priceLabel, 560, 710, cardWidth, {
        height: 158,
        maxLines: 2,
      });
      drawInfoCard(context, t.posterLocation, locationLabel, 72, 890, 936, {
        height: 174,
        lineHeight: 34,
        maxLines: 3,
        valueFont: "700 28px sans-serif",
      });

      const qrDataUrl = await QRCode.toDataURL(activityUrl, {
        color: {
          dark: "#18181b",
          light: "#ffffff",
        },
        margin: 1,
        width: 260,
      });
      const qrImage = await loadImage(qrDataUrl);
      const urlHost = getUrlHost(activityUrl);

      context.fillStyle = "#ffffff";
      context.beginPath();
      context.roundRect(72, 1096, 936, 170, 28);
      context.fill();
      context.drawImage(qrImage, 786, 1122, 118, 118);
      context.font = "800 34px sans-serif";
      context.fillStyle = "#18181b";
      context.fillText(t.posterScanTitle, 108, 1160);
      context.font = "400 26px sans-serif";
      context.fillStyle = "#52525b";
      drawWrappedText(context, t.posterScanDescription, 108, 1204, 610, 32, {
        color: "#52525b",
        font: "400 26px sans-serif",
        maxLines: 1,
      });
      context.font = "700 24px sans-serif";
      context.fillStyle = "#3f5f46";
      context.fillText(urlHost, 108, 1242);

      const posterDataUrl = canvas.toDataURL("image/png");
      setPosterPreviewUrl(posterDataUrl);

      const link = document.createElement("a");
      link.download = posterFileName;
      link.href = posterDataUrl;
      link.click();
      setDownloadState("idle");
    } catch (error) {
      console.error("Failed to generate activity poster", error);
      setDownloadState("failed");
    }
  }

  const canDownload = Boolean(activityUrl) && downloadState !== "downloading";

  return (
    <div className="rounded-md border border-zinc-200 bg-paper/80 p-3">
      <div className="flex items-start gap-2">
        <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{t.title}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {t.description}
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <div className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-ink ring-1 ring-zinc-200">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{t.copyTitle}</span>
          <ActivityCopyButton
            className="-mr-1"
            failedLabel={t.copyFailed}
            label={t.copyTitle}
            successLabel={t.copied}
            value={activityTitle}
          />
        </div>
        <div className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-medium text-ink ring-1 ring-zinc-200">
          <LinkIcon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{t.copyLink}</span>
          {activityUrl ? (
            <ActivityCopyButton
              className="-mr-1"
              failedLabel={t.copyFailed}
              label={t.copyLink}
              successLabel={t.copied}
              value={activityUrl}
            />
          ) : null}
        </div>
        <Button
          className={cn("gap-2 px-3", !canDownload && "opacity-70")}
          disabled={!canDownload}
          onClick={handleDownloadPoster}
          type="button"
          variant="secondary"
        >
          <Download className="h-4 w-4 shrink-0" />
          {downloadState === "downloading" ? t.downloading : t.downloadPoster}
        </Button>
      </div>
      {downloadState === "failed" ? (
        <p className="mt-2 text-xs leading-5 text-red-600">
          {t.downloadFailed}
        </p>
      ) : null}
      {posterPreviewUrl ? (
        <div className="relative mt-3 overflow-hidden rounded-md bg-white ring-1 ring-zinc-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={t.posterPreviewAlt}
            className="aspect-[4/5] w-full object-cover"
            src={posterPreviewUrl}
          />
          <a
            aria-label={t.downloadPoster}
            className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm ring-1 ring-black/10 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"
            download={posterFileName}
            href={posterPreviewUrl}
            title={t.downloadPoster}
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      ) : null}
    </div>
  );
}
