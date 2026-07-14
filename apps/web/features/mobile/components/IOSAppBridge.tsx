"use client";

import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type PushNotificationSchema,
} from "@capacitor/push-notifications";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  getStoredIOSPushToken,
  isFriemiIOSApp,
  registerIOSMobileDevice,
  storeIOSPushToken,
} from "@/features/mobile/push/clientPush";

function getIOSDeviceContext() {
  return {
    appVersion: Capacitor.getPlatform() === "ios" ? "ios-app" : undefined,
    deviceId: `ios-${window.navigator.userAgent}`,
    locale: document.documentElement.lang || window.navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function resolvePushPath(
  notification: PushNotificationSchema,
) {
  const path = notification.data?.path ?? notification.data?.url;

  return typeof path === "string" && path.startsWith("/") ? path : null;
}

export function IOSAppBridge() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const lastRegisteredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isFriemiIOSApp()) {
      return;
    }

    document.documentElement.dataset.friemiIosApp = "true";

    let active = true;

    const removeRegistration = PushNotifications.addListener(
      "registration",
      (token) => {
        if (!active || !token.value) {
          return;
        }

        storeIOSPushToken(token.value);

        if (token.value === lastRegisteredTokenRef.current) {
          return;
        }

        void registerIOSMobileDevice({
          ...getIOSDeviceContext(),
          token: token.value,
        })
          .then((ok) => {
            if (ok) {
              lastRegisteredTokenRef.current = token.value;
              storeIOSPushToken(token.value);
            }
          })
          .catch((error) => {
            console.error("Failed to register iOS push token", error);
          });
      },
    );

    const removeRegistrationError = PushNotifications.addListener(
      "registrationError",
      (error) => {
        console.error("iOS push registration error", error);
      },
    );

    const removeNotificationReceived = PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.info("iOS push received", notification);
      },
    );

    const removeNotificationAction = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification) => {
        const path = resolvePushPath(notification.notification);

        if (path) {
          router.push(path);
        }
      },
    );

    void PushNotifications.checkPermissions()
      .then((permission) => {
        if (permission.receive === "prompt") {
          return PushNotifications.requestPermissions();
        }

        return permission;
      })
      .then((permission) => {
        if (!active || permission.receive !== "granted") {
          console.info("iOS push permission not granted", permission.receive);
          return;
        }

        return PushNotifications.register();
      })
      .catch((error) => {
        console.error("Failed to initialize iOS push notifications", error);
      });

    return () => {
      active = false;
      delete document.documentElement.dataset.friemiIosApp;
      void removeRegistration.then((listener) => listener.remove());
      void removeRegistrationError.then((listener) => listener.remove());
      void removeNotificationReceived.then((listener) => listener.remove());
      void removeNotificationAction.then((listener) => listener.remove());
    };
  }, [router]);

  useEffect(() => {
    if (!isFriemiIOSApp() || !isLoaded || !isSignedIn) {
      return;
    }

    const token = getStoredIOSPushToken();

    if (!token || token === lastRegisteredTokenRef.current) {
      return;
    }

    void registerIOSMobileDevice({
      ...getIOSDeviceContext(),
      token,
    })
      .then((ok) => {
        if (ok) {
          lastRegisteredTokenRef.current = token;
        }
      })
      .catch((error) => {
        console.error("Failed to register cached iOS push token", error);
      });
  }, [isLoaded, isSignedIn]);

  return null;
}
