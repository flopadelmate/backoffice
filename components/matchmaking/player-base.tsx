"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlayers, useDeletePlayer, useUpdatePlayer } from "@/hooks/use-matchmaking";
import { Database, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { playerUpdateSchema } from "@/lib/schemas/player";
import type { Player } from "@/types/api";

// ============================================================================
// Types pour le pattern "server state + draft state"
// ============================================================================

interface PlayerDraft {
  displayName: string;
  pmrInput: string; // String pour gérer l'input décimal
  preferredCourtPosition: "LEFT" | "RIGHT" | "BOTH";
}

interface PlayerEditState {
  draft: PlayerDraft;
  dirty: boolean;
  awaitingAck: boolean; // true après PUT, évite que le poll écrase avant sync backend
}

export function PlayerBase() {
  const { data: players, isLoading: isLoadingPlayers } = usePlayers();
  const deletePlayerMutation = useDeletePlayer();
  const updatePlayerMutation = useUpdatePlayer();

  // State draft/dirty par joueur (pattern "server state + draft state")
  const [editStateByPlayerId, setEditStateByPlayerId] = useState<Record<string, PlayerEditState>>({});

  // Track quel joueur est en cours d'update (pour isPending par ligne)
  const [updatingPlayerId, setUpdatingPlayerId] = useState<string | null>(null);

  // ============================================================================
  // Sync polling → draft (seulement si !dirty && !awaitingAck)
  // ============================================================================

  useEffect(() => {
    if (!players) return;

    setEditStateByPlayerId((prev) => {
      const next: Record<string, PlayerEditState> = {};

      players.forEach((player) => {
        const existing = prev[player.publicId];

        // Si dirty ou awaitingAck → garder le draft local
        if (existing?.dirty || existing?.awaitingAck) {
          if (existing.awaitingAck) {
            // Vérifier si backend a reflété nos changements
            const pmrValue = parseFloat(existing.draft.pmrInput);
            const backendMatches =
              player.displayName === existing.draft.displayName &&
              player.pmr === pmrValue &&
              player.preferredCourtPosition === existing.draft.preferredCourtPosition;

            if (backendMatches) {
              // Backend synced → clear awaitingAck
              next[player.publicId] = {
                draft: {
                  displayName: player.displayName,
                  pmrInput: player.pmr.toString(),
                  preferredCourtPosition: player.preferredCourtPosition ?? "BOTH",
                },
                dirty: false,
                awaitingAck: false,
              };
            } else {
              next[player.publicId] = existing;
            }
          } else {
            next[player.publicId] = existing;
          }
        } else {
          // Pas dirty → sync depuis backend
          next[player.publicId] = {
            draft: {
              displayName: player.displayName,
              pmrInput: player.pmr.toString(),
              preferredCourtPosition: player.preferredCourtPosition ?? "BOTH",
            },
            dirty: false,
            awaitingAck: false,
          };
        }
      });

      return next;
    });
  }, [players]);

  // ============================================================================
  // Helpers
  // ============================================================================

  const updateDraft = (
    playerId: string,
    field: keyof PlayerDraft,
    value: string
  ) => {
    setEditStateByPlayerId((prev) => {
      const existing = prev[playerId];
      if (!existing) return prev;

      return {
        ...prev,
        [playerId]: {
          draft: { ...existing.draft, [field]: value },
          dirty: true,
          awaitingAck: false,
        },
      };
    });
  };

  const handleDelete = (publicId: string) => {
    deletePlayerMutation.mutate(publicId);
  };

  const handleUpdate = (player: Player) => {
    const editState = editStateByPlayerId[player.publicId];
    if (!editState) return;

    const pmrValue = parseFloat(editState.draft.pmrInput);

    // Validation Zod
    const parsed = playerUpdateSchema.safeParse({
      displayName: editState.draft.displayName,
      pmr: pmrValue,
      preferredCourtPosition: editState.draft.preferredCourtPosition,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Validation échouée");
      return;
    }

    // Track quel joueur est en cours d'update
    setUpdatingPlayerId(player.publicId);

    // Envoyer DTO complet
    updatePlayerMutation.mutate(
      {
        publicId: player.publicId,
        data: {
          displayName: parsed.data.displayName,
          pmr: parsed.data.pmr,
          preferredCourtPosition: parsed.data.preferredCourtPosition,
        },
      },
      {
        onSuccess: () => {
          setEditStateByPlayerId((prev) => {
            const existing = prev[player.publicId];
            if (!existing) {
              // Cas improbable: on sauvegarde alors qu'il n'y a pas de draft
              // On ne modifie pas le state dans ce cas
              return prev;
            }
            return {
              ...prev,
              [player.publicId]: {
                ...existing,
                dirty: false,
                awaitingAck: true,
              },
            };
          });
          setUpdatingPlayerId(null);
          toast.success("Joueur mis à jour");
        },
        onError: (error) => {
          setUpdatingPlayerId(null);
          toast.error(`Erreur: ${error.message}`);
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Player Base
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingPlayers && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-600">Chargement...</p>
          </div>
        )}

        {!isLoadingPlayers && (!players || players.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            Aucun joueur de test créé. Utilisez le formulaire ci-dessus.
          </div>
        )}

        {players && players.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {players.length} joueur{players.length > 1 ? "s" : ""} en base
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Côté</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player) => {
                    const editState = editStateByPlayerId[player.publicId];

                    // Attendre init du draft
                    if (!editState) {
                      return (
                        <TableRow key={player.publicId}>
                          <TableCell colSpan={4} className="text-center text-gray-400">
                            Chargement...
                          </TableCell>
                        </TableRow>
                      );
                    }

                    const { draft, dirty } = editState;
                    const isUpdating = updatingPlayerId === player.publicId;

                    return (
                      <TableRow key={player.publicId}>
                        <TableCell>
                          <Input
                            value={draft.displayName}
                            onChange={(e) =>
                              updateDraft(player.publicId, "displayName", e.target.value)
                            }
                            className="w-[150px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={draft.pmrInput}
                            onChange={(e) => {
                              const value = e.target.value.replace(",", ".");
                              updateDraft(player.publicId, "pmrInput", value);
                            }}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={draft.preferredCourtPosition}
                            onValueChange={(v) =>
                              updateDraft(
                                player.publicId,
                                "preferredCourtPosition",
                                v as "LEFT" | "RIGHT" | "BOTH"
                              )
                            }
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LEFT">Gauche</SelectItem>
                              <SelectItem value="RIGHT">Droite</SelectItem>
                              <SelectItem value="BOTH">Les deux</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdate(player)}
                              disabled={!dirty || isUpdating}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              {isUpdating ? "..." : "Update"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(player.publicId)}
                              disabled={deletePlayerMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
