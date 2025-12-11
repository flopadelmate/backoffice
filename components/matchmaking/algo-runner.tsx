"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useTestPlayers,
  useRunMatchmaking,
  useMatchmakingLogs,
} from "@/hooks/use-matchmaking";
import { Play, AlertCircle, CheckCircle, Clock, Info } from "lucide-react";

export function AlgoRunner() {
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const { data: players } = useTestPlayers();
  const runMutation = useRunMatchmaking();
  const { data: logs, isLoading: logsLoading } = useMatchmakingLogs(lastRunId);

  const enqueuedPlayers = players?.filter((p) => p.isEnqueued) || [];

  const handleRun = () => {
    const playerIds = enqueuedPlayers.map((p) => p.id);

    if (playerIds.length === 0) {
      alert("Aucun joueur en file. Inscrivez d'abord des joueurs.");
      return;
    }

    runMutation.mutate(playerIds, {
      onSuccess: (run) => {
        setLastRunId(run.id);
      },
    });
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case "ERROR":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "WARNING":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "INFO":
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
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
          <Button
            onClick={handleRun}
            disabled={runMutation.isPending || enqueuedPlayers.length === 0}
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

        {runMutation.isError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
            Une erreur est survenue lors du lancement du matchmaking.
          </div>
        )}

        {runMutation.isSuccess && runMutation.data && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">
                  Matchmaking terminé avec succès
                </p>
                <p className="text-sm text-green-700 mt-1">
                  {runMutation.data.matchesCreated} matchs créés pour{" "}
                  {runMutation.data.playerCount} joueurs
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-6">
          <h3 className="font-medium mb-4">
            Logs du dernier run
            {lastRunId && <span className="text-sm text-gray-500 ml-2">#{lastRunId.slice(-6)}</span>}
          </h3>

          {!lastRunId && (
            <div className="text-center py-8 text-gray-500">
              Aucun run lancé. Lancez le matchmaking pour voir les logs.
            </div>
          )}

          {lastRunId && logsLoading && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600">Chargement des logs...</p>
            </div>
          )}

          {lastRunId && !logsLoading && logs && logs.length > 0 && (
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-md border bg-white"
                >
                  <div className="mt-0.5">{getLogIcon(log.level)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {log.message}
                      </p>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString("fr-FR")}
                      </span>
                    </div>
                    {log.details && (
                      <div className="mt-1 text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
