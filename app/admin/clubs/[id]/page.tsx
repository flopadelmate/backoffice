"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useClub, useUpdateClub } from "@/hooks/use-clubs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import type { ClubStatus } from "@/types/api";

export default function ClubDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clubId = params.id as string;

  const { data: club, isLoading, isError } = useClub(clubId);
  const updateMutation = useUpdateClub();

  const [status, setStatus] = useState<ClubStatus | undefined>();
  const [visible, setVisible] = useState<boolean | undefined>();
  const [courtCount, setCourtCount] = useState<number | undefined>();

  // Initialize form values when club data loads
  if (club && status === undefined) {
    setStatus(club.status);
    setVisible(club.visible);
    setCourtCount(club.courtCount);
  }

  const hasChanges =
    status !== club?.status ||
    visible !== club?.visible ||
    courtCount !== club?.courtCount;

  const handleSave = () => {
    if (!club) return;

    const updates: {
      status?: ClubStatus;
      visible?: boolean;
      courtCount?: number;
    } = {};

    if (status !== club.status) updates.status = status;
    if (visible !== club.visible) updates.visible = visible;
    if (courtCount !== club.courtCount) updates.courtCount = courtCount;

    updateMutation.mutate(
      { id: clubId, data: updates },
      {
        onSuccess: () => {
          // Show success feedback could be added here
          alert("Club mis à jour avec succès!");
        },
      }
    );
  };

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
          <p className="text-gray-600 mt-1">Détails et édition du club</p>
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
              <Input value={club.name} disabled className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Ville</Label>
              <Input value={club.city} disabled className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Adresse</Label>
              <Input value={club.address} disabled className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paramètres modifiables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="status">Statut</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ClubStatus)}>
                <SelectTrigger id="status" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Actif</SelectItem>
                  <SelectItem value="INACTIVE">Inactif</SelectItem>
                  <SelectItem value="PENDING">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="visible">Visibilité</Label>
              <Select
                value={visible ? "true" : "false"}
                onValueChange={(value) => setVisible(value === "true")}
              >
                <SelectTrigger id="visible" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Visible</SelectItem>
                  <SelectItem value="false">Caché</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="courtCount">Nombre de courts</Label>
              <Input
                id="courtCount"
                type="number"
                value={courtCount}
                onChange={(e) => setCourtCount(parseInt(e.target.value))}
                className="mt-1"
                min={1}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Métadonnées</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-sm font-medium text-gray-600">Créé le</Label>
            <p className="mt-1">
              {new Date(club.createdAt).toLocaleString("fr-FR")}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Modifié le</Label>
            <p className="mt-1">
              {new Date(club.updatedAt).toLocaleString("fr-FR")}
            </p>
          </div>
        </CardContent>
      </Card>

      {updateMutation.isError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          Une erreur est survenue lors de la mise à jour du club.
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {updateMutation.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </div>
    </div>
  );
}
