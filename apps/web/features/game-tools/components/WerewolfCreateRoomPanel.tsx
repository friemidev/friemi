"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import jsQR from "jsqr";
import {
  ArrowRight,
  Camera,
  Hash,
  Moon,
  Shield,
  Sparkles,
  X,
  UsersRound,
} from "lucide-react";
import {
  createWerewolfRoomAction,
  type WerewolfRoomActionState,
} from "@/features/game-tools/actions/werewolfRoomActions";
import {
  defaultWerewolfVariantKey,
  getWerewolfVariantLabel,
  werewolfVariants,
  type WerewolfRoleKey,
  type WerewolfVariant,
} from "@/features/game-tools/werewolfConfig";
import { werewolfUiAssets } from "@/features/game-tools/werewolfCardAssets";
import { withLocale } from "@/lib/routes";

type WerewolfCreateRoomPanelProps = {
  locale: string;
};

type Copy = {
  boundary: string;
  chips: string[];
  create: string;
  eyebrow: string;
  helper: string;
  joinCodeAction: string;
  joinCodeError: string;
  joinCodeHelper: string;
  joinCodeLabel: string;
  joinCodePlaceholder: string;
  joinCodeTitle: string;
  judge: string;
  players: string;
  preview: string;
  scanCodeAction: string;
  scannerClose: string;
  scannerHelper: string;
  scannerPermission: string;
  scannerSearching: string;
  scannerTitle: string;
  scannerUnsupported: string;
  title: string;
  titleLabel: string;
  titlePlaceholder: string;
  variants: string;
};

const copies: Record<string, Copy> = {
  "zh-CN": {
    boundary: "手机发身份、记生死和结算，桌上照常发言、投票、走夜晚。",
    chips: ["扫码入座", "私密身份", "法官记生死"],
    create: "开一局",
    eyebrow: "狼人杀",
    helper: "选版型，朋友扫码入座。",
    joinCodeAction: "加入",
    joinCodeError: "输入房号再加入。",
    joinCodeHelper: "朋友发来房号时，可以直接进房。",
    joinCodeLabel: "房号",
    joinCodePlaceholder: "例如 C2E848",
    joinCodeTitle: "加入已有房间",
    judge: "含 1 位法官",
    players: "席",
    preview: "卡牌预览",
    scanCodeAction: "扫码加入",
    scannerClose: "关闭",
    scannerHelper: "对准房间二维码，识别后自动进入。",
    scannerPermission: "无法打开相机。请检查浏览器权限，或手动输入房号。",
    scannerSearching: "正在识别二维码",
    scannerTitle: "扫码加入房间",
    scannerUnsupported: "当前浏览器不支持相机扫码，请手动输入房号。",
    title: "今晚开狼人杀",
    titleLabel: "这局叫什么",
    titlePlaceholder: "今晚的狼人杀",
    variants: "选版型",
  },
  en: {
    boundary:
      "Use phones for seats, private roles, deaths, and results. Keep speeches, votes, and night calls at the table.",
    chips: ["Scan seats", "Private roles", "Judge notes"],
    create: "Start a table",
    eyebrow: "Werewolf",
    helper: "Pick a setup. Friends scan in.",
    joinCodeAction: "Join",
    joinCodeError: "Enter a room code first.",
    joinCodeHelper: "Got a code from a friend? Enter the room here.",
    joinCodeLabel: "Room code",
    joinCodePlaceholder: "e.g. C2E848",
    joinCodeTitle: "Join a room",
    judge: "includes 1 judge",
    players: "Seats",
    preview: "Card preview",
    scanCodeAction: "Scan",
    scannerClose: "Close",
    scannerHelper: "Point at the room QR code. You'll enter once it is read.",
    scannerPermission:
      "Could not open the camera. Check browser permission or enter the code.",
    scannerSearching: "Looking for a QR code",
    scannerTitle: "Scan room QR",
    scannerUnsupported:
      "This browser cannot scan with the camera. Enter the code instead.",
    title: "Start tonight's Werewolf table",
    titleLabel: "Table name",
    titlePlaceholder: "Tonight's Werewolf",
    variants: "Setup",
  },
  fr: {
    boundary:
      "Le téléphone garde les places, rôles, morts et résultats. La parole, les votes et la nuit restent autour de la table.",
    chips: ["Places par QR", "Rôles privés", "Notes du maître"],
    create: "Ouvrir la table",
    eyebrow: "Loups-garous",
    helper: "Choisissez une configuration. Les amis scannent.",
    joinCodeAction: "Entrer",
    joinCodeError: "Entrez d'abord un code.",
    joinCodeHelper: "Vous avez reçu un code ? Entrez dans la table ici.",
    joinCodeLabel: "Code",
    joinCodePlaceholder: "ex. C2E848",
    joinCodeTitle: "Entrer dans une table",
    judge: "inclut 1 maître",
    players: "Places",
    preview: "Aperçu cartes",
    scanCodeAction: "Scanner",
    scannerClose: "Fermer",
    scannerHelper: "Visez le QR de la table. L'entrée se fait automatiquement.",
    scannerPermission:
      "Impossible d'ouvrir la caméra. Vérifiez l'autorisation ou entrez le code.",
    scannerSearching: "Recherche du QR code",
    scannerTitle: "Scanner le QR",
    scannerUnsupported:
      "Ce navigateur ne peut pas scanner avec la caméra. Entrez le code.",
    title: "Lancez la table Loups-garous de ce soir",
    titleLabel: "Nom de table",
    titlePlaceholder: "Loups-garous de ce soir",
    variants: "Configuration",
  },
};

