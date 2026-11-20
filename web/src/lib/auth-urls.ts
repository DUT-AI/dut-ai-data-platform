// URLs for the DUT AI SSO flow. Values are inlined at build time.

export const BASE_PATH = process.env.APP_BASE_PATH ?? "";

export const LOCAL_LOGIN_ENABLED =
  process.env.NEXT_PUBLIC_LOCAL_LOGIN_ENABLED === "true";

export const LOCAL_LOGIN_PATH = `${BASE_PATH}/login`;

export const SSO_LOGIN_URL =
  process.env.NEXT_PUBLIC_SSO_LOGIN_URL || LOCAL_LOGIN_PATH;

export const SSO_LOGOUT_REDIRECT_URL =
  process.env.NEXT_PUBLIC_SSO_LOGOUT_REDIRECT || SSO_LOGIN_URL;

// Prefix an app-absolute path ("/x") with the basePath. Leave URLs and prefixed paths alone.
export function withBasePath(path: string): string {
  if (
    !BASE_PATH ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path === BASE_PATH ||
    path.startsWith(`${BASE_PATH}/`)
  ) {
    return path;
  }
  return `${BASE_PATH}${path}`;
}

// Full-page navigation to the SSO login. No-op when already there (prevents loops).
export function redirectToSsoLogin(): void {
  if (typeof window === "undefined") {
    return;
  }
  const target = new URL(SSO_LOGIN_URL, window.location.origin);
  if (
    target.origin === window.location.origin &&
    target.pathname === window.location.pathname
  ) {
    return;
  }
  window.location.assign(target.toString());
}
