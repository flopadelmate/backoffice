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
import { usePlayers, useEnqueuePlayer, useDequeuePlayer, useUpdatePlayerTolerance, usePlayerAvailability, usePlayerTeamComposition, usePlayersInCompositions } from "@/hooks/use-matchmaking";
import { ListTodo, PlayCircle, X } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { TeamCompositionWidget } from "./team-composition-widget";

const sideLabels: Record<"LEFT" | "RIGHT" | "BOTH", string> = {
  LEFT: "Gauche",
  RIGHT: "Droite",
  BOTH: "Les deux",
};

export function QueueControl() {
  const { data: players, isLoading } = usePlayers();
  const enqueueMutation = useEnqueuePlayer();
  const dequeueMutation = useDequeuePlayer();
  const toleranceMutation = useUpdatePlayerTolerance();
  const [hoveredButtonId, setHoveredButtonId] = useState<string | null>(null);
  const [availabilityByPlayerId, setAvailabilityForPlayer] = usePlayerAvailability(players);
  const [compositionByPlayerId, setCompositionForPlayer] = usePlayerTeamComposition(players);
  const playersInCompositions = usePlayersInCompositions(compositionByPlayerId);

  // Liste des IDs des joueurs enqueued
  const enqueuedPlayerIds = useMemo(() => {
    return players?.filter((p) => p.isEnqueued).map((p) => p.publicId) || [];
  }, [players]);

  const handleEnqueue = (playerId: string) => {
    enqueueMutation.mutate({ playerId });
  };

  const handleDequeue = (player: typeof players extends (infer U)[] | undefined ? U : never) => {
    if (!player.enqueuedGroupPublicId) {
      console.error("Player not enqueued");
      return;
    }
    dequeueMutation.mutate({ groupPublicId: player.enqueuedGroupPublicId });
  };

  const handleAvailabilityChange = (
    playerId: string,
    field: "start" | "end",
    value: string
  ) => {
    const current = availabilityByPlayerId[playerId]!;
    const newStart = field === "start" ? value : current.start;
    const newEnd = field === "end" ? value : current.end;

    setAvailabilityForPlayer(playerId, { start: newStart, end: newEnd });
  };

  const handleToleranceChange = (playerId: string, value: string) => {
    const tolerance = value === "null" ? null : parseFloat(value);
    toleranceMutation.mutate({ playerId, tolerance });
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
                    <TableHead>Tolérance</TableHead>
                    <TableHead>Groupe</TableHead>
                    <TableHead>Dispos</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player) => {
                    const availability = availabilityByPlayerId[player.publicId];
                    const minStartDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // now + 2h
                    const minEndDate = availability?.start
                      ? new Date(new Date(availability.start).getTime() + 90 * 60 * 1000)
                      : minStartDate;

                    const sideLabel = player.preferredCourtPosition === null
                      ? "Aucune"
                      : sideLabels[player.preferredCourtPosition];

                    // Déterminer les états du joueur
                    const playerComposition = compositionByPlayerId[player.publicId];
                    const isOwner = !!playerComposition && playerComposition.some((id) => id !== null);
                    const isInAnyComposition = !!playersInCompositions[player.publicId];

                    // Le joueur est coéquipier uniquement s'il est dans une compo mais n'est pas owner
                    const isCoTeammateOnly = isInAnyComposition && !isOwner;

                    // Peut éditer le widget si :
                    // - pas dans une compo (peut en créer une)
                    // - OU est owner (peut éditer la sienne)
                    const canEditGroup = !isInAnyComposition || isOwner;

                    return (
                      <TableRow
                        key={player.publicId}
                        className={isCoTeammateOnly ? "opacity-50 bg-gray-50" : ""}
                      >
                        <TableCell className="font-medium">
                          {player.displayName}
                        </TableCell>
                        <TableCell>{player.pmr.toFixed(1)}</TableCell>
                        <TableCell>{sideLabel}</TableCell>
                        <TableCell>
                          <Select
                            value={player.tolerance === null ? "null" : player.tolerance.toString()}
                            onValueChange={(value) => handleToleranceChange(player.publicId, value)}
                            disabled={toleranceMutation.isPending}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0.25">± 0.25</SelectItem>
                              <SelectItem value="0.5">± 0.5</SelectItem>
                              <SelectItem value="1">± 1</SelectItem>
                              <SelectItem value="2">± 2</SelectItem>
                              <SelectItem value="null">Tout</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TeamCompositionWidget
                            currentPlayer={player}
                            teamComposition={compositionByPlayerId[player.publicId] || [null, null, null]}
                            allPlayers={players}
                            enqueuedPlayerIds={enqueuedPlayerIds}
                            playersInCompositions={playersInCompositions}
                            canEditGroup={canEditGroup}
                            onUpdate={(composition) =>
                              setCompositionForPlayer(player.publicId, composition)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DateTimePicker
                              value={availability?.start || null}
                              onChange={(value) =>
                                handleAvailabilityChange(player.publicId, "start", value)
                              }
                              minDate={minStartDate}
                              label="Début"
                            />
                            <DateTimePicker
                              value={availability?.end || null}
                              onChange={(value) =>
                                handleAvailabilityChange(player.publicId, "end", value)
                              }
                              minDate={minEndDate}
                              label="Fin"
                              disabled={!availability?.start}
                            />
                          </div>
                        </TableCell>
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
                            variant={
                              player.isEnqueued && hoveredButtonId === player.publicId
                                ? "destructive"
                                : player.isEnqueued
                                ? "outline"
                                : "default"
                            }
                            onClick={() =>
                              player.isEnqueued
                                ? handleDequeue(player)
                                : handleEnqueue(player.publicId)
                            }
                            onMouseEnter={() => setHoveredButtonId(player.publicId)}
                            onMouseLeave={() => setHoveredButtonId(null)}
                            disabled={enqueueMutation.isPending || dequeueMutation.isPending || isCoTeammateOnly}
                          >
                            {player.isEnqueued && hoveredButtonId === player.publicId ? (
                              <X className="h-4 w-4 mr-2" />
                            ) : (
                              <PlayCircle className="h-4 w-4 mr-2" />
                            )}
                            {player.isEnqueued ? "En file" : "Inscrire"}
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
