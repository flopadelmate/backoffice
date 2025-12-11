"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTestPlayers, useEnqueuePlayer } from "@/hooks/use-matchmaking";
import { ListTodo, PlayCircle } from "lucide-react";
import type { PlayerLevel, PlayerSide } from "@/types/api";

const levelLabels: Record<PlayerLevel, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
  EXPERT: "Expert",
};

const sideLabels: Record<PlayerSide, string> = {
  LEFT: "Gauche",
  RIGHT: "Droite",
  BOTH: "Les deux",
};

export function QueueControl() {
  const { data: players, isLoading } = useTestPlayers();
  const enqueueMutation = useEnqueuePlayer();

  const handleEnqueue = (playerId: string) => {
    enqueueMutation.mutate(playerId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          Queue Control
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-600">Chargement...</p>
          </div>
        )}

        {!isLoading && (!players || players.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            Aucun joueur de test créé. Utilisez la Player Factory ci-dessus.
          </div>
        )}

        {players && players.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {players.length} joueur{players.length > 1 ? "s" : ""} ·{" "}
                {players.filter((p) => p.isEnqueued).length} en file
              </p>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Niveau</TableHead>
                    <TableHead>Côté</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">
                        {player.name}
                      </TableCell>
                      <TableCell>{levelLabels[player.level]}</TableCell>
                      <TableCell>{sideLabels[player.side]}</TableCell>
                      <TableCell>
                        {player.isEnqueued ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            En file
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                            Hors file
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={player.isEnqueued ? "outline" : "default"}
                          onClick={() => handleEnqueue(player.id)}
                          disabled={
                            player.isEnqueued ||
                            enqueueMutation.isPending
                          }
                        >
                          <PlayCircle className="h-4 w-4 mr-2" />
                          {player.isEnqueued ? "En file" : "Inscrire"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
