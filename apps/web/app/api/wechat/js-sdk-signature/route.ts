import { NextResponse } from "next/server";
import {
  createWechatJsSdkSignature,
  createWechatNonce,
  normalizeWechatJsSdkUrl,
} from "@/lib/wechat-js-sdk-signature";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WechatAccessTokenPayload = {
  access_token?: string;
  errcode?: number;
  errmsg?: string;
  expires_in?: number;
};

type WechatJsapiTicketPayload = {
  errcode?: number;
  errmsg?: string;
  expires_in?: number;
  ticket?: string;
};

type CachedWechatCredential = {
  appId: string;
  expiresAt: number;
  value: string;
};

class WechatJsSdkError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

let accessTokenCache: CachedWechatCredential | null = null;
let jsapiTicketCache: CachedWechatCredential | null = null;

function getWechatCredentials() {
  const appId =
    process.env.WECHAT_MP_APP_ID?.trim() ||
    process.env.WECHAT_APP_ID?.trim() ||
    process.env.WX_APP_ID?.trim();
  const appSecret =
    process.env.WECHAT_MP_APP_SECRET?.trim() ||
    process.env.WECHAT_APP_SECRET?.trim() ||
    process.env.WX_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    return null;
  }

  return { appId, appSecret };
}

function getCacheExpiry(expiresIn: number | null | undefined) {
  const safeExpiresIn = Math.max(60, expiresIn ?? 7200);

  return Date.now() + Math.max(30, safeExpiresIn - 300) * 1000;
}

function isCachedCredentialValid(
  cachedCredential: CachedWechatCredential | null,
  appId: string,
) {
  return (
    Boolean(cachedCredential) &&
    cachedCredential?.appId === appId &&
    cachedCredential.expiresAt > Date.now()
  );
}

async function getWechatAccessToken(appId: string, appSecret: string) {
  if (isCachedCredentialValid(accessTokenCache, appId)) {
    return accessTokenCache!.value;
  }

  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new WechatJsSdkError(
      `WECHAT_ACCESS_TOKEN_HTTP_${response.status}`,
      502,
    );
  }

  const payload = (await response.json()) as WechatAccessTokenPayload;

  if (payload.errcode && payload.errcode !== 0) {
    throw new WechatJsSdkError(`WECHAT_ACCESS_TOKEN_${payload.errcode}`, 502);
  }

  if (!payload.access_token) {
    throw new WechatJsSdkError("WECHAT_ACCESS_TOKEN_MISSING", 502);
  }

  accessTokenCache = {
    appId,
    expiresAt: getCacheExpiry(payload.expires_in),
    value: payload.access_token,
  };

  return payload.access_token;
}

async function getWechatJsapiTicket(appId: string, accessToken: string) {
  if (isCachedCredentialValid(jsapiTicketCache, appId)) {
    return jsapiTicketCache!.value;
  }

  const url = new URL("https://api.weixin.qq.com/cgi-bin/ticket/getticket");
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("type", "jsapi");

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new WechatJsSdkError(
      `WECHAT_JSAPI_TICKET_HTTP_${response.status}`,
      502,
    );
  }

  const payload = (await response.json()) as WechatJsapiTicketPayload;

  if (payload.errcode && payload.errcode !== 0) {
    throw new WechatJsSdkError(`WECHAT_JSAPI_TICKET_${payload.errcode}`, 502);
  }

  if (!payload.ticket) {
    throw new WechatJsSdkError("WECHAT_JSAPI_TICKET_MISSING", 502);
  }

  jsapiTicketCache = {
    appId,
    expiresAt: getCacheExpiry(payload.expires_in),
    value: payload.ticket,
  };

  return payload.ticket;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const targetUrl = normalizeWechatJsSdkUrl(
    requestUrl.searchParams.get("url"),
  );

  if (!targetUrl) {
    return NextResponse.json(
      { error: "INVALID_URL", ok: false },
      { status: 400 },
    );
  }

  const credentials = getWechatCredentials();

  if (!credentials) {
    return NextResponse.json({
      error: "WECHAT_JS_SDK_NOT_CONFIGURED",
      ok: false,
    });
  }

  try {
    const accessToken = await getWechatAccessToken(
      credentials.appId,
      credentials.appSecret,
    );
    const jsapiTicket = await getWechatJsapiTicket(
      credentials.appId,
      accessToken,
    );
    const nonceStr = createWechatNonce();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createWechatJsSdkSignature({
      jsapiTicket,
      nonceStr,
      timestamp,
      url: targetUrl,
    });

    return NextResponse.json({
      config: {
        appId: credentials.appId,
        nonceStr,
        signature,
        timestamp,
      },
      ok: true,
    });
  } catch (error) {
    console.error("Failed to create WeChat JS-SDK signature", error);
    const reason =
      error instanceof Error
        ? error.message
        : "WECHAT_JS_SDK_SIGNATURE_FAILED";

    return NextResponse.json(
      {
        error: "WECHAT_JS_SDK_SIGNATURE_FAILED",
        ok: false,
        reason,
      },
      { status: error instanceof WechatJsSdkError ? error.status : 502 },
    );
  }
}
