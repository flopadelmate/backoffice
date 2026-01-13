"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useClubs,
  useBlacklistedClubs,
  useWhitelistedClubs,
  useRemoveFromBlacklist,
  useRemoveFromWhitelist,
} from "@/hooks/use-clubs";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Trash2, Plus, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { ReservationSystem, GetClubsParams, GetWhitelistParams, GetBlacklistParams } from "@/types/api";
import { AddToWhitelistDialog } from "@/components/clubs/add-to-whitelist-dialog";
import {
  addOptionalString,
  addOptionalBool,
  addOptionalEnum,
} from "@/lib/api-params-helpers";
import { encodeReservationSystemForApi } from "@/types/api";
import {
  parsePaginationParams,
  buildPaginationUrl,
  cleanParams,
  type PaginationParams,
  type SortDirection,
} from "@/lib/pagination-helpers";

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
type WhitelistSortField = "whitelistedAt" | "externalId";
type BlacklistSortField = "blacklistedAt" | "externalId";
type TabType = "all" | "whitelist" | "blacklist";

// Pagination defaults by tab
const PAGINATION_DEFAULTS = {
  all: {
    sortBy: "name",
    sortDir: "asc" as const,
    validSortFields: ["name", "favoriteCount", "matchCount", "lastAdminUpdateAt", "lastScrapedAt"],
  },
  whitelist: {
    sortBy: "whitelistedAt",
    sortDir: "desc" as const,
    validSortFields: ["whitelistedAt", "externalId"],
  },
  blacklist: {
    sortBy: "blacklistedAt",
    sortDir: "desc" as const,
    validSortFields: ["blacklistedAt", "externalId"],
  },
} as const;

// Utility: Parse URL params with defaults according to active tab
function parseUrlParamsByTab(searchParams: URLSearchParams, tab: TabType) {
  const defaults = PAGINATION_DEFAULTS[tab];

  // Parse pagination params using helper with tab-specific defaults
  const pagination = parsePaginationParams(searchParams, {
    defaultPage: 0,
    defaultSize: 20,
    validSizes: [20, 50, 100],
    validSortFields: [...defaults.validSortFields], // Convert readonly to mutable
    defaultSortBy: defaults.sortBy,
    defaultSortDir: defaults.sortDir,
  });

  // Parse filters for "all" tab
  const name = searchParams.get("name") || undefined;
  const department = searchParams.get("department") || undefined;
  const verifiedParam = searchParams.get("verified");
  const verified = verifiedParam === "true" ? true
    : verifiedParam === "false" ? false
    : undefined;
  const rsParam = searchParams.get("reservationSystem");
  const validRS: ReservationSystem[] = ["GESTION_SPORTS", "DOIN_SPORT", "TENUP"];
  const reservationSystem = rsParam && validRS.includes(rsParam as ReservationSystem)
    ? (rsParam as ReservationSystem)
    : undefined;

  // Parse filters for WL/BL tabs
  const externalId = searchParams.get("externalId") || undefined;
  const sourceParam = searchParams.get("source");
  const source = (sourceParam === "MANUAL" || sourceParam === "SCRAPER")
    ? sourceParam
    : undefined;

  return {
    page: pagination.page,
    size: pagination.size,
    sortBy: pagination.sortBy,
    sortDir: pagination.sortDir,
    name,
    department,
    verified,
    reservationSystem,
    externalId,
    source,
  };
}

// Utility: Build URL query string from params using helper
function buildUrlString(params: {
  page: number;
  size: number;
  sortBy: SortField;
  sortDir: "asc" | "desc";
  name?: string;
  department?: string;
  verified?: boolean;
  reservationSystem?: ReservationSystem;
}): string {
  // Extract pagination params
  const pagination: PaginationParams = {
    page: params.page,
    size: params.size,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  };

  // Extract filter params (page-specific)
  const filters = cleanParams({
    name: params.name,
    department: params.department,
    verified: params.verified,
    reservationSystem: params.reservationSystem,
  });

  // Build URL using helper
  return buildPaginationUrl(
    pagination,
    {
      defaultPage: 0,
      defaultSize: 20,
      defaultSortBy: "name",
      defaultSortDir: "asc",
    },
    filters
  );
}

