import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UserX, MapPin, Clock, Eye } from "lucide-react";
import type { UnmatchedGroupViewModel, MatchingPhase } from "@/types/api";
import { PlayerSlotReadOnly } from "./player-slot-readonly";
import { UnmatchedDebugPanel } from "./debug/unmatched-debug-panel";

interface UnmatchedGroupCardProps {
  group: UnmatchedGroupViewModel;
  debugMode: boolean;
  phases: MatchingPhase[];
}

export function UnmatchedGroupCard({
  group,
  debugMode,
  phases,
}: UnmatchedGroupCardProps) {
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
    });
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-red-600" />
              <CardTitle className="text-lg">Groupe non matché</CardTitle>
            </div>
            <Badge variant="outline" className="bg-white">
              {group.type}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Joueurs */}
        <div className="flex items-center justify-center gap-3 p-4 bg-white rounded-lg border border-red-100">
          {group.players.map((player, idx) => (
            <PlayerSlotReadOnly
              key={idx}
              name={player.name}
              pmr={player.pmr}
              position={undefined}
            />
          ))}
          {/* Remplir jusqu'à 4 slots si moins de joueurs */}
          {Array.from({ length: 4 - group.players.length }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="w-12 h-12 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center"
            >
              <span className="text-gray-300">-</span>
            </div>
          ))}
        </div>

        {/* Raison */}
        <div className="text-sm text-gray-700 bg-white p-3 rounded-md border border-red-100">
          <p className="font-medium text-red-900 mb-1">Raison :</p>
          <p>{group.reason}</p>
        </div>

        {/* Fenêtre horaire et clubs */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-2 bg-white rounded border border-red-100">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-gray-500" />
              <p className="text-xs text-gray-500">Fenêtre horaire</p>
            </div>
            <p className="text-xs font-medium text-gray-900">
              {formatDate(group.timeWindow.start)}{" "}
              {formatDateTime(group.timeWindow.start)}
            </p>
            <p className="text-xs font-medium text-gray-900">
              → {formatDateTime(group.timeWindow.end)}
            </p>
          </div>
          <div className="p-2 bg-white rounded border border-red-100">
            <div className="flex items-center gap-1 mb-1">
              <MapPin className="h-3 w-3 text-gray-500" />
              <p className="text-xs text-gray-500">Clubs</p>
            </div>
            {group.clubs.map((club, idx) => (
              <p key={idx} className="text-xs font-medium text-gray-900">
                {club}
              </p>
            ))}
          </div>
        </div>

        {/* ID */}
        <div className="text-xs text-gray-500">
          <p>ID : {group.publicId}</p>
        </div>

        {/* Debug accordion (si debugMode activé) */}
        {debugMode && (
          <Accordion
            type="single"
            collapsible
            onValueChange={(value: string) => setDebugExpanded(value === "debug")}
          >
            <AccordionItem value="debug" className="border-red-200">
              <AccordionTrigger className="text-sm font-medium text-red-900 py-2 px-3 bg-white rounded hover:bg-red-50">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>🔍 Voir pourquoi ce groupe n&apos;a pas été matché</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-3">
                {debugExpanded && (
                  <UnmatchedDebugPanel groupId={group.publicId} phases={phases} />
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
