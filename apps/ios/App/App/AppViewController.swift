import Capacitor
import CapacitorKeyboard
import SafariServices
import UIKit
import WebKit

class AppViewController: CAPBridgeViewController {
    private var capacitorUIDelegate: WKUIDelegate?
    private var edgeBackGestures: [UIScreenEdgePanGestureRecognizer] = []
    private let fallbackBaseUrl = "https://www.friemi.com"
    private let fallbackLocale = "zh-CN"
    private let supportedLocales = ["zh-CN", "en", "fr"]

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // Register only if auto-discovery missed it; duplicate loads toggle the accessory override.
        if bridge?.plugin(withName: "Keyboard") == nil {
            bridge?.registerPluginInstance(KeyboardPlugin())
        }
        bridge?.registerPluginInstance(FriemiNavigationPlugin())
        capacitorUIDelegate = webView?.uiDelegate
        webView?.uiDelegate = self
        webView?.allowsBackForwardNavigationGestures = false
        installEdgeBackGestures()
        disableContainerExitGesture()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleFriemiOpenURLNotification(_:)),
            name: .friemiOpenURL,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppWillResignActive),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
        CAPLog.print("Friemi iOS navigation plugin registered v2")
    }

    override func viewDidLoad() {
        installFriemiNavigationGuard()
        super.viewDidLoad()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        disableContainerExitGesture()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        disableContainerExitGesture()
        consumePendingFriemiOpenURL()
    }

    override func didMove(toParent parent: UIViewController?) {
        super.didMove(toParent: parent)
        disableContainerExitGesture()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func handleFriemiOpenURLNotification(_ notification: Notification) {
        guard let url = notification.object as? URL else {
            consumePendingFriemiOpenURL()
            return
        }

        guard webView != nil else {
            return
        }

        UserDefaults.standard.removeObject(forKey: friemiPendingOpenURLKey)
        openFriemiURL(url)
    }

    @objc private func handleAppDidBecomeActive() {
        dispatchWebLifecycleEvent("friemi:ios-resume")
        dispatchWebLifecycleEvent("friemi:app-foreground")
        consumePendingFriemiOpenURL()
    }

    @objc private func handleAppWillResignActive() {
        dispatchWebLifecycleEvent("friemi:app-background")
    }

    private func dispatchWebLifecycleEvent(_ eventName: String) {
        let script = "window.dispatchEvent(new CustomEvent('\(eventName)'))"

        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(script, completionHandler: nil)
        }
    }

    private func consumePendingFriemiOpenURL() {
        guard webView != nil,
              let rawUrl = UserDefaults.standard.string(forKey: friemiPendingOpenURLKey),
              let url = URL(string: rawUrl)
        else {
            return
        }

        UserDefaults.standard.removeObject(forKey: friemiPendingOpenURLKey)
        openFriemiURL(url)
    }

    private func openFriemiURL(_ url: URL) {
        guard let targetUrl = buildWebUrlFromFriemiURL(url) else {
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            if let browser = self.presentedViewController as? SFSafariViewController {
                browser.dismiss(animated: true) { [weak self] in
                    self?.webView?.load(URLRequest(url: targetUrl))
                }
            } else {
                self.webView?.load(URLRequest(url: targetUrl))
            }
        }
    }

    private func buildWebUrlFromFriemiURL(_ url: URL) -> URL? {
        if url.scheme?.lowercased() == "friemi", url.host?.lowercased() == "auth-complete" {
            return buildWebUrlFromAuthCompleteURL(url)
        }
        return FriemiAppLinks.resolve(url, base: getCurrentBaseUrl(), locale: getCurrentLocale())
    }

    private func buildWebUrlFromAuthCompleteURL(_ url: URL) -> URL? {
        FriemiAppLinks.resolveAuthComplete(
            url, base: getCurrentBaseUrl(), configuredBase: getConfiguredBaseUrl(),
            locale: getCurrentLocale(), timestamp: String(Int(Date().timeIntervalSince1970 * 1000))
        )
    }

    private func getLocaleFromPath(_ path: String) -> String? {
        let firstSegment = path.split(separator: "/").first.map(String.init)
        return supportedLocales.first(where: { $0 == firstSegment })
    }

    private func getCurrentLocale() -> String {
        return getLocaleFromPath(webView?.url?.path ?? "") ??
            getLocaleFromPath(bridge?.config.serverURL.path ?? "") ?? fallbackLocale
    }

    private func getConfiguredBaseUrl() -> String {
        bridge?.config.serverURL.absoluteString ?? fallbackBaseUrl
    }

    private func getCurrentBaseUrl() -> String {
        let configured = getConfiguredBaseUrl()
        return FriemiAppLinks.trustedContentOrigin(webView?.url?.absoluteString, configuredBase: configured) ??
            FriemiAppLinks.trustedContentOrigin(configured, configuredBase: configured) ?? fallbackBaseUrl
    }

    private func installEdgeBackGestures() {
        guard edgeBackGestures.isEmpty else {
            return
        }

        let leftEdgeGesture = makeEdgeBackGesture(edges: .left)
        let rightEdgeGesture = makeEdgeBackGesture(edges: .right)
        edgeBackGestures = [leftEdgeGesture, rightEdgeGesture]

        view.addGestureRecognizer(leftEdgeGesture)
        view.addGestureRecognizer(rightEdgeGesture)
    }

    private func makeEdgeBackGesture(edges: UIRectEdge) -> UIScreenEdgePanGestureRecognizer {
        let gesture = UIScreenEdgePanGestureRecognizer(
            target: self,
            action: #selector(handleEdgeBackGesture(_:))
        )
        gesture.edges = edges
        gesture.maximumNumberOfTouches = 1
        gesture.cancelsTouchesInView = true
        gesture.delegate = self
        return gesture
    }

    private func disableContainerExitGesture() {
        navigationController?.interactivePopGestureRecognizer?.isEnabled = false
    }

    @objc private func handleEdgeBackGesture(_ gesture: UIScreenEdgePanGestureRecognizer) {
        guard gesture.state == .ended else {
            return
        }

        let translation = gesture.translation(in: view)
        let velocity = gesture.velocity(in: view)
        let expectedDirection = gesture.edges.contains(.left)
            ? translation.x > 0
            : translation.x < 0
        let minimumDistance = min(max(view.bounds.width * 0.16, 48), 72)
        let completedSwipe = abs(translation.x) >= minimumDistance || abs(velocity.x) >= 500

        guard expectedDirection, completedSwipe,
              let webView,
              let destination = previousFriemiHistoryItem(in: webView)
        else {
            return
        }

        webView.go(to: destination)
    }

    private func previousFriemiHistoryItem(in webView: WKWebView) -> WKBackForwardListItem? {
        guard let currentHost = webView.url?.host?.lowercased() else {
            return nil
        }

        return webView.backForwardList.backList.reversed().first { item in
            guard let candidateHost = item.url.host?.lowercased(),
                  item.url.scheme == "https" || item.url.scheme == "http"
            else {
                return false
            }

            return isSameFriemiAppOrigin(candidateHost, currentHost)
        }
    }

    private func isSameFriemiAppOrigin(_ candidateHost: String, _ currentHost: String) -> Bool {
        if candidateHost == currentHost {
            return true
        }

        return isFriemiProductionHost(candidateHost) && isFriemiProductionHost(currentHost)
    }

    private func isFriemiProductionHost(_ host: String) -> Bool {
        host == "friemi.com" || host == "www.friemi.com" || host.hasSuffix(".friemi.com")
    }

    private func installFriemiNavigationGuard() {
        let configured = (try? JSONSerialization.data(withJSONObject: [getConfiguredBaseUrl()]))
            .flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
        let source = """
        (() => {
          if (window.__friemiIOSNavigationGuard) {
            return;
          }

          window.__friemiIOSNavigationGuard = true;
          const configuredOrigin = new URL((\(configured))[0] || 'https://www.friemi.com').origin;

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

          const shouldKeepInApp = (hostname) =>
            isFriemiHost(hostname) ||
            isClerkHost(hostname) ||
            isAppleAuthHost(hostname);

          const shouldStayInWebView = (value) => {
            try {
              const url = new URL(String(value), window.location.href);
              const allowed = !url.username && !url.password && (url.origin === configuredOrigin ||
                (url.protocol === "https:" && !url.port && shouldKeepInApp(url.hostname)));
              return allowed
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

}

extension AppViewController: UIGestureRecognizerDelegate {
    func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        guard let edgeGesture = gestureRecognizer as? UIScreenEdgePanGestureRecognizer,
              edgeBackGestures.contains(where: { $0 === edgeGesture }),
              let webView,
              previousFriemiHistoryItem(in: webView) != nil
        else {
            return false
        }

        let velocity = edgeGesture.velocity(in: view)
        guard abs(velocity.x) > abs(velocity.y) else {
            return false
        }

        return edgeGesture.edges.contains(.left) ? velocity.x > 0 : velocity.x < 0
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

        if FriemiAppLinks.isAllowedWebNavigation(url, configuredBase: getConfiguredBaseUrl()) {
            CAPLog.print("Friemi iOS popup kept in WebView")
            webView.load(URLRequest(url: url))
        } else if UIApplication.shared.applicationState == .active {
            CAPLog.print("Friemi iOS popup opened externally")
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