export default function ClubsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstMount = useRef(true);

  // Read activeTab from URL (not local state!)
  const activeTab = (searchParams.get("tab") || "all") as TabType;

  // Dialog state
  const [isAddToWhitelistDialogOpen, setIsAddToWhitelistDialogOpen] = useState(false);

  // Pagination state (0-indexed, shared across tabs, read from URL)
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Sort state (shared across tabs, read from URL)
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  // Filter state for "all" tab (not applied until "Appliquer" is clicked)
  const [nameInput, setNameInput] = useState("");
  const [departmentInput, setDepartmentInput] = useState("");
  const [reservationSystemInput, setReservationSystemInput] = useState<string>("all");
  const [verifiedInput, setVerifiedInput] = useState<string>("all");

  // Applied filters for "all" tab (from URL)
  const [appliedName, setAppliedName] = useState<string | undefined>();
  const [appliedDepartment, setAppliedDepartment] = useState<string | undefined>();
  const [appliedReservationSystem, setAppliedReservationSystem] = useState<ReservationSystem | undefined>();
  const [appliedVerified, setAppliedVerified] = useState<boolean | undefined>();

  // Filter state for "whitelist" tab
  const [wlExternalIdInput, setWlExternalIdInput] = useState("");

  // Applied filters for "whitelist" tab (from URL)
  const [appliedWlExternalId, setAppliedWlExternalId] = useState<string | undefined>();

  // Filter state for "blacklist" tab
  const [blExternalIdInput, setBlExternalIdInput] = useState("");
  const [blSourceInput, setBlSourceInput] = useState<string>("all");

  // Applied filters for "blacklist" tab (from URL)
  const [appliedBlExternalId, setAppliedBlExternalId] = useState<string | undefined>();
  const [appliedBlSource, setAppliedBlSource] = useState<"MANUAL" | "SCRAPER" | undefined>();

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

  // Blacklist and Whitelist hooks (fetch only when tab is active) with pagination
  // Use helpers to respect exactOptionalPropertyTypes
  let blacklistParams: GetBlacklistParams = {
    page: currentPage,
    size: pageSize,
    sortBy: sortBy as BlacklistSortField,
    sortDir,
  };
  blacklistParams = addOptionalString(blacklistParams, "externalId", appliedBlExternalId);
  if (appliedBlSource) {
    blacklistParams = { ...blacklistParams, source: appliedBlSource };
  }

  const {
    data: blacklistData,
    isLoading: isLoadingBlacklist,
  } = useBlacklistedClubs(blacklistParams, activeTab === "blacklist");

  let whitelistParams: GetWhitelistParams = {
    page: currentPage,
    size: pageSize,
    sortBy: sortBy as WhitelistSortField,
    sortDir,
  };
  whitelistParams = addOptionalString(whitelistParams, "externalId", appliedWlExternalId);

  const {
    data: whitelistData,
    isLoading: isLoadingWhitelist,
  } = useWhitelistedClubs(whitelistParams, activeTab === "whitelist");

  // Extract data from WL/BL Spring Page
  const whitelistEntries = whitelistData?.content ?? [];
  const whitelistTotalPages = whitelistData?.totalPages ?? 0;
  const whitelistTotalElements = whitelistData?.totalElements ?? 0;

  const blacklistEntries = blacklistData?.content ?? [];
  const blacklistTotalPages = blacklistData?.totalPages ?? 0;
  const blacklistTotalElements = blacklistData?.totalElements ?? 0;

  const removeFromBlacklistMutation = useRemoveFromBlacklist();
  const removeFromWhitelistMutation = useRemoveFromWhitelist();

  // Handlers for blacklist/whitelist removal
  const handleRemoveFromBlacklist = (id: number) => {
    removeFromBlacklistMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Club retiré de la blacklist");
      },
      onError: () => {
        toast.error("Erreur lors de la suppression");
      },
    });
  };

  const handleRemoveFromWhitelist = (id: number) => {
    removeFromWhitelistMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Club retiré de la whitelist");
      },
      onError: () => {
        toast.error("Erreur lors de la suppression");
      },
    });
  };

  // Sync state from URL (on mount and back/forward)
  useEffect(() => {
    const parsed = parseUrlParamsByTab(searchParams, activeTab);

    // Always sync pagination, sort
    setCurrentPage(parsed.page);
    setPageSize(parsed.size);
    setSortBy(parsed.sortBy);
    setSortDir(parsed.sortDir);

    // Sync filters for "all" tab
    setAppliedName(parsed.name);
    setAppliedDepartment(parsed.department);
    setAppliedReservationSystem(parsed.reservationSystem);
    setAppliedVerified(parsed.verified);

    // Sync filters for WL/BL tabs
    setAppliedWlExternalId(parsed.externalId);
    setAppliedBlExternalId(parsed.externalId);
    setAppliedBlSource(parsed.source as "MANUAL" | "SCRAPER" | undefined);

    // Sync input states on first mount or when activeTab changes (for back/forward and tab switching)
    if (isFirstMount.current || activeTab) {
      // "all" tab inputs
      if (activeTab === "all") {
        setNameInput(parsed.name || "");
        setDepartmentInput(parsed.department || "");
        setReservationSystemInput(parsed.reservationSystem || "all");
        setVerifiedInput(
          parsed.verified === undefined ? "all" : parsed.verified.toString()
        );
      }
      // Whitelist inputs
      if (activeTab === "whitelist") {
        setWlExternalIdInput(parsed.externalId || "");
      }
      // Blacklist inputs
      if (activeTab === "blacklist") {
        setBlExternalIdInput(parsed.externalId || "");
        setBlSourceInput(parsed.source || "all");
      }

      if (isFirstMount.current) {
        isFirstMount.current = false;
      }
    }
  }, [searchParams.toString(), activeTab]);

  // Handler: Switch tab (reset page=0, apply tab defaults, keep size + relevant filters)
  const handleTabChange = (newTab: TabType) => {
    const defaults = PAGINATION_DEFAULTS[newTab];

    // Base pagination with tab defaults
    const pagination: PaginationParams = {
      page: 0, // Reset page on tab switch
      size: pageSize, // Keep current size
      sortBy: defaults.sortBy,
      sortDir: defaults.sortDir,
    };

    // Build filters based on tab
    let filters: Record<string, string | boolean> = {};

    if (newTab === "whitelist") {
      // Keep externalId filter if present
      if (appliedWlExternalId) {
        filters.externalId = appliedWlExternalId;
      }
    } else if (newTab === "blacklist") {
      // Keep externalId + source filters if present
      if (appliedBlExternalId) {
        filters.externalId = appliedBlExternalId;
      }
      if (appliedBlSource) {
        filters.source = appliedBlSource;
      }
    } else if (newTab === "all") {
      // Keep all "all" tab filters
      if (appliedName) filters.name = appliedName;
      if (appliedDepartment) filters.department = appliedDepartment;
      if (appliedVerified !== undefined) filters.verified = appliedVerified;
      if (appliedReservationSystem) filters.reservationSystem = appliedReservationSystem;
    }

    // Add tab param
    filters.tab = newTab;

    // Build URL using helper
    const url = buildPaginationUrl(
      pagination,
      { defaultPage: 0, defaultSize: 20, defaultSortBy: defaults.sortBy, defaultSortDir: defaults.sortDir },
      filters
    );

    // Navigate with replace (no history entry)
    router.replace(`/admin/clubs${url}`, { scroll: false });
  };

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
    const base = { page: 0, size: pageSize, sortBy: sortBy as SortField, sortDir };
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
      sortBy: sortBy as SortField,
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

    const base = { page: 0, size: nextSize, sortBy: sortBy as SortField, sortDir };
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
    const base = { page: newPage, size: pageSize, sortBy: sortBy as SortField, sortDir };
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

  // Render sort icon for WL/BL tabs (generic based on current sortBy string)
  const renderSortIconGeneric = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-gray-400" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1 text-gray-900" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1 text-gray-900" />
    );
  };

  // Handler: Apply filters for Whitelist tab
  const handleApplyFiltersWL = () => {
    // Parse current URL to get current pagination/sort for whitelist tab
    const parsed = parseUrlParamsByTab(searchParams, "whitelist");

    // Calculate next filter state
    const nextExternalId = wlExternalIdInput.trim() || undefined;

    // Build pagination with parsed values from URL
    const pagination: PaginationParams = {
      page: 0, // Reset page on filter apply
      size: parsed.size, // Use current size from URL
      sortBy: parsed.sortBy, // Use current sort from URL
      sortDir: parsed.sortDir, // Use current sort dir from URL
    };

    // Build filters
    const filters: Record<string, string> = { tab: "whitelist" };
    if (nextExternalId) {
      filters.externalId = nextExternalId;
    }

    // Build URL using helper
    const url = buildPaginationUrl(
      pagination,
      { defaultPage: 0, defaultSize: 20, defaultSortBy: "whitelistedAt", defaultSortDir: "desc" },
      filters
    );

    // Navigate with replace (no history entry)
    router.replace(`/admin/clubs${url}`, { scroll: false });
  };

  // Handler: Reset filters for Whitelist tab
  const handleResetFiltersWL = () => {
    // Parse current URL to get current pagination/sort
    const parsed = parseUrlParamsByTab(searchParams, "whitelist");

    // Build pagination with parsed values from URL
    const pagination: PaginationParams = {
      page: 0,
      size: parsed.size,
      sortBy: parsed.sortBy,
      sortDir: parsed.sortDir,
    };

    // Build URL with only tab param (no filters)
    const url = buildPaginationUrl(
      pagination,
      { defaultPage: 0, defaultSize: 20, defaultSortBy: "whitelistedAt", defaultSortDir: "desc" },
      { tab: "whitelist" }
    );

    // Clear input
    setWlExternalIdInput("");

    // Navigate with replace
    router.replace(`/admin/clubs${url}`, { scroll: false });
  };

  // Handler: Enter key on Whitelist filters
  const handleKeyDownWL = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleApplyFiltersWL();
    }
  };

  // Handler: Apply filters for Blacklist tab
  const handleApplyFiltersBL = () => {
    // Parse current URL to get current pagination/sort for blacklist tab
    const parsed = parseUrlParamsByTab(searchParams, "blacklist");

    // Calculate next filter state
    const nextExternalId = blExternalIdInput.trim() || undefined;
    const nextSource = blSourceInput === "all" ? undefined : (blSourceInput as "MANUAL" | "SCRAPER");

    // Build pagination with parsed values from URL
    const pagination: PaginationParams = {
      page: 0, // Reset page on filter apply
      size: parsed.size,
      sortBy: parsed.sortBy,
      sortDir: parsed.sortDir,
    };

    // Build filters
    const filters: Record<string, string> = { tab: "blacklist" };
    if (nextExternalId) {
      filters.externalId = nextExternalId;
    }
    if (nextSource) {
      filters.source = nextSource;
    }

    // Build URL using helper
    const url = buildPaginationUrl(
      pagination,
      { defaultPage: 0, defaultSize: 20, defaultSortBy: "blacklistedAt", defaultSortDir: "desc" },
      filters
    );

    // Navigate with replace (no history entry)
    router.replace(`/admin/clubs${url}`, { scroll: false });
  };

  // Handler: Reset filters for Blacklist tab
  const handleResetFiltersBL = () => {
    // Parse current URL to get current pagination/sort
    const parsed = parseUrlParamsByTab(searchParams, "blacklist");

    // Build pagination with parsed values from URL
    const pagination: PaginationParams = {
      page: 0,
      size: parsed.size,
      sortBy: parsed.sortBy,
      sortDir: parsed.sortDir,
    };

    // Build URL with only tab param (no filters)
    const url = buildPaginationUrl(
      pagination,
      { defaultPage: 0, defaultSize: 20, defaultSortBy: "blacklistedAt", defaultSortDir: "desc" },
      { tab: "blacklist" }
    );

    // Clear inputs
    setBlExternalIdInput("");
    setBlSourceInput("all");

    // Navigate with replace
    router.replace(`/admin/clubs${url}`, { scroll: false });
  };

  // Handler: Enter key on Blacklist filters
  const handleKeyDownBL = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleApplyFiltersBL();
    }
  };

  // Handler: Sort for Whitelist tab
  const handleSortWL = (field: WhitelistSortField) => {
    // Parse current URL to get current state
    const parsed = parseUrlParamsByTab(searchParams, "whitelist");

    // Calculate next sort state
    let nextSortBy = field;
    let nextSortDir: SortDirection = "asc";

    if (parsed.sortBy === field) {
      nextSortDir = parsed.sortDir === "asc" ? "desc" : "asc";
    }

    // Build pagination
    const pagination: PaginationParams = {
      page: 0, // Reset page on sort
      size: parsed.size,
      sortBy: nextSortBy,
      sortDir: nextSortDir,
    };

    // Build filters
    const filters: Record<string, string> = { tab: "whitelist" };
    if (appliedWlExternalId) {
      filters.externalId = appliedWlExternalId;
    }

    // Build URL
    const url = buildPaginationUrl(
      pagination,
      { defaultPage: 0, defaultSize: 20, defaultSortBy: "whitelistedAt", defaultSortDir: "desc" },
      filters
    );

    // Navigate with replace
    router.replace(`/admin/clubs${url}`, { scroll: false });
  };

  // Handler: Sort for Blacklist tab
  const handleSortBL = (field: BlacklistSortField) => {
    // Parse current URL to get current state
    const parsed = parseUrlParamsByTab(searchParams, "blacklist");

    // Calculate next sort state
    let nextSortBy = field;
    let nextSortDir: SortDirection = "asc";

    if (parsed.sortBy === field) {
      nextSortDir = parsed.sortDir === "asc" ? "desc" : "asc";
    }

    // Build pagination
    const pagination: PaginationParams = {
      page: 0, // Reset page on sort
      size: parsed.size,
      sortBy: nextSortBy,
      sortDir: nextSortDir,
    };

    // Build filters
    const filters: Record<string, string> = { tab: "blacklist" };
    if (appliedBlExternalId) {
      filters.externalId = appliedBlExternalId;
    }
    if (appliedBlSource) {
      filters.source = appliedBlSource;
    }

    // Build URL
    const url = buildPaginationUrl(
      pagination,
      { defaultPage: 0, defaultSize: 20, defaultSortBy: "blacklistedAt", defaultSortDir: "desc" },
      filters
    );

    // Navigate with replace
    router.replace(`/admin/clubs${url}`, { scroll: false });
  };

  // Check if WL/BL filters are active
  const hasActiveFiltersWL = appliedWlExternalId !== undefined;
  const hasActiveFiltersBL = appliedBlExternalId !== undefined || appliedBlSource !== undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Clubs</h1>
        <p className="text-gray-600 mt-1">
          Gérer les clubs de padel référencés
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as TabType)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">Tous les clubs</TabsTrigger>
          <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
          <TabsTrigger value="whitelist">Whitelist</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6 mt-6">

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
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{club.name}</span>
                            {club.hasTenupExternalId && (
                              <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600 hover:bg-gray-200">
                                TenUp
                              </Badge>
                            )}
                          </div>
                        </TableCell>
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
        </TabsContent>

        {/* Blacklist Tab */}
        <TabsContent value="blacklist" className="space-y-6 mt-6">
          {/* Filters Card for Blacklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* External ID filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Place ID
                  </label>
                  <Input
                    placeholder="Rechercher par Place ID..."
                    value={blExternalIdInput}
                    onChange={(e) => setBlExternalIdInput(e.target.value)}
                    onKeyDown={handleKeyDownBL}
                  />
                </div>

                {/* Source filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Source
                  </label>
                  <Select
                    value={blSourceInput}
                    onValueChange={setBlSourceInput}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="MANUAL">Manuel</SelectItem>
                      <SelectItem value="SCRAPER">Scraper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex justify-end gap-2">
                <Button onClick={handleApplyFiltersBL}>
                  Appliquer les filtres
                </Button>
                {hasActiveFiltersBL && (
                  <Button
                    variant="outline"
                    onClick={handleResetFiltersBL}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Réinitialiser
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clubs blacklistés</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingBlacklist && (
                <div className="text-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
                  <p className="mt-4 text-sm text-gray-600">Chargement...</p>
                </div>
              )}

              {blacklistEntries.length === 0 && !isLoadingBlacklist && (
                <p className="text-center py-8 text-gray-500">
                  Aucun club blacklisté.
                </p>
              )}

              {blacklistEntries.length > 0 && (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <button
                            onClick={() => handleSortBL("externalId")}
                            className="flex items-center hover:text-gray-900 font-medium"
                          >
                            Place ID
                            {renderSortIconGeneric("externalId")}
                          </button>
                        </TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSortBL("blacklistedAt")}
                            className="flex items-center hover:text-gray-900 font-medium"
                          >
                            Date
                            {renderSortIconGeneric("blacklistedAt")}
                          </button>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blacklistEntries.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.externalId}
                          </TableCell>
                          <TableCell>{item.source}</TableCell>
                          <TableCell>{item.reason || "-"}</TableCell>
                          <TableCell>{formatDate(item.blacklistedAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <a
                                  href={`https://www.google.com/maps/place/?q=place_id:${item.externalId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  GMaps
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveFromBlacklist(item.id)}
                                disabled={removeFromBlacklistMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination for Blacklist */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      {blacklistTotalElements > 0 ? (
                        <>
                          {currentPage * pageSize + 1}-
                          {Math.min((currentPage + 1) * pageSize, blacklistTotalElements)} sur {blacklistTotalElements} résultats
                        </>
                      ) : (
                        "Aucun résultat"
                      )}
                    </div>
                    {blacklistTotalPages > 1 && (
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
                          onClick={() => handlePageChange(Math.min(blacklistTotalPages - 1, currentPage + 1))}
                          disabled={currentPage === blacklistTotalPages - 1}
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
        </TabsContent>

        {/* Whitelist Tab */}
        <TabsContent value="whitelist" className="space-y-6 mt-6">
          {/* Filters Card for Whitelist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* External ID filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Place ID
                  </label>
                  <Input
                    placeholder="Rechercher par Place ID..."
                    value={wlExternalIdInput}
                    onChange={(e) => setWlExternalIdInput(e.target.value)}
                    onKeyDown={handleKeyDownWL}
                    className="mt-2"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex justify-end gap-2">
                <Button onClick={handleApplyFiltersWL}>
                  Appliquer les filtres
                </Button>
                {hasActiveFiltersWL && (
                  <Button
                    variant="outline"
                    onClick={handleResetFiltersWL}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Réinitialiser
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Clubs whitelistés</CardTitle>
                <Button onClick={() => setIsAddToWhitelistDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingWhitelist && (
                <div className="text-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
                  <p className="mt-4 text-sm text-gray-600">Chargement...</p>
                </div>
              )}

              {whitelistEntries.length === 0 && !isLoadingWhitelist && (
                <p className="text-center py-8 text-gray-500">
                  Aucun club whitelisté.
                </p>
              )}

              {whitelistEntries.length > 0 && (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <button
                            onClick={() => handleSortWL("externalId")}
                            className="flex items-center hover:text-gray-900 font-medium"
                          >
                            Place ID
                            {renderSortIconGeneric("externalId")}
                          </button>
                        </TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSortWL("whitelistedAt")}
                            className="flex items-center hover:text-gray-900 font-medium"
                          >
                            Date
                            {renderSortIconGeneric("whitelistedAt")}
                          </button>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {whitelistEntries.map((item) => (
                        <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.externalId}
                        </TableCell>
                        <TableCell>{item.reason || "-"}</TableCell>
                        <TableCell>{formatDate(item.whitelistedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                            >
                              <a
                                href={`https://www.google.com/maps/place/?q=place_id:${item.externalId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <MapPin className="h-4 w-4 mr-2" />
                                GMaps
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveFromWhitelist(item.id)}
                              disabled={removeFromWhitelistMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination for Whitelist */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    {whitelistTotalElements > 0 ? (
                      <>
                        {currentPage * pageSize + 1}-
                        {Math.min((currentPage + 1) * pageSize, whitelistTotalElements)} sur {whitelistTotalElements} résultats
                      </>
                    ) : (
                      "Aucun résultat"
                    )}
                  </div>
                  {whitelistTotalPages > 1 && (
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
                        onClick={() => handlePageChange(Math.min(whitelistTotalPages - 1, currentPage + 1))}
                        disabled={currentPage === whitelistTotalPages - 1}
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
        </TabsContent>
      </Tabs>

      <AddToWhitelistDialog
        open={isAddToWhitelistDialogOpen}
        onClose={() => setIsAddToWhitelistDialogOpen(false)}
      />
    </div>
  );
}
