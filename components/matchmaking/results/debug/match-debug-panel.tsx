import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle, AlertTriangle } from "lucide-react";
import type { MatchingPhase } from "@/types/api";
import { extractDebugInfoForMatch } from "@/lib/matchmaking-report-utils";

interface MatchDebugPanelProps {
  matchId: string;
  phases: MatchingPhase[];
}

export function MatchDebugPanel({ matchId, phases }: MatchDebugPanelProps) {
  // Extraction LAZY : seulement quand ce composant est monté (accordion ouvert)
  const debugInfo = useMemo(
    () => extractDebugInfoForMatch(matchId, phases),
    [matchId, phases]
  );

  if (!debugInfo) {
    return (
      <Alert variant="default" className="bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-900">Debug indisponible (payload lite)</AlertTitle>
        <AlertDescription className="text-amber-800">
          Le rapport de matchmaking actuel utilise un format allégé sans détails de
          debug (candidates, checks, processing logs). Pour obtenir des informations
          détaillées, le backend doit renvoyer un rapport complet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <Accordion type="single" collapsible className="bg-white rounded border">
        {/* Bucket */}
        <AccordionItem value="bucket">
          <AccordionTrigger className="px-4 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span>🪣 Bucket</span>
              <Badge variant="outline">
                {debugInfo.bucket.anchor ? "Ancré" : "Virtuel"}
              </Badge>
              {debugInfo.bucket.kept && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500">Bucket ID</p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {debugInfo.bucket.bucketId}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Club</p>
                  <p className="font-medium">{debugInfo.bucket.club}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Horaire</p>
                  <p className="font-medium">{debugInfo.bucket.start}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <Badge variant={debugInfo.bucket.anchor ? "default" : "outline"}>
                    {debugInfo.bucket.anchor ? "Ancré" : "Virtuel"}
                  </Badge>
                </div>
              </div>
              {debugInfo.bucket.reservedBy && (
                <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-100">
                  <p className="text-xs font-medium text-blue-900 mb-2">
                    Réservé par :
                  </p>
                  <div className="space-y-1 text-xs text-blue-800">
                    <p>
                      <span className="font-medium">Groupe :</span>{" "}
                      {debugInfo.bucket.reservedBy.groupPublicId}
                    </p>
                    <p>
                      <span className="font-medium">Créateur :</span>{" "}
                      {debugInfo.bucket.reservedBy.creator}
                    </p>
                    <p>
                      <span className="font-medium">Court :</span>{" "}
                      {debugInfo.bucket.reservedBy.courtId}
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-3 p-3 bg-gray-50 rounded">
                <p className="text-xs font-medium text-gray-700 mb-1">Raison :</p>
                <p className="text-xs text-gray-600">{debugInfo.bucket.reason}</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Candidats */}
        <AccordionItem value="candidates">
          <AccordionTrigger className="px-4 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span>🧩 Candidats générés</span>
              <Badge variant="outline">{debugInfo.candidates.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-3">
              {debugInfo.candidates.length === 0 && (
                <p className="text-sm text-gray-500">Aucun candidat généré.</p>
              )}
              {debugInfo.candidates.map((candidate) => (
                <div
                  key={candidate.candidateId}
                  className={`p-3 rounded border ${
                    candidate.selected
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-xs bg-white px-2 py-1 rounded border">
                      {candidate.candidateId}
                    </code>
                    {candidate.selected ? (
                      <Badge className="bg-green-600">✓ Sélectionné</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-white">
                        Non sélectionné
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                    <div>
                      <p className="text-gray-500">PMR Équipe 1</p>
                      <p className="font-medium">{candidate.avgTeam1.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">PMR Équipe 2</p>
                      <p className="font-medium">{candidate.avgTeam2.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Score</p>
                      <p className="font-medium">{candidate.score}</p>
                    </div>
                  </div>
                  {candidate.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-800">
                      <span className="font-medium">Rejeté :</span>{" "}
                      {candidate.rejectionReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Checks */}
        <AccordionItem value="checks">
          <AccordionTrigger className="px-4 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span>✓ Vérifications</span>
              <Badge variant="outline">{debugInfo.checks.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-2">
              {debugInfo.checks.length === 0 && (
                <p className="text-sm text-gray-500">Aucune vérification.</p>
              )}
              {debugInfo.checks.map((check, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs"
                >
                  {check.details.pass === true ? (
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : check.details.pass === false ? (
                    <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{check.name}</p>
                    <div className="mt-1 space-y-0.5 text-gray-600">
                      {check.details.gap !== undefined && (
                        <p>Gap : {check.details.gap.toFixed(2)}</p>
                      )}
                      {check.details.maxAllowed !== undefined && (
                        <p>Max autorisé : {check.details.maxAllowed.toFixed(2)}</p>
                      )}
                      {check.details.valid !== undefined && (
                        <p>Valide : {check.details.valid ? "Oui" : "Non"}</p>
                      )}
                      {check.details.reason && (
                        <p className="text-red-600">{check.details.reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Slot Validation */}
        <AccordionItem value="slot">
          <AccordionTrigger className="px-4 py-2 text-sm">
            <span>📅 Validation slot</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 rounded border border-blue-100">
                <p className="text-xs font-medium text-blue-900 mb-2">
                  {debugInfo.slotValidation.skipValidation
                    ? "⏭️ Validation ignorée"
                    : "✓ Validation effectuée"}
                </p>
                <p className="text-xs text-blue-800">
                  {debugInfo.slotValidation.reason}
                </p>
              </div>
              {debugInfo.slotValidation.compatibleSlots.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Créneaux compatibles ({debugInfo.slotValidation.compatibleSlots.length}) :
                  </p>
                  <div className="space-y-2">
                    {debugInfo.slotValidation.compatibleSlots.map((slot, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-white rounded border text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{slot.club}</span>
                          <Badge variant="outline" className="text-xs">
                            {slot.source}
                          </Badge>
                        </div>
                        <div className="mt-1 text-gray-600 space-y-0.5">
                          <p>Court : {slot.courtId}</p>
                          <p>
                            {slot.start} - {slot.end}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Rejections */}
        {debugInfo.rejections.length > 0 && (
          <AccordionItem value="rejections">
            <AccordionTrigger className="px-4 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span>⚠️ Rejets</span>
                <Badge variant="outline" className="bg-red-50 text-red-800">
                  {debugInfo.rejections.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-2">
                {debugInfo.rejections.map((rejection, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-red-50 rounded border border-red-100 text-xs"
                  >
                    <p className="font-medium text-red-900 mb-1">
                      {rejection.reason}
                    </p>
                    <p className="text-red-800 mb-2">{rejection.details}</p>
                    {rejection.groupsAffected.length > 0 && (
                      <div>
                        <p className="text-red-700 font-medium mb-1">
                          Groupes affectés :
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {rejection.groupsAffected.map((groupId) => (
                            <code
                              key={groupId}
                              className="text-xs bg-white px-2 py-0.5 rounded border border-red-200"
                            >
                              {groupId}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
