import sharp from "sharp";
import { PHOTO_WEBP_QUALITY, type PhotoSize } from "./photo-url";

const RASTER = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

export async function transcodePhoto(
  bytes: Uint8Array,
  contentType: string,
  size: PhotoSize,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!RASTER.has(normalized)) {
    return { bytes, contentType };
  }
  try {
    const out = await sharp(bytes)
      .rotate()
      .webp({ quality: PHOTO_WEBP_QUALITY[size] })
      .toBuffer();
    return { bytes: new Uint8Array(out), contentType: "image/webp" };
  } catch {
    return { bytes, contentType };
  }
}
