import Capacitor
import WebKit

@objc(FriemiNavigationPlugin)
class FriemiNavigationPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "FriemiNavigationPlugin"
    let jsName = "FriemiNavigation"
    let pluginMethods: [CAPPluginMethod] = []

    override func load() {
        CAPLog.print("Friemi iOS navigation plugin loaded")
    }

    override func shouldOverrideLoad(_ navigationAction: WKNavigationAction) -> NSNumber? {
        guard let url = navigationAction.request.url else {
            return nil
        }

        let isTopLevelNavigation = navigationAction.targetFrame == nil ||
            navigationAction.targetFrame?.isMainFrame == true
        let navigationType = navigationAction.navigationType.rawValue

        guard isTopLevelNavigation else {
            return nil
        }

        guard url.scheme == "http" || url.scheme == "https" else {
            CAPLog.print("Friemi iOS navigation allowed non-web URL: \(url.absoluteString)")
            return nil
        }

        if shouldKeepInWebView(url.host) {
            CAPLog.print("Friemi iOS navigation allowed in WebView: \(url.absoluteString), type: \(navigationType)")
            return false
        }

        CAPLog.print("Friemi iOS navigation blocked external handoff: \(url.absoluteString), type: \(navigationType)")
        return true
    }

    private func shouldKeepInWebView(_ host: String?) -> Bool {
        guard let normalizedHost = host?.lowercased() else {
            return false
        }

        return normalizedHost == "friemi.com" ||
            normalizedHost == "www.friemi.com" ||
            normalizedHost.hasSuffix(".friemi.com") ||
            normalizedHost == "clerk.accounts.dev" ||
            normalizedHost.hasSuffix(".clerk.accounts.dev")
    }
}
