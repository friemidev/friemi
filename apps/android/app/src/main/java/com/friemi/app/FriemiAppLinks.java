package com.friemi.app;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Content-only links. Authentication completion has its own existing handler. */
final class FriemiAppLinks {
    private static final Set<String> LOCALES = new HashSet<>(Arrays.asList("zh-CN", "en", "fr"));
    private static final Set<String> ROOTS = new HashSet<>(Arrays.asList(
        "lobby", "activities", "public-events", "planets", "game-tools", "mobile-home",
        "home", "world", "profile", "users", "friends", "messages", "footprints",
        "notifications", "discover", "search", "referrals", "account", "coupons", "tickets",
        "merchants", "poll", "official-messages", "official-feedback", "top-news", "updates",
        "co-creators", "privacy", "safety"
    ));

    private FriemiAppLinks() {}

    static String resolve(String incoming, String base, String locale) {
        try {
            URI uri = new URI(incoming);
            if (uri.getUserInfo() != null) return null;
            String scheme = uri.getScheme();
            String host = uri.getHost();
            String target;
            if ("friemi".equalsIgnoreCase(scheme)) {
                if (uri.getPort() != -1) return null;
                if ("open".equalsIgnoreCase(host)) {
                    target = queryValue(uri.getRawQuery(), "target");
                } else {
                    String path = "/" + (host == null ? "" : host) + (uri.getRawPath() == null ? "" : uri.getRawPath());
                    if (path.startsWith("/activity/")) path = "/activities/" + path.substring(10);
                    if (path.startsWith("/team/")) path = "/activities/" + path.substring(6);
                    if (path.equals("/hall") || path.equals("/home") || path.equals("/")) path = "/mobile-home";
                    target = path + suffix(uri);
                }
            } else if (isAppWebUri(uri, new URI(base))) {
                target = "/open".equals(uri.getPath()) ? queryValue(uri.getRawQuery(), "target") : uri.getRawPath() + suffix(uri);
            } else {
                return null;
            }
            String normalized = normalizeTarget(target, locale);
            return normalized == null ? null : base.replaceAll("/+$", "") + normalized;
        } catch (Exception ignored) {
            return null;
        }
    }

    static String resolveNotification(String target, String base, String locale) {
        if (target == null) return null;
        if (target.startsWith("/")) {
            String normalized = normalizeTarget(target, locale);
            return normalized == null ? null : base.replaceAll("/+$", "") + normalized;
        }
        return resolve(target, base, locale);
    }

    // Internal windows may carry Clerk state. Only external content handoffs strip it.
    static String resolveWebNavigation(String incoming, String base, String locale) {
        try {
            URI uri = new URI(incoming);
            if (!isAppWebUri(uri, new URI(base))) return null;
            if ("/open".equals(uri.getPath())) return resolve(incoming, base, locale);
            String path = uri.getRawPath();
            if (path == null || path.isEmpty() || path.equals("/")) path = "/mobile-home";
            String root = path.substring(1).split("/", 2)[0];
            if (!LOCALES.contains(root) && !root.equals("api") && !path.contains(".")) {
                path = "/" + (LOCALES.contains(locale) ? locale : "zh-CN") + path;
            }
            return base.replaceAll("/+$", "") + path + suffix(uri);
        } catch (Exception ignored) {
            return null;
        }
    }

    static String normalizeAuthTarget(String target, String base, String locale) {
        try {
            if (target != null && target.startsWith("https://")) {
                URI uri = new URI(target);
                if (!isAppWebUri(uri, new URI(base))) return null;
                target = uri.getRawPath() + suffix(uri);
            }
            return normalizeTarget(target, locale, true);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static boolean isAppWebUri(URI uri, URI base) {
        if (uri.getUserInfo() != null || uri.getHost() == null) return false;
        String scheme = uri.getScheme();
        if (!"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme)) return false;
        if (scheme.equalsIgnoreCase(base.getScheme()) && uri.getHost().equalsIgnoreCase(base.getHost())
            && uri.getPort() == base.getPort()) return true;
        return "https".equalsIgnoreCase(scheme) && (uri.getPort() == -1 || uri.getPort() == 443)
            && (uri.getHost().equalsIgnoreCase("www.friemi.com") || uri.getHost().equalsIgnoreCase("friemi.com"));
    }

    static String normalizeTarget(String target, String locale) {
        return normalizeTarget(target, locale, false);
    }

    private static String normalizeTarget(String target, String locale, boolean authReturn) {
        if (target == null || target.length() > 4096 || !target.startsWith("/") || target.startsWith("//") || unsafe(target)) return null;
        try {
            URI uri = new URI(target);
            String path = uri.getPath();
            if (uri.isAbsolute() || uri.getRawAuthority() != null || path == null || unsafe(path) || path.contains("//") || path.contains("%")) return null;
            // Encoded dot segments must not bypass the route allowlist.
            for (String segment : path.split("/")) if (segment.equals(".") || segment.equals("..")) return null;
            String[] segments = path.substring(1).split("/");
            boolean localized = segments.length > 0 && LOCALES.contains(segments[0]);
            int root = localized ? 1 : 0;
            if (segments.length <= root) return null;
            boolean handoff = authReturn && segments[root].equals("android-auth-return") && segments.length == root + 1;
            if (!ROOTS.contains(segments[root]) && !handoff) return null;
            String query = cleanQuery(uri.getRawQuery(), handoff || segments[root].equals("game-tools"), authReturn, locale);
            return (localized ? "" : "/" + (LOCALES.contains(locale) ? locale : "zh-CN")) + uri.getRawPath()
                + (query.isEmpty() ? "" : "?" + query)
                + (uri.getRawFragment() == null ? "" : "#" + uri.getRawFragment());
        } catch (Exception ignored) {
            return null;
        }
    }

    static String queryValue(String query, String key) {
        if (query == null) return null;
        for (String part : query.split("&")) {
            String[] pair = part.split("=", 2);
            if (decode(pair[0]).equals(key)) return pair.length == 2 ? decode(pair[1]) : "";
        }
        return null;
    }

    static String installTarget(String referrer, long installedAtSeconds, long nowSeconds, String locale) {
        if (installedAtSeconds <= 0 || installedAtSeconds > nowSeconds || nowSeconds - installedAtSeconds > 86400) return null;
        try {
            return normalizeTarget(queryValue(referrer, "friemi_target"), locale);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String cleanQuery(String query, boolean keepCode, boolean authReturn, String locale) {
        if (query == null) return "";
        List<String> kept = new ArrayList<>();
        for (String part : query.split("&")) {
            String[] pair = part.split("=", 2);
            String key = decode(pair[0]);
            if (keepCode && key.equals("code")) { kept.add(part); continue; }
            if (authReturn && pair.length == 2) {
                String value = decode(pair[1]);
                if ((key.equals("__friemi_android_auth_retry") && value.equals("1"))
                    || (key.equals("redirect_url") && normalizeTarget(value, locale) != null)) {
                    kept.add(part);
                    continue;
                }
            }
            if (!key.matches("(?i)^(?:__clerk.*|__friemi_.*|code|state|ticket|token|redirect_url)$") && !key.equals("embedded") && !key.equals("sheet")) kept.add(part);
        }
        return String.join("&", kept);
    }

    private static boolean unsafe(String value) {
        return value.matches("(?s).*[\\\\\\x00-\\x20\\x7f].*");
    }

    private static String suffix(URI uri) {
        return (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery())
            + (uri.getRawFragment() == null ? "" : "#" + uri.getRawFragment());
    }

    private static String decode(String value) {
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8.name());
        } catch (java.io.UnsupportedEncodingException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
