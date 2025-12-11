"use client";

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
import { usePlayers, useDeletePlayer } from "@/hooks/use-matchmaking";
import { Database, Trash2 } from "lucide-react";

const sideLabels: Record<"LEFT" | "RIGHT" | "BOTH", string> = {
  LEFT: "Gauche",
  RIGHT: "Droite",
  BOTH: "Les deux",
};

export function PlayerBase() {
  const { data: players, isLoading: isLoadingPlayers } = usePlayers();
  const deletePlayerMutation = useDeletePlayer();

  const handleDelete = (publicId: string) => {
    deletePlayerMutation.mutate(publicId);
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
                    const sideLabel = player.preferredCourtPosition === null
                      ? "Aucune"
                      : sideLabels[player.preferredCourtPosition];

                    return (
                      <TableRow key={player.publicId}>
                        <TableCell className="font-medium">
                          {player.displayName}
                        </TableCell>
                        <TableCell>{player.pmr.toFixed(1)}</TableCell>
                        <TableCell>{sideLabel}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(player.publicId)}
                            disabled={deletePlayerMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </Button>
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
