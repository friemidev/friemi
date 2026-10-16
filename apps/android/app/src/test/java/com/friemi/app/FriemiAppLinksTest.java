package com.friemi.app;

import org.junit.Test;
import static org.junit.Assert.*;

public class FriemiAppLinksTest {
    private final String base = "https://www.friemi.com";

    @Test public void openKeepsTargetLocaleQueryAndAnchor() {
        assertEquals(base + "/fr/lobby/a?access=k%2B1#details", FriemiAppLinks.resolve(
            "friemi://open?target=%2Ffr%2Flobby%2Fa%3Faccess%3Dk%252B1%23details", base, "en"));
        assertEquals(base + "/en/planets/a", FriemiAppLinks.resolve(
            "https://friemi.com/open?target=%2Fen%2Fplanets%2Fa", base, "zh-CN"));
    }

    @Test public void legacyRoutesStillWorkWithoutDuplicateLocale() {
        assertEquals(base + "/fr/activities/a?access=x#photos", FriemiAppLinks.resolve("friemi://activity/a?access=x#photos", base, "fr"));
        assertEquals(base + "/en/lobby/a", FriemiAppLinks.resolve("friemi://en/lobby/a", base, "fr"));
        assertEquals(base + "/fr/game-tools/werewolf/join/code", FriemiAppLinks.resolve("friemi://game-tools/werewolf/join/code", base, "fr"));
        assertEquals(base + "/en/game-tools/dice/online?code=ABC123", FriemiAppLinks.resolve("friemi://en/game-tools/dice/online?code=ABC123", base, "fr"));
    }

    @Test public void invalidSourcesAndAuthCallbacksAreNotContentLinks() {
        for (String url : new String[]{"https://evil.vercel.app/en/lobby/a", "javascript:alert(1)",
            "https://www.friemi.com.evil.test/en/lobby/a", "https://user@www.friemi.com/en/lobby/a",
            "friemi://open?target=https%3A%2F%2Fevil.test", "friemi://open?target=%2F%2Fevil.test",
            "friemi://open?target=%2Fen%2Fsign-in", "friemi://open?target=%2Fopen",
            "friemi://auth-complete?target=%2Fen%2Flobby%2Fa"}) {
            assertNull(url, FriemiAppLinks.resolve(url, base, "en"));
        }
    }

    @Test public void sanitizationRejectsEscapesAndStripsAuthState() {
        for (String path : new String[]{"/en/lobby/%2e%2e/%2e%2e/api", "/en/lobby/%252e%252e/api", "/en/lobby/%5c", "/en/lobby/a\n", "/en/lobby/%00", "/en/lobby/%"}) {
            assertNull(path, FriemiAppLinks.normalizeTarget(path, "en"));
        }
        assertEquals("/en/lobby/a?access=ok#details", FriemiAppLinks.normalizeTarget(
            "/en/lobby/a?access=ok&code=secret&__clerk_ticket=secret&embedded=1#details", "en"));
    }

    @Test public void installReferrerMustBeRecentAndContentOnly() {
        assertEquals("/en/lobby/a", FriemiAppLinks.installTarget("friemi_target=%2Fen%2Flobby%2Fa", 100, 200, "fr"));
        assertNull(FriemiAppLinks.installTarget("friemi_target=%2Fen%2Flobby%2Fa", 100, 86501, "fr"));
        assertNull(FriemiAppLinks.installTarget("friemi_target=%2Fen%2Flobby%2Fa", 300, 200, "fr"));
        assertNull(FriemiAppLinks.installTarget("friemi_target=https%3A%2F%2Fevil.test", 100, 200, "fr"));
        assertNull(FriemiAppLinks.installTarget("utm_source=google", 100, 200, "fr"));
    }

    @Test public void internalLoginWindowsKeepTheirAuthState() {
        assertEquals(base + "/fr/sign-in?redirect_url=%2Ffr%2Flobby%2Fa&__clerk_ticket=one-time",
            FriemiAppLinks.resolveWebNavigation(base + "/fr/sign-in?redirect_url=%2Ffr%2Flobby%2Fa&__clerk_ticket=one-time", base, "en"));
        assertEquals(base + "/fr/sign-in?redirect_url=%2Flobby%2Fa",
            FriemiAppLinks.resolveWebNavigation(base + "/sign-in?redirect_url=%2Flobby%2Fa", base, "fr"));
        assertEquals(base + "/api/auth/callback?code=one-time",
            FriemiAppLinks.resolveWebNavigation(base + "/api/auth/callback?code=one-time", base, "fr"));
        assertNull(FriemiAppLinks.resolveWebNavigation("https://evil.vercel.app/en/lobby/a", base, "en"));
    }

