"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { useReservationSystem } from "@/hooks/use-clubs";
import EditReservationSystemDialog from "@/components/clubs/edit-reservation-system-dialog";

interface ClubReservationSystemProps {
  clubId: number;
}

export default function ClubReservationSystem({
  clubId,
}: ClubReservationSystemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { data: reservationSystem, isLoading } = useReservationSystem(clubId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Système de réservation</CardTitle>
        </CardHeader>
        <CardContent>Chargement...</CardContent>
      </Card>
    );
  }

  // Toujours afficher la carte, même si pas de données (sinon impossible d'éditer quand c'est vide)
  const data = reservationSystem || {
    systemType: "UNKNOWN",
    backendUrl: null,
    frontendUrl: null,
    email: null,
    password: null,
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Système de réservation</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Modifier les données du LR
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Type de système</Label>
              <div className="text-sm">{data.systemType}</div>
            </div>
            <div />
            <div className="space-y-2">
              <Label>URL Backend</Label>
              <div className="text-sm text-muted-foreground">
                {data.backendUrl || "Non renseigné"}
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL Frontend</Label>
              <div className="text-sm text-muted-foreground">
                {data.frontendUrl || "Non renseigné"}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="text-sm text-muted-foreground">
                {data.email || "Non renseigné"}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mot de passe</Label>
              <div className="text-sm text-muted-foreground">
                {data.password ? "••••••••" : "Non renseigné"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditReservationSystemDialog
        clubId={clubId}
        reservationSystem={data}
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
      />
    </>
  );
}
