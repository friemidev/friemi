"use client";

import { useEffect } from "react";

type WechatShareConfiguratorProps = {
  description: string;
  enabled: boolean;
  imageUrl: string | null;
  link: string;
  title: string;
};

type WechatJsSdkShareData = {
  desc?: string;
  imgUrl: string;
  link: string;
  title: string;
};

type WechatJsSdkBridge = {
  config(options: {
    appId: string;
    debug: boolean;
    jsApiList: string[];
    nonceStr: string;
    signature: string;
    timestamp: number;
  }): void;
  error(callback: (error: unknown) => void): void;
  onMenuShareAppMessage?: (options: WechatJsSdkShareData) => void;
  onMenuShareTimeline?: (options: Omit<WechatJsSdkShareData, "desc">) => void;
  ready(callback: () => void): void;
  updateAppMessageShareData?: (options: WechatJsSdkShareData) => void;
  updateTimelineShareData?: (
    options: Omit<WechatJsSdkShareData, "desc">,
  ) => void;
};

type WechatSignatureResponse =
  | {
      config: {
        appId: string;
        nonceStr: string;
        signature: string;
        timestamp: number;
      };
      ok: true;
    }
  | {
      error?: string;
      ok: false;
    };

declare global {
  interface Window {
    __friemiWechatEntryUrl?: string;
    wx?: WechatJsSdkBridge;
  }
}

const wechatJsSdkUrl = "https://res.wx.qq.com/open/js/jweixin-1.6.0.js";
let wechatScriptPromise: Promise<void> | null = null;

function isWechatWebView(userAgent: string) {
  return /MicroMessenger/i.test(userAgent);
}

function isIosWechatWebView(userAgent: string) {
  return /MicroMessenger/i.test(userAgent) && /iPhone|iPad|iPod/i.test(userAgent);
}

function getCurrentWechatSignatureUrl() {
  const currentUrl = window.location.href.split("#")[0];

  if (!window.__friemiWechatEntryUrl) {
    window.__friemiWechatEntryUrl = currentUrl;
  }

  return isIosWechatWebView(window.navigator.userAgent)
    ? window.__friemiWechatEntryUrl
    : currentUrl;
}

function resolveHttpUrl(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value, window.location.origin);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function loadWechatJsSdk() {
  if (window.wx) {
    return Promise.resolve();
  }

  if (wechatScriptPromise) {
    return wechatScriptPromise;
  }

  wechatScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${wechatJsSdkUrl}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("WECHAT_JS_SDK_LOAD_FAILED")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = wechatJsSdkUrl;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("WECHAT_JS_SDK_LOAD_FAILED"));
    document.head.appendChild(script);
  });

  return wechatScriptPromise;
}

async function getWechatSignatureConfig(url: string) {
  const response = await fetch(
    `/api/wechat/js-sdk-signature?url=${encodeURIComponent(url)}`,
    {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`WECHAT_SIGNATURE_HTTP_${response.status}`);
  }

  const payload = (await response.json()) as WechatSignatureResponse;

  if (!payload.ok) {
    return null;
  }

  return payload.config;
}

function applyWechatShareData(wx: WechatJsSdkBridge, data: WechatJsSdkShareData) {
  wx.updateAppMessageShareData?.(data);
  wx.updateTimelineShareData?.({
    imgUrl: data.imgUrl,
    link: data.link,
    title: data.title,
  });
  wx.onMenuShareAppMessage?.(data);
  wx.onMenuShareTimeline?.({
    imgUrl: data.imgUrl,
    link: data.link,
    title: data.title,
  });
}

export function WechatShareConfigurator({
  description,
  enabled,
  imageUrl,
  link,
  title,
}: WechatShareConfiguratorProps) {
  useEffect(() => {
    if (
      !enabled ||
      typeof window === "undefined" ||
      !isWechatWebView(window.navigator.userAgent)
    ) {
      return;
    }

    const shareLink = resolveHttpUrl(link);
    const shareImageUrl = resolveHttpUrl(imageUrl);

    if (!shareLink || !shareImageUrl) {
      return;
    }

    const resolvedShareLink = shareLink;
    const resolvedShareImageUrl = shareImageUrl;
    let cancelled = false;

    async function configureWechatShare() {
      try {
        await loadWechatJsSdk();

        if (cancelled || !window.wx) {
          return;
        }

        const config = await getWechatSignatureConfig(
          getCurrentWechatSignatureUrl(),
        );

        if (cancelled || !config || !window.wx) {
          return;
        }

        const shareData: WechatJsSdkShareData = {
          desc: description,
          imgUrl: resolvedShareImageUrl,
          link: resolvedShareLink,
          title,
        };

        window.wx.config({
          ...config,
          debug: false,
          jsApiList: [
            "updateAppMessageShareData",
            "updateTimelineShareData",
            "onMenuShareAppMessage",
            "onMenuShareTimeline",
          ],
        });
        window.wx.ready(() => {
          if (!cancelled && window.wx) {
            applyWechatShareData(window.wx, shareData);
          }
        });
        window.wx.error((error) => {
          console.warn("WeChat JS-SDK config failed", error);
        });
      } catch (error) {
        console.warn("Failed to configure WeChat share card", error);
      }
    }

    void configureWechatShare();

    return () => {
      cancelled = true;
    };
  }, [description, enabled, imageUrl, link, title]);

  return null;
}
