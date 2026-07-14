"use client";

import { PushNotifications } from "@capacitor/push-notifications";

export const iosPushTokenStorageKey = "friemi:ios-push-token";

export type IOSPushRegistrationPayload = {
  appVersion?: string;
  deviceId?: string;
  locale?: string;
  timezone?: string;
  token: string;
};

export function isFriemiIOSApp() {
  return (
    typeof window !== "undefined" &&
    /FriemiIOS\//i.test(window.navigator.userAgent)
  );
}

export function getStoredIOSPushToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(iosPushTokenStorageKey)?.trim();
  return value ? value : null;
}

export function storeIOSPushToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!token) {
    window.localStorage.removeItem(iosPushTokenStorageKey);
    return;
  }

  window.localStorage.setItem(iosPushTokenStorageKey, token);
}

export async function registerIOSMobileDevice(
  payload: IOSPushRegistrationPayload,
) {
  const response = await fetch("/api/mobile/devices/register", {
    body: JSON.stringify({
      appVersion: payload.appVersion,
      deviceId: payload.deviceId,
      fcmToken: payload.token,
      locale: payload.locale,
      platform: "IOS",
      timezone: payload.timezone,
    }),
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  return response.ok;
}

export async function unregisterIOSMobileDevice() {
  const token = getStoredIOSPushToken();

  if (!token) {
    return;
  }

  try {
    await fetch("/api/mobile/devices/unregister", {
      body: JSON.stringify({
        fcmToken: token,
        platform: "IOS",
      }),
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
  } catch (error) {
    console.error("Failed to unregister iOS push token", error);
  }

  try {
    await PushNotifications.unregister();
  } catch (error) {
    console.error("Failed to unregister iOS push notifications", error);
  }

  storeIOSPushToken(null);
}
