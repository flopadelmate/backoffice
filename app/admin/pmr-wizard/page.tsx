"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wand2, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { pmrOnboardingSchema, type PmrOnboardingData } from "@/lib/schemas/pmr";
import {
  computePMR as computePMRCurrent,
  type PmrResult,
  type AnswerQ1,
  type AnswerQ2,
  type AnswerQ3,
  type AnswerQ4,
  type AnswerQ5,
} from "@/lib/pmr-calculator";
import { computePMR as computePMRBest } from "@/lib/pmr-calculator-best";

const NIVEAU_OPTIONS = [
  {
    value: "debutant",
    label: "Débutant (15% des joueurs)",
    description:
      "Tu découvres le padel ou tu as joué très peu. Les bases techniques et le jeu avec les vitres sont encore en apprentissage.",
  },
  {
    value: "debutant-avance",
    label: "Débutant avancé (20% des joueurs)",
    description:
      "Tu connais les règles et les coups de base. Tu échanges quelques balles mais le jeu reste irrégulier.",
  },
  {
    value: "loisir-regulier",
    label: "Loisir régulier (25% des joueurs)",
    description:
      "Tu joues occasionnellement. Tu commences à utiliser les vitres et à construire les points, sans régularité constante.",
  },
  {
    value: "intermediaire",
    label: "Intermédiaire (25% des joueurs)",
    description:
      "Tu joues régulièrement. Tu maîtrises les fondamentaux, les vitres et les volées, avec une régularité correcte.",
  },
  {
    value: "confirme",
    label: "Confirmé (10% des joueurs)",
    description:
      "Tu construis les points, montes au filet efficacement et utilises les vitres de façon intentionnelle.",
  },
  {
    value: "avance",
    label: "Avancé (5% des joueurs)",
    description:
      "Tu as une bonne lecture du jeu, une régularité élevée et un jeu offensif maîtrisé (volées, bandejas, viboras).",
  },
  {
    value: "expert",
    label: "Expert (2% des joueurs)",
    description:
      "Tu joues en compétition (P250+). Ton jeu est structuré, tactique, avec une excellente gestion du filet et des transitions.",
  },
  {
    value: "elite",
    label: "Élite (<1% des joueurs)",
    description:
      "Joueur expert avec un très haut niveau technique et tactique. Tu joues des P1000+, avec une intensité et une précision constantes.",
  },
];

const EXPERIENCE_OPTIONS = [
  { value: "moins-1an", label: "Moins d'un an" },
  { value: "1-3ans", label: "De 1 à 3 ans" },
  { value: "3-6ans", label: "De 3 à 6 ans" },
  { value: "6-10ans", label: "De 6 à 10 ans" },
  { value: "plus-10ans", label: "Plus de 10 ans" },
];

const COMPETITION_OPTIONS = [
  {
    value: "loisir",
    label: "Loisir",
    description: "Uniquement des matchs loisirs (entre amis ou en club).",
  },
  {
    value: "debut-competition",
    label: "Début de compétition",
    description: "Tu joues régulièrement des P25, et occasionnellement des P100.",
  },
  {
    value: "competiteur-regulier",
    label: "Compétiteur régulier",
    description: "Tu joues régulièrement des P100, et parfois des P250.",
  },
  {
    value: "competiteur-avance",
    label: "Compétiteur avancé",
    description: "Tu joues régulièrement des tournois P250 ou plus.",
  },
];

const VOLEE_OPTIONS = [
  { value: "1", label: "Je ne monte presque pas au filet" },
  {
    value: "2",
    label: "Je ne suis pas à l'aise au filet. Je commets beaucoup d'erreurs.",
  },
  {
    value: "3",
    label: "Je volleye en coup droit et en revers avec un peu de difficulté",
  },
  { value: "4", label: "Je me place bien au filet et volleye avec assurance" },
  { value: "5", label: "Je volleye en profondeur et avec puissance" },
];

const REBONDS_OPTIONS = [
  {
    value: "1",
    label: "Je ne sais pas lire les rebonds. Je frappe avant le rebond.",
  },
  {
    value: "2",
    label: "J'essaie de frapper les rebonds sur le mur du fond, mais avec difficulté.",
  },
  {
    value: "3",
    label:
      "Je renvoie les rebonds sur le mur du fond, mais j'ai du mal avec ceux de double mur.",
  },
  {
    value: "4",
    label: "Je renvoie les rebonds sur deux murs et j'atteins les rebonds rapides",
  },
  {
    value: "5",
    label: "Je fais des descentes de mur puissantes en coup droit et en revers",
  },
];

