export const AUTH_ALLOWED_HOSTS = ["*.vercel.app", "localhost:3000"] as const;

const DEFAULT_TRUSTED_ORIGINS = [
  "http://localhost:3000",
  "https://*.vercel.app",
] as const;

export function authTrustedOrigins(betterAuthUrl?: string): string[] {
  const origins = new Set<string>(DEFAULT_TRUSTED_ORIGINS);
  if (betterAuthUrl) {
    try {
      origins.add(new URL(betterAuthUrl).origin);
    } catch {
      // Invalid BETTER_AUTH_URL is ignored; defaults still apply.
    }
  }
  return [...origins];
}