    @Test public void inAppOpenRoutesResolveToContentInsteadOfALocalizedOpenPage() {
        assertEquals(base + "/fr/planets/a?access=k%2B1#join", FriemiAppLinks.resolveWebNavigation(
            "https://friemi.com/open?target=%2Ffr%2Fplanets%2Fa%3Faccess%3Dk%252B1%23join", base, "en"));
        assertNull(FriemiAppLinks.resolveWebNavigation(base + "/open?target=%2F%2Fevil.test", base, "en"));
    }

    @Test public void backgroundNotificationPathsReachTheSameTargetAsForegroundLinks() {
        String path = "/fr/messages/room?access=k%2B1#last";
        assertEquals(base + path, FriemiAppLinks.resolveNotification(path, base, "en"));
        assertEquals(base + path, FriemiAppLinks.resolveNotification(base + path, base, "en"));
        assertNull(FriemiAppLinks.resolveNotification(null, base, "en"));
        assertNull(FriemiAppLinks.resolveNotification("//evil.test/path", base, "en"));
        assertNull(FriemiAppLinks.resolveNotification("/en/android-auth-return?code=secret", base, "en"));
    }

    @Test public void authReturnPreservesCodesAndEncodedInvitationValuesWithoutAllowingRedirects() {
        assertEquals("/fr/android-auth-return?flow=f&code=k%2B1", FriemiAppLinks.normalizeAuthTarget(
            "/fr/android-auth-return?flow=f&code=k%2B1", base, "en"));
        assertEquals("/fr/lobby/a?access=k%2B1%26other%3Dx#details", FriemiAppLinks.normalizeAuthTarget(
            base + "/fr/lobby/a?access=k%2B1%26other%3Dx#details", base, "en"));
        assertNull(FriemiAppLinks.normalizeAuthTarget("/fr/lobby/../sign-in", base, "en"));
        assertNull(FriemiAppLinks.normalizeAuthTarget("//evil.test", base, "en"));
        assertNull(FriemiAppLinks.normalizeAuthTarget("/fr/android-auth-browser", base, "en"));
        assertNull(FriemiAppLinks.normalizeAuthTarget("https://evil.vercel.app/fr/lobby/a", base, "en"));
    }

    @Test public void authRetriesStayBoundedAndProfileSetupRetainsItsReturnPage() {
        assertEquals("/fr/lobby/a?__friemi_android_auth_retry=1", FriemiAppLinks.normalizeAuthTarget(
            "/fr/lobby/a?__friemi_android_auth_retry=1&__friemi_ios_auth_ts=old", base, "en"));
        String setup = "/fr/profile/setup?redirect_url=%2Ffr%2Flobby%2Fa%3Faccess%3Dk%252B1";
        assertEquals(setup, FriemiAppLinks.normalizeAuthTarget(setup, base, "en"));
        assertEquals("/fr/profile/setup", FriemiAppLinks.normalizeAuthTarget(
            "/fr/profile/setup?redirect_url=https%3A%2F%2Fevil.test", base, "en"));
        assertEquals("/fr/lobby/a", FriemiAppLinks.normalizeTarget(
            "/fr/lobby/a?__friemi_android_auth_retry=1", "en"));
    }

    @Test public void configuredPreviewOriginAndPortAreUsedWithoutTrustingOtherOrigins() {
        String preview = "http://127.0.0.1:3041";
        assertEquals(preview + "/en/lobby/a", FriemiAppLinks.resolve("https://friemi.com/open?target=%2Fen%2Flobby%2Fa", preview, "fr"));
        assertEquals(preview + "/en/lobby/a", FriemiAppLinks.resolve(preview + "/en/lobby/a", preview, "fr"));
        assertNull(FriemiAppLinks.resolve("http://127.0.0.1:3042/en/lobby/a", preview, "en"));
        assertNull(FriemiAppLinks.resolve("http://www.friemi.com/en/lobby/a", base, "en"));
        assertNull(FriemiAppLinks.resolve("friemi://open:443?target=%2Fen%2Flobby%2Fa", base, "en"));
        assertNull(FriemiAppLinks.normalizeTarget("/en/lobby/../planets/a", "en"));
    }
}
