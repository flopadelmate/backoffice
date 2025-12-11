"use client";

import { useKPIs } from "@/hooks/use-kpi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Clock, Target } from "lucide-react";

export default function KPIPage() {
  const { data: kpis, isLoading, isError } = useKPIs();

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600">Chargement des KPIs...</p>
      </div>
    );
  }

  if (isError || !kpis) {
    return (
      <div className="text-center py-8 text-red-600">
        Une erreur est survenue lors du chargement des KPIs.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">KPI & Statistiques</h1>
        <p className="text-gray-600 mt-1">
          Indicateurs de performance et métriques clés
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Matchs créés (24h)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.matchesCreated24h}</div>
            <p className="text-xs text-gray-500 mt-1">
              Dernières 24 heures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Temps moyen de matchmaking
            </CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {kpis.averageMatchmakingTime.toFixed(1)} min
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Temps pour trouver un match
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Utilisateurs actifs
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.activeUsers}</div>
            <p className="text-xs text-gray-500 mt-1">
              Utilisateurs actifs ce mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Taux de succès
            </CardTitle>
            <Target className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.successRate}%</div>
            <p className="text-xs text-gray-500 mt-1">
              Matchs complétés avec succès
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>À propos des KPIs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Note :</strong> Ces métriques sont actuellement mockées pour
              la démonstration. Elles seront connectées aux vraies données du
              backend une fois les endpoints prêts.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-gray-900">Métriques disponibles :</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>
                <strong>Matchs créés (24h) :</strong> Nombre de matchs créés dans
                les dernières 24 heures
              </li>
              <li>
                <strong>Temps moyen de matchmaking :</strong> Temps moyen pour
                qu'un joueur trouve un match (en minutes)
              </li>
              <li>
                <strong>Utilisateurs actifs :</strong> Nombre d'utilisateurs ayant
                utilisé l'application ce mois
              </li>
              <li>
                <strong>Taux de succès :</strong> Pourcentage de matchs créés qui
                ont été complétés avec succès
              </li>
            </ul>
          </div>

          <div className="rounded-md bg-gray-50 p-4">
            <p className="text-sm text-gray-600">
              Les données sont automatiquement rafraîchies toutes les minutes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
