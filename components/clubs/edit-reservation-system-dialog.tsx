"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateReservationSystem } from "@/hooks/use-clubs";
import {
  reservationSystemSchema,
  type ReservationSystemFormData,
} from "@/lib/schemas/reservation-system";
import type { ReservationSystemDto, ReservationSystemUpdateDto } from "@/types/api";

interface EditReservationSystemDialogProps {
  clubId: number;
  reservationSystem: ReservationSystemDto;
  open: boolean;
  onClose: () => void;
}

type SystemType = ReservationSystemDto["systemType"];
type EditableField = "frontendUrl" | "clubId" | "email" | "password";

// Détermine si un champ est éditable selon le systemType
function isFieldEditable(systemType: SystemType, field: EditableField): boolean {
  if (systemType === "UNKNOWN" || systemType === "NOT_IMPLEMENTED") {
    return false;
  }

  const editableFieldsByType: Record<SystemType, EditableField[]> = {
    UNKNOWN: [],
    NOT_IMPLEMENTED: [],
    TENUP: ["clubId"],
    GESTION_SPORTS: ["frontendUrl", "clubId", "email", "password"],
    DOIN_SPORT: ["frontendUrl", "clubId"],
    OPEN_RESA: ["frontendUrl", "email", "password"],
  };

  return editableFieldsByType[systemType].includes(field);
}

export default function EditReservationSystemDialog({
  clubId,
  reservationSystem,
  open,
  onClose,
}: EditReservationSystemDialogProps) {
  const updateMutation = useUpdateReservationSystem(clubId);

  const form = useForm<ReservationSystemFormData>({
    resolver: zodResolver(reservationSystemSchema),
    defaultValues: reservationSystem,
  });

  const systemType = form.watch("systemType");

  // Reset form when reservationSystem changes
  useEffect(() => {
    form.reset(reservationSystem);
  }, [reservationSystem, form]);

  const onSubmit = (data: ReservationSystemFormData) => {
    // Normaliser "" → null (inputs vides)
    const normalizeEmptyToNull = (value: string | null | undefined): string | null => {
      if (value === "" || value === undefined) return null;
      return value;
    };

    // Construire le payload en mergant avec les valeurs existantes pour les champs readOnly
    const payload: ReservationSystemUpdateDto = {
      systemType: data.systemType,
      frontendUrl: isFieldEditable(data.systemType, "frontendUrl")
        ? normalizeEmptyToNull(data.frontendUrl)
        : reservationSystem.frontendUrl,
      clubId: isFieldEditable(data.systemType, "clubId")
        ? normalizeEmptyToNull(data.clubId)
        : reservationSystem.clubId,
      email: isFieldEditable(data.systemType, "email")
        ? normalizeEmptyToNull(data.email)
        : reservationSystem.email,
      password: isFieldEditable(data.systemType, "password")
        ? normalizeEmptyToNull(data.password)
        : reservationSystem.password,
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        onClose();
        form.reset();
      },
    });
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const showOtherFields = systemType !== "UNKNOWN" && systemType !== "NOT_IMPLEMENTED";

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Modifier le système de réservation</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="systemType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de système</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UNKNOWN">UNKNOWN</SelectItem>
                      <SelectItem value="NOT_IMPLEMENTED">NOT_IMPLEMENTED</SelectItem>
                      <SelectItem value="TENUP">TENUP</SelectItem>
                      <SelectItem value="GESTION_SPORTS">
                        GESTION_SPORTS
                      </SelectItem>
                      <SelectItem value="DOIN_SPORT">DOIN_SPORT</SelectItem>
                      <SelectItem value="OPEN_RESA">OPEN_RESA</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showOtherFields && (
              <>
                <FormField
                  control={form.control}
                  name="backendUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Backend (lecture seule)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} readOnly className="bg-muted" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frontendUrl"
                  render={({ field }) => {
                    const editable = isFieldEditable(systemType, "frontendUrl");
                    return (
                      <FormItem>
                        <FormLabel>
                          URL Frontend
                          {editable && <span className="text-destructive ml-1">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            readOnly={!editable}
                            className={!editable ? "bg-muted" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="clubId"
                  render={({ field }) => {
                    const editable = isFieldEditable(systemType, "clubId");
                    return (
                      <FormItem>
                        <FormLabel>
                          ID Club
                          {editable && <span className="text-destructive ml-1">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            readOnly={!editable}
                            className={!editable ? "bg-muted" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => {
                    const editable = isFieldEditable(systemType, "email");
                    return (
                      <FormItem>
                        <FormLabel>
                          Email
                          {editable && <span className="text-destructive ml-1">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            {...field}
                            value={field.value || ""}
                            readOnly={!editable}
                            className={!editable ? "bg-muted" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => {
                    const editable = isFieldEditable(systemType, "password");
                    return (
                      <FormItem>
                        <FormLabel>
                          Mot de passe
                          {editable && <span className="text-destructive ml-1">*</span>}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            {...field}
                            value={field.value || ""}
                            readOnly={!editable}
                            className={!editable ? "bg-muted" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={updateMutation.isPending}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                Confirmer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
