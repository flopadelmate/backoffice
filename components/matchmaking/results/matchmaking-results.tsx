"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MatchmakingReport } from "@/types/api";
import { transformReportToViewModel } from "@/lib/matchmaking-report-utils";
import { ReportSummaryCards } from "./report-summary-cards";
import { MatchCard } from "./match-card";
import { UnmatchedGroupCard } from "./unmatched-group-card";
import { ExpiredGroupCard } from "./expired-group-card";

interface MatchmakingResultsProps {
  report: MatchmakingReport;
}

export function MatchmakingResults({ report }: MatchmakingResultsProps) {
  const [debugMode, setDebugMode] = useState(false);

  // Transformation du rapport (pas de debugInfo ici, il sera calculé lazy par card)
  const viewModel = useMemo(() => transformReportToViewModel(report), [report]);

  return (
    <div className="space-y-6">
      {/* Summary cards avec toggle debug */}
      <ReportSummaryCards
        counts={viewModel.counts}
        meta={viewModel.meta}
        hasSummaryDivergence={viewModel.hasSummaryDivergence}
        summaryFromBackend={viewModel.summaryFromBackend}
        debugMode={debugMode}
        onToggleDebug={setDebugMode}
      />

      {/* Tabs pour organiser les résultats */}
      <Tabs defaultValue="matches" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matches">
            Matchs ({viewModel.counts.matchesCreated})
          </TabsTrigger>
          <TabsTrigger value="unmatched">
            Non matchés ({viewModel.counts.unmatchedGroups})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Expirés ({viewModel.counts.expiredGroups})
          </TabsTrigger>
        </TabsList>

        {/* Tab Matchs créés */}
        <TabsContent value="matches" className="space-y-4">
          {viewModel.createdMatches.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
              <p className="text-lg font-medium">Aucun match créé</p>
              <p className="text-sm mt-1">
                Le matchmaking n&apos;a trouvé aucune combinaison valide.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {viewModel.createdMatches.map((match) => (
                <MatchCard
                  key={match.matchId}
                  match={match}
                  debugMode={debugMode}
                  phases={report.phases}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab Groupes non matchés */}
        <TabsContent value="unmatched" className="space-y-4">
          {viewModel.unmatchedGroups.length === 0 ? (
            <div className="text-center py-12 text-green-500 bg-green-50 rounded-lg border border-dashed border-green-200">
              <p className="text-lg font-medium">Tous les groupes ont été matchés !</p>
              <p className="text-sm mt-1">
                Aucun groupe en attente de match.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {viewModel.unmatchedGroups.map((group) => (
                <UnmatchedGroupCard
                  key={group.publicId}
                  group={group}
                  debugMode={debugMode}
                  phases={report.phases}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab Groupes expirés */}
        <TabsContent value="expired" className="space-y-4">
          {viewModel.expiredGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
              <p className="text-lg font-medium">Aucun groupe expiré</p>
              <p className="text-sm mt-1">
                Tous les groupes sont dans leur fenêtre horaire valide.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {viewModel.expiredGroups.map((group) => (
                <ExpiredGroupCard key={group.publicId} group={group} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
