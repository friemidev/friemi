package com.friemi.app;

import android.webkit.JavascriptInterface;

final class FriemiAndroidBridge {
    private final MainActivity activity;

    FriemiAndroidBridge(MainActivity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public String getAppInfo() {
        return activity.getAppInfoJson();
    }

    @JavascriptInterface
    public void saveLocale(String locale) {
        activity.saveLocaleFromBridge(locale);
    }

    @JavascriptInterface
    public void openExternal(String url) {
        activity.openExternalFromBridge(url);
    }

    @JavascriptInterface
    public void openMap(String url) {
        activity.openExternalFromBridge(url);
    }

    @JavascriptInterface
    public void copyText(String text) {
        activity.copyTextFromBridge(text);
    }

    @JavascriptInterface
    public void downloadFile(String url) {
        activity.downloadFileFromBridge(url);
    }

    @JavascriptInterface
    public void share(String payloadJson) {
        activity.shareFromBridge(payloadJson);
    }

    @JavascriptInterface
    public String registerPushToken() {
        return activity.registerPushTokenPlaceholder();
    }

    @JavascriptInterface
    public void setBackBehavior(String behaviorJson) {
        activity.updateBackBehaviorFromBridge(behaviorJson);
    }
}
