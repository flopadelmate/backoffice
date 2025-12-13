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
import { usePlayers, useEnqueuePlayer, useDequeuePlayer, usePlayerAvailability, usePlayerTeamComposition, usePlayersInCompositions, useUpdateMatchmakingGroup, useMatchmakingQueue, type PlayerWithUIState } from "@/hooks/use-matchmaking";
import { ListTodo, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo, useEffect } from "react";
import { TeamCompositionWidget } from "./team-composition-widget";
import type { MatchmakingGroupUpdateRequest, PlayerSlotDto } from "@/types/api";

// ============================================================================
// Types pour le pattern "server state + draft state"
// ============================================================================

interface GroupDraft {
  teammateTol: number;
  timeWindowStart: string;
  timeWindowEnd: string;
  clubPublicIds: string[];
}

interface GroupEditState {
  draft: GroupDraft;
  dirty: boolean;
  awaitingAck: boolean; // true après PUT, évite que le poll écrase avant sync backend
}

const sideLabels: Record<"LEFT" | "RIGHT" | "BOTH", string> = {
  LEFT: "Gauche",
  RIGHT: "Droite",
  BOTH: "Les deux",
};

export function QueueControl() {
  const { data: players, isLoading } = usePlayers();
  const { data: queueGroups } = useMatchmakingQueue();
  const enqueueMutation = useEnqueuePlayer();
  const dequeueMutation = useDequeuePlayer();
  const updateMutation = useUpdateMatchmakingGroup();
  const [availabilityByPlayerId, setAvailabilityForPlayer] = usePlayerAvailability(players);
  const [compositionByPlayerId, setCompositionForPlayer] = usePlayerTeamComposition(players);
  const playersInCompositions = usePlayersInCompositions(compositionByPlayerId);

  // ============================================================================
  // State draft/dirty par groupe (pattern "server state + draft state")
  // ============================================================================
  const [editStateByGroupId, setEditStateByGroupId] = useState<Record<string, GroupEditState>>({});

  // State pour la tolérance pré-inscription (joueurs non encore en queue)
  const [preEnqueueTolByPlayerId, setPreEnqueueTolByPlayerId] = useState<Record<string, number>>({});

  // Sync polling → draft (seulement si pas dirty ET pas awaitingAck)
  useEffect(() => {
    if (!queueGroups) return;

    setEditStateByGroupId((prev) => {
      const next: Record<string, GroupEditState> = {};

      queueGroups.forEach((group) => {
        const existing = prev[group.publicId];

        // Si dirty ou awaitingAck → on garde le draft local intact
        if (existing?.dirty || existing?.awaitingAck) {
          // Vérifier si le backend a bien reflété nos changements (pour clear awaitingAck)
          if (existing.awaitingAck) {
            const backendMatches =
              group.teammateTol === existing.draft.teammateTol &&
              group.timeWindowStart === existing.draft.timeWindowStart &&
              group.timeWindowEnd === existing.draft.timeWindowEnd;

            if (backendMatches) {
              // Backend synced → on peut clear awaitingAck et sync
              next[group.publicId] = {
                draft: {
                  teammateTol: group.teammateTol ?? 0.5,
                  timeWindowStart: group.timeWindowStart ?? "",
                  timeWindowEnd: group.timeWindowEnd ?? "",
                  clubPublicIds: group.clubPublicIds ?? [],
                },
                dirty: false,
                awaitingAck: false,
              };
            } else {
              // Backend pas encore synced → garder le draft
              next[group.publicId] = existing;
            }
          } else {
            // Dirty mais pas awaitingAck → garder tel quel
            next[group.publicId] = existing;
          }
        } else {
          // Pas dirty → sync depuis le backend
          next[group.publicId] = {
            draft: {
              teammateTol: group.teammateTol ?? 0.5,
              timeWindowStart: group.timeWindowStart ?? "",
              timeWindowEnd: group.timeWindowEnd ?? "",
              clubPublicIds: group.clubPublicIds ?? [],
            },
            dirty: false,
            awaitingAck: false,
          };
        }
      });

      // Les groupIds absents de queueGroups sont automatiquement supprimés
      return next;
    });
  }, [queueGroups]);

  // ============================================================================
  // Helpers pour le draft
  // ============================================================================

  const getDefaultDraft = (groupId: string): GroupDraft => {
    const group = queueGroups?.find((g) => g.publicId === groupId);
    return {
      teammateTol: group?.teammateTol ?? 0.5,
      timeWindowStart: group?.timeWindowStart ?? "",
      timeWindowEnd: group?.timeWindowEnd ?? "",
      clubPublicIds: group?.clubPublicIds ?? [],
    };
  };

  const updateDraft = (groupId: string, field: keyof GroupDraft, value: GroupDraft[keyof GroupDraft]) => {
    setEditStateByGroupId((prev) => {
      const existing = prev[groupId];
      const baseDraft = existing?.draft ?? getDefaultDraft(groupId);

      return {
        ...prev,
        [groupId]: {
          draft: { ...baseDraft, [field]: value },
          dirty: true,
          awaitingAck: false,
        },
      };
    });
  };

  const canUpdate = (groupId: string): boolean => {
    const editState = editStateByGroupId[groupId];
    if (!editState) return false;

    const { draft, dirty } = editState;

    // Disabled si pas dirty OU champs requis manquants OU mutation pending
    if (!dirty) return false;
    if (!draft.timeWindowStart || !draft.timeWindowEnd) return false;
    if (updateMutation.isPending) return false;

    return true;
  };

  // ============================================================================
  // Handlers
  // ============================================================================

  // Liste des IDs des joueurs enqueued
  const enqueuedPlayerIds = useMemo(() => {
    return players?.filter((p) => p.isEnqueued).map((p) => p.publicId) || [];
  }, [players]);

  const handleEnqueue = (playerId: string) => {
    const teammateTol = preEnqueueTolByPlayerId[playerId] ?? 0.5;
    enqueueMutation.mutate({ playerId, teammateTol });
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

  // Helper pour afficher la tolérance
  const getDisplayTolerance = (player: PlayerWithUIState): number => {
    if (player.isEnqueued && player.enqueuedGroupPublicId) {
      return editStateByGroupId[player.enqueuedGroupPublicId]?.draft.teammateTol ?? 0.5;
    }
    return preEnqueueTolByPlayerId[player.publicId] ?? 0.5;
  };

  // Handler unifié pour la tolérance (inscrit ou non)
  const handleToleranceChange = (player: PlayerWithUIState, value: string) => {
    const tol = value === "all" ? 10 : parseFloat(value);

    if (player.isEnqueued && player.enqueuedGroupPublicId) {
      // Joueur inscrit → update draft du groupe
      updateDraft(player.enqueuedGroupPublicId, "teammateTol", tol);
    } else {
      // Joueur non inscrit → update state local pré-inscription
      setPreEnqueueTolByPlayerId((prev) => ({ ...prev, [player.publicId]: tol }));
    }
  };

  // Handler pour Update avec validation groupe + toast
  const handleUpdate = (player: PlayerWithUIState) => {
    const groupId = player.enqueuedGroupPublicId;
    if (!groupId) return;

    const editState = editStateByGroupId[groupId];
    if (!editState) return;

    // Récupérer le groupe server pour les slots
    const serverGroup = queueGroups?.find((g) => g.publicId === groupId);
    if (!serverGroup) {
      toast.error("Groupe introuvable");
      return;
    }

    // Construire les slots depuis le groupe server (typés correctement)
    const slots: Pick<MatchmakingGroupUpdateRequest, "slotA" | "slotB" | "slotC" | "slotD"> = {};
    serverGroup.players.forEach((p) => {
      const slotDto: PlayerSlotDto = { playerPublicId: p.playerPublicId };
      if (p.slot === "A") slots.slotA = slotDto;
      else if (p.slot === "B") slots.slotB = slotDto;
      else if (p.slot === "C") slots.slotC = slotDto;
      else if (p.slot === "D") slots.slotD = slotDto;
    });

    updateMutation.mutate(
      {
        groupPublicId: groupId,
        data: {
          clubPublicIds: editState.draft.clubPublicIds,
          timeWindowStart: editState.draft.timeWindowStart,
          timeWindowEnd: editState.draft.timeWindowEnd,
          teammateTol: editState.draft.teammateTol,
          ...slots,
        },
      },
      {
        onSuccess: () => {
          // Clear dirty + set awaitingAck pour éviter que le poll écrase
          setEditStateByGroupId((prev) => ({
            ...prev,
            [groupId]: { ...prev[groupId], dirty: false, awaitingAck: true },
          }));
          toast.success("Groupe mis à jour");
        },
        onError: (error) => {
          toast.error(`Erreur: ${error.message}`);
        },
      }
    );
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
                          {(() => {
                            const displayTol = getDisplayTolerance(player);

                            return (
                              <Select
                                value={displayTol === 10 ? "all" : displayTol.toString()}
                                onValueChange={(value) => handleToleranceChange(player, value)}
                              >
                                <SelectTrigger className="w-[100px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0.25">± 0.25</SelectItem>
                                  <SelectItem value="0.5">± 0.5</SelectItem>
                                  <SelectItem value="1">± 1</SelectItem>
                                  <SelectItem value="2">± 2</SelectItem>
                                  <SelectItem value="all">Tout</SelectItem>
                                </SelectContent>
                              </Select>
                            );
                          })()}
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
                          {player.isEnqueued ? (
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdate(player)}
                                disabled={!canUpdate(player.enqueuedGroupPublicId!)}
                              >
                                {updateMutation.isPending ? "..." : "Update"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDequeue(player)}
                                disabled={dequeueMutation.isPending}
                              >
                                Quitter
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleEnqueue(player.publicId)}
                              disabled={enqueueMutation.isPending || isCoTeammateOnly}
                            >
                              <PlayCircle className="h-4 w-4 mr-2" />
                              Inscrire
                            </Button>
                          )}
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
