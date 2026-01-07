"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PostMatchResult } from "@/types/pmr-wizard";

interface PostMatchResultsProps {
  results: PostMatchResult[];
}

export function PostMatchResults({ results }: PostMatchResultsProps) {
  const getDeltaBadgeVariant = (delta: number) => {
    if (delta > 0) return "default"; // Vert (gagnants)
    if (delta < 0) return "destructive"; // Rouge (perdants)
    return "secondary"; // Gris (égalité, rare)
  };

  const formatDelta = (delta: number): string => {
    if (delta > 0) return `+${delta.toFixed(2)}`;
    return delta.toFixed(2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Résultats de la simulation</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Joueur</TableHead>
              <TableHead className="text-right">PMR actuel</TableHead>
              <TableHead className="text-right">Nouveau PMR</TableHead>
              <TableHead className="text-right">Évolution PMR</TableHead>
              <TableHead className="text-right">Fiabilité actuelle</TableHead>
              <TableHead className="text-right">Nouvelle Fiabilité</TableHead>
              <TableHead className="text-right">Évolution Fiabilité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.playerPublicId}>
                <TableCell className="font-medium">
                  {result.displayName}
                </TableCell>
                <TableCell className="text-right">
                  {result.previousPmr.toFixed(1)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {result.newPmr.toFixed(1)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={getDeltaBadgeVariant(result.delta)}>
                    {formatDelta(result.delta)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {result.previousReliability.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {result.newReliability.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={getDeltaBadgeVariant(result.deltaReliability)}>
                    {formatDelta(result.deltaReliability)}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
