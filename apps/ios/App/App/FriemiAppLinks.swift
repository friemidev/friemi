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
              components.user == nil, components.password == nil
        else { return nil }
        let scheme = components.scheme?.lowercased()
        let host = components.host ?? ""
        var target: String?
        if scheme == "friemi" {
            guard components.port == nil else { return nil }
            if host.lowercased() == "open" {
                target = components.queryItems?.first(where: { $0.name == "target" })?.value
            } else {
                var path = "/\(host)\(components.percentEncodedPath)"
                if path.hasPrefix("/activity/") { path = "/activities/" + String(path.dropFirst(10)) }
                if path.hasPrefix("/team/") { path = "/activities/" + String(path.dropFirst(6)) }
                if ["/", "/home", "/hall"].contains(path) { path = "/mobile-home" }
                target = path + suffix(components)
            }
        } else if trustedContentOrigin(url.absoluteString, configuredBase: base) != nil {
            target = components.path == "/open"
                ? components.queryItems?.first(where: { $0.name == "target" })?.value
                : components.percentEncodedPath + suffix(components)
        } else { return nil }
        guard let target, let path = normalizeTarget(target, locale: locale) else { return nil }
        // The caller supplies the configured app origin, never an authentication page's origin.
        let contentBase = webOrigin(base) ?? "https://www.friemi.com"
        return URL(string: contentBase + path)
    }

    static func trustedContentOrigin(_ value: String?, configuredBase: String) -> String? {
        guard let value, let origin = webOrigin(value) else { return nil }
        if origin == webOrigin(configuredBase) { return origin }
        return ["https://www.friemi.com", "https://friemi.com"].contains(origin) ? origin : nil
    }

    static func isAllowedWebNavigation(_ url: URL, configuredBase: String) -> Bool {
        if trustedContentOrigin(url.absoluteString, configuredBase: configuredBase) != nil { return true }
        guard let origin = webOrigin(url.absoluteString), origin.hasPrefix("https://"),
              url.port == nil || url.port == 443, let host = url.host?.lowercased()
        else { return false }
        return host.hasSuffix(".friemi.com") ||
            ["clerk.com", "accounts.dev", "appleid.apple.com", "idmsa.apple.com"].contains(host) ||
            [".clerk.com", ".accounts.dev", ".appleid.apple.com", ".idmsa.apple.com"].contains(where: { host.hasSuffix($0) })
    }

    static func resolveAuthComplete(_ url: URL, base: String, configuredBase: String, locale: String, timestamp: String) -> URL? {
        guard let incoming = URLComponents(url: url, resolvingAgainstBaseURL: false),
              incoming.scheme?.lowercased() == "friemi", incoming.host?.lowercased() == "auth-complete",
              incoming.user == nil, incoming.password == nil, incoming.port == nil,
              let target = incoming.queryItems?.first(where: { $0.name == "target" })?.value
        else { return nil }
        let fallback = "/\(locales.contains(locale) ? locale : "zh-CN")/mobile-home"
        let route = normalizeTarget(target, locale: locale, authReturn: true) ?? fallback
        let requestedBase = incoming.queryItems?.first(where: { $0.name == "webBase" })?.value
        let origin = trustedContentOrigin(requestedBase, configuredBase: configuredBase) ??
            trustedContentOrigin(base, configuredBase: configuredBase) ?? webOrigin(configuredBase) ?? "https://www.friemi.com"
        guard var result = URLComponents(string: origin + route) else { return nil }
        var query = result.percentEncodedQuery.map { $0 + "&" } ?? ""
        query += "__friemi_android_auth_return=1&__friemi_ios_auth_ts=\(timestamp)"
        result.percentEncodedQuery = query
        return result.url
    }

    private static func webOrigin(_ value: String) -> String? {
        guard var components = URLComponents(string: value), components.user == nil, components.password == nil,
              let scheme = components.scheme?.lowercased(), ["http", "https"].contains(scheme),
              let host = components.host?.lowercased(), !host.isEmpty
        else { return nil }
        components.scheme = scheme
        components.host = host
        if (scheme == "https" && components.port == 443) || (scheme == "http" && components.port == 80) { components.port = nil }
        components.path = ""
        components.query = nil
        components.fragment = nil
        return components.string
    }

    static func normalizeTarget(_ target: String, locale: String, authReturn: Bool = false) -> String? {
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
        guard segments.count > index else { return nil }
        let handoff = authReturn && segments[index] == "android-auth-return" && segments.count == index + 1
        guard roots.contains(segments[index]) || handoff else { return nil }
        // Keep raw values: URLComponents.queryItems would turn %2B into +,
        // which web form/query parsers interpret as a space in invitation tokens.
        let query = components.percentEncodedQuery?.split(separator: "&").filter {
            let pair = $0.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
            let rawKey = String(pair.first ?? "")
            let key = (rawKey.removingPercentEncoding ?? rawKey).lowercased()
            if key == "code", segments[index] == "game-tools" || handoff { return true }
            if authReturn, pair.count == 2, let value = String(pair[1]).removingPercentEncoding {
                if key == "__friemi_android_auth_retry", value == "1" { return true }
                if key == "redirect_url", normalizeTarget(value, locale: locale) != nil { return true }
            }
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
