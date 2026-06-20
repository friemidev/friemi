"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Download,
  Link as LinkIcon,
  QrCode,
  Share2,
  X,
} from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@chill-club/ui";
import type {
  AnalyticsEntityType,
  AnalyticsSourceSurface,
} from "@/features/analytics/events";
import { trackClientAnalyticsEvent } from "@/features/analytics/client";
import { getActivityCoverDisplayUrl } from "@/lib/activity-cover-display";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { ActivityCopyButton } from "./ActivityCopyButton";

type ActivityShareToolsProps = {
  activityTitle: string;
  analyticsEntityId: string;
  analyticsEntityType: AnalyticsEntityType;
  analyticsSourceSurface?: AnalyticsSourceSurface;
  categoryLabel: string;
  coverImageUrl?: string | null;
  dateLabel: string;
  description: string;
  locationLabel: string;
  locale: string;
  priceLabel: string;
  sharePath?: string | null;
  shareKind?: "activity" | "team";
};

type WebShareMode = "copy" | "native" | "wechat";

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
    return "Next Fun";
  }
}

function isWechatWebView(userAgent: string) {
  return /MicroMessenger/i.test(userAgent);
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

async function drawBrandHeader(
  context: CanvasRenderingContext2D,
  hasCoverBackground: boolean,
) {
  try {
    const logo = await loadImage("/logo.png");
    context.fillStyle = "rgba(255, 255, 255, 0.92)";
    context.beginPath();
    context.roundRect(72, 72, 76, 76, 38);
    context.fill();
    context.drawImage(logo, 78, 78, 64, 64);
  } catch {
    context.fillStyle = hasCoverBackground ? "#ffffff" : "#3f5f46";
    context.font = "800 30px sans-serif";
    context.fillText("Next Fun", 72, 120);
    return;
  }

  context.font = "700 28px sans-serif";
  context.fillStyle = hasCoverBackground ? "#ffffff" : "#3f5f46";
  context.fillText("Next Fun", 176, 120);
}

export function ActivityShareTools({
  activityTitle,
  analyticsEntityId,
  analyticsEntityType,
  analyticsSourceSurface = "activity_detail",
  categoryLabel,
  coverImageUrl,
  dateLabel,
  description,
  locationLabel,
  locale,
  priceLabel,
  sharePath = null,
  shareKind = "activity",
}: ActivityShareToolsProps) {
  const t = getCopy(locale).activityShare;
  const [activityUrl, setActivityUrl] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [shareHelpOpen, setShareHelpOpen] = useState(false);
  const [shareMode, setShareMode] = useState<WebShareMode>("copy");
  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<
    "idle" | "downloading" | "failed"
  >("idle");
  const [qrDownloadState, setQrDownloadState] = useState<
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
  const qrFileName = useMemo(
    () => `${sanitizeFileName(activityTitle)}-next-fun-club-qr.png`,
    [activityTitle],
  );

  useEffect(() => {
    const resolvedUrl = sharePath
      ? new URL(sharePath, window.location.origin).toString()
      : window.location.href;

    setActivityUrl(resolvedUrl);
  }, [sharePath]);

  useEffect(() => {
    if (isWechatWebView(navigator.userAgent)) {
      setShareMode("wechat");
      return;
    }

    if (typeof navigator.share === "function") {
      setShareMode("native");
    }
  }, []);

  async function handleSystemShare() {
    if (!activityUrl) {
      return;
    }

    if (shareMode === "native" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: activityTitle,
          url: activityUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    setShareHelpOpen(true);
  }

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
          const { image, objectUrl } = await loadFetchedImage(
            getActivityCoverDisplayUrl(coverImageUrl),
          );
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

      await drawBrandHeader(context, hasCoverBackground);

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
      trackClientAnalyticsEvent({
        name: "poster_downloaded",
        entityId: analyticsEntityId,
        entityType: analyticsEntityType,
        sourceSurface: analyticsSourceSurface,
        properties: {
          has_cover_image: Boolean(coverImageUrl),
          has_qr_code: true,
        },
      });
      setDownloadState("idle");
    } catch (error) {
      console.error("Failed to generate activity poster", error);
      setDownloadState("failed");
    }
  }

  async function handleDownloadQrCode() {
    if (!activityUrl) {
      return;
    }

    setQrDownloadState("downloading");

    try {
      const qrDataUrl = await QRCode.toDataURL(activityUrl, {
        color: {
          dark: "#18181b",
          light: "#ffffff",
        },
        margin: 2,
        width: 720,
      });
      const link = document.createElement("a");
      link.download = qrFileName;
      link.href = qrDataUrl;
      link.click();
      trackClientAnalyticsEvent({
        name: "qr_code_shared",
        entityId: analyticsEntityId,
        entityType: analyticsEntityType,
        sourceSurface: analyticsSourceSurface,
        properties: {
          share_mode: "qr_download",
        },
      });
      setQrDownloadState("idle");
    } catch (error) {
      console.error("Failed to generate activity QR code", error);
      setQrDownloadState("failed");
    }
  }

  const canDownload = Boolean(activityUrl) && downloadState !== "downloading";
  const canDownloadQr =
    Boolean(activityUrl) && qrDownloadState !== "downloading";
  const shareTitle = shareKind === "team" ? t.teamTitle : t.activityTitle;
  const shareDescription =
    shareKind === "team" ? t.teamDescription : t.activityDescription;
  const usesSystemSharePrimary = shareMode !== "copy";

  return (
    <div className="rounded-[1.1rem] border border-[#dccba8] bg-[#fff8ec]/78 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#8a6a40] ring-1 ring-[#dccba8]">
            <Share2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{shareTitle}</p>
            <p className="mt-0.5 text-xs leading-5 text-zinc-500">
              {shareDescription}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-600 ring-1 ring-[#dccba8] transition hover:bg-[#fffaf2] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d88d72]/30"
          onClick={() => setExpanded((value) => !value)}
          title={expanded ? t.collapse : t.expand}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition", expanded && "rotate-180")}
          />
          <span className="sr-only">{expanded ? t.collapse : t.expand}</span>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {usesSystemSharePrimary ? (
          <Button
            className="h-10 gap-2 rounded-full border-[#d8a77f] bg-[#111111] px-3 text-sm font-semibold text-white shadow-none hover:bg-[#2a2a2a]"
            disabled={!activityUrl}
            onClick={handleSystemShare}
            type="button"
            variant="secondary"
          >
            <Share2 className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{t.systemShare}</span>
          </Button>
        ) : activityUrl ? (
          <ActivityCopyButton
            analyticsEvent={{
              name: "link_copied",
              entityId: analyticsEntityId,
              entityType: analyticsEntityType,
              sourceSurface: analyticsSourceSurface,
            }}
            className="h-10 w-full justify-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-ink ring-1 ring-[#dccba8] hover:bg-[#fffaf2]"
            failedLabel={t.copyFailed}
            label={t.copyLink}
            successLabel={t.copied}
            value={activityUrl}
          >
            <span className="min-w-0 truncate">{t.copyLink}</span>
          </ActivityCopyButton>
        ) : (
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-zinc-400 ring-1 ring-[#dccba8]"
            disabled
            type="button"
          >
            <LinkIcon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{t.copyLink}</span>
          </button>
        )}
        <Button
          className={cn(
            "h-10 gap-2 rounded-full border-[#dccba8] bg-white px-3 text-sm font-semibold text-ink shadow-none hover:bg-[#fffaf2]",
            !canDownload && "opacity-70",
          )}
          disabled={!canDownload}
          onClick={handleDownloadPoster}
          type="button"
          variant="secondary"
        >
          <Download className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">
            {downloadState === "downloading" ? t.downloading : t.downloadPoster}
          </span>
        </Button>
      </div>

      {expanded ? (
        <div className="mt-2 grid gap-2 border-t border-[#ead9bd] pt-2 sm:grid-cols-2 lg:grid-cols-1">
          {usesSystemSharePrimary && activityUrl ? (
            <ActivityCopyButton
              analyticsEvent={{
                name: "link_copied",
                entityId: analyticsEntityId,
                entityType: analyticsEntityType,
                sourceSurface: analyticsSourceSurface,
              }}
              className="h-10 w-full justify-center gap-2 rounded-full bg-white px-3 text-sm font-medium text-ink ring-1 ring-[#ead9bd] hover:bg-[#fffaf2]"
              failedLabel={t.copyFailed}
              label={t.copyLink}
              successLabel={t.copied}
              value={activityUrl}
            >
              <span className="min-w-0 truncate">{t.copyLink}</span>
            </ActivityCopyButton>
          ) : null}
          <ActivityCopyButton
            analyticsEvent={{
              name: "field_copied",
              entityId: analyticsEntityId,
              entityType: analyticsEntityType,
              sourceSurface: analyticsSourceSurface,
              properties: {
                field_name: "title",
              },
            }}
            className="h-10 w-full justify-center gap-2 rounded-full bg-white px-3 text-sm font-medium text-ink ring-1 ring-[#ead9bd] hover:bg-[#fffaf2]"
            failedLabel={t.copyFailed}
            label={t.copyTitle}
            successLabel={t.copied}
            value={activityTitle}
          >
            <span className="min-w-0 truncate">{t.copyTitle}</span>
          </ActivityCopyButton>
          <Button
            className={cn(
              "h-10 gap-2 rounded-full border-[#ead9bd] bg-white px-3 text-sm font-medium text-ink shadow-none hover:bg-[#fffaf2]",
              !canDownloadQr && "opacity-70",
            )}
            disabled={!canDownloadQr}
            onClick={handleDownloadQrCode}
            type="button"
            variant="secondary"
          >
            <QrCode className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">
              {qrDownloadState === "downloading"
                ? t.qrDownloading
                : t.downloadQr}
            </span>
          </Button>
        </div>
      ) : null}

      {expanded && activityUrl ? (
        <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-white/72 px-3 py-1.5 text-xs text-zinc-500 ring-1 ring-[#ead9bd]">
          <LinkIcon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{getUrlHost(activityUrl)}</span>
        </div>
      ) : null}
      {downloadState === "failed" ? (
        <p className="mt-2 text-xs leading-5 text-red-600">
          {t.downloadFailed}
        </p>
      ) : null}
      {qrDownloadState === "failed" ? (
        <p className="mt-2 text-xs leading-5 text-red-600">
          {t.qrDownloadFailed}
        </p>
      ) : null}
      {shareHelpOpen ? (
        <div
          aria-label={t.systemShare}
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-end bg-black/38 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:items-center sm:justify-center sm:p-6"
          role="dialog"
        >
          <button
            aria-label={t.closeShareHelp}
            className="absolute inset-0 cursor-default"
            onClick={() => setShareHelpOpen(false)}
            type="button"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[#dccba8] bg-[#fffaf2] p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#a76243] ring-1 ring-[#dccba8]">
                  <Share2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-ink">
                    {t.systemShare}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    {shareMode === "wechat"
                      ? t.wechatShareHint
                      : t.shareUnavailable}
                  </p>
                </div>
              </div>
              <button
                aria-label={t.closeShareHelp}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 ring-1 ring-[#dccba8] transition hover:text-ink"
                onClick={() => setShareHelpOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {activityUrl ? (
              <ActivityCopyButton
                analyticsEvent={{
                  name: "link_copied",
                  entityId: analyticsEntityId,
                  entityType: analyticsEntityType,
                  sourceSurface: analyticsSourceSurface,
                }}
                className="mt-4 h-10 w-full justify-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-ink ring-1 ring-[#dccba8] hover:bg-[#fffaf2]"
                failedLabel={t.copyFailed}
                label={t.copyLink}
                successLabel={t.copied}
                value={activityUrl}
              >
                <span className="min-w-0 truncate">{t.copyLink}</span>
              </ActivityCopyButton>
            ) : null}
          </div>
        </div>
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
