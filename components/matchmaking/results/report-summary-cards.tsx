import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Copy, CheckCircle, Bug, Clock, Users, UserX, Timer } from "lucide-react";
import type { ReportCounts, ReportMeta, MatchingSummary } from "@/types/api";
import { useState } from "react";

interface ReportSummaryCardsProps {
  counts: ReportCounts;
  meta: ReportMeta;
  hasSummaryDivergence: boolean;
  summaryFromBackend: MatchingSummary;
  debugMode: boolean;
  onToggleDebug: (enabled: boolean) => void;
}

export function ReportSummaryCards({
  counts,
  meta,
  hasSummaryDivergence,
  summaryFromBackend,
  debugMode,
  onToggleDebug,
}: ReportSummaryCardsProps) {
  const [copied, setCopied] = useState(false);

  const copyRunId = () => {
    navigator.clipboard.writeText(meta.runId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDateTime = (date: Date): string => {
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header avec runId et toggle debug */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-500">Run ID</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-gray-900">{meta.runId}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyRunId}
                className="h-6 w-6 p-0"
              >
                {copied ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-300" />
          <div>
            <p className="text-xs text-gray-500">Exécuté le</p>
            <p className="text-sm font-medium text-gray-900">
              {formatDateTime(meta.executionTime)}
            </p>
          </div>
        </div>
        <Button
          variant={debugMode ? "default" : "outline"}
          size="sm"
          onClick={() => onToggleDebug(!debugMode)}
        >
          <Bug className="h-4 w-4 mr-2" />
          {debugMode ? "Mode Debug ON" : "Mode Debug OFF"}
        </Button>
      </div>

      {/* Warning divergence si nécessaire */}
      {hasSummaryDivergence && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="bg-yellow-100 text-yellow-900 border-yellow-300">
              ⚠️ Divergence détectée
            </Badge>
          </div>
          <Accordion type="single" collapsible className="mt-2">
            <AccordionItem value="divergence" className="border-none">
              <AccordionTrigger className="text-sm font-medium text-yellow-900 py-2">
                Voir les différences entre le summary backend et les données calculées
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700 mb-2">Calculé (UI)</p>
                    <ul className="space-y-1 text-gray-600">
                      <li>Matchs créés : {counts.matchesCreated}</li>
                      <li>Joueurs matchés : {counts.playersMatched}</li>
                      <li>Joueurs non matchés : {counts.playersUnmatched}</li>
                      <li>Groupes expirés : {counts.expiredGroups}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 mb-2">Backend (summary)</p>
                    <ul className="space-y-1 text-gray-600">
                      <li>Matchs créés : {summaryFromBackend.matchesCreated}</li>
                      <li>Joueurs matchés : {summaryFromBackend.playersMatched}</li>
                      <li>Joueurs non matchés : {summaryFromBackend.playersUnmatched}</li>
                      <li>Groupes expirés : {summaryFromBackend.groupsExpired}</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {/* Grid de metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {counts.groupsProcessed}
                </p>
                <p className="text-xs text-gray-600">Groupes traités</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">
                  {counts.matchesCreated}
                </p>
                <p className="text-xs text-gray-600">Matchs créés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">
                  {counts.playersMatched}
                </p>
                <p className="text-xs text-gray-600">Joueurs matchés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-900">
                  {counts.playersUnmatched}
                </p>
                <p className="text-xs text-gray-600">Joueurs non matchés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-900">
                  {counts.expiredGroups}
                </p>
                <p className="text-xs text-gray-600">Groupes expirés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Timer className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900">
                  {meta.durationMs}
                </p>
                <p className="text-xs text-gray-600">ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
