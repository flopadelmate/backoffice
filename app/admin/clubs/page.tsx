"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import type { ReservationSystem, GetClubsParams } from "@/types/api";
import {
  addOptionalString,
  addOptionalBool,
  addOptionalEnum,
} from "@/lib/api-params-helpers";
import { encodeReservationSystemForApi } from "@/types/api";

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
    UNKNOWN: "Inconnu",
    NOT_IMPLEMENTED: "Non implémenté",
  };

  return mapping[system] || system;
}

type SortField = "name" | "favoriteCount" | "matchCount" | "lastAdminUpdateAt" | "lastScrapedAt";
type SortDirection = "asc" | "desc";

// Utility: Parse URL params with robust validation
function parseUrlParams(searchParams: URLSearchParams) {
  // Parse page (int, clamp >= 0, default: 0)
  const pageParam = searchParams.get("page");
  const parsedPage = pageParam ? parseInt(pageParam, 10) : 0;
  const page = !isNaN(parsedPage) && parsedPage >= 0 ? parsedPage : 0;

  // Parse size (int, whitelist {20, 50, 100}, default: 20)
  const sizeParam = searchParams.get("size");
  const parsedSize = sizeParam ? parseInt(sizeParam, 10) : 20;
  const validSizes = [20, 50, 100];
  const size = validSizes.includes(parsedSize) ? parsedSize : 20;

  // Parse sortBy (validate enum, default: "name")
  const validSortFields: SortField[] = ["name", "favoriteCount", "matchCount", "lastAdminUpdateAt", "lastScrapedAt"];
  const sortByParam = searchParams.get("sortBy");
  const sortBy = sortByParam && validSortFields.includes(sortByParam as SortField)
    ? (sortByParam as SortField)
    : "name";

  // Parse sortDir (validate, default: "asc")
  const sortDirParam = searchParams.get("sortDir");
  const sortDir: SortDirection = sortDirParam === "desc" ? "desc" : "asc";

  // Parse name (string | undefined)
  const name = searchParams.get("name") || undefined;

  // Parse department (string | undefined)
  const department = searchParams.get("department") || undefined;

  // Parse verified (boolean | undefined) - strict parsing
  const verifiedParam = searchParams.get("verified");
  const verified = verifiedParam === "true" ? true
    : verifiedParam === "false" ? false
    : undefined;

  // Parse reservationSystem (validate enum | undefined)
  const rsParam = searchParams.get("reservationSystem");
  const validRS: ReservationSystem[] = ["GESTION_SPORTS", "DOIN_SPORT", "TENUP"];
  const reservationSystem = rsParam && validRS.includes(rsParam as ReservationSystem)
    ? (rsParam as ReservationSystem)
    : undefined;

  return {
    page,
    size,
    sortBy,
    sortDir,
    name,
    department,
    verified,
    reservationSystem,
  };
}

