package com.friemi.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** One-shot Play install handoff; never blocks startup or replaces a user's navigation. */
final class FriemiInstallReferrer {
    private static final String CHECKED = "friemi_install_link_checked";
    interface Result { void accept(String target); }

    private final SharedPreferences preferences;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private InstallReferrerClient client;
    private boolean closed;
    private boolean consumed;

    FriemiInstallReferrer(SharedPreferences preferences) {
        this.preferences = preferences;
        consumed = preferences.getBoolean(CHECKED, false);
    }

    void start(Context context, String locale, Result result) {
        if (consumed) { close(); return; }
        try {
            client = InstallReferrerClient.newBuilder(context.getApplicationContext()).build();
            main.postDelayed(this::close, 5000);
            client.startConnection(new InstallReferrerStateListener() {
                @Override public void onInstallReferrerSetupFinished(int code) {
                    main.post(() -> {
                        if (closed) return;
                        if (code != InstallReferrerClient.InstallReferrerResponse.OK) {
                            if (code == InstallReferrerClient.InstallReferrerResponse.FEATURE_NOT_SUPPORTED) consume();
                            else close();
                            return;
                        }
                        worker.execute(() -> {
                            try {
                                ReferrerDetails details = client.getInstallReferrer();
                                String target = FriemiAppLinks.installTarget(details.getInstallReferrer(),
                                    details.getInstallBeginTimestampSeconds(), System.currentTimeMillis() / 1000, locale);
                                main.post(() -> {
                                    if (closed) return;
                                    consume();
                                    if (target != null) result.accept(target);
                                });
                            } catch (Exception ignored) { main.post(FriemiInstallReferrer.this::close); }
                        });
                    });
                }
                @Override public void onInstallReferrerServiceDisconnected() { main.post(FriemiInstallReferrer.this::close); }
            });
        } catch (Exception ignored) { close(); }
    }

    void consume() {
        if (!consumed) {
            consumed = true;
            preferences.edit().putBoolean(CHECKED, true).apply();
        }
        close();
    }

    void close() {
        if (closed) return;
        closed = true;
        main.removeCallbacksAndMessages(null);
        worker.shutdownNow();
        if (client != null) {
            try { client.endConnection(); } catch (Exception ignored) { }
        }
    }
}
