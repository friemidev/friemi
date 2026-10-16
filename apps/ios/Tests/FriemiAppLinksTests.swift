import Foundation

// Run with swiftc App/App/FriemiAppLinks.swift Tests/FriemiAppLinksTests.swift -o /tmp/friemi-app-links-tests
@main
enum FriemiAppLinksTests {
    static func main() {
        let base = "https://www.friemi.com"
        let cases: [(String, String?)] = [
            ("friemi://open?target=%2Ffr%2Flobby%2Fa%3Faccess%3Dk%252B1%23details", base + "/fr/lobby/a?access=k%2B1#details"),
            ("https://friemi.com/open?target=%2Fen%2Fplanets%2Fa", base + "/en/planets/a"),
            ("friemi://activity/a?access=x#photos", base + "/fr/activities/a?access=x#photos"),
            ("friemi://en/lobby/a", base + "/en/lobby/a"),
            ("friemi://en/game-tools/dice/online?code=ABC123", base + "/en/game-tools/dice/online?code=ABC123"),
            ("friemi://game-tools/werewolf/join/code", base + "/fr/game-tools/werewolf/join/code"),
            ("https://evil.vercel.app/en/lobby/a", nil),
            ("https://user@www.friemi.com/en/lobby/a", nil),
            ("friemi://open?target=%2F%2Fevil.test", nil),
            ("friemi://open?target=%2Fen%2Fsign-in", nil),
            ("friemi://open?target=%2Fopen", nil),
            ("friemi://auth-complete?target=%2Fen%2Flobby%2Fa", nil),
        ]
        for (input, expected) in cases {
            let actual = FriemiAppLinks.resolve(URL(string: input)!, base: base, locale: "fr")?.absoluteString
            precondition(actual == expected, "Unexpected result for \(input): \(String(describing: actual))")
        }
        for path in ["/en/lobby/%2e%2e/%2e%2e/api", "/en/lobby/%5c", "/en/lobby/%00", "/en/lobby/a\n"] {
            precondition(FriemiAppLinks.normalizeTarget(path, locale: "en") == nil)
        }
        precondition(FriemiAppLinks.normalizeTarget("/en/lobby/a?access=ok&code=secret&embedded=1#details", locale: "en") == "/en/lobby/a?access=ok#details")

        let preview = "http://127.0.0.1:3041/fr/mobile-home"
        precondition(FriemiAppLinks.resolve(URL(string: "friemi://open?target=%2Ffr%2Flobby%2Fa")!, base: preview, locale: "en")?.absoluteString == "http://127.0.0.1:3041/fr/lobby/a")
        precondition(FriemiAppLinks.resolve(URL(string: "http://127.0.0.1:3042/fr/lobby/a")!, base: preview, locale: "en") == nil)
        for untrusted in ["https://evil.vercel.app", "https://clerk.friemi.com", "https://accounts.dev", "http://www.friemi.com", "https://www.friemi.com:444", "https://user@www.friemi.com"] {
            precondition(FriemiAppLinks.trustedContentOrigin(untrusted, configuredBase: base) == nil)
        }
        precondition(FriemiAppLinks.trustedContentOrigin(preview, configuredBase: preview) == "http://127.0.0.1:3041")
        precondition(FriemiAppLinks.isAllowedWebNavigation(URL(string: "https://clerk.friemi.com/v1/client/handshake")!, configuredBase: base))
        precondition(!FriemiAppLinks.isAllowedWebNavigation(URL(string: "https://evil.vercel.app")!, configuredBase: base))
        precondition(!FriemiAppLinks.isAllowedWebNavigation(URL(string: "http://localhost:3041")!, configuredBase: base))

        let encodedAuth = URL(string: "friemi://auth-complete?target=%2Ffr%2Flobby%2Fa%3Faccess%3Dk%252B1%2526x%253Dy%23details&webBase=https%3A%2F%2Fevil.vercel.app")!
        precondition(FriemiAppLinks.resolveAuthComplete(encodedAuth, base: base, configuredBase: base, locale: "en", timestamp: "1")?.absoluteString == base + "/fr/lobby/a?access=k%2B1%26x%3Dy&__friemi_android_auth_return=1&__friemi_ios_auth_ts=1#details")
        let handoff = URL(string: "friemi://auth-complete?target=%2Ffr%2Fandroid-auth-return%3Fflow%3Df%26code%3Dk%252B1")!
        precondition(FriemiAppLinks.resolveAuthComplete(handoff, base: "https://clerk.friemi.com", configuredBase: base, locale: "en", timestamp: "1")?.absoluteString == base + "/fr/android-auth-return?flow=f&code=k%2B1&__friemi_android_auth_return=1&__friemi_ios_auth_ts=1")
        precondition(FriemiAppLinks.normalizeTarget("/fr/lobby/../sign-in", locale: "en", authReturn: true) == nil)
        precondition(FriemiAppLinks.normalizeTarget("/fr/lobby/a?__friemi_android_auth_retry=1&__friemi_ios_auth_ts=old", locale: "en", authReturn: true) == "/fr/lobby/a?__friemi_android_auth_retry=1")
        let setup = "/fr/profile/setup?redirect_url=%2Ffr%2Flobby%2Fa%3Faccess%3Dk%252B1"
        precondition(FriemiAppLinks.normalizeTarget(setup, locale: "en", authReturn: true) == setup)
        precondition(FriemiAppLinks.normalizeTarget("/fr/profile/setup?redirect_url=https%3A%2F%2Fevil.test", locale: "en", authReturn: true) == "/fr/profile/setup")
        print("Friemi app-link routing: all cases passed")
    }
}
