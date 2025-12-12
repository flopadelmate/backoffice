import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle } from "lucide-react";
import type { ExpiredGroupViewModel } from "@/types/api";

interface ExpiredGroupCardProps {
  group: ExpiredGroupViewModel;
}

export function ExpiredGroupCard({ group }: ExpiredGroupCardProps) {
  const formatDateTime = (date: Date): string => {
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white">
                {group.type}
              </Badge>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              Créateur : {group.creator}
            </p>
          </div>
          <Clock className="h-5 w-5 text-orange-500" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm text-gray-700 bg-white p-3 rounded-md border border-orange-100">
          <p className="font-medium text-orange-900 mb-1">Raison :</p>
          <p>{group.reason}</p>
        </div>
        <div className="text-xs text-gray-600">
          <p>
            <span className="font-medium">Fenêtre expirée :</span>{" "}
            {formatDateTime(group.timeWindowEnd)}
          </p>
          <p className="text-xs text-gray-500 mt-1">ID : {group.publicId}</p>
        </div>
      </CardContent>
    </Card>
  );
}
