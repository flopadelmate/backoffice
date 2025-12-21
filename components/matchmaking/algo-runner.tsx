"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlayers, useRunMatchmaking } from "@/hooks/use-matchmaking";
import { Play, Clock, CheckCircle } from "lucide-react";
import { MatchmakingResults } from "./results/matchmaking-results";
import type { MatchmakingReport } from "@/types/api";

// Type guard pour détecter si c'est un MatchmakingReport complet
function isMatchmakingReport(data: unknown): data is MatchmakingReport {
  return (
    typeof data === "object" &&
    data !== null &&
    "phases" in data &&
    "summary" in data &&
    "unmatchedGroups" in data
  );
}

function getCurrentTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function AlgoRunner() {
  const [scheduledTime, setScheduledTime] = useState<string>(getCurrentTime());
  const { data: players } = usePlayers();
  const runMutation = useRunMatchmaking();

  const enqueuedPlayers = players?.filter((p) => p.isEnqueued) || [];

  const handleRun = (dryRun: boolean) => {
    if (enqueuedPlayers.length === 0) {
      alert("Aucun joueur en file. Inscrivez d'abord des joueurs.");
      return;
    }

    runMutation.mutate({ scheduledTime, dryRun });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Algo Runner & Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
          <div>
            <p className="font-medium text-gray-900">
              {enqueuedPlayers.length} joueur{enqueuedPlayers.length > 1 ? "s" : ""}{" "}
              en file
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Prêt à lancer le matchmaking
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="scheduled-time" className="text-sm font-medium">
                Heure :
              </Label>
              <Input
                id="scheduled-time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-32"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleRun(true)}
                disabled={runMutation.isPending}
                size="lg"
                variant="outline"
              >
                {runMutation.isPending ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    En cours...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Dry Run
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleRun(false)}
                disabled={runMutation.isPending}
                size="lg"
              >
                {runMutation.isPending ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    En cours...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Lancer le matchmaking
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {runMutation.isError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            Une erreur est survenue lors du lancement du matchmaking.
          </div>
        )}

        {runMutation.isSuccess && runMutation.data && (
          <>
            {/* Détecter si c'est un MatchmakingReport complet ou juste MatchmakingRunResponse */}
            {isMatchmakingReport(runMutation.data) ? (
              // Nouveau rendu avec rapport complet
              <MatchmakingResults report={runMutation.data} />
            ) : (
              // Ancien rendu simple (fallback pour compatibilité avec l'API actuelle)
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">
                      Matchmaking terminé avec succès
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      {runMutation.data.matchCount} match
                      {runMutation.data.matchCount > 1 ? "s" : ""} créé
                      {runMutation.data.matchCount > 1 ? "s" : ""} pour
                      l&apos;heure :{" "}
                      {new Date(runMutation.data.executionTime).toLocaleTimeString(
                        "fr-FR",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
