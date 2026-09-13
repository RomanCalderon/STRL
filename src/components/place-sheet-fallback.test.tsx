import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlaceSheetFallback } from "./place-sheet-fallback";

describe("PlaceSheetFallback", () => {
  it("reserves the place sheet frame instead of a centered overlay", () => {
    render(<PlaceSheetFallback />);
    const status = screen.getByRole("status", { name: "Loading place" });
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveClass("h-[88dvh]");
    expect(status.className).not.toMatch(/min-h-dvh/);
    expect(screen.getByRole("status", { name: "Loading photo" })).toBeInTheDocument();
    const maps = screen.getByRole("button", { name: "Open in Google Maps" });
    expect(maps).toHaveAttribute("aria-busy", "true");
    expect(maps).toHaveClass("w-full");
  });
});
