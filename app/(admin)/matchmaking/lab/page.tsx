import { PlayerFactory } from "@/components/matchmaking/player-factory";
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

      <Tabs defaultValue="workflow" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="sections">Par section</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-6">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-medium">
                  1
                </span>
                <h2 className="text-lg font-semibold">Créer des joueurs</h2>
              </div>
              <PlayerFactory />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-medium">
                  2
                </span>
                <h2 className="text-lg font-semibold">Inscrire en file</h2>
              </div>
              <QueueControl />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-medium">
                  3
                </span>
                <h2 className="text-lg font-semibold">Lancer et analyser</h2>
              </div>
              <AlgoRunner />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sections" className="space-y-6">
          <PlayerFactory />
          <QueueControl />
          <AlgoRunner />
        </TabsContent>
      </Tabs>
    </div>
  );
}
