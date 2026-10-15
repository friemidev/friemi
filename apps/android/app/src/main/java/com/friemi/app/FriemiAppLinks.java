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
            if (uri.getUserInfo() != null || uri.getPort() != -1) return null;
            String scheme = uri.getScheme();
            String host = uri.getHost();
            String target;
            if ("friemi".equalsIgnoreCase(scheme)) {
                if ("open".equalsIgnoreCase(host)) {
                    target = queryValue(uri.getRawQuery(), "target");
                } else {
                    String path = "/" + (host == null ? "" : host) + (uri.getRawPath() == null ? "" : uri.getRawPath());
                    if (path.startsWith("/activity/")) path = "/activities/" + path.substring(10);
                    if (path.startsWith("/team/")) path = "/activities/" + path.substring(6);
                    if (path.equals("/hall") || path.equals("/home") || path.equals("/")) path = "/mobile-home";
                    target = path + suffix(uri);
                }
            } else if ("https".equalsIgnoreCase(scheme) && host != null && (
                host.equalsIgnoreCase("www.friemi.com") || host.equalsIgnoreCase("friemi.com") ||
                host.equalsIgnoreCase(new URI(base).getHost())
            )) {
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

    static String normalizeTarget(String target, String locale) {
        if (target == null || target.length() > 4096 || !target.startsWith("/") || target.startsWith("//") || unsafe(target)) return null;
        try {
            URI uri = new URI(target).normalize();
            String path = uri.getPath();
            if (uri.isAbsolute() || uri.getRawAuthority() != null || path == null || unsafe(path) || path.contains("//") || path.contains("%")) return null;
            // Encoded dot segments must not bypass the route allowlist.
            for (String segment : path.split("/")) if (segment.equals(".") || segment.equals("..")) return null;
            String[] segments = path.substring(1).split("/");
            boolean localized = segments.length > 0 && LOCALES.contains(segments[0]);
            int root = localized ? 1 : 0;
            if (segments.length <= root || !ROOTS.contains(segments[root])) return null;
            String query = cleanQuery(uri.getRawQuery(), segments[root].equals("game-tools"));
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

    private static String cleanQuery(String query, boolean gameInvite) {
        if (query == null) return "";
        List<String> kept = new ArrayList<>();
        for (String part : query.split("&")) {
            String key = decode(part.split("=", 2)[0]);
            if (gameInvite && key.equals("code")) { kept.add(part); continue; }
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
