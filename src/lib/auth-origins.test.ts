import { describe, expect, it } from "vitest";
import { authTrustedOrigins, AUTH_ALLOWED_HOSTS } from "./auth-origins";

describe("authTrustedOrigins", () => {
  it("trusts localhost and Vercel preview hosts", () => {
    const origins = authTrustedOrigins();
    expect(origins).toContain("http://localhost:3000");
    expect(origins).toContain("https://*.vercel.app");
  });

  it("includes the BETTER_AUTH_URL origin when it is a valid URL", () => {
    expect(authTrustedOrigins("https://strl-maps.vercel.app/api/auth")).toContain(
      "https://strl-maps.vercel.app",
    );
  });

  it("ignores an invalid BETTER_AUTH_URL", () => {
    expect(authTrustedOrigins("not-a-url")).toEqual([
      "http://localhost:3000",
      "https://*.vercel.app",
    ]);
  });
});

describe("AUTH_ALLOWED_HOSTS", () => {
  it("allows Vercel preview hosts so OAuth callbacks stay on the current deploy", () => {
    expect(AUTH_ALLOWED_HOSTS).toContain("*.vercel.app");
    expect(AUTH_ALLOWED_HOSTS).toContain("localhost:3000");
  });
});
