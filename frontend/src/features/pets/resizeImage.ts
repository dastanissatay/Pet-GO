export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const SIDE = 256;

/** Why a picked file can't be used, or null when it can. */
export function photoProblem(file: { type: string; size: number }): string | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return "Pick a JPG, PNG or WebP photo.";
  }
  if (file.size > MAX_PHOTO_BYTES) return "Pick a photo under 10 MB.";
  return null;
}

/** Center-crops to a square and shrinks to 256 px, so it fits in browser storage. */
export async function resizeToSquare(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIDE;
  canvas.height = SIDE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available.");
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIDE,
    SIDE,
  );
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}
