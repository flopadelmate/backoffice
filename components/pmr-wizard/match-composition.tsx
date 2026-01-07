"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import type { PostMatchPlayer, PostMatchScoreSet } from "@/types/pmr-wizard";
import { clampPmr, clampReliability } from "@/types/pmr-wizard";

interface MatchCompositionProps {
  team1: [PostMatchPlayer, PostMatchPlayer];
  team2: [PostMatchPlayer, PostMatchPlayer];
  sets: [PostMatchScoreSet, PostMatchScoreSet, PostMatchScoreSet];
  onUpdateSet: (setIndex: number, team: "team1" | "team2", value: string) => void;
  onUpdatePmr: (playerIndex: number, newPmr: number) => void;
  onUpdateReliability: (playerIndex: number, newReliability: number) => void;
  isScoreValid: boolean;
}

// Composant séparé pour afficher un joueur avec PMR et reliability éditables
interface PlayerWithEditablePmrProps {
  player: PostMatchPlayer;
  playerIndex: number;
  onUpdatePmr: (playerIndex: number, newPmr: number) => void;
  onUpdateReliability: (playerIndex: number, newReliability: number) => void;
}

function PlayerWithEditablePmr({
  player,
  playerIndex,
  onUpdatePmr,
  onUpdateReliability,
}: PlayerWithEditablePmrProps) {
  // État local pour les valeurs temporaires pendant la saisie
  const [tempPmr, setTempPmr] = useState(player.pmr.toFixed(1));
  const [tempReliability, setTempReliability] = useState(player.reliability.toFixed(0));

  // Synchroniser avec le PMR du joueur quand il change
  useEffect(() => {
    setTempPmr(player.pmr.toFixed(1));
  }, [player.pmr]);

  // Synchroniser avec la reliability du joueur quand elle change
  useEffect(() => {
    setTempReliability(player.reliability.toFixed(0));
  }, [player.reliability]);

  const initials = player.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handlePmrBlur = (value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      const clamped = clampPmr(parsed);
      onUpdatePmr(playerIndex, clamped);
      setTempPmr(clamped.toFixed(1)); // Reformater
    } else {
      // Valeur invalide, reset
      setTempPmr(player.pmr.toFixed(1));
    }
  };

  const handleReliabilityBlur = (value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      const clamped = clampReliability(parsed);
      onUpdateReliability(playerIndex, clamped);
      setTempReliability(clamped.toFixed(0)); // Reformater
    } else {
      // Valeur invalide, reset
      setTempReliability(player.reliability.toFixed(0));
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
        {initials}
      </div>
      {/* Nom */}
      <span className="text-xs text-gray-700 text-center max-w-[60px] truncate">
        {player.displayName}
      </span>
      {/* PMR éditable */}
      <Input
        type="text"
        value={tempPmr}
        onChange={(e) => setTempPmr(e.target.value)}
        onBlur={(e) => handlePmrBlur(e.target.value)}
        onFocus={(e) => e.target.select()}
        tabIndex={playerIndex + 1}
        className="w-14 h-7 text-center text-xs p-1"
      />

      {/* Reliability éditable */}
      <div className="flex flex-col items-center gap-0.5 w-full">
        <Input
          type="text"
          value={tempReliability}
          onChange={(e) => setTempReliability(e.target.value)}
          onBlur={(e) => handleReliabilityBlur(e.target.value)}
          onFocus={(e) => e.target.select()}
          tabIndex={playerIndex + 11}
          className="w-14 h-7 text-center text-xs p-1"
        />
        <span className="text-[10px] text-gray-500">fiabilité %</span>
      </div>
    </div>
  );
}

export function MatchComposition({
  team1,
  team2,
  sets,
  onUpdateSet,
  onUpdatePmr,
  onUpdateReliability,
  isScoreValid,
}: MatchCompositionProps) {

  return (
    <div className="space-y-4">
      {/* Team 1 */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
        {/* Label équipe */}
        <div className="w-20 text-sm font-semibold text-gray-700">Équipe 1</div>

        {/* Joueurs avec PMR et reliability éditables */}
        <div className="flex items-center gap-3">
          {team1.map((player, idx) => (
            <PlayerWithEditablePmr
              key={player.publicId}
              player={player}
              playerIndex={idx}
              onUpdatePmr={onUpdatePmr}
              onUpdateReliability={onUpdateReliability}
            />
          ))}
        </div>

        {/* Séparateur */}
        <div className="mx-2 w-px h-16 bg-gray-300" />

        {/* Score (3 sets) */}
        <div className="flex items-center gap-2">
          {sets.map((set, idx) => (
            <Input
              key={idx}
              type="text"
              inputMode="numeric"
              pattern="[0-7]"
              placeholder="-"
              tabIndex={idx * 2 + 5}
              value={set.team1Games !== null ? set.team1Games.toString() : ""}
              onChange={(e) => onUpdateSet(idx, "team1", e.target.value)}
              onFocus={(e) => e.target.select()}
              className={`w-12 text-center ${
                !isScoreValid && set.team1Games !== null
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }`}
            />
          ))}
        </div>
      </div>

      {/* Team 2 */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
        {/* Label équipe */}
        <div className="w-20 text-sm font-semibold text-gray-700">Équipe 2</div>

        {/* Joueurs avec PMR et reliability éditables */}
        <div className="flex items-center gap-3">
          {team2.map((player, idx) => (
            <PlayerWithEditablePmr
              key={player.publicId}
              player={player}
              playerIndex={idx + 2}
              onUpdatePmr={onUpdatePmr}
              onUpdateReliability={onUpdateReliability}
            />
          ))}
        </div>

        {/* Séparateur */}
        <div className="mx-2 w-px h-16 bg-gray-300" />

        {/* Score (3 sets) */}
        <div className="flex items-center gap-2">
          {sets.map((set, idx) => (
            <Input
              key={idx}
              type="text"
              inputMode="numeric"
              pattern="[0-7]"
              placeholder="-"
              tabIndex={idx * 2 + 6}
              value={set.team2Games !== null ? set.team2Games.toString() : ""}
              onChange={(e) => onUpdateSet(idx, "team2", e.target.value)}
              onFocus={(e) => e.target.select()}
              className={`w-12 text-center ${
                !isScoreValid && set.team2Games !== null
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }`}
            />
          ))}
        </div>
      </div>

      {/* Message d'aide pour la saisie */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>
          <strong>Saisie du score :</strong> Entrez le nombre de jeux par set
          (0-7)
        </p>
        <p>
          • Sets 1 et 2 obligatoires • Set 3 uniquement si égalité 1-1 • Sets
          valides : 6-0..6-4, 7-5, 7-6
        </p>
        {!isScoreValid && (
          <p className="text-red-600 font-medium">
            ⚠ Score invalide. Vérifiez les règles ci-dessus.
          </p>
        )}
      </div>
    </div>
  );
}
