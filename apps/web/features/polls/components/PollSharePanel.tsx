"use client";

import QRCode from "qrcode";
import { useActionState, useEffect, useState } from "react";
import { Check, Copy, Loader2, QrCode, Share2 } from "lucide-react";
import {
  configureActivityPollShareAction,
  revokeActivityPollShareAction,
  type PollActionState,
} from "../actions/pollActions";
import { getPollCopy } from "../copy";

const initialState: PollActionState = {};

export function PollSharePanel({
  initialAudience,
  initialGuestIdentityMode,
  locale,
  pollId,
  shareActive,
}: {
  initialAudience: "MEMBERS_ONLY" | "SIGNED_IN_WITH_LINK" | "ANYONE_WITH_LINK";
  initialGuestIdentityMode:
    | "NICKNAME_REQUIRED"
    | "NICKNAME_OPTIONAL_ANONYMOUS"
    | null;
  locale: string;
  pollId: string;
  shareActive: boolean;
}) {
  const copy = getPollCopy(locale);
  const [state, action, pending] = useActionState(
    configureActivityPollShareAction,
    initialState,
  );
  const [revokeState, revokeAction, revokePending] = useActionState(
    revokeActivityPollShareAction,
    initialState,
  );
  const [audience, setAudience] = useState(initialAudience);
  const [shareUrl, setShareUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState(shareActive);

  useEffect(() => {
    if (!state.sharePath) return;
    const url = new URL(state.sharePath, window.location.origin).toString();
    setActive(true);
    setShareUrl(url);
    QRCode.toDataURL(url, {
      color: { dark: "#156240", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [state.sharePath]);

  useEffect(() => {
    if (!revokeState.ok) return;
    setActive(false);
    setShareUrl("");
    setQrDataUrl("");
  }, [revokeState.ok]);

  async function copyShareLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function sharePoll() {
    if (!shareUrl) return;
    if (navigator.share) {
      await navigator.share({ title: copy.shareTitle, url: shareUrl });
      return;
    }
    await copyShareLink();
  }

  return (
    <section className="space-y-4 rounded-lg border border-[#DADCC5] bg-[#FBFCF6] p-4">
      <div className="flex items-center gap-2">
        <Share2 className="h-4 w-4 text-[#156240]" />
        <h2 className="text-sm font-black text-[#1D1D1B]">{copy.shareTitle}</h2>
      </div>
      <form action={action} className="space-y-3">
        <input name="locale" type="hidden" value={locale} />
        <input name="pollId" type="hidden" value={pollId} />
        <label className="block text-xs font-bold text-[#607268]">
          <span className="sr-only">{copy.shareTitle}</span>
          <select
            className="min-h-11 w-full rounded-lg border border-[#D8D7C5] bg-white px-3 text-sm font-semibold text-[#1D1D1B] outline-none focus:border-[#369758]"
            name="audience"
            onChange={(event) =>
              setAudience(
                event.target.value as
                  | "MEMBERS_ONLY"
                  | "SIGNED_IN_WITH_LINK"
                  | "ANYONE_WITH_LINK",
              )
            }
            value={audience}
          >
            <option value="MEMBERS_ONLY">{copy.shareMembers}</option>
            <option value="SIGNED_IN_WITH_LINK">{copy.shareLoggedIn}</option>
            <option value="ANYONE_WITH_LINK">{copy.shareAnyone}</option>
          </select>
        </label>
        {audience === "ANYONE_WITH_LINK" ? (
          <select
            className="min-h-11 w-full rounded-lg border border-[#D8D7C5] bg-white px-3 text-sm font-semibold text-[#1D1D1B] outline-none focus:border-[#369758]"
            defaultValue={initialGuestIdentityMode ?? "NICKNAME_REQUIRED"}
            name="guestIdentityMode"
          >
            <option value="NICKNAME_REQUIRED">{copy.nicknameRequired}</option>
            <option value="NICKNAME_OPTIONAL_ANONYMOUS">
              {copy.nicknameOptional}
            </option>
          </select>
        ) : null}
        <button
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#156240] px-4 text-sm font-bold text-white disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <QrCode className="h-4 w-4" />
          )}
          {copy.shareGenerate}
        </button>
        <p className="text-[11px] leading-5 text-[#747B73]">{copy.shareHint}</p>
      </form>

      {state.error ? (
        <p className="text-sm font-semibold text-[#9D332B]">{state.error}</p>
      ) : null}
      {active ? (
        <form action={revokeAction} className="border-t border-[#E3DFD0] pt-3">
          <input name="locale" type="hidden" value={locale} />
          <input name="pollId" type="hidden" value={pollId} />
          <button
            className="min-h-10 w-full rounded-full text-xs font-bold text-[#8E4C45] transition hover:bg-[#FFF0ED] disabled:opacity-60"
            disabled={revokePending}
            type="submit"
          >
            {revokePending ? (
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            ) : null}
            {copy.shareRevoke}
          </button>
          {revokeState.error ? (
            <p className="mt-2 text-center text-xs font-semibold text-[#9D332B]">
              {revokeState.error}
            </p>
          ) : null}
        </form>
      ) : null}
      {revokeState.ok ? (
        <p className="text-center text-xs font-semibold text-[#156240]">
          {copy.shareRevokedSuccess}
        </p>
      ) : null}
      {shareUrl ? (
        <div className="space-y-3 border-t border-[#E3DFD0] pt-4">
          <div className="overflow-hidden rounded-lg border border-[#D8D7C5] bg-white px-3 py-2 text-xs text-[#607268]">
            <p className="truncate">{shareUrl}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#B8CDBB] bg-white text-xs font-bold text-[#156240]"
              onClick={copyShareLink}
              type="button"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? copy.copySuccess : copy.copyLink}
            </button>
            <button
              className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#B8CDBB] bg-white text-xs font-bold text-[#156240]"
              onClick={sharePoll}
              type="button"
            >
              <Share2 className="h-4 w-4" />
              {copy.share}
            </button>
          </div>
          {qrDataUrl ? (
            <div className="mx-auto w-full max-w-[250px] rounded-lg border border-[#E3DFD0] bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={copy.shareQr}
                className="h-auto w-full"
                src={qrDataUrl}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
