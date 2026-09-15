import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OverlayFallback } from "./overlay-fallback";

describe("OverlayFallback", () => {
  it("keeps skeletons inside a fixed overlay", () => {
    render(<OverlayFallback />);
    const status = screen.getByRole("status", { name: "Loading overlay" });
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status.className).toMatch(/fixed/);
    expect(status.className).not.toMatch(/min-h-dvh/);
    expect(screen.queryByRole("status", { name: "Loading places" })).toBeNull();
  });
});
