import { createHash, randomUUID } from "node:crypto";

type WechatJsSdkSignatureInput = {
  jsapiTicket: string;
  nonceStr: string;
  timestamp: number | string;
  url: string;
};

export function normalizeWechatJsSdkUrl(value: string | null | undefined) {
  const urlWithoutHash = value?.trim().split("#")[0] ?? "";

  if (!urlWithoutHash) {
    return null;
  }

  try {
    const url = new URL(urlWithoutHash);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return urlWithoutHash;
  } catch {
    return null;
  }
}

export function createWechatNonce() {
  return randomUUID().replace(/-/g, "");
}

export function createWechatJsSdkSignature({
  jsapiTicket,
  nonceStr,
  timestamp,
  url,
}: WechatJsSdkSignatureInput) {
  const signatureSource = [
    `jsapi_ticket=${jsapiTicket}`,
    `noncestr=${nonceStr}`,
    `timestamp=${timestamp}`,
    `url=${url}`,
  ].join("&");

  return createHash("sha1").update(signatureSource).digest("hex");
}
