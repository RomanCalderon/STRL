"use client";

import { useEffect, type ReactNode } from "react";
import { SHEET_DIALOG_CLASS, SHEET_SCRIM_CLASS } from "./place-sheet-chrome";

export function PlaceSheetFrame({
  titleId,
  label,
  onDismiss,
  children,
}: {
  titleId?: string;
  label?: string;
  onDismiss?: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!onDismiss) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <>
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss"
          className={SHEET_SCRIM_CLASS}
          onClick={onDismiss}
        />
      ) : (
        <div className={SHEET_SCRIM_CLASS} />
      )}
      <div
        role={titleId ? "dialog" : "status"}
        aria-modal={titleId ? "true" : undefined}
        aria-labelledby={titleId}
        aria-label={label ?? (titleId ? undefined : "Loading place")}
        aria-live={titleId ? undefined : "polite"}
        aria-busy={titleId ? undefined : "true"}
        className={SHEET_DIALOG_CLASS}
      >
        {children}
      </div>
    </>
  );
}
