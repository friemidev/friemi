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
}
