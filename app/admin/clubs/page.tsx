"use client";

import { useState } from "react";
import Link from "next/link";
import { useClubs } from "@/hooks/use-clubs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatReservationSystem(system: string | undefined): string {
  if (!system) return "-";

  // Mapping des valeurs backend vers affichage court
  const mapping: Record<string, string> = {
    GESTION_SPORTS: "GestionSports",
    DOIN_SPORT: "DoinSport",
    TENUP: "TenUp",
  };

  return mapping[system] || system;
}

export default function ClubsPage() {
  // Page is 0-indexed for backend API
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20; // Backend default

  const { data, isLoading, isError } = useClubs({
    page: currentPage,
    size: pageSize,
    sortBy: "name",
    sortDir: "asc",
  });

  // Extract data from Spring Page structure
  const clubs = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
        <p className="text-gray-600 mt-1">
          Gérer les clubs de padel référencés
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des clubs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600">Chargement...</p>
            </div>
          )}

          {isError && (
            <div className="text-center py-8 text-red-600">
              Une erreur est survenue lors du chargement des clubs.
            </div>
          )}

          {data && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Dép.</TableHead>
                    <TableHead>LR</TableHead>
                    <TableHead className="text-right">Fav</TableHead>
                    <TableHead className="text-right">Match</TableHead>
                    <TableHead>Vérifié</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Scraped</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clubs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        Aucun club trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clubs.map((club) => (
                      <TableRow key={club.id}>
                        <TableCell className="font-medium">{club.name}</TableCell>
                        <TableCell>{club.city}</TableCell>
                        <TableCell>{club.department}</TableCell>
                        <TableCell>{formatReservationSystem(club.reservationSystem)}</TableCell>
                        <TableCell className="text-right">{club.favoriteCount}</TableCell>
                        <TableCell className="text-right">{club.matchCount}</TableCell>
                        <TableCell>
                          {club.verified ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-gray-400">✗</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {club.lastAdminUpdateAt ? formatDate(club.lastAdminUpdateAt) : "-"}
                        </TableCell>
                        <TableCell>
                          {club.lastScrapedAt ? formatDate(club.lastScrapedAt) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/clubs/${club.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Voir
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Page {currentPage + 1} sur {totalPages} ({totalElements} résultats)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage === totalPages - 1}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
