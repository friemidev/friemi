"use client";

import { registerPlugin } from "@capacitor/core";

type NativeGoogleSignInResult = {
  accessToken?: string;
  email?: string;
  firstName?: string;
  idToken: string;
  lastName?: string;
  name?: string;
};

type NativeAppleSignInResult = {
  authorizationCode?: string;
  email?: string;
  firstName?: string;
  identityToken: string;
  lastName?: string;
  userIdentifier?: string;
};

export const FriemiNavigation = registerPlugin<{
  signInWithApple: () => Promise<NativeAppleSignInResult>;
  signInWithGoogle: () => Promise<NativeGoogleSignInResult>;
  saveImageToPhotos: (options: { url: string }) => Promise<void>;
  getExternalBrowserSupport: () => Promise<{ supported: boolean }>;
  openHostLink: (options: { url: string }) => Promise<void>;
}>("FriemiNavigation");
