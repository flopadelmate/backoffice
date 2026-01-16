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
import type { ReservationSystemDto } from "@/types/api";

interface EditReservationSystemDialogProps {
  clubId: number;
  reservationSystem: ReservationSystemDto;
  open: boolean;
  onClose: () => void;
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

    // Si systemType === "UNKNOWN", forcer autres champs à null
    const payload: ReservationSystemDto =
      data.systemType === "UNKNOWN"
        ? {
            systemType: "UNKNOWN",
            backendUrl: null,
            frontendUrl: null,
            email: null,
            password: null,
          }
        : {
            systemType: data.systemType,
            backendUrl: normalizeEmptyToNull(data.backendUrl),
            frontendUrl: normalizeEmptyToNull(data.frontendUrl),
            email: normalizeEmptyToNull(data.email),
            password: normalizeEmptyToNull(data.password),
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

            {systemType !== "UNKNOWN" && (
              <>
                <FormField
                  control={form.control}
                  name="backendUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Backend</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frontendUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Frontend</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
