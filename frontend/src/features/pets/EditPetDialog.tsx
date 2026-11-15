import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { PetRead } from "@/api/contract";
import { PillRadioGroup } from "@/components/PillRadioGroup";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUpdatePet } from "@/features/pets/api";
import {
  editPetSchema,
  PET_FIELDS,
  petToEditForm,
  toPetUpdate,
  type EditPetValues,
} from "@/features/pets/editPetSchema";
import { ApiError, errorMessage } from "@/lib/api";

const SIZE_OPTIONS = [
  { value: "small", label: "Small (under 20 lb)" },
  { value: "medium", label: "Medium (20–50 lb)" },
  { value: "large", label: "Large (over 50 lb)" },
] as const;

const INSURED_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

interface EditPetDialogProps {
  pet: PetRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPetDialog({ pet, open, onOpenChange }: EditPetDialogProps) {
  const update = useUpdatePet(pet.id);
  const form = useForm<EditPetValues>({
    resolver: zodResolver(editPetSchema),
    defaultValues: petToEditForm(pet),
  });

  useEffect(() => {
    if (open) form.reset(petToEditForm(pet));
  }, [open, pet, form]);

  const submit = form.handleSubmit((values) => {
    update.mutate(toPetUpdate(values), {
      onSuccess: (saved) => {
        toast.success(`Saved ${saved.name}'s details. The forecast is updated.`);
        onOpenChange(false);
      },
      onError: (error) => {
        const fields = error instanceof ApiError ? error.fieldErrors() : {};
        let mapped = false;
        for (const name of PET_FIELDS) {
          const message = fields[name];
          if (!message) continue;
          form.setError(name, { message });
          mapped = true;
        }
        if (!mapped) form.setError("root", { message: errorMessage(error) });
      },
    });
  });

  const rootError = form.formState.errors.root?.message;
  const isDog = pet.species === "dog";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {pet.name}'s details</DialogTitle>
          <DialogDescription>
            Age, size and ZIP change the yearly forecast. Quests and progress stay.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breed</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age_years"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age in years</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP code</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" autoComplete="postal-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isDog && (
              <FormField
                control={form.control}
                name="size_class"
                render={({ field }) => (
                  <FormItem>
                    <PillRadioGroup
                      legend="Size"
                      name={field.name}
                      value={field.value}
                      options={SIZE_OPTIONS}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="insured"
              render={({ field }) => (
                <FormItem>
                  <PillRadioGroup
                    legend={`Is ${pet.name} insured?`}
                    name={field.name}
                    value={field.value ? "yes" : "no"}
                    options={INSURED_OPTIONS}
                    onChange={(value) => field.onChange(value === "yes")}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {rootError && (
              <p role="alert" className="font-bold text-error">
                {rootError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="flex-1 basis-[220px]"
                disabled={update.isPending}
              >
                {update.isPending ? "Saving…" : "Save details"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
