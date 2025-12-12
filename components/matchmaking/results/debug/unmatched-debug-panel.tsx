import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import type { MatchingPhase } from "@/types/api";
import { extractDebugInfoForUnmatchedGroup } from "@/lib/matchmaking-report-utils";

interface UnmatchedDebugPanelProps {
  groupId: string;
  phases: MatchingPhase[];
}

export function UnmatchedDebugPanel({
  groupId,
  phases,
}: UnmatchedDebugPanelProps) {
  // Extraction LAZY : seulement quand ce composant est monté (accordion ouvert)
  const debugInfo = useMemo(
    () => extractDebugInfoForUnmatchedGroup(groupId, phases),
    [groupId, phases]
  );

  return (
    <div className="space-y-3">
      <Accordion type="single" collapsible className="bg-white rounded border">
        {/* Buckets considérés */}
        <AccordionItem value="buckets">
          <AccordionTrigger className="px-4 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span>🪣 Buckets considérés</span>
              <Badge variant="outline">{debugInfo.bucketsConsidered.length}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-2">
              {debugInfo.bucketsConsidered.length === 0 && (
                <p className="text-sm text-gray-500">
                  Aucun bucket n&apos;a considéré ce groupe.
                </p>
              )}
              {debugInfo.bucketsConsidered.map((bucket) => (
                <div
                  key={bucket.bucketId}
                  className={`p-3 rounded border ${
                    bucket.kept
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-xs bg-white px-2 py-1 rounded border">
                      {bucket.bucketId}
                    </code>
                    {bucket.kept ? (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-green-800">
                          Conservé
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-medium text-red-800">
                          Filtré
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    <div>
                      <p className="text-gray-500">Club</p>
                      <p className="font-medium">{bucket.club}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Horaire</p>
                      <p className="font-medium">{bucket.start}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500">Type</p>
                      <Badge variant={bucket.anchor ? "default" : "outline"}>
                        {bucket.anchor ? "Ancré" : "Virtuel"}
                      </Badge>
                    </div>
                  </div>
                  {bucket.reservedBy && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                      <p className="text-xs font-medium text-blue-900 mb-1">
                        Réservé par :
                      </p>
                      <div className="space-y-0.5 text-xs text-blue-800">
                        <p>
                          <span className="font-medium">Groupe :</span>{" "}
                          {bucket.reservedBy.groupPublicId}
                        </p>
                        <p>
                          <span className="font-medium">Créateur :</span>{" "}
                          {bucket.reservedBy.creator}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 p-2 bg-gray-50 rounded">
                    <p className="text-xs font-medium text-gray-700 mb-1">
                      Raison :
                    </p>
                    <p className="text-xs text-gray-600">{bucket.reason}</p>
                  </div>
                </div>
              ))}
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
                          {rejection.groupsAffected.map((affectedGroupId) => (
                            <code
                              key={affectedGroupId}
                              className="text-xs bg-white px-2 py-0.5 rounded border border-red-200"
                            >
                              {affectedGroupId}
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

      {/* Message si aucune info */}
      {debugInfo.bucketsConsidered.length === 0 &&
        debugInfo.rejections.length === 0 && (
          <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded">
            Aucune information de debug disponible pour ce groupe.
          </div>
        )}
    </div>
  );
}
