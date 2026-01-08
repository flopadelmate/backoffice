"use client";

import { useParams, useRouter } from "next/navigation";
import { useClub, useUpdateClub } from "@/hooks/use-clubs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, Trash2 } from "lucide-react";
import { DeleteClubDialog } from "@/components/clubs/delete-club-dialog";
import { ClubHeader } from "./club-header";
import { ClubInfoContact } from "./club-info-contact";
import { ClubExploitation } from "./club-exploitation";
import { ClubCourts } from "./club-courts";
import { ClubPhotosAdmin } from "./club-photos-admin";
import type { ClubBackofficeDetailDto } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { computeChanges } from "./utils";
import { cn } from "@/lib/utils";

export default function ClubDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clubId = parseInt(params.id as string, 10);
  const { toast } = useToast();

  const { data: club, isLoading, isError } = useClub(clubId);
  const updateClub = useUpdateClub();

  // Global state
  const [originalDraft, setOriginalDraft] =
    useState<ClubBackofficeDetailDto | null>(null);
  const [draft, setDraft] = useState<ClubBackofficeDetailDto | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [geoIsInvalid, setGeoIsInvalid] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Hydrate state when club data arrives (only if not dirty)
  const changes = useMemo(() => {
    if (!originalDraft || !draft) return {};
    return computeChanges(originalDraft, draft);
  }, [originalDraft, draft]);

  const isDirty = Object.keys(changes).length > 0;

  useEffect(() => {
    if (club) {
      if (!isDirty) {
        setOriginalDraft(club);
        setDraft(club);
      }
    }
  }, [club, isDirty]);

  const canSave = isDirty && !geoIsInvalid && !isSaving;

  // Update draft function (passed to all sections)
  const updateDraft = (updates: Partial<ClubBackofficeDetailDto>) => {
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
      setOriginalDraft(updatedClub);
      setDraft(updatedClub);

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
            <h1 className="text-3xl font-bold text-gray-900">{club.name}</h1>
            <p className="text-gray-600 mt-1">
              Gestion et modification des informations du club
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer le club
          </Button>
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
        draft={draft}
        onUpdate={updateDraft}
        inputClassName={EDITABLE_INPUT_CLASS}
      />

      <ClubInfoContact
        draft={draft}
        onUpdate={updateDraft}
        inputClassName={EDITABLE_INPUT_CLASS}
        onGeoValidationChange={setGeoIsInvalid}
      />

      <ClubExploitation draft={draft} />

      <ClubCourts draft={draft} />

      <ClubPhotosAdmin
        draft={draft}
        onUpdate={updateDraft}
        inputClassName={EDITABLE_INPUT_CLASS}
      />

      <DeleteClubDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        clubId={clubId}
        clubName={club.name}
        onSuccess={() => router.replace("/admin/clubs")}
      />
    </div>
  );
}
