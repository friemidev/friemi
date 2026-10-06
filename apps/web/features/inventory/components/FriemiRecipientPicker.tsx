"use client";

import jsQR from "jsqr";
import { CheckCircle2, LoaderCircle, QrCode, Search, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import {
  canUseNativeAndroidQrScanner,
  parseAndroidQrScanPayload,
} from "@/features/scan/globalQrScanner";
import { lookupInventoryRecipientAction } from "../actions/inventoryActions";
import { extractFriemiCodeFromQrValue } from "../friendCodeQr";

type Recipient = {
  avatarUrl: string | null;
  friendCode: string | null;
  id: string;
  nickname: string;
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      code: "Code Friemi du destinataire",
      codePlaceholder: "Code à 6 chiffres",
      confirm: "Vérifiez le destinataire avant de continuer.",
      invalidQr: "Ce QR code ne contient pas un profil Friemi.",
      lookup: "Rechercher",
      noCamera: "Caméra indisponible. Saisissez le code Friemi.",
      notFound: "Aucun compte actif ne correspond à ce code.",
      scan: "Scanner son QR",
      scanHint: "Placez le QR de profil Friemi dans le cadre.",
      selected: "Destinataire confirmé",
    };
  }
  if (locale === "en") {
    return {
      code: "Recipient’s Friemi code",
      codePlaceholder: "6-digit code",
      confirm: "Check the recipient before continuing.",
      invalidQr: "This QR code is not a Friemi profile.",
      lookup: "Find account",
      noCamera: "Camera unavailable. Enter the Friemi code.",
      notFound: "No active account matches this code.",
      scan: "Scan their QR",
      scanHint: "Place the Friemi profile QR inside the frame.",
      selected: "Recipient confirmed",
    };
  }
  return {
    code: "收票人的 Friemi 码",
    codePlaceholder: "输入 6 位个人码",
    confirm: "赠送前请核对收票人。",
    invalidQr: "这个二维码不是 Friemi 个人二维码。",
    lookup: "查找账户",
    noCamera: "无法使用相机，可手动输入 Friemi 码。",
    notFound: "没有找到对应的活跃账户。",
    scan: "扫描个人二维码",
    scanHint: "把对方的 Friemi 个人二维码放入框内。",
    selected: "已确认收票人",
  };
}

function RecipientQrScanner({
  locale,
  onClose,
  onScan,
}: {
  locale: string;
  onClose: () => void;
  onScan: (code: string) => void;
}) {
  const copy = getCopy(locale);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stopped = false;
    function stop() {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      frameRef.current = null;
      streamRef.current = null;
    }
    function scanFrame() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", { willReadFrequently: true });
      if (stopped || !video || !canvas || !context) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const { videoWidth: width, videoHeight: height } = video;
        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          context.drawImage(video, 0, 0, width, height);
          const data = context.getImageData(0, 0, width, height);
          const result = jsQR(data.data, width, height);
          if (result?.data) {
            const code = extractFriemiCodeFromQrValue(
              result.data,
              window.location.origin,
            );
            if (code) {
              stop();
              onScan(code);
              return;
            }
            setError(copy.invalidQr);
          }
        }
      }
      frameRef.current = requestAnimationFrame(scanFrame);
    }
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(copy.noCamera);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (stopped) {
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
        setError(copy.noCamera);
      }
    }
    void start();
    return () => {
      stopped = true;
      stop();
    };
  }, [copy.invalidQr, copy.noCamera, onScan]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      aria-label={copy.scan}
      aria-modal="true"
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:items-center"
      role="dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-[1.4rem] bg-[#FEFFF9] p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#111210]">{copy.scan}</h2>
          <button
            aria-label={locale === "zh-CN" ? "关闭" : "Close"}
            className="grid h-9 w-9 place-items-center rounded-full bg-[#F1F2EC]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-[1rem] bg-[#111210]">
          <video
            autoPlay
            className="h-full w-full object-cover"
            muted
            playsInline
            ref={videoRef}
          />
          <canvas className="hidden" ref={canvasRef} />
          <div className="pointer-events-none absolute inset-[15%] rounded-xl border-2 border-white/80" />
          {!ready && !error ? (
            <LoaderCircle className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
          ) : null}
        </div>
        <p
          className={`mt-3 text-sm leading-6 ${error ? "text-[#B5301F]" : "text-[#5F635E]"}`}
          role={error ? "alert" : undefined}
        >
          {error || copy.scanHint}
        </p>
      </div>
    </div>,
    document.body,
  );
}

