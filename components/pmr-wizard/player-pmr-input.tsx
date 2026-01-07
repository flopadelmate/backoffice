"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PostMatchPlayer } from "@/types/pmr-wizard";
import { clampPmr } from "@/types/pmr-wizard";

interface PlayerPmrInputProps {
  players: [PostMatchPlayer, PostMatchPlayer, PostMatchPlayer, PostMatchPlayer];
  onUpdatePmr: (playerIndex: number, newPmr: number) => void;
}

export function PlayerPmrInput({ players, onUpdatePmr }: PlayerPmrInputProps) {
  const handlePmrChange = (playerIndex: number, value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      onUpdatePmr(playerIndex, parsed);
    }
  };

  const handlePmrBlur = (playerIndex: number, value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      const clamped = clampPmr(parsed);
      onUpdatePmr(playerIndex, clamped);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {players.map((player, index) => {
        const initials = player.displayName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return (
          <div key={player.publicId} className="flex items-center gap-3">
            {/* Avatar (pattern du Matchmaking Lab) */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {initials}
            </div>

            {/* Nom + Input PMR */}
            <div className="flex-1 space-y-1">
              <Label className="text-sm font-medium">{player.displayName}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="8.9"
                  value={player.pmr.toFixed(1)}
                  onChange={(e) => handlePmrChange(index, e.target.value)}
                  onBlur={(e) => handlePmrBlur(index, e.target.value)}
                  className="w-20"
                />
                <span className="text-xs text-gray-500">PMR</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
