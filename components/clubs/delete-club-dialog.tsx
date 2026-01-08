"use client";

import { useState } from "react";
import { useDeleteClub } from "@/hooks/use-clubs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface DeleteClubDialogProps {
  open: boolean;
  onClose: () => void;
  clubId: number;
  clubName: string;
  onSuccess?: () => void;
}

export function DeleteClubDialog({
  open,
  onClose,
  clubId,
  clubName,
  onSuccess,
}: DeleteClubDialogProps) {
  const deleteClubMutation = useDeleteClub();
  const [addToBlacklist, setAddToBlacklist] = useState(false);
  const [reason, setReason] = useState("");

  const handleDelete = () => {
    // Build payload with exact optional properties for strictness
    const payload = {
      id: clubId,
      ...(addToBlacklist && { blacklist: true }),
      ...(addToBlacklist && reason && { reason }),
    };

    deleteClubMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Club supprimé avec succès");
        handleClose();
        onSuccess?.();
      },
      onError: () => {
        toast.error("Erreur lors de la suppression du club");
      },
    });
  };

  const handleClose = () => {
    setAddToBlacklist(false);
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Supprimer le club</DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer <strong>{clubName}</strong> ?
            Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="blacklist"
              checked={addToBlacklist}
              onCheckedChange={(checked) =>
                setAddToBlacklist(checked === true)
              }
            />
            <Label
              htmlFor="blacklist"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Ajouter à la Blacklist
            </Label>
          </div>

          {addToBlacklist && (
            <div className="space-y-2">
              <Label htmlFor="reason">Raison (optionnel)</Label>
              <Textarea
                id="reason"
                placeholder="Raison de l'ajout à la blacklist..."
                className="resize-none"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={deleteClubMutation.isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteClubMutation.isPending}
          >
            {deleteClubMutation.isPending ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
