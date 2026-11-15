import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PHOTO_TYPES, photoProblem, resizeToSquare } from "@/features/pets/resizeImage";
import { usePetPhoto } from "@/features/pets/usePetPhoto";

/** A round photo of the real pet, next to the growing avatar. Stored in this browser only. */
export function PetPhoto({ petId, petName }: { petId: string; petName: string }) {
  const { photo, save, remove } = usePetPhoto(petId);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(file: File | undefined) {
    if (!file) return;
    const problem = photoProblem(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      const stored = save(await resizeToSquare(file));
      toast.success(
        stored ? `Added ${petName}'s photo` : "Photo added for this visit only (storage is full)",
      );
    } catch {
      toast.error("That photo couldn't be read. Try another one.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      {photo ? (
        <img
          src={photo}
          alt={petName}
          className="size-[72px] shrink-0 rounded-full border-2 border-ink object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-[72px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-ink bg-surface"
        >
          <Camera className="size-6" />
        </span>
      )}
      <div className="flex flex-col items-start gap-1">
        <input
          ref={input}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void onPick(event.target.files?.[0])}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? "Adding…" : photo ? "Change photo" : `Add a photo of ${petName}`}
        </Button>
        {photo && (
          <Button type="button" size="sm" variant="link" className="h-8 px-0" onClick={remove}>
            Remove photo
          </Button>
        )}
      </div>
    </div>
  );
}
