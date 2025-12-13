"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useCreatePlayer, generateRandomPlayerName } from "@/hooks/use-matchmaking";
import { UserPlus } from "lucide-react";
import type { CreatePlayerRequest } from "@/types/api";
import { playerCreateSchema, type PlayerCreateFormData } from "@/lib/schemas/player";

export function PlayerFactory() {
  const createPlayerMutation = useCreatePlayer();
  const [pmrInput, setPmrInput] = useState<string>('');

  const form = useForm<PlayerCreateFormData>({
    resolver: zodResolver(playerCreateSchema),
    defaultValues: {
      displayName: "",
      pmr: undefined,
      preferredCourtPosition: "BOTH",
    },
  });

  const onSubmit = (data: PlayerCreateFormData) => {
    const playerData: CreatePlayerRequest = {
      displayName: data.displayName.trim() === "" ? generateRandomPlayerName() : data.displayName,
      pmr: data.pmr as number, // Zod garantit que pmr est défini ici grâce au refine
      preferredCourtPosition: data.preferredCourtPosition,
    };
    createPlayerMutation.mutate(playerData, {
      onSuccess: () => {
        form.reset();
        setPmrInput('');
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Player Factory
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div>
          <h3 className="font-medium mb-4">Créer un joueur de test</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du joueur</FormLabel>
                    <FormControl>
                      <Input placeholder="Jean Dupont" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="pmr"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel>PMR (1 - 8)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="4"
                            value={pmrInput}
                            onChange={(e) => {
                              const value = e.target.value.replace(',', '.');

                              // Mettre à jour l'affichage local immédiatement
                              setPmrInput(value);

                              // Si vide, mettre undefined dans le formulaire
                              if (value === '') {
                                field.onChange(undefined);
                                return;
                              }

                              // Autoriser les états intermédiaires comme "5." ou "."
                              if (value === '.' || value.endsWith('.')) {
                                return; // Ne pas mettre à jour le formulaire encore
                              }

                              // Parser et valider
                              const parsed = parseFloat(value);
                              if (!isNaN(parsed)) {
                                field.onChange(parsed);
                              }
                            }}
                            onBlur={() => {
                              // Au blur, nettoyer l'input
                              const value = pmrInput.replace(',', '.');
                              const parsed = parseFloat(value);

                              if (!isNaN(parsed)) {
                                field.onChange(parsed);
                                setPmrInput(parsed.toString());
                              } else if (value === '' || value === '.') {
                                field.onChange(undefined);
                                setPmrInput('');
                              } else {
                                // Input invalide, réinitialiser à la valeur du formulaire
                                setPmrInput(field.value?.toString() ?? '');
                              }

                              field.onBlur();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="preferredCourtPosition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Côté préféré</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LEFT">Gauche</SelectItem>
                          <SelectItem value="RIGHT">Droite</SelectItem>
                          <SelectItem value="BOTH">Les deux</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={createPlayerMutation.isPending}
                className="w-full"
              >
                {createPlayerMutation.isPending
                  ? "Création..."
                  : "Créer le joueur"}
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
