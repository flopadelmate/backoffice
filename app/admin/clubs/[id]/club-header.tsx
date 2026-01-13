"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, MapPin, Copy, Star, Heart, Trophy } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClubBackofficeDetailDto, ReservationSystem } from "@/types/api";
import type { ClubDraft } from "./utils";
import { OverridableFieldWrapper } from "@/components/overridable-field-wrapper";
import { useState } from "react";

interface ClubHeaderProps {
  clubApi: ClubBackofficeDetailDto | null;
  draft: ClubDraft;
  onUpdate: (updates: Partial<ClubDraft>) => void;
  inputClassName: string;
}

export function ClubHeader({
  clubApi,
  draft,
  onUpdate,
  inputClassName,
}: ClubHeaderProps) {
  const [copiedPublicId, setCopiedPublicId] = useState(false);
  const [copiedPlaceId, setCopiedPlaceId] = useState(false);

  const handleCopyPublicId = async () => {
    if (!clubApi) return;
    await navigator.clipboard.writeText(clubApi.publicId);
    setCopiedPublicId(true);
    setTimeout(() => setCopiedPublicId(false), 2000);
  };

  const handleCopyPlaceId = async () => {
    if (!clubApi) return;
    await navigator.clipboard.writeText(clubApi.externalId);
    setCopiedPlaceId(true);
    setTimeout(() => setCopiedPlaceId(false), 2000);
  };

  const handleOpenReservationUrl = () => {
    if (draft.reservationUrl) {
      window.open(draft.reservationUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenMaps = () => {
    if (!clubApi) return;
    window.open(clubApi.googleMapsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        {/* Name + verified + reservationSystem */}
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Name - With override indicator */}
            <div>
              <Label htmlFor="name">Nom du club</Label>
              {clubApi ? (
                <OverridableFieldWrapper
                  overridableValue={clubApi.name}
                  fieldLabel="Nom du club"
                >
                  <Input
                    id="name"
                    value={draft.name}
                    onChange={(e) => onUpdate({ name: e.target.value })}
                    className={inputClassName}
                  />
                </OverridableFieldWrapper>
              ) : (
                <Input
                  id="name"
                  value={draft.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  className={inputClassName}
                />
              )}
            </div>

            {/* Verified - Switch always active */}
            <div className="space-y-2">
              <Label>Vérifié</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={draft.verified}
                  onCheckedChange={(checked: boolean) =>
                    onUpdate({ verified: checked })
                  }
                />
                <span className="text-sm text-gray-600">
                  {draft.verified ? "Oui" : "Non"}
                </span>
              </div>
            </div>
          </div>

          {/* ReservationUrl + ReservationSystem */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* ReservationUrl - Input direct */}
            <div>
              <Label htmlFor="reservationUrl">URL de réservation</Label>
              <Input
                id="reservationUrl"
                type="url"
                value={draft.reservationUrl || ""}
                onChange={(e) => onUpdate({ reservationUrl: e.target.value })}
                className={inputClassName}
                placeholder="https://..."
              />
            </div>

            {/* ReservationSystem - Select always active with "UNKNOWN" = pas de système */}
            <div>
              <Label htmlFor="reservationSystem">Système de réservation</Label>
              <Select
                value={draft.reservationSystem ?? "UNKNOWN"}
                onValueChange={(value) =>
                  onUpdate({
                    reservationSystem: value as ReservationSystem,
                  })
                }
              >
                <SelectTrigger id="reservationSystem" className={inputClassName}>
                  <SelectValue placeholder="Inconnu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GESTION_SPORTS">Gestion Sports</SelectItem>
                  <SelectItem value="DOIN_SPORT">Doin Sport</SelectItem>
                  <SelectItem value="TENUP">TenUp</SelectItem>
                  <SelectItem value="NOT_IMPLEMENTED">Non implémenté</SelectItem>
                  <SelectItem value="UNKNOWN">Inconnu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* KPIs - Read-only */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Star className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-xs text-gray-600">Note Google</p>
              <p className="text-sm font-semibold">
                {clubApi?.googleRating != null ? (
                  <>
                    {clubApi.googleRating.toFixed(1)}/5
                    {clubApi.googleReviewCount != null &&
                      clubApi.googleReviewCount > 0 && (
                        <span className="text-xs text-gray-500 ml-1">
                          ({clubApi.googleReviewCount} avis)
                        </span>
                      )}
                  </>
                ) : (
                  <span className="text-gray-400 text-xs">Non renseigné</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Heart className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-xs text-gray-600">Favoris</p>
              <p className="text-sm font-semibold">{clubApi?.favoriteCount ?? 0}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Trophy className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xs text-gray-600">Matchs créés</p>
              <p className="text-sm font-semibold">{clubApi?.matchCount ?? 0}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Public ID</p>
              <p className="text-xs font-mono truncate">
                {clubApi?.publicId ?? "-"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="text-xs text-gray-600">Place ID</p>
              <p className="text-xs font-mono truncate">
                {clubApi?.externalId ?? "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {draft.reservationUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenReservationUrl}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Ouvrir réservation
            </Button>
          )}

          {clubApi?.googleMapsUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenMaps}
              className="gap-2"
            >
              <MapPin className="h-4 w-4" />
              Voir sur Maps
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPublicId}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            {copiedPublicId ? "Copié !" : "Copier Public ID"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPlaceId}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            {copiedPlaceId ? "Copié !" : "Copier Place ID"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
