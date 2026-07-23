import Capacitor
import UIKit
import WebKit

class AppViewController: CAPBridgeViewController {
    private var capacitorUIDelegate: WKUIDelegate?
    private let fallbackBaseUrl = "https://www.friemi.com"
    private let fallbackLocale = "zh-CN"
    private let supportedLocales = ["zh-CN", "en", "fr"]

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(FriemiNavigationPlugin())
        capacitorUIDelegate = webView?.uiDelegate
        webView?.uiDelegate = self
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAuthCompleteNotification(_:)),
            name: .friemiAuthCompleteURL,
            object: nil
        )
        CAPLog.print("Friemi iOS navigation plugin registered v2")
    }

    override func viewDidLoad() {
        installFriemiNavigationGuard()
        super.viewDidLoad()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        consumePendingAuthCompleteURL()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func handleAuthCompleteNotification(_ notification: Notification) {
        guard let url = notification.object as? URL else {
            consumePendingAuthCompleteURL()
            return
        }

        openAuthCompleteURL(url)
    }

    private func consumePendingAuthCompleteURL() {
        guard let rawUrl = UserDefaults.standard.string(forKey: friemiPendingAuthCompleteURLKey),
              let url = URL(string: rawUrl)
        else {
            return
        }

        UserDefaults.standard.removeObject(forKey: friemiPendingAuthCompleteURLKey)
        openAuthCompleteURL(url)
    }

    private func openAuthCompleteURL(_ url: URL) {
        guard let targetUrl = buildWebUrlFromAuthCompleteURL(url) else {
            return
        }

        DispatchQueue.main.async { [weak self] in
            self?.webView?.load(URLRequest(url: targetUrl))
        }
    }

    private func buildWebUrlFromAuthCompleteURL(_ url: URL) -> URL? {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let target = components.queryItems?.first(where: { $0.name == "target" })?.value
        else {
            return nil
        }

        let route = normalizeAuthCompleteTarget(target)
        let webBaseUrl = getTrustedWebBase(from: components) ?? getCurrentBaseUrl()
        guard var webComponents = URLComponents(string: "\(webBaseUrl)\(route)") else {
            return nil
        }

        var queryItems = webComponents.queryItems ?? []
        queryItems.append(URLQueryItem(name: "__friemi_android_auth_return", value: "1"))
        queryItems.append(
            URLQueryItem(name: "__friemi_ios_auth_ts", value: String(Int(Date().timeIntervalSince1970 * 1000)))
        )
        webComponents.queryItems = queryItems

        return webComponents.url
    }

    private func getTrustedWebBase(from components: URLComponents) -> String? {
        guard let rawWebBase = components.queryItems?.first(where: { $0.name == "webBase" })?.value,
              let webBaseComponents = URLComponents(string: rawWebBase),
              let scheme = webBaseComponents.scheme,
              let host = webBaseComponents.host,
              (scheme == "https" || scheme == "http"),
              shouldKeepInApp(host)
        else {
            return nil
        }

        var originComponents = URLComponents()
        originComponents.scheme = scheme
        originComponents.host = host
        originComponents.port = webBaseComponents.port

        return originComponents.url?.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    private func normalizeAuthCompleteTarget(_ target: String) -> String {
        let trimmedTarget = target.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmedTarget.isEmpty,
              !trimmedTarget.lowercased().hasPrefix("http://"),
              !trimmedTarget.lowercased().hasPrefix("https://"),
              !trimmedTarget.hasPrefix("//")
        else {
            return "/\(getCurrentLocale())/mobile-home"
        }

        var route = trimmedTarget.hasPrefix("/") ? trimmedTarget : "/\(trimmedTarget)"
        let path = route.split(separator: "?", maxSplits: 1).first.map(String.init) ?? route

        if isAuthPath(path) {
            return "/\(getCurrentLocale())/mobile-home"
        }

        if getLocaleFromPath(path) == nil {
            route = "/\(getCurrentLocale())\(route)"
        }

        return route
    }

    private func isAuthPath(_ path: String) -> Bool {
        let segments = path.split(separator: "/").map(String.init)
        let pathWithoutLocale = supportedLocales.contains(segments.first ?? "")
            ? "/" + segments.dropFirst().joined(separator: "/")
            : path

        return pathWithoutLocale == "/sign-in" ||
            pathWithoutLocale.hasPrefix("/sign-in/") ||
            pathWithoutLocale == "/sign-up" ||
            pathWithoutLocale.hasPrefix("/sign-up/")
    }

    private func getLocaleFromPath(_ path: String) -> String? {
        let firstSegment = path.split(separator: "/").first.map(String.init)
        return supportedLocales.first(where: { $0 == firstSegment })
    }

    private func getCurrentLocale() -> String {
        guard let url = webView?.url else {
            return fallbackLocale
        }

        return getLocaleFromPath(url.path) ?? fallbackLocale
    }

    private func getCurrentBaseUrl() -> String {
        guard let url = webView?.url,
              let scheme = url.scheme,
              let host = url.host,
              (scheme == "https" || scheme == "http"),
              shouldKeepInApp(host)
        else {
            return fallbackBaseUrl
        }

        var components = URLComponents()
        components.scheme = scheme
        components.host = host
        components.port = url.port

        return components.url?.absoluteString.trimmingCharacters(in: CharacterSet(charactersIn: "/")) ?? fallbackBaseUrl
    }

    private func installFriemiNavigationGuard() {
        let source = """
        (() => {
          if (window.__friemiIOSNavigationGuard) {
            return;
          }

          window.__friemiIOSNavigationGuard = true;

          const isFriemiHost = (hostname) =>
            hostname === "friemi.com" ||
            hostname === "www.friemi.com" ||
            hostname.endsWith(".friemi.com");

          const isClerkHost = (hostname) =>
            hostname === "clerk.com" ||
            hostname.endsWith(".clerk.com") ||
            hostname === "accounts.dev" ||
            hostname.endsWith(".accounts.dev") ||
            hostname === "clerk.shared.lcl.dev";

          const isAppleAuthHost = (hostname) =>
            hostname === "appleid.apple.com" ||
            hostname.endsWith(".appleid.apple.com") ||
            hostname === "idmsa.apple.com" ||
            hostname.endsWith(".idmsa.apple.com");

          const isLocalHost = (hostname) =>
            hostname === "localhost" ||
            hostname === "127.0.0.1";

          const isPrivateIPv4Host = (hostname) =>
            /^10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$/.test(hostname) ||
            /^192\\.168\\.\\d{1,3}\\.\\d{1,3}$/.test(hostname) ||
            /^172\\.(1[6-9]|2\\d|3[0-1])\\.\\d{1,3}\\.\\d{1,3}$/.test(hostname);

          const isPreviewHost = (hostname) =>
            hostname.endsWith(".vercel.app");

          const shouldKeepInApp = (hostname) =>
            isFriemiHost(hostname) ||
            isClerkHost(hostname) ||
            isAppleAuthHost(hostname) ||
            isLocalHost(hostname) ||
            isPrivateIPv4Host(hostname) ||
            isPreviewHost(hostname);

          const shouldStayInWebView = (value) => {
            try {
              const url = new URL(String(value), window.location.href);
              const isAllowedProtocol =
                url.protocol === "https:" ||
                (url.protocol === "http:" &&
                  (isLocalHost(url.hostname) || isPrivateIPv4Host(url.hostname)));

              return isAllowedProtocol && shouldKeepInApp(url.hostname)
                ? url.toString()
                : null;
            } catch (_) {
              return null;
            }
          };

          const nativeOpen = window.open;
          window.open = function friemiOpen(url, target, features) {
            const nextUrl = url ? shouldStayInWebView(url) : null;

            if (nextUrl) {
              window.location.assign(nextUrl);
              return null;
            }

            return nativeOpen.call(window, url, target, features);
          };

          document.addEventListener(
            "click",
            (event) => {
              const target = event.target;
              const anchor =
                target && target.closest ? target.closest("a") : null;

              if (!anchor || anchor.target !== "_blank") {
                return;
              }

              const nextUrl = shouldStayInWebView(anchor.href);

              if (!nextUrl) {
                return;
              }

              event.preventDefault();
              window.location.assign(nextUrl);
            },
            true
          );
        })();
        """
        let script = WKUserScript(
            source: source,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        webView?.configuration.userContentController.addUserScript(script)
    }

    private func shouldKeepInApp(_ host: String?) -> Bool {
        guard let normalizedHost = host?.lowercased() else {
            return false
        }

        return normalizedHost == "friemi.com" ||
            normalizedHost == "www.friemi.com" ||
            normalizedHost.hasSuffix(".friemi.com") ||
            normalizedHost == "clerk.com" ||
            normalizedHost.hasSuffix(".clerk.com") ||
            normalizedHost == "accounts.dev" ||
            normalizedHost.hasSuffix(".accounts.dev") ||
            normalizedHost == "clerk.shared.lcl.dev" ||
            normalizedHost == "appleid.apple.com" ||
            normalizedHost.hasSuffix(".appleid.apple.com") ||
            normalizedHost == "idmsa.apple.com" ||
            normalizedHost.hasSuffix(".idmsa.apple.com") ||
            normalizedHost == "localhost" ||
            normalizedHost == "127.0.0.1" ||
            isPrivateIPv4Host(normalizedHost) ||
            normalizedHost.hasSuffix(".vercel.app")
    }

    private func isPrivateIPv4Host(_ host: String) -> Bool {
        let parts = host.split(separator: ".")

        guard parts.count == 4,
              let first = Int(parts[0]),
              let second = Int(parts[1]),
              parts.dropFirst(2).allSatisfy({ Int($0) != nil })
        else {
            return false
        }

        return first == 10 ||
            (first == 172 && (16...31).contains(second)) ||
            (first == 192 && second == 168)
    }
}

extension AppViewController: WKUIDelegate {
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        guard let url = navigationAction.request.url else {
            return nil
        }

        if shouldKeepInApp(url.host) {
            CAPLog.print("Friemi iOS popup kept in WebView: \(url.absoluteString)")
            webView.load(URLRequest(url: url))
        } else if UIApplication.shared.applicationState == .active {
            CAPLog.print("Friemi iOS popup opened externally: \(url.absoluteString)")
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }

        return nil
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        capacitorUIDelegate?.webView?(
            webView,
            runJavaScriptAlertPanelWithMessage: message,
            initiatedByFrame: frame,
            completionHandler: completionHandler
        ) ?? completionHandler()
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        capacitorUIDelegate?.webView?(
            webView,
            runJavaScriptConfirmPanelWithMessage: message,
            initiatedByFrame: frame,
            completionHandler: completionHandler
        ) ?? completionHandler(false)
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptTextInputPanelWithPrompt prompt: String,
        defaultText: String?,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (String?) -> Void
    ) {
        capacitorUIDelegate?.webView?(
            webView,
            runJavaScriptTextInputPanelWithPrompt: prompt,
            defaultText: defaultText,
            initiatedByFrame: frame,
            completionHandler: completionHandler
        ) ?? completionHandler(defaultText)
    }
}
