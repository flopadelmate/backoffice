"use client";

import { useParams } from "next/navigation";
import { useClub } from "@/hooks/use-clubs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ClubDetailPage() {
  const params = useParams();
  const clubId = parseInt(params.id as string, 10);

  const { data: club, isLoading, isError } = useClub(clubId);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600">Chargement...</p>
      </div>
    );
  }

  if (isError || !club) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Club introuvable</p>
        <Link href="/admin/clubs">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à la liste
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/clubs">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la liste
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{club.name}</h1>
          <p className="text-gray-600 mt-1">Détails du club</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Nom</Label>
              <p className="mt-1">{club.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Téléphone</Label>
              <p className="mt-1">{club.phone || "-"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Adresse</Label>
              <p className="mt-1">
                {club.address.street}
                <br />
                {club.address.zipCode} {club.address.city}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Site web</Label>
              <p className="mt-1">
                {club.websiteUrl ? (
                  <a
                    href={club.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {club.websiteUrl}
                  </a>
                ) : (
                  "-"
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Métriques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Favoris</Label>
              <p className="mt-1">{club.favoriteCount}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Matchs créés</Label>
              <p className="mt-1">{club.matchCount}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Vérifié</Label>
              <p className="mt-1">{club.verified ? "Oui" : "Non"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">
                Système de réservation
              </Label>
              <p className="mt-1">{club.reservationSystem || "-"}</p>
            </div>
            {club.reservationUrl && (
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  URL de réservation
                </Label>
                <p className="mt-1">
                  <a
                    href={club.reservationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {club.reservationUrl}
                  </a>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Géolocalisation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-sm font-medium text-gray-600">Latitude</Label>
            <p className="mt-1">{club.latitude}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Longitude</Label>
            <p className="mt-1">{club.longitude}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Note Google</Label>
            <p className="mt-1">
              {club.googleRating} ({club.googleReviewCount} avis)
            </p>
          </div>
        </CardContent>
      </Card>

      {club.courts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Terrains ({club.courts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {club.courts.map((court, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="font-medium">{court.name}</p>
                  <p className="text-sm text-gray-600">
                    {court.sportType} - {court.surface} -{" "}
                    {court.indoor ? "Intérieur" : "Extérieur"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {club.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes admin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{club.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Métadonnées</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-sm font-medium text-gray-600">
              Dernière mise à jour admin
            </Label>
            <p className="mt-1">
              {club.lastAdminUpdateAt
                ? new Date(club.lastAdminUpdateAt).toLocaleString("fr-FR")
                : "-"}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">
              Dernier scraping
            </Label>
            <p className="mt-1">
              {club.lastScrapedAt
                ? new Date(club.lastScrapedAt).toLocaleString("fr-FR")
                : "-"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
