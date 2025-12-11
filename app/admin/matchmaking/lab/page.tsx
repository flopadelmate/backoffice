import { PlayerFactory } from "@/components/matchmaking/player-factory";
import { PlayerBase } from "@/components/matchmaking/player-base";
import { QueueControl } from "@/components/matchmaking/queue-control";
import { AlgoRunner } from "@/components/matchmaking/algo-runner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MatchmakingLabPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Matchmaking Lab</h1>
        <p className="text-gray-600 mt-1">
          Créer des joueurs de test et tester l'algorithme de matchmaking
        </p>
      </div>

      <div className="rounded-md bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Note :</strong> Cet environnement utilise des données mockées.
          Les joueurs créés ici ne sont pas persistés et disparaîtront au
          rechargement de la page. Une fois le backend prêt, les vrais endpoints
          seront connectés.
        </p>
      </div>

      <Tabs defaultValue="players" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="players">Gestion joueurs</TabsTrigger>
          <TabsTrigger value="matchmaking">Matchmaking</TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="space-y-6">
          <PlayerFactory />
          <PlayerBase />
        </TabsContent>

        <TabsContent value="matchmaking" className="space-y-6">
          <QueueControl />
          <AlgoRunner />
        </TabsContent>
      </Tabs>
    </div>
  );
}
