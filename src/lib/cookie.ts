export const TOKEN_COOKIE_NAME = "access_token";
export const ROLE_COOKIE_NAME = "user_role";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 h — mirrors backend JWT expiry
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function buildCookieString(name: string, value: string, maxAge: number): string {
  const parts = [
    `${name}=${value}`,
    "path=/",
    `max-age=${maxAge}`,
    "SameSite=Lax",
  ];
  if (IS_PRODUCTION) parts.push("Secure");
  return parts.join("; ");
}

export function setAuthCookie(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = buildCookieString(TOKEN_COOKIE_NAME, token, COOKIE_MAX_AGE);
}

export function clearAuthCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = buildCookieString(TOKEN_COOKIE_NAME, "", 0);
}

export function setRoleCookie(role: string): void {
  if (typeof document === "undefined") return;
  document.cookie = buildCookieString(ROLE_COOKIE_NAME, role, COOKIE_MAX_AGE);
}

export function clearRoleCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = buildCookieString(ROLE_COOKIE_NAME, "", 0);
}
