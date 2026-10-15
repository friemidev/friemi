import Foundation

enum FriemiAppLinks {
    static let locales = ["zh-CN", "en", "fr"]
    static let webHosts = ["www.friemi.com", "friemi.com", "friemi-git-dev-friemi.vercel.app"]
    private static let roots = Set([
        "lobby", "activities", "public-events", "planets", "game-tools", "mobile-home",
        "home", "world", "profile", "users", "friends", "messages", "footprints",
        "notifications", "discover", "search", "referrals", "account", "coupons", "tickets",
        "merchants", "poll", "official-messages", "official-feedback", "top-news", "updates",
        "co-creators", "privacy", "safety"
    ])

    static func resolve(_ url: URL, base: String, locale: String) -> URL? {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              components.user == nil, components.password == nil, components.port == nil
        else { return nil }
        let scheme = components.scheme?.lowercased()
        let host = components.host ?? ""
        var target: String?
        if scheme == "friemi" {
            if host.lowercased() == "open" {
                target = components.queryItems?.first(where: { $0.name == "target" })?.value
            } else {
                var path = "/\(host)\(components.percentEncodedPath)"
                if path.hasPrefix("/activity/") { path = "/activities/" + String(path.dropFirst(10)) }
                if path.hasPrefix("/team/") { path = "/activities/" + String(path.dropFirst(6)) }
                if ["/", "/home", "/hall"].contains(path) { path = "/mobile-home" }
                target = path + suffix(components)
            }
        } else if scheme == "https", webHosts.contains(host.lowercased()) {
            target = components.path == "/open"
                ? components.queryItems?.first(where: { $0.name == "target" })?.value
                : components.percentEncodedPath + suffix(components)
        } else { return nil }
        guard let target, let path = normalizeTarget(target, locale: locale) else { return nil }
        // Never load an incoming link on a Clerk/third-party web origin.
        let contentBase = webHosts.contains(URL(string: base)?.host?.lowercased() ?? "")
            ? base.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            : "https://www.friemi.com"
        return URL(string: contentBase + path)
    }

    static func normalizeTarget(_ target: String, locale: String) -> String? {
        guard target.count <= 4096, target.hasPrefix("/"), !target.hasPrefix("//"), !unsafe(target),
              var components = URLComponents(string: target), components.scheme == nil,
              components.host == nil,
              let path = components.percentEncodedPath.removingPercentEncoding,
              !unsafe(path), !path.contains("//"), !path.contains("%")
        else { return nil }
        let segments = path.split(separator: "/").map(String.init)
        guard !segments.contains("."), !segments.contains("..") else { return nil }
        let localized = segments.first.map { locales.contains($0) } ?? false
        let index = localized ? 1 : 0
        guard segments.count > index, roots.contains(segments[index]) else { return nil }
        // Keep raw values: URLComponents.queryItems would turn %2B into +,
        // which web form/query parsers interpret as a space in invitation tokens.
        let query = components.percentEncodedQuery?.split(separator: "&").filter {
            let rawKey = String($0.split(separator: "=", maxSplits: 1).first ?? "")
            let key = (rawKey.removingPercentEncoding ?? rawKey).lowercased()
            if key == "code", segments[index] == "game-tools" { return true }
            return !key.hasPrefix("__clerk") && !key.hasPrefix("__friemi_") &&
                !["code", "state", "ticket", "token", "redirect_url", "embedded", "sheet"].contains(key)
        }.joined(separator: "&")
        components.percentEncodedQuery = (query?.isEmpty == false) ? query : nil
        if !localized {
            components.percentEncodedPath = "/\(locales.contains(locale) ? locale : "zh-CN")\(components.percentEncodedPath)"
        }
        return components.string
    }

    private static func unsafe(_ value: String) -> Bool {
        value.unicodeScalars.contains { $0.value <= 32 || $0.value == 127 || $0.value == 92 }
    }

    private static func suffix(_ components: URLComponents) -> String {
        (components.percentEncodedQuery.map { "?\($0)" } ?? "") +
            (components.percentEncodedFragment.map { "#\($0)" } ?? "")
    }
}
