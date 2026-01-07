import { useState, useEffect } from "react";
import type {
  PostMatchPlayer,
  PostMatchScoreSet,
  PostMatchResult,
} from "@/types/pmr-wizard";
import { clampPmr, clampReliability, postMatchScoreSchema } from "@/types/pmr-wizard";
import { computePmrAfterMatch } from "@/lib/pmr-adjustment";

/**
 * Hook pour gérer la simulation d'évolution du PMR après un match
 */
export function usePmrSimulation() {
  // État des 4 joueurs (PMR et reliability modifiables)
  const [players, setPlayers] = useState<
    [PostMatchPlayer, PostMatchPlayer, PostMatchPlayer, PostMatchPlayer]
  >([
    { publicId: "p1", displayName: "Joueur A", pmr: 4.5, reliability: 50 },
    { publicId: "p2", displayName: "Joueur B", pmr: 5.0, reliability: 50 },
    { publicId: "p3", displayName: "Joueur C", pmr: 4.8, reliability: 50 },
    { publicId: "p4", displayName: "Joueur D", pmr: 5.2, reliability: 50 },
  ]);

  // État du score (3 sets)
  const [sets, setSets] = useState<
    [PostMatchScoreSet, PostMatchScoreSet, PostMatchScoreSet]
  >([
    { team1Games: null, team2Games: null },
    { team1Games: null, team2Games: null },
    { team1Games: null, team2Games: null },
  ]);

  // Résultats après simulation (null avant simulation)
  const [results, setResults] = useState<PostMatchResult[] | null>(null);

  // Validation du score
  const [isScoreValid, setIsScoreValid] = useState(false);

  // UX auto : Auto-clear set3 si le match devient 2-0 ou 0-2
  useEffect(() => {
    const set1 = sets[0];
    const set2 = sets[1];
    const set3 = sets[2];

    // Si set1 et set2 sont remplis, vérifier s'il faut clear set3
    if (
      set1.team1Games !== null &&
      set1.team2Games !== null &&
      set2.team1Games !== null &&
      set2.team2Games !== null
    ) {
      let team1Sets = 0;
      let team2Sets = 0;

      if (set1.team1Games > set1.team2Games) team1Sets++;
      else team2Sets++;

      if (set2.team1Games > set2.team2Games) team1Sets++;
      else team2Sets++;

      const isTied = team1Sets === 1 && team2Sets === 1;

      // Si pas d'égalité et que set3 n'est pas vide, le vider
      if (
        !isTied &&
        (set3.team1Games !== null || set3.team2Games !== null)
      ) {
        setSets((prev) => [
          prev[0],
          prev[1],
          { team1Games: null, team2Games: null },
        ]);
      }
    }
  }, [sets]);

  // UX auto : Reset results si PMR ou score change
  useEffect(() => {
    setResults(null);
  }, [players, sets]);

  // Validation du score en temps réel
  useEffect(() => {
    try {
      postMatchScoreSchema.parse({
        set1: sets[0],
        set2: sets[1],
        set3: sets[2],
      });
      setIsScoreValid(true);
    } catch {
      setIsScoreValid(false);
    }
  }, [sets]);

  /**
   * Met à jour le PMR d'un joueur (avec clamp 0.1-8.9)
   */
  const updatePlayerPmr = (playerIndex: number, newPmr: number) => {
    const clampedPmr = clampPmr(newPmr);
    setPlayers((prev) => {
      const updated = [...prev] as [
        PostMatchPlayer,
        PostMatchPlayer,
        PostMatchPlayer,
        PostMatchPlayer
      ];
      const player = updated[playerIndex]!; // Non-null assertion: playerIndex is always 0-3
      updated[playerIndex] = {
        publicId: player.publicId,
        displayName: player.displayName,
        pmr: clampedPmr,
        reliability: player.reliability,
      };
      return updated;
    });
  };

  /**
   * Met à jour la reliability d'un joueur (avec clamp 0-100)
   */
  const updatePlayerReliability = (playerIndex: number, newReliability: number) => {
    const clampedReliability = clampReliability(newReliability);
    setPlayers((prev) => {
      const updated = [...prev] as [
        PostMatchPlayer,
        PostMatchPlayer,
        PostMatchPlayer,
        PostMatchPlayer
      ];
      const player = updated[playerIndex]!; // Non-null assertion: playerIndex is always 0-3
      updated[playerIndex] = {
        publicId: player.publicId,
        displayName: player.displayName,
        pmr: player.pmr,
        reliability: clampedReliability,
      };
      return updated;
    });
  };

  /**
   * Met à jour un set (avec parsing string → number | null)
   */
  const updateSet = (
    setIndex: number,
    team: "team1" | "team2",
    value: string
  ) => {
    const parsed = value === "" ? null : parseInt(value, 10);
    const games = parsed !== null && !isNaN(parsed) ? parsed : null;

    setSets((prev) => {
      const updated = [...prev] as [
        PostMatchScoreSet,
        PostMatchScoreSet,
        PostMatchScoreSet
      ];
      const currentSet = updated[setIndex]!; // Non-null assertion: setIndex is always 0-2
      if (team === "team1") {
        updated[setIndex] = {
          team1Games: games,
          team2Games: currentSet.team2Games,
        };
      } else {
        updated[setIndex] = {
          team1Games: currentSet.team1Games,
          team2Games: games,
        };
      }
      return updated;
    });
  };

  /**
   * Simulation de l'évolution du PMR avec l'algorithme réel
   * Utilise computePmrAfterMatch de lib/pmr-adjustment.ts
   */
  const simulate = (): PostMatchResult[] => {
    // Mapping des données vers le format de l'algo
    const input = {
      team1: [
        { id: players[0].publicId, pmr: players[0].pmr, reliability: players[0].reliability },
        { id: players[1].publicId, pmr: players[1].pmr, reliability: players[1].reliability },
      ] as [{ id: string; pmr: number; reliability: number }, { id: string; pmr: number; reliability: number }],
      team2: [
        { id: players[2].publicId, pmr: players[2].pmr, reliability: players[2].reliability },
        { id: players[3].publicId, pmr: players[3].pmr, reliability: players[3].reliability },
      ] as [{ id: string; pmr: number; reliability: number }, { id: string; pmr: number; reliability: number }],
      sets: [sets[0], sets[1], sets[2]] as [
        { team1Games: number | null; team2Games: number | null },
        { team1Games: number | null; team2Games: number | null },
        { team1Games: number | null; team2Games: number | null }?
      ],
    };

    // Appel de l'algorithme réel
    const algoResults = computePmrAfterMatch(input);

    // Mapping des résultats vers le format d'affichage
    const simulationResults: PostMatchResult[] = algoResults.map((result) => {
      const player = players.find((p) => p.publicId === result.playerId)!;
      return {
        playerPublicId: result.playerId,
        displayName: player.displayName,
        previousPmr: result.previousPmr,
        newPmr: result.newPmr,
        delta: result.delta,
        previousReliability: result.previousReliability,
        newReliability: result.newReliability,
        deltaReliability: result.deltaReliability,
      };
    });

    setResults(simulationResults);
    return simulationResults;
  };

  return {
    // État
    players,
    sets,
    results,
    isScoreValid,

    // Actions
    updatePlayerPmr,
    updatePlayerReliability,
    updateSet,
    simulate,

    // Helpers
    team1: [players[0], players[1]] as [PostMatchPlayer, PostMatchPlayer],
    team2: [players[2], players[3]] as [PostMatchPlayer, PostMatchPlayer],
  };
}
