"use client";

import jsQR from "jsqr";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  FileText,
  LoaderCircle,
  ScanLine,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  canUseNativeAndroidQrScanner,
  parseAndroidQrScanPayload,
  resolveGlobalQrScanDestination,
  resolveGlobalQrScanResult,
} from "@/features/scan/globalQrScanner";

type QrScannerMode = "global" | "redeem";

function getCopy(locale: string, mode: QrScannerMode) {
  if (locale === "fr") {
    return {
      close: "Fermer",
      copied: "Copié",
      copy: "Copier le contenu",
      detected: mode === "global" ? "QR détecté" : "Coupon détecté",
      invalid:
        mode === "global"
          ? "Ce QR code ne peut pas être ouvert."
          : "Ce QR code n'est pas un coupon Friemi.",
      permission:
        mode === "global"
          ? "Autorisez l'accès à la caméra pour scanner un QR code."
          : "Autorisez l'accès à la caméra pour scanner le coupon.",
      scan: mode === "global" ? "Scanner" : "Scanner un coupon",
      scanning:
        mode === "global"
          ? "Placez n'importe quel QR code dans le cadre."
          : "Placez le QR code du client dans le cadre.",
      textTitle: "Contenu du QR code",
    };
  }
  if (locale === "en") {
    return {
      close: "Close",
      copied: "Copied",
      copy: "Copy content",
      detected: mode === "global" ? "QR code found" : "Coupon found",
      invalid:
        mode === "global"
          ? "This QR code cannot be opened."
          : "This is not a Friemi coupon QR code.",
      permission:
        mode === "global"
          ? "Allow camera access to scan a QR code."
          : "Allow camera access to scan the coupon.",
      scan: mode === "global" ? "Scan" : "Scan coupon",
      scanning:
        mode === "global"
          ? "Place any QR code inside the frame."
          : "Place the customer's QR code inside the frame.",
      textTitle: "QR code content",
    };
  }
  return {
    close: "关闭",
    copied: "已复制",
    copy: "复制内容",
    detected: mode === "global" ? "已识别二维码" : "已识别优惠券",
    invalid:
      mode === "global"
        ? "这个二维码暂时无法打开。"
        : "这不是有效的 Friemi 优惠券二维码。",
    permission:
      mode === "global"
        ? "请允许使用相机，以便扫描二维码。"
        : "请允许使用相机，以便扫描优惠券。",
    scan: mode === "global" ? "扫码" : "扫码核销",
    scanning:
      mode === "global"
        ? "将任意二维码放入框内。"
        : "把客人的优惠券二维码放入框内。",
    textTitle: "二维码内容",
  };
}

function getRedemptionHref(locale: string, rawValue: string) {
  const destination = resolveGlobalQrScanDestination({ locale, rawValue });

  return destination?.kind === "internal" &&
    /\/(?:zh-CN|en|fr)\/coupons\/redeem\/[^/?#]+/.test(
      destination.href,
    )
    ? destination.href
    : null;
}

