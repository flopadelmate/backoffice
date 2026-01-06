import { Plus, X } from "lucide-react";
import type { Player } from "@/types/api";

interface PlayerSlotProps {
  player: Player | undefined;
  canRemove: boolean;
  canAdd: boolean;
  onRemove?: () => void;
  onAdd?: () => void;
}

export function PlayerSlot({
  player,
  canRemove,
  canAdd,
  onRemove,
  onAdd,
}: PlayerSlotProps) {
  // État rempli : afficher l'avatar et le nom
  if (player) {
    const initials = player.displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className="flex flex-col items-center gap-1 relative group">
        {/* Avatar */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
            {initials}
          </div>
          {/* Croix rouge en hover */}
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              aria-label="Retirer le joueur"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
        {/* Nom */}
        <span className="text-xs text-gray-700 text-center max-w-[60px] truncate">
          {player.displayName}
        </span>
      </div>
    );
  }

  // État vide : afficher l'icône + et "Libre"
  if (canAdd) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="flex flex-col items-center gap-1 group"
      >
        {/* Zone cliquable avec bordure dashed */}
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
          <Plus className="w-5 h-5 text-blue-500" />
        </div>
        {/* Label "Libre" */}
        <span className="text-xs text-blue-500 font-medium">Libre</span>
      </button>
    );
  }

  // Slot vide non cliquable (ne devrait pas arriver en pratique)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
        <Plus className="w-5 h-5 text-gray-300" />
      </div>
      <span className="text-xs text-gray-400">-</span>
    </div>
  );
}
