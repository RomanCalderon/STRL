import {
  SHEET_ATTR_SLOT_CLASS,
  SHEET_DIALOG_CLASS,
  SHEET_MAPS_CLASS,
  SHEET_MAPS_SLOT_CLASS,
  SHEET_PHOTO_SLOT_CLASS,
  SHEET_PULSE,
  SHEET_RATING_SLOT_CLASS,
  SHEET_SCRIM_CLASS,
} from "./place-sheet-chrome";

export function PlacePhotoFallback() {
  return (
    <div
      className={`${SHEET_PHOTO_SLOT_CLASS} ${SHEET_PULSE}`}
      role="status"
      aria-label="Loading photo"
    />
  );
}

export function PlaceMapsFallback() {
  return (
    <div className={SHEET_MAPS_SLOT_CLASS}>
      <button
        type="button"
        disabled
        aria-busy="true"
        aria-label="Open in Google Maps"
        className={SHEET_MAPS_CLASS}
      >
        Open in Google Maps
      </button>
    </div>
  );
}

export function PlaceSheetFallback() {
  return (
    <>
      <div className={SHEET_SCRIM_CLASS} />
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading place"
        className={SHEET_DIALOG_CLASS}
      >
        <div className="bop-sheet-enter relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <PlacePhotoFallback />
          <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 pt-3">
            <p className={SHEET_ATTR_SLOT_CLASS} aria-hidden="true">
              &nbsp;
            </p>
            <div className={`mt-2 h-7 w-2/3 rounded ${SHEET_PULSE}`} />
            <p className={SHEET_RATING_SLOT_CLASS} aria-hidden="true">
              &nbsp;
            </p>
            <div className={`mt-1 h-4 w-full rounded ${SHEET_PULSE}`} />
            <PlaceMapsFallback />
            <div className={`mt-4 h-20 w-full rounded-lg ${SHEET_PULSE}`} />
            <div className={`mt-3 h-10 w-full rounded-lg ${SHEET_PULSE}`} />
            <div className={`mt-3 h-10 w-full rounded-lg ${SHEET_PULSE}`} />
          </div>
        </div>
      </div>
    </>
  );
}
