import { useState } from "react";

const keyFor = (petId: string) => `petgo:photo:${petId}`;

function read(petId: string): string | null {
  try {
    return window.localStorage.getItem(keyFor(petId));
  } catch {
    return null;
  }
}

/**
 * The pet's photo, kept only in this browser (a small data URL in localStorage).
 * It never goes to the server. Moving it to server storage is a later step.
 */
export function usePetPhoto(petId: string) {
  const [photo, setPhoto] = useState<string | null>(() => read(petId));

  function save(dataUrl: string): boolean {
    try {
      window.localStorage.setItem(keyFor(petId), dataUrl);
      setPhoto(dataUrl);
      return true;
    } catch {
      // Storage full or blocked: keep the photo for this visit only.
      setPhoto(dataUrl);
      return false;
    }
  }

  function remove() {
    try {
      window.localStorage.removeItem(keyFor(petId));
    } catch {
      // Nothing stored to remove.
    }
    setPhoto(null);
  }

  return { photo, save, remove };
}
