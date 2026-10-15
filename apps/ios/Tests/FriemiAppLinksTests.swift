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
        print("Friemi app-link routing: all cases passed")
    }
}
