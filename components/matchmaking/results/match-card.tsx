import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MapPin, Calendar, Trophy, Eye } from "lucide-react";
import type { CreatedMatchViewModel, MatchingPhase } from "@/types/api";
import { PlayerSlotReadOnly } from "./player-slot-readonly";
import { MatchDebugPanel } from "./debug/match-debug-panel";

interface MatchCardProps {
  match: CreatedMatchViewModel;
  debugMode: boolean;
  phases: MatchingPhase[];
}

export function MatchCard({ match, debugMode, phases }: MatchCardProps) {
  const [debugExpanded, setDebugExpanded] = useState(false);

  const formatDateTime = (date: Date): string => {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "PENDING_CAPTAIN_CHOICE":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "CONFIRMED":
        return "bg-green-100 text-green-800 border-green-300";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-600" />
              <CardTitle className="text-lg">{match.club}</CardTitle>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(match.slot.start)}</span>
              </div>
              <div>
                {formatDateTime(match.slot.start)} - {formatDateTime(match.slot.end)}
              </div>
              <Badge variant="outline" className="bg-white">
                Court {match.slot.courtId}
              </Badge>
            </div>
          </div>
          <Badge variant="outline" className={getStatusColor(match.status)}>
            {match.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Layout 2v2 */}
        <div className="flex items-center justify-center gap-4 p-4 bg-white rounded-lg border border-green-100">
          {/* Équipe 1 */}
          <div className="flex items-center gap-3">
            {match.team1.map((player, idx) => (
              <PlayerSlotReadOnly
                key={idx}
                name={player.name}
                pmr={player.pmr}
                position={player.position}
              />
            ))}
          </div>

          {/* Séparateur */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-px h-16 bg-gray-300" />
            <span className="text-xs font-medium text-gray-500">VS</span>
            <div className="w-px h-16 bg-gray-300" />
          </div>

          {/* Équipe 2 */}
          <div className="flex items-center gap-3">
            {match.team2.map((player, idx) => (
              <PlayerSlotReadOnly
                key={idx}
                name={player.name}
                pmr={player.pmr}
                position={player.position}
              />
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="p-2 bg-white rounded border border-green-100">
            <p className="text-xs text-gray-500">PMR Équipe 1</p>
            <p className="font-semibold text-gray-900">{match.stats.avgTeam1.toFixed(2)}</p>
          </div>
          <div className="p-2 bg-white rounded border border-green-100">
            <p className="text-xs text-gray-500">PMR Équipe 2</p>
            <p className="font-semibold text-gray-900">{match.stats.avgTeam2.toFixed(2)}</p>
          </div>
          <div className="p-2 bg-white rounded border border-green-100">
            <p className="text-xs text-gray-500">Qualité</p>
            <p className="font-semibold text-gray-900">{match.stats.quality.toFixed(2)}</p>
          </div>
          <div className="p-2 bg-white rounded border border-green-100 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-xs text-gray-500">Score</p>
              <p className="font-semibold text-gray-900">{match.stats.score}</p>
            </div>
          </div>
        </div>

        {/* Capitaine */}
        <div className="text-sm text-gray-600 bg-white p-2 rounded border border-green-100">
          <span className="font-medium">Capitaine :</span> {match.captain}
        </div>

        {/* Debug accordion (si debugMode activé) */}
        {debugMode && (
          <Accordion
            type="single"
            collapsible
            onValueChange={(value: string) => setDebugExpanded(value === "debug")}
          >
            <AccordionItem value="debug" className="border-green-200">
              <AccordionTrigger className="text-sm font-medium text-green-900 py-2 px-3 bg-white rounded hover:bg-green-50">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>🔍 Voir pourquoi ce match a été créé</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-3">
                {debugExpanded && (
                  <MatchDebugPanel matchId={match.matchId} phases={phases} />
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
