"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { useCreateTestPlayer, useCreateRandomPlayers, generateRandomPlayerName } from "@/hooks/use-matchmaking";
import { UserPlus, Users } from "lucide-react";
import type { CreateTestPlayerRequest } from "@/types/api";

const playerSchema = z.object({
  name: z.string(),
  level: z.number().min(0.1, "Le niveau doit être au minimum 0.1").max(9, "Le niveau doit être au maximum 9"),
  side: z.enum(["LEFT", "RIGHT", "BOTH"]),
});

type PlayerFormData = z.infer<typeof playerSchema>;

export function PlayerFactory() {
  const [randomCount, setRandomCount] = useState(5);
  const createPlayerMutation = useCreateTestPlayer();
  const createRandomMutation = useCreateRandomPlayers();

  const form = useForm<PlayerFormData>({
    resolver: zodResolver(playerSchema),
    defaultValues: {
      name: "",
      level: 5,
      side: "BOTH",
    },
  });

  const onSubmit = (data: PlayerFormData) => {
    const playerData = {
      ...data,
      name: data.name.trim() === "" ? generateRandomPlayerName() : data.name,
    };
    createPlayerMutation.mutate(playerData as CreateTestPlayerRequest, {
      onSuccess: () => {
        form.reset();
      },
    });
  };

  const handleCreateRandom = () => {
    createRandomMutation.mutate(randomCount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Player Factory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-medium mb-4">Créer un joueur de test</h3>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
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
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Niveau (0.1 - 9)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0.1}
                          max={9}
                          step={0.1}
                          placeholder="5.0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0.1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="side"
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

        <div className="border-t pt-6">
          <h3 className="font-medium mb-4">Génération rapide</h3>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Nombre de joueurs
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={randomCount}
                onChange={(e) => setRandomCount(parseInt(e.target.value) || 1)}
              />
            </div>
            <Button
              onClick={handleCreateRandom}
              disabled={createRandomMutation.isPending}
              variant="outline"
            >
              <Users className="mr-2 h-4 w-4" />
              {createRandomMutation.isPending
                ? "Création..."
                : "Créer N joueurs random"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
