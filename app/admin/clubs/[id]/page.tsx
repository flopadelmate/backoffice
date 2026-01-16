"use client";

import { useParams, useRouter } from "next/navigation";
import { useClub, useUpdateClub } from "@/hooks/use-clubs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, Trash2, MapPin } from "lucide-react";
import { DeleteClubDialog } from "@/components/clubs/delete-club-dialog";
import { ModifyPlaceIdDialog } from "@/components/clubs/modify-place-id-dialog";
import { ClubHeader } from "./club-header";
import ClubReservationSystem from "./club-reservation-system";
import ClubExternalIds from "./club-external-ids";
import { ClubInfoContact } from "./club-info-contact";
import { ClubExploitation } from "./club-exploitation";
import { ClubCourts } from "./club-courts";
import { ClubPhotosAdmin } from "./club-photos-admin";
import type { ClubBackofficeDetailDto } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { computeChanges, hydrateDraftFromApi, type ClubDraft } from "./utils";
import { cn } from "@/lib/utils";

export default function ClubDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clubId = parseInt(params.id as string, 10);
  const { toast } = useToast();

  const { data: club, isLoading, isError } = useClub(clubId);
  const updateClub = useUpdateClub();

  // Global state
  const [clubApi, setClubApi] = useState<ClubBackofficeDetailDto | null>(null);
  const [originalDraft, setOriginalDraft] = useState<ClubDraft | null>(null);
  const [draft, setDraft] = useState<ClubDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [geoIsInvalid, setGeoIsInvalid] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isModifyPlaceIdDialogOpen, setIsModifyPlaceIdDialogOpen] =
    useState(false);

  // Compute changes for isDirty detection
  const changes = useMemo(() => {
    if (!clubApi || !draft) return {};
    return computeChanges(clubApi, draft);
  }, [clubApi, draft]);

  const isDirty = Object.keys(changes).length > 0;

  // Hydrate state when club data arrives (only if id changed or not dirty)
  useEffect(() => {
    if (!club) return;

    // Guard: ne réhydrater que si pas de draft existant OU si club id a changé
    if (!originalDraft || club.id !== originalDraft.id) {
      setClubApi(club);
      const hydrated = hydrateDraftFromApi(club);
      setOriginalDraft(hydrated);
      setDraft(hydrated);
    }
  }, [club, originalDraft]);

  const canSave = isDirty && !geoIsInvalid && !isSaving;

  // Update draft function (passed to all sections)
  const updateDraft = (updates: Partial<ClubDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...updates } : null));
  };

  // Save handler
  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      const updatedClub = await updateClub.mutateAsync({
        id: clubId,
        data: changes,
      });

      // Sync with backend response (lastAdminUpdateAt, etc.)
      setClubApi(updatedClub);
      const hydrated = hydrateDraftFromApi(updatedClub);
      setOriginalDraft(hydrated);
      setDraft(hydrated);

      toast({
        title: "Modifications enregistrées",
        description: "Les données ont été mises à jour avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel handler
  const handleCancel = () => {
    if (!originalDraft) return;
    setDraft(originalDraft); // Reset to original snapshot
    setGeoIsInvalid(false); // Reset validation state
  };

  // Back handler: use router.back() to preserve filters
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      // Fallback if no history (direct URL access)
      router.replace("/admin/clubs");
    }
  };

  // Common input style
  const EDITABLE_INPUT_CLASS = cn(
    "border border-gray-200",
    "hover:border-gray-400",
    "focus:border-blue-500 focus:ring-2 focus:ring-blue-200",
    "transition-colors"
  );

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600">Chargement...</p>
      </div>
    );
  }

  if (isError || !club || !draft) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Club introuvable</p>
        <Button variant="outline" className="mt-4" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="sm" className="mb-2" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à la liste
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{draft.name}</h1>
            <p className="text-gray-600 mt-1">
              Gestion et modification des informations du club
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsModifyPlaceIdDialogOpen(true)}
            >
              <MapPin className="mr-2 h-4 w-4" />
              Modifier le Place ID
            </Button>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer le club
            </Button>
          </div>
        </div>
      </div>

      {/* Sticky Save/Cancel buttons (only when dirty) */}
      {isDirty && (
        <div className="fixed top-20 right-6 z-50 flex gap-2 bg-white shadow-lg rounded-lg p-3 border border-gray-200">
          <Button
            onClick={handleSave}
            disabled={!canSave}
            size="sm"
            className="gap-1"
          >
            <Check className="h-4 w-4" />
            Enregistrer
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
            size="sm"
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Annuler
          </Button>

          {/* Validation error indicator */}
          {geoIsInvalid && (
            <span className="text-xs text-red-600 ml-2 self-center">
              Coordonnées GPS invalides
            </span>
          )}
        </div>
      )}

      {/* Sections */}
      <ClubHeader
        clubApi={clubApi}
        draft={draft}
        onUpdate={updateDraft}
        inputClassName={EDITABLE_INPUT_CLASS}
      />

      <ClubReservationSystem clubId={clubId} />

      <ClubExternalIds clubId={clubId} />

      <ClubInfoContact
        clubApi={clubApi}
        draft={draft}
        onUpdate={updateDraft}
        inputClassName={EDITABLE_INPUT_CLASS}
        onGeoValidationChange={setGeoIsInvalid}
      />

      <ClubExploitation draft={clubApi} />

      <ClubCourts draft={clubApi} />

      <ClubPhotosAdmin
        clubApi={clubApi}
        draft={draft}
        onUpdate={updateDraft}
        inputClassName={EDITABLE_INPUT_CLASS}
      />

      <DeleteClubDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        clubId={clubId}
        clubName={draft.name}
        onSuccess={() => router.replace("/admin/clubs")}
      />

      <ModifyPlaceIdDialog
        open={isModifyPlaceIdDialogOpen}
        onClose={() => setIsModifyPlaceIdDialogOpen(false)}
        club={clubApi!}
      />
    </div>
  );
}
