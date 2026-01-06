"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ClubBackofficeDetailDto } from "@/types/api";

interface ClubCourtsProps {
  draft: ClubBackofficeDetailDto;
}

export function ClubCourts({ draft }: ClubCourtsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Terrains ({draft.courts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {draft.courts.length > 0 ? (
          <div className="space-y-3">
            {draft.courts.map((court, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{court.name}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {court.sportType}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {court.surface}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        court.indoor
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-green-50 text-green-700 border-green-200"
                      }`}
                    >
                      {court.indoor ? "Intérieur" : "Extérieur"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Aucun terrain renseigné
          </p>
        )}
      </CardContent>
    </Card>
  );
}
