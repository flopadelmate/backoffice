"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Check, X, Plus } from "lucide-react";
import {
  useExternalIds,
  useCreateExternalId,
  useUpdateExternalId,
} from "@/hooks/use-clubs";
import {
  createExternalIdSchema,
  updateExternalIdSchema,
  type CreateExternalIdFormData,
  type UpdateExternalIdFormData,
} from "@/lib/schemas/external-id";
import type { ExternalIdSource } from "@/types/api";

interface ClubExternalIdsProps {
  clubId: number;
}

export default function ClubExternalIds({ clubId }: ClubExternalIdsProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  const { data: externalIds, isLoading } = useExternalIds(clubId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>IDs externes</CardTitle>
        </CardHeader>
        <CardContent>Chargement...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>IDs externes</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddingNew(true)}
          disabled={addingNew || editingId !== null}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un ID
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>ID externe</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {externalIds?.map((externalId) =>
              editingId === externalId.id ? (
                <ExternalIdEditRow
                  key={externalId.id}
                  clubId={clubId}
                  externalId={externalId}
                  onCancel={() => setEditingId(null)}
                  onSuccess={() => setEditingId(null)}
                />
              ) : (
                <TableRow key={externalId.id}>
                  <TableCell>
                    <Badge variant="outline">{externalId.source}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {externalId.externalId}
                  </TableCell>
                  <TableCell>
                    {externalId.isPrimary && (
                      <Badge variant="secondary">Primary</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(externalId.id)}
                      disabled={addingNew || editingId !== null}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            )}

            {addingNew && (
              <ExternalIdAddRow
                clubId={clubId}
                onCancel={() => setAddingNew(false)}
                onSuccess={() => setAddingNew(false)}
              />
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ========== ROW EDIT MODE ==========
interface ExternalIdEditRowProps {
  clubId: number;
  externalId: { id: number; source: string; externalId: string };
  onCancel: () => void;
  onSuccess: () => void;
}

function ExternalIdEditRow({
  clubId,
  externalId,
  onCancel,
  onSuccess,
}: ExternalIdEditRowProps) {
  const updateMutation = useUpdateExternalId(clubId, externalId.id);

  const form = useForm<UpdateExternalIdFormData>({
    resolver: zodResolver(updateExternalIdSchema),
    defaultValues: { externalId: externalId.externalId },
  });

  const onSubmit = (data: UpdateExternalIdFormData) => {
    updateMutation.mutate(data, { onSuccess });
  };

  return (
    <TableRow>
      <TableCell>
        {/* Source en read-only (afficher juste le texte/badge, pas de Select bancal) */}
        <Badge variant="outline" className="bg-muted">
          {externalId.source}
        </Badge>
      </TableCell>
      <TableCell>
        <Input
          {...form.register("externalId")}
          className="font-mono text-sm"
        />
        {form.formState.errors.externalId && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.externalId.message}
          </p>
        )}
      </TableCell>
      <TableCell />
      <TableCell>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={form.handleSubmit(onSubmit)}
            disabled={updateMutation.isPending}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={updateMutation.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ========== ROW ADD MODE ==========
interface ExternalIdAddRowProps {
  clubId: number;
  onCancel: () => void;
  onSuccess: () => void;
}

function ExternalIdAddRow({
  clubId,
  onCancel,
  onSuccess,
}: ExternalIdAddRowProps) {
  const createMutation = useCreateExternalId(clubId);

  const form = useForm<CreateExternalIdFormData>({
    resolver: zodResolver(createExternalIdSchema),
    defaultValues: { source: "GOOGLE", externalId: "" },
  });

  const onSubmit = (data: CreateExternalIdFormData) => {
    createMutation.mutate(data, { onSuccess });
  };

  return (
    <TableRow>
      <TableCell>
        <Select
          onValueChange={(value) =>
            form.setValue("source", value as ExternalIdSource)
          }
          defaultValue="GOOGLE"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GOOGLE">GOOGLE</SelectItem>
            <SelectItem value="TENUP">TENUP</SelectItem>
            <SelectItem value="DOIN_SPORT">DOIN_SPORT</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.source && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.source.message}
          </p>
        )}
      </TableCell>
      <TableCell>
        <Input
          {...form.register("externalId")}
          placeholder="Entrez l'ID externe"
          className="font-mono text-sm"
        />
        {form.formState.errors.externalId && (
          <p className="text-sm text-red-500 mt-1">
            {form.formState.errors.externalId.message}
          </p>
        )}
      </TableCell>
      <TableCell />
      <TableCell>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createMutation.isPending}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={createMutation.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