// Utility: Build URL query string from params
function buildUrlString(params: {
  page: number;
  size: number;
  sortBy: SortField;
  sortDir: SortDirection;
  name?: string;
  department?: string;
  verified?: boolean;
  reservationSystem?: ReservationSystem;
}): string {
  const searchParams = new URLSearchParams();

  // Omit defaults to keep URL clean
  if (params.page !== 0) {
    searchParams.set("page", params.page.toString());
  }
  if (params.size !== 20) {
    searchParams.set("size", params.size.toString());
  }
  if (params.sortBy !== "name") {
    searchParams.set("sortBy", params.sortBy);
  }
  if (params.sortDir !== "asc") {
    searchParams.set("sortDir", params.sortDir);
  }

  // Add filters if present
  if (params.name) {
    searchParams.set("name", params.name);
  }
  if (params.department) {
    searchParams.set("department", params.department);
  }
  if (params.verified !== undefined) {
    searchParams.set("verified", params.verified.toString());
  }
  if (params.reservationSystem) {
    searchParams.set("reservationSystem", params.reservationSystem);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export default function ClubsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstMount = useRef(true);

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

  // Build query params using helpers to respect exactOptionalPropertyTypes
  let queryParams: GetClubsParams = {
    page: currentPage,
    size: pageSize,
    sortBy,
    sortDir,
  };
  queryParams = addOptionalString(queryParams, "name", appliedName);
  queryParams = addOptionalString(queryParams, "department", appliedDepartment);
  queryParams = addOptionalEnum(
    queryParams,
    "reservationSystem",
    encodeReservationSystemForApi(appliedReservationSystem)
  );
  queryParams = addOptionalBool(queryParams, "verified", appliedVerified);

  const { data, isLoading, isError } = useClubs(queryParams);

  // Extract data from Spring Page structure
  const clubs = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  // Sync state from URL (on mount and back/forward)
  useEffect(() => {
    const parsed = parseUrlParams(searchParams);

    // Always sync pagination, sort, and applied filters
    setCurrentPage(parsed.page);
    setPageSize(parsed.size);
    setSortBy(parsed.sortBy);
    setSortDir(parsed.sortDir);
    setAppliedName(parsed.name);
    setAppliedDepartment(parsed.department);
    setAppliedReservationSystem(parsed.reservationSystem);
    setAppliedVerified(parsed.verified);

    // Sync input states only on first mount to avoid flicker
    if (isFirstMount.current) {
      setNameInput(parsed.name || "");
      setDepartmentInput(parsed.department || "");
      setReservationSystemInput(parsed.reservationSystem || "all");
      setVerifiedInput(
        parsed.verified === undefined ? "all" : parsed.verified.toString()
      );
      isFirstMount.current = false;
    }
  }, [searchParams.toString()]);

  // Build URL params using helpers
  const buildUrlParams = (config: {
    page: number;
    size: number;
    sortBy: SortField;
    sortDir: SortDirection;
    name?: string;
    department?: string;
    verified?: boolean;
    reservationSystem?: ReservationSystem;
  }) => {
    let params: {
      page: number;
      size: number;
      sortBy: SortField;
      sortDir: SortDirection;
      name?: string;
      department?: string;
      verified?: boolean;
      reservationSystem?: ReservationSystem;
    } = {
      page: config.page,
      size: config.size,
      sortBy: config.sortBy,
      sortDir: config.sortDir,
    };
    params = addOptionalString(params, "name", config.name);
    params = addOptionalString(params, "department", config.department);
    params = addOptionalBool(params, "verified", config.verified);
    params = addOptionalEnum(params, "reservationSystem", config.reservationSystem);
    return params;
  };

  // Update URL with router.replace (no history entry)
  const replaceUrl = (config: {
    page: number;
    size: number;
    sortBy: SortField;
    sortDir: SortDirection;
    name?: string;
    department?: string;
    verified?: boolean;
    reservationSystem?: ReservationSystem;
  }) => {
    const params = buildUrlParams(config);
    const queryString = buildUrlString(params);
    router.replace(`/admin/clubs${queryString}`, { scroll: false });
  };

  // Update URL with router.push (create history entry)
  const pushUrl = (config: {
    page: number;
    size: number;
    sortBy: SortField;
    sortDir: SortDirection;
    name?: string;
    department?: string;
    verified?: boolean;
    reservationSystem?: ReservationSystem;
  }) => {
    const params = buildUrlParams(config);
    const queryString = buildUrlString(params);
    router.push(`/admin/clubs${queryString}`, { scroll: false });
  };

  // Handler: Apply filters
  const handleApplyFilters = () => {
    // Calculate next state
    const nextName = nameInput.trim() || undefined;
    const nextDepartment = departmentInput.trim() || undefined;
    const nextReservationSystem = reservationSystemInput === "all"
      ? undefined
      : (reservationSystemInput as ReservationSystem);
    const nextVerified = verifiedInput === "all"
      ? undefined
      : verifiedInput === "true";

    // Build params with helpers
    const base = { page: 0, size: pageSize, sortBy, sortDir };
    let nextParams = base as typeof base & Partial<Pick<typeof base & {
      name: string;
      department: string;
      reservationSystem: ReservationSystem;
      verified: boolean;
    }, "name" | "department" | "reservationSystem" | "verified">>;
    if (nextName) nextParams = { ...nextParams, name: nextName };
    if (nextDepartment) nextParams = { ...nextParams, department: nextDepartment };
    if (nextReservationSystem) nextParams = { ...nextParams, reservationSystem: nextReservationSystem };
    if (nextVerified !== undefined) nextParams = { ...nextParams, verified: nextVerified };

    // 1. Update URL with replace (no history pollution)
    replaceUrl(nextParams);

    // 2. Update states (will be overridden by useEffect but prevents flicker)
    setCurrentPage(0);
    setAppliedName(nextName);
    setAppliedDepartment(nextDepartment);
    setAppliedReservationSystem(nextReservationSystem);
    setAppliedVerified(nextVerified);
  };

  // Handler: Reset filters
  const handleResetFilters = () => {
    const nextParams = {
      page: 0,
      size: pageSize,
      sortBy,
      sortDir,
    };

    // 1. Update URL with replace (clean URL)
    replaceUrl(nextParams);

    // 2. Update states
    setCurrentPage(0);
    setNameInput("");
    setDepartmentInput("");
    setReservationSystemInput("all");
    setVerifiedInput("all");
    setAppliedName(undefined);
    setAppliedDepartment(undefined);
    setAppliedReservationSystem(undefined);
    setAppliedVerified(undefined);
  };

  // Handler: Toggle sort on column
  const handleSort = (field: SortField) => {
    // Calculate next sort state
    let nextSortBy = field;
    let nextSortDir: SortDirection = "asc";

    if (sortBy === field) {
      nextSortDir = sortDir === "asc" ? "desc" : "asc";
    }

    const base = { page: 0, size: pageSize, sortBy: nextSortBy, sortDir: nextSortDir };
    let nextParams = base as typeof base & Partial<Pick<typeof base & {
      name: string;
      department: string;
      reservationSystem: ReservationSystem;
      verified: boolean;
    }, "name" | "department" | "reservationSystem" | "verified">>;
    if (appliedName) nextParams = { ...nextParams, name: appliedName };
    if (appliedDepartment) nextParams = { ...nextParams, department: appliedDepartment };
    if (appliedReservationSystem) nextParams = { ...nextParams, reservationSystem: appliedReservationSystem };
    if (appliedVerified !== undefined) nextParams = { ...nextParams, verified: appliedVerified };

    // 1. Update URL with replace
    replaceUrl(nextParams);

    // 2. Update states
    setCurrentPage(0);
    setSortBy(nextSortBy);
    setSortDir(nextSortDir);
  };

  // Handler: Change page size
  const handlePageSizeChange = (value: string) => {
    const nextSize = Number(value);

    const base = { page: 0, size: nextSize, sortBy, sortDir };
    let nextParams = base as typeof base & Partial<Pick<typeof base & {
      name: string;
      department: string;
      reservationSystem: ReservationSystem;
      verified: boolean;
    }, "name" | "department" | "reservationSystem" | "verified">>;
    if (appliedName) nextParams = { ...nextParams, name: appliedName };
    if (appliedDepartment) nextParams = { ...nextParams, department: appliedDepartment };
    if (appliedReservationSystem) nextParams = { ...nextParams, reservationSystem: appliedReservationSystem };
    if (appliedVerified !== undefined) nextParams = { ...nextParams, verified: appliedVerified };

    // 1. Update URL with replace (no need for history)
    replaceUrl(nextParams);

    // 2. Update states
    setCurrentPage(0);
    setPageSize(nextSize);
  };

  // Handler: Change page (for pagination buttons)
  const handlePageChange = (newPage: number) => {
    const base = { page: newPage, size: pageSize, sortBy, sortDir };
    let nextParams = base as typeof base & Partial<Pick<typeof base & {
      name: string;
      department: string;
      reservationSystem: ReservationSystem;
      verified: boolean;
    }, "name" | "department" | "reservationSystem" | "verified">>;
    if (appliedName) nextParams = { ...nextParams, name: appliedName };
    if (appliedDepartment) nextParams = { ...nextParams, department: appliedDepartment };
    if (appliedReservationSystem) nextParams = { ...nextParams, reservationSystem: appliedReservationSystem };
    if (appliedVerified !== undefined) nextParams = { ...nextParams, verified: appliedVerified };

    // 1. Update URL with PUSH (create history entry for back/forward)
    pushUrl(nextParams);

    // 2. Update state
    setCurrentPage(newPage);
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
                  <SelectItem value="UNKNOWN">Inconnu</SelectItem>
                  <SelectItem value="NOT_IMPLEMENTED">Non implémenté</SelectItem>
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
                      onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
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