export function FriemiRecipientPicker({
  locale,
  onSelectionChange,
}: {
  locale: string;
  onSelectionChange: (selected: boolean) => void;
}) {
  const copy = getCopy(locale);
  const inputId = useId();
  const [code, setCode] = useState("");
  const [method, setMethod] = useState<"FRIEMI_CODE" | "FRIEND_QR">(
    "FRIEMI_CODE",
  );
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const nativePendingRef = useRef(false);
  const lookupIdRef = useRef(0);

  const lookup = useCallback(
    (value: string) => {
      const lookupId = ++lookupIdRef.current;
      setRecipient(null);
      onSelectionChange(false);
      setError(null);
      startTransition(async () => {
        try {
          const result = await lookupInventoryRecipientAction(locale, value);
          if (lookupId !== lookupIdRef.current) return;
          if (result.status === "FOUND") {
            setRecipient(result.profile);
            onSelectionChange(true);
          } else {
            setError(copy.notFound);
          }
        } catch {
          if (lookupId !== lookupIdRef.current) return;
          setError(copy.notFound);
        }
      });
    },
    [copy.notFound, locale, onSelectionChange],
  );

  useEffect(() => {
    function onNativeScan(event: Event) {
      if (!nativePendingRef.current) return;
      nativePendingRef.current = false;
      const payload = parseAndroidQrScanPayload(
        (event as CustomEvent<unknown>).detail,
      );
      if (!payload?.ok || !payload.rawValue) return;
      const scanned = extractFriemiCodeFromQrValue(
        payload.rawValue,
        window.location.origin,
      );
      if (!scanned) {
        setError(copy.invalidQr);
        return;
      }
      setCode(scanned);
      setMethod("FRIEND_QR");
      lookup(scanned);
    }
    window.addEventListener("friemi:android-qr-scan", onNativeScan);
    return () =>
      window.removeEventListener("friemi:android-qr-scan", onNativeScan);
  }, [copy.invalidQr, lookup]);

  function startScan() {
    if (!canUseNativeAndroidQrScanner()) {
      setScannerOpen(true);
      return;
    }
    nativePendingRef.current = true;
    try {
      const payload = parseAndroidQrScanPayload(
        window.FriemiAndroid?.scanQrCode?.(),
      );
      if (payload?.ok && payload.rawValue) {
        nativePendingRef.current = false;
        const scanned = extractFriemiCodeFromQrValue(
          payload.rawValue,
          window.location.origin,
        );
        if (scanned) {
          setCode(scanned);
          setMethod("FRIEND_QR");
          lookup(scanned);
        } else {
          setError(copy.invalidQr);
        }
        return;
      }
      if (payload?.supported === false || payload?.ok === false) {
        nativePendingRef.current = false;
        setScannerOpen(true);
      }
    } catch {
      nativePendingRef.current = false;
      setScannerOpen(true);
    }
  }

  return (
    <div className="space-y-3">
      <input
        name="recipientCode"
        readOnly
        type="hidden"
        value={recipient?.friendCode ?? ""}
      />
      <input name="method" readOnly type="hidden" value={method} />
      <label
        className="block text-sm font-bold text-[#263B2E]"
        htmlFor={inputId}
      >
        {copy.code}
      </label>
      <div className="flex gap-2">
        <input
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-[#D6D5B2] bg-white px-3 py-3 text-base text-[#111210] outline-none focus:border-[#156240] focus:ring-2 focus:ring-[#156240]/20"
          id={inputId}
          inputMode="numeric"
          maxLength={12}
          onChange={(event) => {
            lookupIdRef.current += 1;
            setCode(event.target.value);
            setMethod("FRIEMI_CODE");
            setRecipient(null);
            setError(null);
            onSelectionChange(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              lookup(code);
            }
          }}
          placeholder={copy.codePlaceholder}
          type="text"
          value={code}
        />
        <button
          aria-label={copy.scan}
          className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-xl bg-[#EAF5E8] text-[#156240] ring-1 ring-[#BFD8B9]"
          onClick={startScan}
          type="button"
        >
          <QrCode className="h-5 w-5" />
        </button>
      </div>
      <button
        className="inline-flex items-center gap-2 rounded-full border border-[#D6D5B2] bg-white px-4 py-2 text-sm font-bold text-[#156240] disabled:opacity-50"
        disabled={pending || !code.trim()}
        onClick={() => lookup(code)}
        type="button"
      >
        {pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        {copy.lookup}
      </button>
      {recipient ? (
        <div
          className="rounded-xl border border-[#BFD8B9] bg-[#EAF5E8] px-4 py-3"
          role="status"
        >
          <p className="flex items-center gap-2 text-xs font-bold text-[#156240]">
            <CheckCircle2 className="h-4 w-4" />
            {copy.selected}
          </p>
          <p className="mt-1 text-base font-bold text-[#111210]">
            {recipient.nickname} · {recipient.friendCode}
          </p>
          <p className="mt-1 text-xs text-[#5F635E]">{copy.confirm}</p>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-[#B5301F]" role="alert">
          {error}
        </p>
      ) : null}
      {scannerOpen ? (
        <RecipientQrScanner
          locale={locale}
          onClose={() => setScannerOpen(false)}
          onScan={(scanned) => {
            setScannerOpen(false);
            setCode(scanned);
            setMethod("FRIEND_QR");
            lookup(scanned);
          }}
        />
      ) : null}
    </div>
  );
}
