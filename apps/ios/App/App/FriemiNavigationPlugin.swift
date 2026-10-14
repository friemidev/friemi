import AuthenticationServices
import Capacitor
import GoogleSignIn
import Photos
import SafariServices
import UIKit
import WebKit

@objc(FriemiNavigationPlugin)
class FriemiNavigationPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding, SFSafariViewControllerDelegate {
    private let googleClientId = "114440097515-l4nse3gdjm6s12n5vu78a22gmch41560.apps.googleusercontent.com"
    private var appleSignInCall: CAPPluginCall?

    let identifier = "FriemiNavigationPlugin"
    let jsName = "FriemiNavigation"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signInWithGoogle", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signInWithApple", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveImageToPhotos", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getExternalBrowserSupport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openHostLink", returnType: CAPPluginReturnPromise),
    ]

    override func load() {
        CAPLog.print("Friemi iOS navigation plugin loaded")
    }

    @objc func getExternalBrowserSupport(_ call: CAPPluginCall) {
        call.resolve(["supported": true])
    }

    @objc func openHostLink(_ call: CAPPluginCall) {
        guard let value = call.getString("url"),
              let url = URL(string: value),
              url.scheme?.lowercased() == "https",
              url.host?.isEmpty == false,
              url.user == nil,
              url.password == nil
        else {
            call.reject("Invalid host link.")
            return
        }

        DispatchQueue.main.async {
            guard UIApplication.shared.applicationState == .active,
                  let presenter = self.bridge?.viewController,
                  presenter.view.window != nil,
                  presenter.presentedViewController == nil
            else {
                call.reject("The browser cannot be presented right now.")
                return
            }
            let browser = SFSafariViewController(url: url)
            browser.delegate = self
            browser.dismissButtonStyle = .close
            browser.preferredControlTintColor = UIColor(red: 21 / 255, green: 98 / 255, blue: 64 / 255, alpha: 1)
            browser.modalPresentationStyle = .pageSheet
            presenter.present(browser, animated: true) {
                call.resolve()
            }
        }
    }

    func safariViewControllerDidFinish(_ controller: SFSafariViewController) {
        controller.dismiss(animated: true)
    }

    @objc func signInWithGoogle(_ call: CAPPluginCall) {
        guard let presentingViewController = bridge?.viewController else {
            call.reject("Unable to present Google sign-in.")
            return
        }

        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: googleClientId)

        DispatchQueue.main.async {
            GIDSignIn.sharedInstance.signIn(withPresenting: presentingViewController) { result, error in
                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }

                guard let user = result?.user,
                      let idToken = user.idToken?.tokenString
                else {
                    call.reject("Google sign-in did not return an ID token.")
                    return
                }

                call.resolve([
                    "idToken": idToken,
                    "accessToken": user.accessToken.tokenString,
                    "email": user.profile?.email ?? "",
                    "name": user.profile?.name ?? "",
                    "firstName": user.profile?.givenName ?? "",
                    "lastName": user.profile?.familyName ?? "",
                ])
            }
        }
    }

    @objc func signInWithApple(_ call: CAPPluginCall) {
        appleSignInCall = call

        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performRequests()
    }

    @objc func saveImageToPhotos(_ call: CAPPluginCall) {
        guard let urlValue = call.getString("url"),
              let url = URL(string: urlValue),
              url.scheme == "https" || url.scheme == "http"
        else {
            call.reject("Invalid image URL.")
            return
        }

        URLSession.shared.dataTask(with: url) { data, response, error in
            guard error == nil,
                  let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode),
                  let data,
                  !data.isEmpty
            else {
                call.reject("Unable to download the image.")
                return
            }

            PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
                guard status == .authorized || status == .limited else {
                    call.reject("Photo library access was not granted.")
                    return
                }

                PHPhotoLibrary.shared().performChanges({
                    let request = PHAssetCreationRequest.forAsset()
                    request.addResource(with: .photo, data: data, options: nil)
                }) { success, saveError in
                    if success {
                        call.resolve()
                    } else {
                        call.reject(
                            saveError?.localizedDescription ?? "Unable to save the image."
                        )
                    }
                }
            }
        }.resume()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = appleSignInCall else {
            return
        }
        appleSignInCall = nil

        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let identityTokenData = credential.identityToken,
              let identityToken = String(data: identityTokenData, encoding: .utf8)
        else {
            call.reject("Apple sign-in did not return an identity token.")
            return
        }

        let authorizationCode = credential.authorizationCode.flatMap { String(data: $0, encoding: .utf8) } ?? ""

        call.resolve([
            "identityToken": identityToken,
            "authorizationCode": authorizationCode,
            "email": credential.email ?? "",
            "firstName": credential.fullName?.givenName ?? "",
            "lastName": credential.fullName?.familyName ?? "",
            "userIdentifier": credential.user,
        ])
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        appleSignInCall?.reject(error.localizedDescription)
        appleSignInCall = nil
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        if let window = bridge?.viewController?.view.window {
            return window
        }

        for scene in UIApplication.shared.connectedScenes {
            if let windowScene = scene as? UIWindowScene,
               let window = windowScene.windows.first(where: { $0.isKeyWindow }) {
                return window
            }
        }

        return ASPresentationAnchor()
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

        if UIApplication.shared.applicationState == .active {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
        CAPLog.print("Friemi iOS navigation opened externally: \(url.absoluteString), type: \(navigationType)")
        return true
    }

    private func shouldKeepInWebView(_ host: String?) -> Bool {
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
