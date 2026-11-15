import { describe, expect, it } from "vitest";
import { MAX_PHOTO_BYTES, photoProblem } from "@/features/pets/resizeImage";

describe("photoProblem", () => {
  it("accepts JPG, PNG and WebP under the size limit", () => {
    expect(photoProblem({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(photoProblem({ type: "image/png", size: 1000 })).toBeNull();
    expect(photoProblem({ type: "image/webp", size: MAX_PHOTO_BYTES })).toBeNull();
  });

  it("rejects other file types", () => {
    expect(photoProblem({ type: "image/gif", size: 1000 })).toMatch(/jpg, png or webp/i);
    expect(photoProblem({ type: "application/pdf", size: 1000 })).not.toBeNull();
  });

  it("rejects photos over 10 MB", () => {
    expect(photoProblem({ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 })).toMatch(/10 MB/);
  });
});
