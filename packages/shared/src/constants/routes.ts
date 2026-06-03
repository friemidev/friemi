export const routes = {
  home: "/",
  activities: "/activities",
  lobby: "/lobby",
  newActivity: "/activities/new",
  profile: "/profile",
  signIn: "/sign-in",
  signUp: "/sign-up",
} as const;

export const defaultLocale = "zh-CN";
export const locales = ["zh-CN", "en", "fr"] as const;
