import Capacitor
import UIKit
import WebKit

class AppViewController: CAPBridgeViewController {
    private var capacitorUIDelegate: WKUIDelegate?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(FriemiNavigationPlugin())
        capacitorUIDelegate = webView?.uiDelegate
        webView?.uiDelegate = self
        CAPLog.print("Friemi iOS navigation plugin registered v2")
    }

    override func viewDidLoad() {
        installFriemiNavigationGuard()
        super.viewDidLoad()
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