export default function PmrWizardPage() {
  const [pmrResults, setPmrResults] = useState<{
    current: PmrResult;
    best: PmrResult;
  } | null>(null);
  const [showDebugCurrent, setShowDebugCurrent] = useState(false);
  const [showDebugBest, setShowDebugBest] = useState(false);

  const form = useForm<PmrOnboardingData>({
    resolver: zodResolver(pmrOnboardingSchema),
    defaultValues: {
      niveau: "",
      experience: "",
      competition: "",
      volee: "",
      rebonds: "",
    },
  });

  // Reset results when form values change
  useEffect(() => {
    const subscription = form.watch(() => {
      setPmrResults(null);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = (data: PmrOnboardingData) => {
    const params = {
      q1: data.niveau as AnswerQ1,
      q2: data.experience as AnswerQ2,
      q3: data.competition as AnswerQ3,
      q4: data.volee as AnswerQ4,
      q5: data.rebonds as AnswerQ5,
    };

    const resultCurrent = computePMRCurrent(params);
    const resultBest = computePMRBest(params);

    setPmrResults({
      current: resultCurrent,
      best: resultBest,
    });

    console.log("PMR Result Current:", resultCurrent);
    console.log("PMR Result Best:", resultBest);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">PMR Wizard</h1>
        <p className="text-gray-600 mt-1">
          Calculez le PMR (Player Match Rating) d'un joueur via différentes méthodes
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="onboarding" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="post-match">Post-match</TabsTrigger>
        </TabsList>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Questionnaire d'évaluation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {/* Question 1: Niveau */}
                  <FormField
                    control={form.control}
                    name="niveau"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold">
                          Quel est votre niveau ?
                        </FormLabel>
                        <div className="rounded-md bg-blue-50 p-4 mb-4">
                          <div className="flex gap-2">
                            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800 space-y-1">
                              <p className="font-medium">
                                Choisissez toujours le niveau le plus bas en cas d'hésitation.
                                Les parties seront plus équilibrées et agréables pour tous.
                              </p>
                              <p>Vous pourrez modifier votre niveau plus tard.</p>
                            </div>
                          </div>
                        </div>
                        <FormControl>
                          <div className="space-y-3">
                            {NIVEAU_OPTIONS.map((option) => (
                              <label
                                key={option.value}
                                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                                  field.value === option.value
                                    ? "border-blue-600 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                <input
                                  type="radio"
                                  value={option.value}
                                  checked={field.value === option.value}
                                  onChange={field.onChange}
                                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-600"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {option.label}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    {option.description}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Questions 2 & 3: Grid Layout */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Question 2: Experience */}
                    <FormField
                      control={form.control}
                      name="experience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">
                            Depuis combien d'années pratiques-tu le padel ou un autre sport de raquette ?
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              {EXPERIENCE_OPTIONS.map((option) => (
                                <label
                                  key={option.value}
                                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                                    field.value === option.value
                                      ? "border-blue-600 bg-blue-50"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    value={option.value}
                                    checked={field.value === option.value}
                                    onChange={field.onChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-600"
                                  />
                                  <div className="font-medium text-gray-900">
                                    {option.label}
                                  </div>
                                </label>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Question 3: Competition */}
                    <FormField
                      control={form.control}
                      name="competition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">
                            Quel est ton niveau de pratique en compétition ?
                          </FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              {COMPETITION_OPTIONS.map((option) => (
                                <label
                                  key={option.value}
                                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                                    field.value === option.value
                                      ? "border-blue-600 bg-blue-50"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    value={option.value}
                                    checked={field.value === option.value}
                                    onChange={field.onChange}
                                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-600"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                      {option.label}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                      {option.description}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Questions 4 & 5: Grid Layout */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Question 4: Volée */}
                    <FormField
                      control={form.control}
                      name="volee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">En volée...</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              {VOLEE_OPTIONS.map((option) => (
                                <label
                                  key={option.value}
                                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                                    field.value === option.value
                                      ? "border-blue-600 bg-blue-50"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    value={option.value}
                                    checked={field.value === option.value}
                                    onChange={field.onChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-600"
                                  />
                                  <div className="font-medium text-gray-900">
                                    {option.label}
                                  </div>
                                </label>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Question 5: Rebonds */}
                    <FormField
                      control={form.control}
                      name="rebonds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-lg font-semibold">Aux rebonds...</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              {REBONDS_OPTIONS.map((option) => (
                                <label
                                  key={option.value}
                                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                                    field.value === option.value
                                      ? "border-blue-600 bg-blue-50"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    value={option.value}
                                    checked={field.value === option.value}
                                    onChange={field.onChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-600"
                                  />
                                  <div className="font-medium text-gray-900">
                                    {option.label}
                                  </div>
                                </label>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Submit Button */}
                  <div>
                    <Button type="submit" size="lg">
                      Valider
                    </Button>
                  </div>
                </form>
              </Form>

              {/* Results Display */}
              {pmrResults && (
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  {/* Version Actuelle */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Version actuelle</h3>

                    {/* Main PMR Result */}
                    <div className="rounded-lg border-2 border-blue-600 bg-blue-50 p-6">
                      <div className="flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-sm font-medium text-blue-900">PMR Calculé</p>
                          <p className="text-4xl font-bold text-blue-600 mt-1">
                            {pmrResults.current.pmr.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Debug Section */}
                    <div className="border rounded-lg">
                      <button
                        type="button"
                        onClick={() => setShowDebugCurrent(!showDebugCurrent)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-900">
                          Informations de debug
                        </span>
                        {showDebugCurrent ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </button>

                      {showDebugCurrent && (
                        <div className="border-t p-4 space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">
                              Scores par question
                            </h4>
                            <div className="space-y-2">
                              {pmrResults.current.debugScores.map((debug) => (
                                <div
                                  key={debug.questionId}
                                  className="text-sm border rounded p-3 bg-gray-50"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-gray-900">
                                      {debug.questionId}
                                    </span>
                                    <div className="text-gray-500 font-mono text-right">
                                      <div>base: {debug.scoreAtWinnerBase.toFixed(3)}</div>
                                      <div>weighted: {debug.scoreAtWinnerWeighted.toFixed(3)}</div>
                                    </div>
                                  </div>
                                  <div className="text-gray-600 space-x-3">
                                    <span>mu={debug.mu}</span>
                                    <span>tau={debug.tau}</span>
                                    <span>weight={debug.weight}</span>
                                    {debug.hardMin && <span>hardMin={debug.hardMin}</span>}
                                    {debug.hardMax && <span>hardMax={debug.hardMax}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Version Best */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Version best (fine-tuned)</h3>

                    {/* Main PMR Result */}
                    <div className="rounded-lg border-2 border-green-600 bg-green-50 p-6">
                      <div className="flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-sm font-medium text-green-900">PMR Calculé</p>
                          <p className="text-4xl font-bold text-green-600 mt-1">
                            {pmrResults.best.pmr.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Debug Section */}
                    <div className="border rounded-lg">
                      <button
                        type="button"
                        onClick={() => setShowDebugBest(!showDebugBest)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-900">
                          Informations de debug
                        </span>
                        {showDebugBest ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </button>

                      {showDebugBest && (
                        <div className="border-t p-4 space-y-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">
                              Scores par question
                            </h4>
                            <div className="space-y-2">
                              {pmrResults.best.debugScores.map((debug) => (
                                <div
                                  key={debug.questionId}
                                  className="text-sm border rounded p-3 bg-gray-50"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-gray-900">
                                      {debug.questionId}
                                    </span>
                                    <div className="text-gray-500 font-mono text-right">
                                      <div>base: {debug.scoreAtWinnerBase.toFixed(3)}</div>
                                      <div>weighted: {debug.scoreAtWinnerWeighted.toFixed(3)}</div>
                                    </div>
                                  </div>
                                  <div className="text-gray-600 space-x-3">
                                    <span>mu={debug.mu}</span>
                                    <span>tau={debug.tau}</span>
                                    <span>weight={debug.weight}</span>
                                    {debug.hardMin && <span>hardMin={debug.hardMin}</span>}
                                    {debug.hardMax && <span>hardMax={debug.hardMax}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Post-match Tab (Placeholder) */}
        <TabsContent value="post-match" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Calcul PMR Post-match
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  Cette fonctionnalité sera implémentée prochainement
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
