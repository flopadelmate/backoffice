"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import type { ClubBackofficeDetailDto } from "@/types/api";
import type { ClubDraft } from "./utils";
import Image from "next/image";

interface ClubPhotosAdminProps {
  clubApi: ClubBackofficeDetailDto | null;
  draft: ClubDraft;
  onUpdate: (updates: Partial<ClubDraft>) => void;
  inputClassName: string;
}

/**
 * Normalize photo URL by adding https:// protocol if missing
 * Backend may return URLs without protocol (e.g., "cdn.example.com/photo.jpg")
 */
function normalizePhotoUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `https://${url}`;
}

export function ClubPhotosAdmin({
  clubApi,
  draft,
  onUpdate,
  inputClassName,
}: ClubPhotosAdminProps) {
  if (!clubApi) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos & Administration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Photos Gallery */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Galerie photos
            <span className="text-xs text-gray-500 ml-2">
              (cliquez sur une photo pour la définir comme principale)
            </span>
          </h3>

          {clubApi.photoUrls && clubApi.photoUrls.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {clubApi.photoUrls.map((photoUrl, index) => (
                <div
                  key={index}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer hover:border-blue-400 ${
                    normalizePhotoUrl(draft.mainPhotoUrl) === normalizePhotoUrl(photoUrl)
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-200"
                  }`}
                  onClick={() => onUpdate({ mainPhotoUrl: photoUrl })}
                >
                  <Image
                    src={normalizePhotoUrl(photoUrl)}
                    alt={`Photo ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  {normalizePhotoUrl(draft.mainPhotoUrl) === normalizePhotoUrl(photoUrl) && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full">
                      <Star className="h-3 w-3 fill-current" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aucune photo disponible</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notes admin</Label>
          <Textarea
            id="notes"
            value={draft.notes || ""}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Notes internes..."
            className={inputClassName}
            rows={4}
          />
        </div>

        {/* Metadata (Read-only) */}
        <div className="border-t pt-4 mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Métadonnées techniques
          </h3>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <Label className="text-xs text-gray-600">ID interne</Label>
              <p className="font-mono">{clubApi.id}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Public ID</Label>
              <p className="font-mono text-xs">{clubApi.publicId}</p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">
                Dernière mise à jour admin
              </Label>
              <p>
                {clubApi.lastAdminUpdateAt
                  ? new Date(clubApi.lastAdminUpdateAt).toLocaleString("fr-FR")
                  : "-"}
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Dernier scraping</Label>
              <p>
                {clubApi.lastScrapedAt
                  ? new Date(clubApi.lastScrapedAt).toLocaleString("fr-FR")
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
