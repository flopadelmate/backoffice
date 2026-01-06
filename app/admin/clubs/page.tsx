"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from "lucide-react";
import type { ReservationSystem } from "@/types/api";

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

type SortField = "name" | "favoriteCount" | "matchCount" | "lastAdminUpdateAt" | "lastScrapedAt";
type SortDirection = "asc" | "desc";

export default function ClubsPage() {
  const router = useRouter();

  // Pagination state (0-indexed for backend API)
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Sort state
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  // Filter state (not applied until "Appliquer" is clicked)
  const [nameInput, setNameInput] = useState("");
  const [departmentInput, setDepartmentInput] = useState("");
  const [reservationSystemInput, setReservationSystemInput] = useState<string>("all");
  const [verifiedInput, setVerifiedInput] = useState<string>("all");

  // Applied filters (these are sent to the API)
  const [appliedName, setAppliedName] = useState<string | undefined>();
  const [appliedDepartment, setAppliedDepartment] = useState<string | undefined>();
  const [appliedReservationSystem, setAppliedReservationSystem] = useState<ReservationSystem | undefined>();
  const [appliedVerified, setAppliedVerified] = useState<boolean | undefined>();

  const { data, isLoading, isError } = useClubs({
    page: currentPage,
    size: pageSize,
    sortBy,
    sortDir,
    name: appliedName,
    department: appliedDepartment,
    reservationSystem: appliedReservationSystem,
    verified: appliedVerified,
  });

  // Extract data from Spring Page structure
  const clubs = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  // Handler: Apply filters
  const handleApplyFilters = () => {
    // Reset to page 0 when applying filters
    setCurrentPage(0);

    // Apply filters
    setAppliedName(nameInput.trim() || undefined);
    setAppliedDepartment(departmentInput.trim() || undefined);
    setAppliedReservationSystem(
      reservationSystemInput === "all" ? undefined : (reservationSystemInput as ReservationSystem)
    );
    setAppliedVerified(
      verifiedInput === "all" ? undefined : verifiedInput === "true"
    );
  };

  // Handler: Reset filters
  const handleResetFilters = () => {
    setNameInput("");
    setDepartmentInput("");
    setReservationSystemInput("all");
    setVerifiedInput("all");
    setAppliedName(undefined);
    setAppliedDepartment(undefined);
    setAppliedReservationSystem(undefined);
    setAppliedVerified(undefined);
    setCurrentPage(0);
  };

  // Handler: Toggle sort on column
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      // Toggle direction
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setSortBy(field);
      setSortDir("asc");
    }
    setCurrentPage(0); // Reset to first page on sort change
  };

  // Handler: Change page size
  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(0); // Reset to first page
  };

  // Handler: Enter key on input fields
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleApplyFilters();
    }
  };

  // Check if any filter is active
  const hasActiveFilters = appliedName || appliedDepartment || appliedReservationSystem || appliedVerified !== undefined;

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-gray-400" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1 text-gray-900" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1 text-gray-900" />
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
        <p className="text-gray-600 mt-1">
          Gérer les clubs de padel référencés
        </p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres et tri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Name filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Nom du club
              </label>
              <Input
                placeholder="Rechercher un club..."
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Department filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Département
              </label>
              <Input
                placeholder="Ex: 75, 92..."
                value={departmentInput}
                onChange={(e) => setDepartmentInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Reservation System filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Système de réservation
              </label>
              <Select
                value={reservationSystemInput}
                onValueChange={setReservationSystemInput}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="GESTION_SPORTS">GestionSports</SelectItem>
                  <SelectItem value="DOIN_SPORT">DoinSport</SelectItem>
                  <SelectItem value="TENUP">TenUp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Verified filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Vérifié
              </label>
              <Select value={verifiedInput} onValueChange={setVerifiedInput}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="true">Oui</SelectItem>
                  <SelectItem value="false">Non</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Second row with action buttons */}
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={handleApplyFilters}>
              Appliquer les filtres
            </Button>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleResetFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
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
                    <TableHead>
                      <button
                        onClick={() => handleSort("name")}
                        className="flex items-center hover:text-gray-900 font-medium"
                      >
                        Nom
                        {renderSortIcon("name")}
                      </button>
                    </TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Dép.</TableHead>
                    <TableHead>LR</TableHead>
                    <TableHead className="text-right">
                      <button
                        onClick={() => handleSort("favoriteCount")}
                        className="flex items-center ml-auto hover:text-gray-900 font-medium"
                      >
                        Fav
                        {renderSortIcon("favoriteCount")}
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button
                        onClick={() => handleSort("matchCount")}
                        className="flex items-center ml-auto hover:text-gray-900 font-medium"
                      >
                        Match
                        {renderSortIcon("matchCount")}
                      </button>
                    </TableHead>
                    <TableHead>Vérifié</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort("lastAdminUpdateAt")}
                        className="flex items-center hover:text-gray-900 font-medium"
                      >
                        Updated
                        {renderSortIcon("lastAdminUpdateAt")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort("lastScrapedAt")}
                        className="flex items-center hover:text-gray-900 font-medium"
                      >
                        Scraped
                        {renderSortIcon("lastScrapedAt")}
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clubs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        Aucun club trouvé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clubs.map((club) => (
                      <TableRow
                        key={club.id}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => router.push(`/admin/clubs/${club.id}`)}
                      >
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
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    {totalElements > 0 ? (
                      <>
                        {currentPage * pageSize + 1}-
                        {Math.min((currentPage + 1) * pageSize, totalElements)} sur {totalElements} résultats
                      </>
                    ) : (
                      "Aucun résultat"
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Afficher :</span>
                    <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {totalPages > 1 && (
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
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
