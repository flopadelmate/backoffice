"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAddToWhitelist } from "@/hooks/use-clubs";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  addToWhitelistSchema,
  type AddToWhitelistFormData,
} from "@/lib/schemas/whitelist";

interface AddToWhitelistDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddToWhitelistDialog({
  open,
  onClose,
}: AddToWhitelistDialogProps) {
  const addToWhitelistMutation = useAddToWhitelist();

  const form = useForm<AddToWhitelistFormData>({
    resolver: zodResolver(addToWhitelistSchema),
    defaultValues: {
      externalId: "",
      reason: "",
    },
  });

  const onSubmit = (data: AddToWhitelistFormData) => {
    // Build payload with exact optional properties for strictness
    const payload = {
      externalId: data.externalId,
      source: "MANUAL" as const, // Always MANUAL for user-added entries
      ...(data.reason && { reason: data.reason }), // Only include if provided
    };

    addToWhitelistMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Club ajouté à la whitelist");
        form.reset();
        onClose();
      },
      onError: () => {
        toast.error("Erreur lors de l'ajout à la whitelist");
      },
    });
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter à la whitelist</DialogTitle>
          <DialogDescription>
            Ajoutez un club à la whitelist en indiquant son Place ID.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="externalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Place ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ChIJ..."
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raison (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Raison de l'ajout à la whitelist..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={addToWhitelistMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={addToWhitelistMutation.isPending}
              >
                {addToWhitelistMutation.isPending ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
