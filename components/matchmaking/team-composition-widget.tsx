import { useState, useMemo } from "react";
import type { Player } from "@/types/api";
import { PlayerSlot } from "./player-slot";
import { PlayerSelectionModal } from "./player-selection-modal";

interface TeamCompositionWidgetProps {
  currentPlayer: Player;
  teamComposition: [string | null, string | null, string | null];
  allPlayers: Player[];
  enqueuedPlayerIds: string[];
  playersInCompositions: Record<string, boolean>;
  canEditGroup: boolean;
  onUpdate: (composition: [string | null, string | null, string | null]) => void;
}

export function TeamCompositionWidget({
  currentPlayer,
  teamComposition,
  allPlayers,
  enqueuedPlayerIds,
  playersInCompositions,
  canEditGroup,
  onUpdate,
}: TeamCompositionWidgetProps) {
  const [openSlotIndex, setOpenSlotIndex] = useState<number | null>(null);

  // Dériver les joueurs pris dans d'autres compositions (pas celle-ci)
  const playersUsedElsewhere = useMemo(() => {
    const set = new Set<string>();

    Object.entries(playersInCompositions).forEach(([id, isUsed]) => {
      if (!isUsed) return; // Pas utilisé
      if (id === currentPlayer.publicId) return; // C'est le owner (ok pour sa propre compo)
      if (teamComposition.includes(id)) return; // Déjà dans cette compo (ok)
      set.add(id); // Utilisé ailleurs → bloquer
    });

    return set;
  }, [playersInCompositions, currentPlayer.publicId, teamComposition]);

  // Filtrer les joueurs disponibles pour la sélection
  const availablePlayers = useMemo(() => {
    return allPlayers.filter(
      (p) =>
        p.publicId !== currentPlayer.publicId && // Pas le joueur principal
        !enqueuedPlayerIds.includes(p.publicId) && // Pas déjà enqueued
        !teamComposition.includes(p.publicId) && // Pas déjà dans cette compo
        !playersUsedElsewhere.has(p.publicId) // Pas utilisé dans une autre compo
    );
  }, [allPlayers, currentPlayer.publicId, enqueuedPlayerIds, teamComposition, playersUsedElsewhere]);

  // Trouver un joueur par ID
  const findPlayer = (playerId: string | null): Player | undefined => {
    if (!playerId) return undefined;
    return allPlayers.find((p) => p.publicId === playerId);
  };

  // Handler pour ajouter un joueur à un slot
  const handleAddPlayer = (slotIndex: number, playerId: string) => {
    const newComposition = [...teamComposition] as [string | null, string | null, string | null];
    newComposition[slotIndex] = playerId;
    onUpdate(newComposition);
  };

  // Handler pour retirer un joueur d'un slot
  const handleRemovePlayer = (slotIndex: number) => {
    const newComposition = [...teamComposition] as [string | null, string | null, string | null];
    newComposition[slotIndex] = null;
    onUpdate(newComposition);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Équipe 1 (2 joueurs) */}
        <div className="flex items-center gap-2">
          {/* Slot 0 : Joueur principal (non modifiable) */}
          <PlayerSlot
            player={currentPlayer}
            canRemove={false}
            canAdd={false}
          />

          {/* Slot 1 : Premier coéquipier */}
          <PlayerSlot
            player={findPlayer(teamComposition[0])}
            canRemove={canEditGroup}
            canAdd={canEditGroup}
            onRemove={() => handleRemovePlayer(0)}
            onAdd={() => setOpenSlotIndex(0)}
          />
        </div>

        {/* Séparateur vertical */}
        <div className="w-px h-12 bg-gray-300 mx-1" />

        {/* Équipe 2 (2 joueurs) */}
        <div className="flex items-center gap-2">
          {/* Slot 2 : Adversaire 1 */}
          <PlayerSlot
            player={findPlayer(teamComposition[1])}
            canRemove={canEditGroup}
            canAdd={canEditGroup}
            onRemove={() => handleRemovePlayer(1)}
            onAdd={() => setOpenSlotIndex(1)}
          />

          {/* Slot 3 : Adversaire 2 */}
          <PlayerSlot
            player={findPlayer(teamComposition[2])}
            canRemove={canEditGroup}
            canAdd={canEditGroup}
            onRemove={() => handleRemovePlayer(2)}
            onAdd={() => setOpenSlotIndex(2)}
          />
        </div>
      </div>

      {/* Modal de sélection */}
      <PlayerSelectionModal
        open={openSlotIndex !== null}
        onClose={() => setOpenSlotIndex(null)}
        availablePlayers={availablePlayers}
        onSelect={(playerId) => {
          if (openSlotIndex !== null) {
            handleAddPlayer(openSlotIndex, playerId);
            setOpenSlotIndex(null);
          }
        }}
      />
    </>
  );
}