const initialState: WerewolfRoomActionState = {};

function getRoleMix(roles: WerewolfRoleKey[]) {
  const wolves = roles.filter((role) => role === "werewolf").length;
  const villagers = roles.filter((role) => role === "villager").length;
  const specials = roles.length - wolves - villagers;

  return { specials, villagers, wolves };
}

function RoleMixBadges({
  locale,
  variant,
}: {
  locale: string;
  variant: WerewolfVariant;
}) {
  const mix = getRoleMix(variant.roles);
  const labels =
    locale === "zh-CN"
      ? {
          specials: "神",
          villagers: "民",
          wolves: "狼",
        }
      : {
          specials: "Power",
          villagers: "Villager",
          wolves: "Wolf",
        };

  return (
    <div className="mt-2 flex flex-nowrap items-center gap-1.5 overflow-hidden">
      <RoleMixPill label={labels.wolves} tone="wolf" value={mix.wolves} />
      <RoleMixPill label={labels.specials} tone="power" value={mix.specials} />
      <RoleMixPill label={labels.villagers} tone="villager" value={mix.villagers} />
    </div>
  );
}

function VariantSeatDots({ variant }: { variant: WerewolfVariant }) {
  return (
    <div
      aria-hidden="true"
      className="mt-2 flex flex-wrap gap-1.5"
    >
      {variant.roles.map((role, index) => (
        <span
          className={`h-2 w-3.5 rounded-full sm:h-2.5 sm:w-5 ${
            role === "werewolf"
              ? "bg-[#7A1F2B]"
              : role === "villager"
                ? "bg-[#D9C7B4]"
                : "bg-[#F0C36A]"
          }`}
          key={`${role}-${index}`}
        />
      ))}
      <span className="h-2 w-3.5 rounded-full bg-[#1E1718] sm:h-2.5 sm:w-5" />
    </div>
  );
}

