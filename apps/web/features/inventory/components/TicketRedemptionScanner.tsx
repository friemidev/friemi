"use client";

import jsQR from "jsqr";
import { Camera, CircleAlert, LoaderCircle, ScanLine, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  canUseNativeAndroidQrScanner,
  parseAndroidQrScanPayload,
} from "@/features/scan/globalQrScanner";
import { normalizeFriemiCode } from "@/features/inventory/friemiCode";
import { getTicketRedemptionCopy } from "@/features/inventory/ticketRedemptionCopy";
import { parseTicketRedemptionToken } from "@/features/inventory/ticketRedemptionScan";
import { withLocale } from "@/lib/routes";

export function TicketRedemptionScanner({
  definitionId,
  locale,
  source,
}: {
  definitionId?: string;
  locale: string;
  source?: string;
}) {
  const router = useRouter();
  const copy = getTicketRedemptionCopy(locale);
  const [input, setInput] = useState("");
  const [holderInput, setHolderInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [errorSource, setErrorSource] = useState<"scan" | "manual">("scan");
  const [manualErrorField, setManualErrorField] = useState<"holder" | "code">("code");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const navigatingRef = useRef(false);
  const nativeScanPendingRef = useRef(false);

  const openToken = useCallback(
    (
      rawValue: string,
      sourceType: "scan" | "manual" = "scan",
      rawHolderCode = "",
    ) => {
      const token = parseTicketRedemptionToken(rawValue);
      if (!token) {
        setError(sourceType === "manual" ? copy.enterCodeInvalid : copy.invalid);
        setErrorSource(sourceType);
        setManualErrorField("code");
        setScanning(false);
        return false;
      }
      const isManualCode = /^(?:\d{6}|\d{10})$/.test(token);
      if (isManualCode && !definitionId) {
        setError(copy.selectEvent);
        setErrorSource(sourceType);
        setScanning(false);
        return false;
      }
      const holderCode = isManualCode
        ? normalizeFriemiCode(rawHolderCode)
        : null;
      if (isManualCode && (!holderCode || sourceType !== "manual")) {
        setError(
          sourceType === "manual" ? copy.holderCodeInvalid : copy.invalid,
        );
        setErrorSource(sourceType);
        setManualErrorField("holder");
        setScanning(false);
        return false;
      }
      if (navigatingRef.current) return true;
      navigatingRef.current = true;
      setError("");
      setScanning(false);
      const query = new URLSearchParams();
      if (definitionId) query.set("definitionId", definitionId);
      if (holderCode) query.set("holderCode", holderCode);
      if (source === "admin") query.set("source", "admin");
      router.push(
        withLocale(
          locale,
          `/tickets/redeem/${token}${query.size ? `?${query.toString()}` : ""}`,
        ),
      );
      return true;
    },
    [
      copy.holderCodeInvalid,
      copy.enterCodeInvalid,
      copy.invalid,
      copy.selectEvent,
      definitionId,
      locale,
      router,
      source,
    ],
  );

  useEffect(() => {
    function handleNativeScan(event: Event) {
      if (!nativeScanPendingRef.current) return;
      nativeScanPendingRef.current = false;
      const payload = parseAndroidQrScanPayload(
        (event as CustomEvent<unknown>).detail,
      );
      if (payload?.ok && payload.rawValue) {
        openToken(payload.rawValue);
      } else if (payload?.reason !== "CANCELLED") {
        setScanning(true);
      }
    }
    window.addEventListener("friemi:android-qr-scan", handleNativeScan);
    return () =>
      window.removeEventListener("friemi:android-qr-scan", handleNativeScan);
  }, [openToken]);

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;

    function stopCamera() {
      if (scanFrameRef.current !== null) {
        window.cancelAnimationFrame(scanFrameRef.current);
        scanFrameRef.current = null;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    function scanFrame() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", { willReadFrequently: true });
      if (!video || !canvas || !context || cancelled) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (width && height) {
          canvas.width = width;
          canvas.height = height;
          context.drawImage(video, 0, 0, width, height);
          const image = context.getImageData(0, 0, width, height);
          const scanned = jsQR(image.data, width, height)?.data;
          if (scanned && openToken(scanned)) {
            stopCamera();
            return;
          }
        }
      }
      scanFrameRef.current = window.requestAnimationFrame(scanFrame);
    }

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(definitionId ? copy.noCamera : copy.selectEvent);
        setErrorSource("scan");
        setScanning(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
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
        setError(definitionId ? copy.noCamera : copy.selectEvent);
        setErrorSource("scan");
        setScanning(false);
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [copy.noCamera, copy.selectEvent, definitionId, openToken, scanning]);

  function startScan() {
    setError("");
    setReady(false);
    if (!canUseNativeAndroidQrScanner()) {
      setScanning(true);
      return;
    }
    nativeScanPendingRef.current = true;
    try {
      const payload = parseAndroidQrScanPayload(
        window.FriemiAndroid?.scanQrCode?.(),
      );
      if (payload?.ok && payload.rawValue) {
        nativeScanPendingRef.current = false;
        openToken(payload.rawValue);
      } else if (payload?.supported === false) {
        nativeScanPendingRef.current = false;
        setScanning(true);
      } else if (payload?.reason === "CANCELLED") {
        nativeScanPendingRef.current = false;
      }
    } catch {
      nativeScanPendingRef.current = false;
      setScanning(true);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.3rem] bg-white p-5 ring-1 ring-[#D6D5B2]">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#EAF5E8] text-[#156240]">
            <ScanLine aria-hidden="true" className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-bold text-[#111210]">{copy.scan}</h2>
        </div>
        {scanning ? (
          <div className="mt-5">
            <div className="relative aspect-square max-h-[65vh] overflow-hidden rounded-xl bg-[#10251F]">
              <video
                aria-label={copy.scanning}
                className="h-full w-full object-cover"
                muted
                playsInline
                ref={videoRef}
              />
              <canvas className="hidden" ref={canvasRef} />
              <div className="pointer-events-none absolute inset-[14%] rounded-lg border-2 border-white shadow-[0_0_0_999px_rgba(0,0,0,0.32)]" />
              {!ready ? (
                <LoaderCircle
                  aria-label={copy.processing}
                  className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-spin text-white"
                />
              ) : null}
            </div>
            <p className="mt-3 text-sm text-[#667065]">{copy.scanning}</p>
            <button
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F3F5EF] font-bold text-[#123D31]"
              onClick={() => setScanning(false)}
              type="button"
            >
              <X aria-hidden="true" className="h-4 w-4" />
              {copy.back}
            </button>
          </div>
        ) : (
          <button
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#156240] px-5 text-sm font-bold text-white active:scale-[0.99]"
            onClick={startScan}
            type="button"
          >
            <Camera aria-hidden="true" className="h-5 w-5" />
            {copy.scan}
          </button>
        )}
        {error && errorSource === "scan" ? (
          <p
            className="mt-4 flex items-start gap-2 rounded-xl bg-[#FFF0ED] px-4 py-3 text-sm text-[#A62834]"
            role="alert"
          >
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            {error}
          </p>
        ) : null}
      </section>

      {definitionId ? (
        <form
          className="rounded-[1.3rem] bg-white p-5 ring-1 ring-[#D6D5B2]"
          onSubmit={(event) => {
            event.preventDefault();
            openToken(input, "manual", holderInput);
          }}
        >
          <label
            className="text-sm font-bold text-[#111210]"
            htmlFor="ticket-holder-friemi-code"
          >
            {copy.holderCode}
          </label>
          <p className="mt-1 text-sm leading-5 text-ink/70">
            {copy.holderCodeHint}
          </p>
          <input
            autoComplete="off"
            aria-describedby={
              error && errorSource === "manual" && manualErrorField === "holder"
                ? "ticket-holder-friemi-code-error"
                : undefined
            }
            aria-invalid={
              Boolean(error) &&
              errorSource === "manual" &&
              manualErrorField === "holder"
            }
            className="mt-3 min-h-12 w-full rounded-xl border border-ink/15 bg-white px-4 font-mono text-base tracking-[0.08em] text-ink outline-none focus:border-meadow focus:ring-2 focus:ring-meadow/20"
            id="ticket-holder-friemi-code"
            inputMode="numeric"
            onChange={(event) => {
              setHolderInput(event.target.value);
              setError("");
            }}
            placeholder="000 000"
            spellCheck={false}
            type="text"
            value={holderInput}
          />
          {error && errorSource === "manual" && manualErrorField === "holder" ? (
            <p
              className="mt-2 flex items-start gap-2 text-sm font-semibold text-danger"
              id="ticket-holder-friemi-code-error"
              role="alert"
            >
              <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
          <label
            className="mt-5 block text-sm font-bold text-[#111210]"
            htmlFor="ticket-redemption-code"
          >
            {copy.enterCode}
          </label>
          <p
            className="mt-1 text-sm leading-5 text-ink/70"
            id="ticket-redemption-code-hint"
          >
            {copy.enterCodeHint}
          </p>
          <input
            autoCapitalize="none"
            autoComplete="off"
            aria-describedby={
              error && errorSource === "manual" && manualErrorField === "code"
                ? "ticket-redemption-code-hint ticket-redemption-code-error"
                : "ticket-redemption-code-hint"
            }
            aria-invalid={
              Boolean(error) &&
              errorSource === "manual" &&
              manualErrorField === "code"
            }
            className="mt-4 min-h-12 w-full rounded-xl border border-ink/15 bg-white px-4 font-mono text-base tracking-[0.08em] text-ink outline-none focus:border-meadow focus:ring-2 focus:ring-meadow/20"
            enterKeyHint="go"
            id="ticket-redemption-code"
            inputMode="numeric"
            onChange={(event) => {
              setInput(event.target.value);
              setError("");
            }}
            placeholder="000 000"
            spellCheck={false}
            type="text"
            value={input}
          />
          {error && errorSource === "manual" && manualErrorField === "code" ? (
            <p
              className="mt-2 flex items-start gap-2 text-sm font-semibold text-danger"
              id="ticket-redemption-code-error"
              role="alert"
            >
              <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
          <button
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#EAF5E8] px-4 text-sm font-bold text-[#156240] disabled:opacity-50"
            disabled={!input.trim()}
            type="submit"
          >
            {copy.useCode}
          </button>
        </form>
      ) : (
        <section className="rounded-[1.3rem] bg-white p-5 text-sm leading-6 text-ink/70 ring-1 ring-[#D6D5B2]">
          <p className="font-bold text-ink">{copy.enterCode}</p>
          <p className="mt-2">{copy.selectEvent}</p>
        </section>
      )}
    </div>
  );
}
