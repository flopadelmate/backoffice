"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateExternalIdAlias } from "@/hooks/use-clubs";
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
  createExternalIdAliasSchema,
  type CreateExternalIdAliasFormData,
} from "@/lib/schemas/external-id-alias";
import type { ClubBackofficeDetailDto } from "@/types/api";

interface ModifyPlaceIdDialogProps {
  open: boolean;
  onClose: () => void;
  club: ClubBackofficeDetailDto;
}

export function ModifyPlaceIdDialog({
  open,
  onClose,
  club,
}: ModifyPlaceIdDialogProps) {
  const createAliasMutation = useCreateExternalIdAlias(club.id);

  const form = useForm<CreateExternalIdAliasFormData>({
    resolver: zodResolver(createExternalIdAliasSchema),
    defaultValues: {
      targetExternalId: "",
      reason: "",
    },
  });

  const onSubmit = (data: CreateExternalIdAliasFormData) => {
    // Validate that target is different from current
    if (data.targetExternalId.trim() === club.externalId) {
      toast.error("Le nouveau Place ID doit être différent de l'actuel");
      return;
    }

    // Build payload with exact properties
    const payload = {
      aliasExternalId: club.externalId, // Current Place ID
      targetExternalId: data.targetExternalId.trim(),
      ...(data.reason && { reason: data.reason }), // Only include if provided
    };

    createAliasMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Alias Place ID créé avec succès");
        form.reset();
        onClose();
      },
      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erreur lors de la création de l'alias"
        );
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
          <DialogTitle>Modifier le Place ID</DialogTitle>
          <DialogDescription>
            Créez un alias pour mapper l'ancien Place ID vers un nouveau.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Place ID (read-only) */}
            <FormItem>
              <FormLabel>Place ID actuel</FormLabel>
              <FormControl>
                <Input value={club.externalId} disabled className="bg-muted" />
              </FormControl>
            </FormItem>

            {/* New Place ID */}
            <FormField
              control={form.control}
              name="targetExternalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nouveau Place ID</FormLabel>
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

            {/* Reason (optional) */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raison (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Raison de la modification du Place ID..."
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
                disabled={createAliasMutation.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={createAliasMutation.isPending}
              >
                {createAliasMutation.isPending ? "Création..." : "Valider"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