function RoleMixPill({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "power" | "villager" | "wolf";
  value: number;
}) {
  const Icon = tone === "wolf" ? Moon : tone === "power" ? Shield : UsersRound;

  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-black leading-none sm:h-7 ${
        tone === "wolf"
          ? "bg-[#7A1F2B] text-white"
          : tone === "power"
            ? "bg-[#F0C36A]/25 text-[#7A1F2B]"
            : "bg-[#F4ECE6] text-[#1E1718]/72"
      }`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {label}
      <span className="font-mono">{value}</span>
    </span>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#7A1F2B] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(122,31,43,0.22)] transition hover:bg-[#9B2D3C] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

function normalizeRoomCode(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function getRoomCodeFromScan(value: string) {
  const trimmed = value.trim();
  const pathMatch = trimmed.match(/\/game-tools\/werewolf\/join\/([^/?#]+)/);

  if (pathMatch?.[1]) {
    return normalizeRoomCode(decodeURIComponent(pathMatch[1]));
  }

  try {
    const parsed = new URL(trimmed);
    const urlMatch = parsed.pathname.match(
      /\/game-tools\/werewolf\/join\/([^/?#]+)/,
    );

    if (urlMatch?.[1]) {
      return normalizeRoomCode(decodeURIComponent(urlMatch[1]));
    }
  } catch {
    // Plain room codes are handled below.
  }

  return normalizeRoomCode(trimmed);
}

export function WerewolfCreateRoomPanel({
  locale,
}: WerewolfCreateRoomPanelProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    createWerewolfRoomAction,
    initialState,
  );
  const [joinCode, setJoinCode] = useState("");
  const [joinCodeError, setJoinCodeError] = useState("");
  const [scannerError, setScannerError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedVariantKey, setSelectedVariantKey] = useState(
    defaultWerewolfVariantKey,
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanHandledRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const t = copies[locale] ?? copies.en;
  const normalizedJoinCode = normalizeRoomCode(joinCode);

  const goToJoinCode = useCallback(
    (code: string) => {
      router.push(
        withLocale(
          locale,
          `/game-tools/werewolf/join/${encodeURIComponent(code)}`,
        ),
      );
    },
    [locale, router],
  );

  useEffect(() => {
    if (!scannerOpen) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError(t.scannerUnsupported);
      return;
    }

    let animationFrameId = 0;
    let stopped = false;
    let stream: MediaStream | null = null;

    async function startScanner() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
          },
        });

        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;

        if (!video) {
          return;
        }

        video.srcObject = stream;
        await video.play();

        const scanFrame = () => {
          if (stopped || scanHandledRef.current) {
            return;
          }

          const canvas = canvasRef.current;
          const context = canvas?.getContext("2d", {
            willReadFrequently: true,
          });

          if (
            video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            canvas &&
            context &&
            video.videoWidth &&
            video.videoHeight
          ) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            );
            const result = jsQR(imageData.data, imageData.width, imageData.height);
            const scannedCode = result ? getRoomCodeFromScan(result.data) : "";

            if (scannedCode) {
              scanHandledRef.current = true;
              setJoinCode(scannedCode);
              setScannerOpen(false);
              goToJoinCode(scannedCode);
              return;
            }
          }

          animationFrameId = window.requestAnimationFrame(scanFrame);
        };

        animationFrameId = window.requestAnimationFrame(scanFrame);
      } catch {
        setScannerError(t.scannerPermission);
      }
    }

    scanHandledRef.current = false;
    setScannerError("");
    void startScanner();

    return () => {
      stopped = true;
      window.cancelAnimationFrame(animationFrameId);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [goToJoinCode, scannerOpen, t.scannerPermission, t.scannerUnsupported]);

  function handleJoinByCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedJoinCode) {
      setJoinCodeError(t.joinCodeError);
      return;
    }

    setJoinCodeError("");
    goToJoinCode(normalizedJoinCode);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(25rem,0.95fr)] lg:items-stretch">
      <div className="overflow-hidden rounded-[1.6rem] border border-[#D9C7B4] bg-[#141820] text-white shadow-[0_24px_70px_rgba(30,23,24,0.18)]">
        <div className="relative min-h-[22rem]">
          <Image
            alt=""
            className="h-full min-h-[22rem] w-full object-cover opacity-70"
            height={720}
            priority={false}
            src="/game-tools/werewolf/werewolf.jpeg"
            width={960}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,24,32,0.12),rgba(20,24,32,0.88))]" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white backdrop-blur">
              <Moon className="h-3.5 w-3.5" />
              {t.eyebrow}
            </span>
            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-[1.04] tracking-normal sm:text-5xl">
              {t.title}
            </h1>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-white/78 sm:text-base">
              {t.helper}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {t.chips.map((chip) => (
                <span
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-white/18 bg-white/12 px-3 text-xs font-black text-white backdrop-blur"
                  key={chip}
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#F0C36A]" />
                  {chip}
                </span>
              ))}
              <Link
                className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-3 text-xs font-black text-[#1E1718] shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition hover:bg-[#F4ECE6]"
                href={withLocale(locale, "/game-tools/werewolf/card-preview")}
              >
                <img
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-5"
                  draggable={false}
                  src={werewolfUiAssets.actionRevealCard}
                />
                {t.preview}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <form
          className="rounded-[1.35rem] border border-[#D9C7B4] bg-white p-3 shadow-[0_14px_34px_rgba(30,23,24,0.07)] sm:p-4"
          onSubmit={handleJoinByCode}
        >
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-[#7A1F2B] text-white shadow-[0_10px_22px_rgba(122,31,43,0.18)]">
              <Hash className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-[#1E1718]">
                {t.joinCodeTitle}
              </h2>
              <p className="truncate text-xs font-bold text-[#7A1F2B]/68">
                {t.joinCodeHelper}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_3rem_5.75rem] gap-2">
            <label className="grid gap-1">
              <span className="sr-only">{t.joinCodeLabel}</span>
              <input
                autoCapitalize="characters"
                className="h-11 min-w-0 rounded-2xl border border-[#D9C7B4] bg-[#FFFDF7] px-3 text-sm font-black uppercase tracking-[0.18em] text-[#1E1718] outline-none transition placeholder:normal-case placeholder:tracking-normal focus:border-[#7A1F2B] focus:ring-2 focus:ring-[#7A1F2B]/15"
                inputMode="text"
                maxLength={12}
                onChange={(event) => {
                  setJoinCode(event.target.value.toUpperCase());
                  if (joinCodeError) {
                    setJoinCodeError("");
                  }
                }}
                placeholder={t.joinCodePlaceholder}
                spellCheck={false}
                value={joinCode}
              />
            </label>
            <button
              aria-label={t.scanCodeAction}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#D9C7B4] bg-[#FFFDF7] text-[#7A1F2B] transition hover:border-[#7A1F2B] hover:bg-[#FFF7F1]"
              onClick={() => setScannerOpen(true)}
              title={t.scanCodeAction}
              type="button"
            >
              <Camera className="h-[1.125rem] w-[1.125rem]" />
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-[#1E1718] px-3 text-xs font-black text-white transition hover:bg-[#3A2A2D]"
              type="submit"
            >
              {t.joinCodeAction}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {joinCodeError ? (
            <p className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              {joinCodeError}
            </p>
          ) : null}
        </form>

        {scannerOpen ? (
          <div className="fixed inset-0 z-[80] grid place-items-center bg-[#1E1718]/78 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm overflow-hidden rounded-[1.5rem] border border-white/16 bg-[#141820] text-white shadow-[0_28px_80px_rgba(0,0,0,0.35)]">
              <div className="flex items-start justify-between gap-3 p-4">
                <div>
                  <h2 className="text-base font-black">{t.scannerTitle}</h2>
                  <p className="mt-1 text-xs font-semibold leading-5 text-white/62">
                    {t.scannerHelper}
                  </p>
                </div>
                <button
                  aria-label={t.scannerClose}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/16 bg-white/10 text-white transition hover:bg-white/18"
                  onClick={() => setScannerOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative mx-4 aspect-square overflow-hidden rounded-[1.15rem] border border-[#F0C36A]/32 bg-black">
                <video
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  ref={videoRef}
                />
                <canvas className="hidden" ref={canvasRef} />
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="h-[72%] w-[72%] rounded-[1rem] border border-[#F0C36A] shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
                </div>
                <div className="pointer-events-none absolute inset-x-[18%] top-1/2 h-px bg-[#F0C36A]/90 shadow-[0_0_18px_rgba(240,195,106,0.85)]" />
              </div>
              <div className="p-4">
                {scannerError ? (
                  <p className="rounded-2xl border border-red-200/20 bg-red-500/12 px-3 py-2 text-sm font-bold text-red-100">
                    {scannerError}
                  </p>
                ) : (
                  <p className="text-center text-xs font-black uppercase tracking-[0.16em] text-[#F0C36A]">
                    {t.scannerSearching}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <form
          action={formAction}
          className="grid content-between gap-5 rounded-[1.6rem] border border-[#D9C7B4] bg-[#FFFDF7] p-4 shadow-[0_18px_48px_rgba(30,23,24,0.08)] sm:p-5"
        >
          <input name="locale" type="hidden" value={locale} />
          <input name="variantKey" type="hidden" value={selectedVariantKey} />

          <div className="grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-xs font-black text-[#7A1F2B]">
                {t.titleLabel}
              </span>
              <input
                className="h-12 rounded-2xl border border-[#D9C7B4] bg-white px-4 text-sm font-bold text-[#1E1718] outline-none transition focus:border-[#7A1F2B] focus:ring-2 focus:ring-[#7A1F2B]/15"
                maxLength={80}
                name="title"
                placeholder={t.titlePlaceholder}
              />
            </label>

            <div className="rounded-[1.2rem] border border-[#D9C7B4] bg-white p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-black text-[#1E1718]">
                  {t.variants}
                </h2>
                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-[#F4ECE6] px-2.5 py-1 text-[11px] font-black text-[#7A1F2B] sm:text-xs">
                  <img
                    alt=""
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0"
                    draggable={false}
                    src={werewolfUiAssets.seatJudge}
                  />
                  <span className="truncate">{t.judge}</span>
                </span>
              </div>

              <div className="mt-3 grid gap-2">
                {werewolfVariants.map((variant) => (
                  <label
                    className={`grid min-h-14 cursor-pointer grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-2 rounded-2xl border px-2.5 py-2.5 transition sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-3 sm:px-3 ${
                      selectedVariantKey === variant.key
                        ? "border-[#7A1F2B] bg-[#FFF7F1] shadow-[0_10px_22px_rgba(122,31,43,0.08)]"
                        : "border-[#D9C7B4] bg-[#F7F3EC] text-[#1E1718]/70 hover:bg-[#FFFDF7]"
                    } ${variant.enabled ? "" : "cursor-not-allowed opacity-60"}`}
                    key={variant.key}
                  >
                    <input
                      checked={selectedVariantKey === variant.key}
                      className="sr-only"
                      disabled={!variant.enabled}
                      name="variantChoice"
                      onChange={() => setSelectedVariantKey(variant.key)}
                      type="radio"
                      value={variant.key}
                    />
                    <span className="relative mt-0.5 grid h-9 w-9 shrink-0 place-items-center sm:h-12 sm:w-12">
                      <img
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full"
                        draggable={false}
                        src={werewolfUiAssets.seatPlayerOccupied}
                      />
                      <span className="relative text-xs font-black text-white sm:text-sm">
                        {variant.roles.length}
                      </span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#1E1718]">
                        {getWerewolfVariantLabel(locale, variant)}
                      </p>
                      <p className="text-xs font-bold text-[#7A1F2B]/70">
                        {variant.totalSeats}
                        {locale === "zh-CN" ? "" : " "}
                        {t.players}
                      </p>
                      <VariantSeatDots variant={variant} />
                      <RoleMixBadges locale={locale} variant={variant} />
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {state.formError ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {state.formError}
              </p>
            ) : null}
          </div>

          <SubmitButton label={t.create} />
        </form>
      </div>
    </section>
  );
}
