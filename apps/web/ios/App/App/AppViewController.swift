import Capacitor
import UIKit
import WebKit

class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(FriemiNavigationPlugin())
        CAPLog.print("Friemi iOS navigation plugin registered")
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

          const shouldStayInWebView = (value) => {
            try {
              const url = new URL(String(value), window.location.href);
              return url.protocol === "https:" && isFriemiHost(url.hostname)
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
