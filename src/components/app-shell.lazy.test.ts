import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./app-shell.tsx", import.meta.url),
  "utf8",
);

describe("AppShell code splitting", () => {
  it("does not statically import AddPlace or PlaceDetail", () => {
    expect(source).not.toMatch(/import\s*\{[^}]*AddPlace[^}]*\}\s*from\s*["']\.\/add-place["']/);
    expect(source).not.toMatch(/import\s*\{[^}]*PlaceDetail[^}]*\}\s*from\s*["']\.\/place-detail["']/);
  });

  it("loads AddPlace and PlaceDetail through next/dynamic", () => {
    expect(source).toMatch(/from\s*["']next\/dynamic["']/);
    expect(source).toMatch(/import\(["']\.\/add-place["']\)/);
    expect(source).toMatch(/import\(["']\.\/place-detail["']\)/);
  });
});
