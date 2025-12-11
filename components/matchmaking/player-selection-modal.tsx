import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import type { Player } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PlayerSelectionModalProps {
  open: boolean;
  onClose: () => void;
  availablePlayers: Player[];
  onSelect: (playerId: string) => void;
}

export function PlayerSelectionModal({
  open,
  onClose,
  availablePlayers,
  onSelect,
}: PlayerSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filtrer les joueurs par recherche
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) {
      return availablePlayers;
    }

    const query = searchQuery.toLowerCase();
    return availablePlayers.filter((player) =>
      player.displayName.toLowerCase().includes(query)
    );
  }, [availablePlayers, searchQuery]);

  const handleSelect = (playerId: string) => {
    onSelect(playerId);
    setSearchQuery(""); // Reset search
    onClose();
  };

  const handleClose = () => {
    setSearchQuery(""); // Reset search
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sélectionner un joueur</DialogTitle>
          <DialogDescription>
            Choisissez un joueur disponible pour compléter l&apos;équipe.
          </DialogDescription>
        </DialogHeader>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un joueur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Liste des joueurs */}
        <div className="max-h-80 overflow-y-auto border rounded-lg">
          {filteredPlayers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              {searchQuery.trim()
                ? "Aucun joueur trouvé"
                : "Aucun joueur disponible"}
            </div>
          ) : (
            <div className="divide-y">
              {filteredPlayers.map((player) => {
                const initials = player.displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <button
                    key={player.publicId}
                    type="button"
                    onClick={() => handleSelect(player.publicId)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {initials}
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">
                        {player.displayName}
                      </div>
                      <div className="text-sm text-gray-500">
                        Niveau {player.pmr.toFixed(1)} •{" "}
                        {player.preferredCourtPosition === "LEFT"
                          ? "Gauche"
                          : player.preferredCourtPosition === "RIGHT"
                            ? "Droite"
                            : "Les deux"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bouton Annuler */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