function CouponScanner({
  locale,
  mode,
  triggerVariant,
}: {
  locale: string;
  mode: QrScannerMode;
  triggerVariant: "full" | "icon";
}) {
  const router = useRouter();
  const copy = getCopy(locale, mode);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [detected, setDetected] = useState(false);
  const [textResult, setTextResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeQrScanPendingRef = useRef(false);

  const handleScanValue = useCallback(
    (rawValue: string) => {
      if (mode === "redeem") {
        const href = getRedemptionHref(locale, rawValue);

        if (!href) {
          setError(copy.invalid);
          return false;
        }

        setDetected(true);
        window.setTimeout(() => {
          setOpen(false);
          router.push(href);
        }, 180);
        return true;
      }

      const result = resolveGlobalQrScanResult({ locale, rawValue });

      if (!result) {
        setError(copy.invalid);
        return false;
      }

      if (result.kind === "text") {
        setError(null);
        setTextResult(result.value);
        setOpen(true);
        return true;
      }

      setDetected(true);
      window.setTimeout(() => {
        setOpen(false);

        if (result.kind === "internal") {
          router.push(result.href);
          return;
        }

        if (typeof window.FriemiAndroid?.openExternal === "function") {
          window.FriemiAndroid.openExternal(result.href);
          return;
        }

        window.location.assign(result.href);
      }, 180);
      return true;
    },
    [copy.invalid, locale, mode, router],
  );

  useEffect(() => {
    function handleAndroidQrScan(event: Event) {
      if (!nativeQrScanPendingRef.current) return;
      nativeQrScanPendingRef.current = false;
      const payload = parseAndroidQrScanPayload(
        (event as CustomEvent<unknown>).detail,
      );

      if (payload?.ok && payload.rawValue) {
        if (!handleScanValue(payload.rawValue)) setOpen(true);
      } else if (payload?.reason !== "CANCELLED") {
        setOpen(true);
      }
    }

    window.addEventListener("friemi:android-qr-scan", handleAndroidQrScan);
    return () =>
      window.removeEventListener("friemi:android-qr-scan", handleAndroidQrScan);
  }, [handleScanValue]);

  useEffect(() => {
    if (!open || textResult) return;
    let closed = false;

    function stopCamera() {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    function scanFrame() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", { willReadFrequently: true });
      if (!video || !canvas || !context || closed) return;

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          context.drawImage(video, 0, 0, width, height);
          const imageData = context.getImageData(0, 0, width, height);
          const result = jsQR(imageData.data, width, height);
          if (result?.data && handleScanValue(result.data)) {
            stopCamera();
            return;
          }
        }
      }
      animationFrameRef.current = window.requestAnimationFrame(scanFrame);
    }

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(copy.permission);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (closed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
          scanFrame();
        }
      } catch {
        setError(copy.permission);
      }
    }

    void startCamera();
    return () => {
      closed = true;
      stopCamera();
    };
  }, [copy.permission, handleScanValue, open, textResult]);

  function startScan() {
    setError(null);
    setReady(false);
    setDetected(false);
    setTextResult(null);
    setCopied(false);

    if (!canUseNativeAndroidQrScanner()) {
      setOpen(true);
      return;
    }

    nativeQrScanPendingRef.current = true;
    try {
      const payload = parseAndroidQrScanPayload(
        window.FriemiAndroid?.scanQrCode?.(),
      );
      if (payload?.ok && payload.rawValue) {
        nativeQrScanPendingRef.current = false;
        if (!handleScanValue(payload.rawValue)) setOpen(true);
        return;
      }
      if (payload?.supported === false || payload?.ok === false) {
        nativeQrScanPendingRef.current = false;
        setOpen(true);
      }
    } catch {
      nativeQrScanPendingRef.current = false;
      setOpen(true);
    }
  }

  async function copyTextResult() {
    if (!textResult || !navigator.clipboard?.writeText) {
      return;
    }

    await navigator.clipboard.writeText(textResult);
    setCopied(true);
  }

  function closeScanner() {
    setOpen(false);
    setTextResult(null);
    setCopied(false);
  }

  return (
    <>
      <button
        aria-label={copy.scan}
        className={
          triggerVariant === "icon"
            ? "inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#156240] ring-1 ring-[#D6D5B2] transition active:scale-95"
            : "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(21,98,64,0.18)] transition active:scale-[0.98]"
        }
        onClick={startScan}
        title={copy.scan}
        type="button"
      >
        <ScanLine className="h-5 w-5" />
        {triggerVariant === "full" ? copy.scan : null}
      </button>

      {open
        ? createPortal(
            <div
              aria-label={copy.scan}
              aria-modal="true"
              className="fixed inset-0 z-[10000] flex min-h-[100svh] items-end justify-center bg-black/45 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:items-center"
              role="dialog"
            >
              <section className="w-full max-w-md overflow-hidden rounded-[1.25rem] bg-white shadow-2xl">
                <header className="flex items-center justify-between border-b border-[#EFEAD7] px-4 py-3">
                  <h2 className="text-base font-black text-[#111210]">
                    {copy.scan}
                  </h2>
                  <button
                    aria-label={copy.close}
                    className="grid h-9 w-9 place-items-center rounded-full ring-1 ring-[#D6D5B2]"
                    onClick={closeScanner}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </header>
                <div className="p-4">
                  {textResult ? (
                    <div className="py-3 text-center">
                      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#EEF7EF] text-[#156240]">
                        <FileText className="h-6 w-6" />
                      </span>
                      <h3 className="mt-4 text-base font-black text-[#111210]">
                        {copy.textTitle}
                      </h3>
                      <p className="mt-3 max-h-40 overflow-y-auto break-all text-left text-sm font-semibold leading-6 text-[#4F574F]">
                        {textResult}
                      </p>
                      <button
                        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-black text-white transition active:scale-[0.98]"
                        onClick={() => void copyTextResult()}
                        type="button"
                      >
                        {copied ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copied ? copy.copied : copy.copy}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative aspect-square overflow-hidden rounded-[1rem] bg-[#10251F]">
                        <video
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          ref={videoRef}
                        />
                        <canvas className="hidden" ref={canvasRef} />
                        <div className="pointer-events-none absolute inset-8 rounded-[0.75rem] border-2 border-[#F1F2E3] shadow-[0_0_0_999px_rgba(0,0,0,0.25)]" />
                        {!ready && !error ? (
                          <LoaderCircle className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                        ) : null}
                        {detected ? (
                          <div className="absolute inset-0 grid place-items-center bg-black/35">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-[#156240]">
                              <CheckCircle2 className="h-4 w-4" />
                              {copy.detected}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <p className="mt-3 flex items-start gap-2 text-sm font-semibold leading-6 text-[#6C746A]">
                        {error ? (
                          <AlertCircle className="mt-1 h-4 w-4 shrink-0 text-[#A62834]" />
                        ) : (
                          <ScanLine className="mt-1 h-4 w-4 shrink-0 text-[#156240]" />
                        )}
                        {error ?? copy.scanning}
                      </p>
                    </>
                  )}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function ProfileQrScanner({ locale }: { locale: string }) {
  return <CouponScanner locale={locale} mode="global" triggerVariant="icon" />;
}

export function CouponRedemptionScanner({ locale }: { locale: string }) {
  return <CouponScanner locale={locale} mode="redeem" triggerVariant="full" />;
}
