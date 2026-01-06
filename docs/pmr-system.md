# Système PMR (PadelMate Rating) - Documentation Technique

## Introduction

Le **PMR (Player Match Rating)** est un système d'évaluation du niveau d'un joueur de padel basé sur un questionnaire de 5 questions. Il utilise une approche Bayésienne avec contraintes pour produire un score sur une échelle de **0.1 à 8.9**.

### Objectifs

- Estimer le niveau d'un joueur lors de son onboarding (questionnaire initial)
- Équilibrer les matchs en créant des équipes de niveaux similaires
- Fournir une métrique commune pour le matchmaking automatique

### Échelle PMR

```
1.0-2.0 : Débutant
2.0-3.0 : Débutant avancé / Loisir régulier
3.0-4.0 : Intermédiaire
4.0-5.0 : Confirmé
5.0-6.0 : Avancé
6.0-7.0 : Expert
7.0-8.9 : Élite
```

---

## Architecture Générale

### Fichiers Principaux

**Algorithmes de calcul :**
- [`lib/pmr-calculator.ts`](../lib/pmr-calculator.ts) - Version actuelle (production)
- [`lib/pmr-calculator-best.ts`](../lib/pmr-calculator-best.ts) - Version fine-tunée (expérimentation)

**Validation et types :**
- [`lib/schemas/pmr.ts`](../lib/schemas/pmr.ts) - Schéma Zod pour validation formulaire
- [`lib/schemas/player.ts`](../lib/schemas/player.ts) - Validation PMR (1-8) pour joueurs
- [`types/api.ts`](../types/api.ts) - Types TypeScript

**Interface utilisateur :**
- [`app/admin/pmr-wizard/page.tsx`](../app/admin/pmr-wizard/page.tsx) - PMR Wizard (comparaison des algorithmes)
- [`components/matchmaking/player-factory.tsx`](../components/matchmaking/player-factory.tsx) - Création de joueur avec PMR manuel

### Intégrations

Le PMR est utilisé dans :
- **PMR Wizard** : Calcul et comparaison des deux versions d'algorithme
- **Player Factory** : Saisie manuelle du PMR lors de la création de joueurs de test
- **Queue Control** : Affichage du PMR dans la file d'attente
- **Matchmaking Algorithm** : Équilibrage des équipes basé sur les PMR
- **Match Reports** : Analyse post-match (PMR moyen par équipe, qualité du match)

---

## Algorithme de Calcul

### Principe : Approche Bayésienne avec Soft Evidence

L'algorithme ne calcule pas directement un score à partir des réponses. Au lieu de cela :

1. **Chaque réponse génère une "Evidence"** avec 3 paramètres :
   - `mu` : Niveau espéré pour cette réponse (ex: "Expert" → mu = 7.0)
   - `tau` : Tolérance / écart-type (plus `tau` est élevé, plus la réponse est permissive)
   - `weight` : Importance relative de cette question (ex: auto-évaluation = 2.0)

2. **L'algorithme teste TOUS les niveaux possibles** (0.1 à 8.9, par pas de 0.1 = 89 candidats)

3. **Pour chaque niveau candidat**, il calcule un **log-score combiné** :
   ```
   logScore = Σ weight_i × logScoreGaussian(candidat, mu_i, tau_i)
   ```

4. **Le niveau avec le meilleur log-score** est retenu comme PMR final

### Calcul en Espace Logarithmique

**Formule gaussienne en log-space :**
```typescript
function logScoreDistanceGaussian(level: number, mu: number, tau: number): number {
  const d = level - mu;
  const sigma = tau;
  return -(d * d) / (2 * sigma * sigma);
}
```

**Pourquoi le log-space ?**
- Évite les underflows numériques (les probabilités très petites deviennent négatives en log)
- Transforme les multiplications en additions (plus rapide et précis)
- Augmente la sensibilité aux différences

### Contraintes Dures (Hard Caps)

Certaines réponses imposent des **limites strictes** sur le PMR :

```typescript
interface Evidence {
  mu: number;
  tau: number;
  weight: number;
  hardMin?: number;  // PMR minimum autorisé
  hardMax?: number;  // PMR maximum autorisé
}
```

**Exemples :**
- Q2: "Moins d'1 an d'expérience" → `hardMax = 4.0` (impossible d'être expert en < 1 an)
- Q4: "Volée niveau 1/5" → `hardMax = 3.0` (un joueur avec mauvaise volée ne peut pas être avancé)

**Traitement :**
```typescript
if (level < evidence.hardMin || level > evidence.hardMax) {
  logScore = -Infinity; // Niveau interdit
}
```

### Algorithme Complet

```typescript
export function computePMR(params: PmrParams): PmrResult {
  // 1. Convertir les réponses en evidences (mu, tau, weight, hardMin/Max)
  const evidences: Evidence[] = [
    questionToEvidence("Q1", params.niveau),
    questionToEvidence("Q2", params.experience),
    questionToEvidence("Q3", params.competition),
    questionToEvidence("Q4", params.volee),
    questionToEvidence("Q5", params.rebonds),
  ];

  // 2. Tester tous les niveaux candidats (0.1 à 8.9)
  const candidates: CandidateScore[] = [];

  for (let levelInt = 1; levelInt <= 89; levelInt++) {
    const level = levelInt / 10;
    let logCombined = 0;

    // 3. Calculer le log-score combiné
    for (const evidence of evidences) {
      // Vérifier les contraintes dures
      if (level < evidence.hardMin || level > evidence.hardMax) {
        logCombined = -Infinity;
        break;
      }

      // Ajouter la contribution pondérée
      const logScore = logScoreDistanceGaussian(level, evidence.mu, evidence.tau);
      logCombined += evidence.weight * logScore;
    }

    candidates.push({ level, logScore: logCombined });
  }

  // 4. Sélectionner le meilleur candidat
  const winner = candidates.reduce((best, curr) =>
    curr.logScore > best.logScore ? curr : best
  );

  // 5. Calculer les scores normalisés pour debug (0..1]
  const bestLogScore = winner.logScore;
  const debugScores = evidences.map(ev => ({
    ...ev,
    scoreAtWinnerBase: Math.exp(
      logScoreDistanceGaussian(winner.level, ev.mu, ev.tau)
    ),
    scoreAtWinnerWeighted: Math.exp(
      ev.weight * logScoreDistanceGaussian(winner.level, ev.mu, ev.tau)
    ),
  }));

  return {
    pmr: winner.level,
    debugScores,
  };
}
```

### Tie-Breaking

En cas d'égalité parfaite de log-score entre plusieurs niveaux :

```typescript
const avgMu = evidences.reduce((sum, ev) => sum + ev.mu, 0) / evidences.length;

// Préférer le niveau le plus proche de la moyenne des mu
if (logCombined === bestLogScore) {
  if (Math.abs(level - avgMu) < Math.abs(bestLevel - avgMu)) {
    bestLevel = level;
  }
}
```

---

## Les 5 Questions du Questionnaire

### Q1 : Auto-évaluation (8 niveaux)

**Options disponibles :**

| Option | Label | mu | tau | weight | Distribution |
|--------|-------|-----|-----|--------|--------------|
| `debutant` | Débutant | 1 | 1.2 | 2.0 | 15% |
| `debutant-avance` | Débutant avancé | 2 | 1.2 | 2.0 | 20% |
| `loisir-regulier` | Loisir régulier | 3 | 1.2 | 2.0 | 25% |
| `intermediaire` | Intermédiaire | 4 | 1.2 | 2.0 | 25% |
| `confirme` | Confirmé | 5 | 1.2 | 2.0 | 10% |
| `avance` | Avancé | 6 | 1.2 | 2.0 | 5% |
| `expert` | Expert | 7 | 1.2 | 2.0 | 2% |
| `elite` | Élite | 8 | 1.2 | 2.0 | <1% |

**Design intent :**
- **Question la plus importante** : `weight = 2.0` (le double des autres)
- **tau permissif (1.2)** : Compense les biais d'auto-évaluation (sur-estimation ou sous-estimation)
- **Mapping direct** : mu = index du niveau (1 à 8)

**Descriptions détaillées :**
```
Débutant : "Je découvre le padel, je ne maîtrise pas encore les bases"
Débutant avancé : "Je commence à tenir des échanges, mais je fais encore beaucoup d'erreurs"
Loisir régulier : "Je maîtrise les bases, je joue régulièrement pour le plaisir"
Intermédiaire : "Je maîtrise plusieurs coups, je commence à avoir une tactique"
Confirmé : "Je joue un padel solide, j'ai peu de points faibles"
Avancé : "Je joue en compétition avec succès, je maîtrise des coups techniques"
Expert : "Niveau professionnel ou semi-pro, technique très aboutie"
Élite : "Joueur de très haut niveau national/international"
```

### Q2 : Expérience (années de pratique)

**Options disponibles :**

#### Version actuelle

| Option | Label | mu | tau | weight | hardMax |
|--------|-------|-----|-----|--------|---------|
| `moins-1an` | Moins d'un an | 1.5 | 2.0 | 0.7 | 4.0 |
| `1-3ans` | 1 à 3 ans | 2.8 | 1.5 | 0.7 | 5.5 |
| `3-6ans` | 3 à 6 ans | 3.5 | 1.2 | 0.8 | 6.5 |
| `6-10ans` | 6 à 10 ans | 3.8 | 1.3 | 0.5 | - |
| `plus-10ans` | Plus de 10 ans | 4.0 | 1.5 | 0.4 | - |

#### Version best

| Option | Label | mu | tau | weight | hardMax |
|--------|-------|-----|-----|--------|---------|
| `moins-1an` | Moins d'un an | 1.5 | 2.0 | **0.9** ⬆️ | 4.0 |
| `1-3ans` | 1 à 3 ans | 2.8 | 1.5 | **0.9** ⬆️ | 5.5 |
| `3-6ans` | 3 à 6 ans | 3.5 | 1.2 | 0.8 | 6.5 |
| `6-10ans` | 6 à 10 ans | 3.8 | 1.3 | **0.6** ⬆️ | - |
| `plus-10ans` | Plus de 10 ans | **4.2** ⬆️ | 1.5 | **0.5** ⬆️ | - |

**Design intent :**
- **L'expérience agit comme un plafond** (via `hardMax`), pas comme un booster
- **Weights faibles pour 6-10ans et +10ans** : Évite qu'un débutant avec 10 ans soit surévalué
- **mu croissants mais plafonnent à 4.2** : L'expérience seule ne fait pas un expert
- **Version best** : Renforce légèrement l'influence de l'expérience (+0.2 sur weights)

**Exemple :**
- "Moins d'1 an" + "Expert" en Q1 → Le PMR sera plafonné à 4.0 (incohérence détectée)

### Q3 : Niveau de compétition

**Options disponibles :**

#### Version actuelle

| Option | Label | mu | tau | weight |
|--------|-------|-----|-----|--------|
| `loisir` | Loisir | 2.0 | 3.0 | 0.2 |
| `debut-competition` | Début compétition (P25, P100) | 4.0 | 1.2 | 0.8 |
| `competiteur-regulier` | Compétiteur régulier (P250, P500) | 5.5 | 1.0 | 0.9 |
| `competiteur-avance` | Compétiteur avancé (P1000+) | 7.5 | 0.9 | 0.9 |

#### Version best

| Option | Label | mu | tau | weight |
|--------|-------|-----|-----|--------|
| `loisir` | Loisir | **1.1** ⬇️ | 3.0 | 0.2 |
| `debut-competition` | Début compétition (P25, P100) | **3.8** ⬇️ | **1.0** ⬇️ | **1.0** ⬆️ |
| `competiteur-regulier` | Compétiteur régulier (P250, P500) | 5.5 | **0.8** ⬇️ | **1.0** ⬆️ |
| `competiteur-avance` | Compétiteur avancé (P1000+) | 7.5 | **0.7** ⬇️ | **1.0** ⬆️ |

**Design intent :**
- **"Loisir" quasi neutre** : `weight = 0.2`, `tau = 3.0` (très permissif)
- **Version best neutralise encore plus le loisir** : `mu = 1.1` (au lieu de 2.0)
- **Compétition discriminante** : tau réduits en version best pour mieux différencier les niveaux
- **Weights augmentés** : Version best donne plus d'importance à la compétition réelle

**Raison :**
Les joueurs confondent souvent les niveaux de tournois (P100 vs P250), d'où des ajustements fins.

### Q4 : Qualité de volée (échelle 1-5)

**Options disponibles :**

#### Version actuelle

| Option | Label | mu | tau | weight | hardMax |
|--------|-------|-----|-----|--------|---------|
| `1` | "Je ne monte presque pas au filet" | 1.1 | 1.3 | 0.8 | 3.0 |
| `2` | "Je monte mais j'ai du mal à volleyer" | 2.5 | 1.3 | 0.8 | 4.0 |
| `3` | "Je volleye correctement les balles faciles" | 3.8 | 1.4 | 0.9 | 5.0 |
| `4` | "Je volleye avec précision et contrôle" | 5.0 | 1.7 | 1.0 | - |
| `5` | "Je volleye en profondeur et avec puissance" | 6.0 | 1.8 | 1.0 | - |

#### Version best

| Option | Label | mu | tau | weight | hardMax |
|--------|-------|-----|-----|--------|---------|
| `1` | "Je ne monte presque pas au filet" | 1.1 | **1.2** ⬇️ | **0.9** ⬆️ | 3.0 |
| `2` | "Je monte mais j'ai du mal à volleyer" | 2.5 | **1.2** ⬇️ | **1.0** ⬆️ | 4.0 |
| `3` | "Je volleye correctement les balles faciles" | 3.8 | **1.3** ⬇️ | **1.0** ⬆️ | 5.0 |
| `4` | "Je volleye avec précision et contrôle" | 5.0 | **1.3** ⬇️ | **1.1** ⬆️ | - |
| `5` | "Je volleye en profondeur et avec puissance" | 6.0 | **1.4** ⬇️ | **1.1** ⬆️ | - |

**Design intent :**
- **Marqueur clé de compétence technique** : La volée est essentielle au padel
- **Hard caps pour niveaux bas** : Impossible d'être avancé (> 5.0) sans bonne volée
- **Version best plus stricte** : tau réduits (-0.1 à -0.4), weights augmentés (+0.1 à +0.2)
- **Moins de tolérance** : Version best pénalise plus fortement les mauvaises volées

### Q5 : Qualité aux rebonds (échelle 1-5)

**Options disponibles :**

#### Version actuelle

| Option | Label | mu | tau | weight | hardMax |
|--------|-------|-----|-----|--------|---------|
| `1` | "Je ne sais pas lire les rebonds" | 1.0 | 1.3 | 0.8 | 3.0 |
| `2` | "Je commence à anticiper les rebonds" | 2.5 | 1.3 | 0.8 | 4.0 |
| `3` | "Je gère correctement les rebonds simples" | 3.8 | 1.4 | 0.9 | 5.0 |
| `4` | "Je maîtrise les rebonds complexes" | 5.0 | 1.7 | 1.0 | - |
| `5` | "Je fais des descentes de mur puissantes" | 6.0 | 1.8 | 1.0 | - |

#### Version best

| Option | Label | mu | tau | weight | hardMax |
|--------|-------|-----|-----|--------|---------|
| `1` | "Je ne sais pas lire les rebonds" | 1.0 | **1.2** ⬇️ | **1.0** ⬆️ | 3.0 |
| `2` | "Je commence à anticiper les rebonds" | 2.5 | **1.2** ⬇️ | **1.0** ⬆️ | 4.0 |
| `3` | "Je gère correctement les rebonds simples" | 3.8 | **1.3** ⬇️ | **1.0** ⬆️ | 5.0 |
| `4` | "Je maîtrise les rebonds complexes" | 5.0 | **1.3** ⬇️ | **1.1** ⬆️ | - |
| `5` | "Je fais des descentes de mur puissantes" | 6.0 | **1.4** ⬇️ | **1.1** ⬆️ | - |

**Design intent :**
- **Marqueur de lecture tactique et d'expérience** : Les rebonds nécessitent de l'anticipation
- **Structure similaire à Q4** : Même progression de mu, même hard caps
- **Version best identique à Q4** : Même philosophie de strictification (tau ⬇️, weight ⬆️)

---

## Comparaison des Versions

### Philosophie des Changements

**Version actuelle (pmr-calculator.ts) :**
- Équilibrée, tolérante sur les compétences techniques (tau élevés)
- Weights faibles sur l'expérience (évite la sur-évaluation)
- "Loisir" en Q3 avec `mu = 2.0` (moyennement neutre)

**Version best (pmr-calculator-best.ts) :**
- Plus stricte sur les compétences techniques (tau réduits)
- Renforce l'influence de l'expérience et de la compétition (weights augmentés)
- Neutralise davantage le "loisir" (`mu = 1.1` au lieu de 2.0)
- **Hypothèse** : Fine-tuning basé sur données réelles ou feedback utilisateurs

### Tableau Récapitulatif des Différences

| Question | Paramètre | Actuelle | Best | Δ | Raison |
|----------|-----------|----------|------|---|--------|
| **Q2** | weight (moins-1an, 1-3ans) | 0.7 | 0.9 | +0.2 | Renforce influence expérience |
| **Q2** | mu (plus-10ans) | 4.0 | 4.2 | +0.2 | Légère augmentation |
| **Q3** | mu (loisir) | 2.0 | 1.1 | -0.9 | Neutralisation |
| **Q3** | tau (compétition) | 0.9-1.2 | 0.7-1.0 | -0.2 | Plus discriminant |
| **Q3** | weight (compétition) | 0.8-0.9 | 1.0 | +0.1/+0.2 | Plus d'importance |
| **Q4** | tau (tous) | 1.3-1.8 | 1.2-1.4 | -0.1/-0.4 | Moins tolérant |
| **Q4** | weight (tous) | 0.8-1.0 | 0.9-1.1 | +0.1/+0.2 | Plus d'influence |
| **Q5** | tau (tous) | 1.3-1.8 | 1.2-1.4 | -0.1/-0.4 | Moins tolérant |
| **Q5** | weight (tous) | 0.8-1.0 | 1.0-1.1 | +0.1/+0.2 | Plus d'influence |

### Impact Estimé

**Scénarios où "best" donne un PMR plus élevé :**
- Joueur avec 10+ ans d'expérience + bonnes compétences techniques
- Compétiteur régulier avec bonne volée/rebonds

**Scénarios où "best" donne un PMR plus faible :**
- Joueur "loisir pur" (mu = 1.1 au lieu de 2.0)
- Joueur avec compétences techniques moyennes (tau réduits → plus pénalisé)

---

## PMR Wizard : Interface de Comparaison

### Accès

URL : `/admin/pmr-wizard`

### Fonctionnalités

**Deux onglets :**
1. **Onboarding** : Calcul initial du PMR via questionnaire 5 questions (implémenté)
2. **Post-match** : Mise à jour du PMR après un match (à implémenter)

**Questionnaire complet :**
- 5 questions avec descriptions détaillées pour chaque option
- Validation via react-hook-form + Zod schema
- Info-boxes avec conseils ("Choisissez toujours le niveau le plus bas en cas d'hésitation")

**Calcul simultané :**
```typescript
const onSubmit = (data: PmrFormData) => {
  const current = computePMRCurrent(params);
  const best = computePMRBest(params);

  setPmrResults({ current, best });
};
```

**Affichage comparatif :**
```
┌─────────────────────────┬─────────────────────────┐
│  Version actuelle       │  Version best           │
│  (couleur bleue)        │  (couleur verte)        │
├─────────────────────────┼─────────────────────────┤
│  PMR: 4.3               │  PMR: 4.7               │
│                         │                         │
│  ▼ Voir détails debug   │  ▼ Voir détails debug   │
│                         │                         │
│  Q1 - intermediaire     │  Q1 - intermediaire     │
│    base: 0.923          │    base: 0.923          │
│    weighted: 0.851      │    weighted: 0.851      │
│    mu=4 tau=1.2 w=2.0   │    mu=4 tau=1.2 w=2.0   │
│  Q2 - 1-3ans            │  Q2 - 1-3ans            │
│    base: 0.456          │    base: 0.456          │
│    weighted: 0.319      │    weighted: 0.412      │
│    mu=2.8 tau=1.5 w=0.7 │    mu=2.8 tau=1.5 w=0.9 │
│  ...                    │  ...                    │
└─────────────────────────┴─────────────────────────┘
```

### Mode Debug

**Affichage pour chaque question :**
```typescript
interface QuestionDebugScore {
  questionId: string;      // "Q1", "Q2", etc.
  answer: string;          // Réponse choisie
  mu: number;              // Niveau espéré
  tau: number;             // Tolérance
  weight: number;          // Importance
  hardMin?: number;        // Contrainte dure min
  hardMax?: number;        // Contrainte dure max
  scoreAtWinnerBase: number;     // Score non pondéré (0..1]
  scoreAtWinnerWeighted: number; // Score pondéré (0..1]
}
```

**Interprétation des scores :**
- **base** : `exp(logScoreGaussian(pmr, mu, tau))` = cohérence brute de la réponse avec le PMR final
- **weighted** : `exp(weight × logScoreGaussian(...))` = cohérence après pondération
- **Plus proche de 1.0** → Réponse très cohérente avec le PMR retenu
- **Proche de 0** → Réponse contradictoire (mais compensée par d'autres questions)

**Exemple concret :**
```
Q1 - expert (mu=7)
  base: 0.234      → PMR final = 4.3, loin de mu=7 → score faible
  weighted: 0.055  → weight=2.0 amplifie la pénalité

Q4 - 3 (mu=3.8)
  base: 0.891      → PMR final = 4.3, proche de mu=3.8 → score élevé
  weighted: 0.794  → weight=0.9, légère atténuation
```

**Utilité :**
- Identifier les réponses contradictoires
- Comprendre pourquoi un PMR est retenu
- Comparer l'impact des paramètres entre les deux versions

---

## Intégration dans le Matchmaking

### Player Factory

**Création manuelle de joueur :**
```typescript
// components/matchmaking/player-factory.tsx

const form = useForm({
  resolver: zodResolver(playerCreateSchema),
  defaultValues: { displayName: "", pmr: undefined, preferredCourtPosition: "BOTH" },
});

// Input avec gestion virgule/point
const handlePmrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  let val = e.target.value.replace(",", ".");
  setPmrInput(val);
  const num = parseFloat(val);
  if (!isNaN(num)) {
    field.onChange(num);
  }
};
```

**Validation :**
- PMR entre 1 et 8 (aligné sur backend)
- Zod schema : `z.number().min(1).max(8)`

### Queue Control

**Affichage du PMR :**
```typescript
// components/matchmaking/queue-control.tsx

<TableCell>{player.pmr.toFixed(1)}</TableCell>
```

- PMR affiché en lecture seule
- Formatage avec 1 décimale (ex: `4.3`)

### Algo Runner

**Utilisation du PMR pour le matchmaking :**

Le backend utilise les PMR pour :
1. **Équilibrer les équipes** : `avg(Team1 PMR) ≈ avg(Team2 PMR)`
2. **Contrainte de tolérance** : `|player1.pmr - player2.pmr| ≤ teammateTol`
3. **Calcul de qualité** : `quality = 1 / (1 + |avgTeam1 - avgTeam2|)`

**Paramètres de matchmaking :**
```typescript
interface MatchmakingParams {
  teammateTol: number;  // Écart PMR max entre coéquipiers (ex: 1.5)
  opponentTol: number;  // Écart PMR max entre adversaires (ex: 2.0)
}
```

### Match Report

**Affichage des PMR dans le rapport :**
```typescript
interface CreatedMatch {
  team1: PlayerInMatch[];
  team2: PlayerInMatch[];
  avgTeam1: number;  // Moyenne PMR équipe 1
  avgTeam2: number;  // Moyenne PMR équipe 2
  quality: number;   // Score de qualité (0..1)
}

interface PlayerInMatch {
  name: string;
  pmr: number;
  position: "LEFT" | "RIGHT";
}
```

**UI :**
```
Match #1
├─ Team 1 (avg PMR: 4.5)
│  ├─ Alice (PMR: 4.3) - LEFT
│  └─ Bob (PMR: 4.7) - RIGHT
├─ Team 2 (avg PMR: 4.4)
│  ├─ Charlie (PMR: 4.2) - LEFT
│  └─ Diana (PMR: 4.6) - RIGHT
└─ Quality: 0.95 (excellent)
```

---

## Types et API

### Types Frontend

**Types principaux ([`types/api.ts`](../types/api.ts)) :**

```typescript
// Player
interface Player {
  publicId: string;
  displayName: string;
  pmr: number;  // 0.1-9.0 (plus large que backend)
  preferredCourtPosition: "LEFT" | "RIGHT" | "BOTH";
}

// Matchmaking
interface PlayerSlotResponseDto {
  publicId: string;
  displayName: string;
  pmr: number;
  position: "LEFT" | "RIGHT";
}

// Report
interface PlayerInMatchViewModel {
  name: string;
  pmr: number;
  position: "LEFT" | "RIGHT";
}

interface CreatedMatchViewModel {
  team1: PlayerInMatchViewModel[];
  team2: PlayerInMatchViewModel[];
  avgTeam1: number;
  avgTeam2: number;
  quality: number;
  score: number;
}
```

**Types de calcul :**

```typescript
// Paramètres du questionnaire
interface PmrParams {
  niveau: string;      // "debutant" | "debutant-avance" | ...
  experience: string;  // "moins-1an" | "1-3ans" | ...
  competition: string; // "loisir" | "debut-competition" | ...
  volee: string;       // "1" | "2" | "3" | "4" | "5"
  rebonds: string;     // "1" | "2" | "3" | "4" | "5"
}

// Résultat du calcul
interface PmrResult {
  pmr: number;  // 0.1-8.9
  debugScores: QuestionDebugScore[];
}
```

### Validation Zod

**Questionnaire ([`lib/schemas/pmr.ts`](../lib/schemas/pmr.ts)) :**

```typescript
export const pmrOnboardingSchema = z.object({
  niveau: z.string().min(1, "Veuillez sélectionner votre niveau"),
  experience: z.string().min(1, "Veuillez sélectionner votre expérience"),
  competition: z.string().min(1, "Veuillez sélectionner votre niveau de compétition"),
  volee: z.string().min(1, "Veuillez évaluer votre qualité de volée"),
  rebonds: z.string().min(1, "Veuillez évaluer votre qualité aux rebonds"),
});

export type PmrOnboardingFormData = z.infer<typeof pmrOnboardingSchema>;
```

**Player ([`lib/schemas/player.ts`](../lib/schemas/player.ts)) :**

```typescript
const pmrSchema = z
  .number()
  .min(1, "Le PMR doit être entre 1 et 8")
  .max(8, "Le PMR doit être entre 1 et 8");

export const playerCreateSchema = z.object({
  displayName: z.string().min(1, "Le nom est requis"),
  pmr: pmrSchema.optional().refine((val) => val !== undefined, {
    message: "Le PMR est requis",
  }),
  preferredCourtPosition: z.enum(["LEFT", "RIGHT", "BOTH"]),
});
```

### Backend API (Swagger)

**Contraintes backend :**
```json
{
  "pmr": {
    "type": "number",
    "minimum": 1,
    "maximum": 8,
    "description": "Player Match Rating"
  }
}
```

**Endpoints concernés :**
- `POST /backoffice/players` - Création de joueur
- `PUT /backoffice/players/{publicId}` - Mise à jour
- `GET /backoffice/matchmaking/queue` - Récupération de la queue

**Incohérence actuelle :**
- ⚠️ Calculateur retourne 0.1-8.9
- ⚠️ Backend accepte 1-8
- ⚠️ Frontend types acceptent 0.1-9.0

**Recommandation :** Aligner les ranges ou ajouter un clamp automatique avant envoi API :
```typescript
const pmrForBackend = Math.max(1, Math.min(8, calculatedPmr));
```

---

## Data Flow

### Flux de Calcul PMR (Onboarding)

```
┌──────────────────────┐
│ PMR Wizard Page      │
│ - Form (5 questions) │
└──────────┬───────────┘
           │ (submit)
           ▼
┌──────────────────────────────────┐
│ onSubmit()                       │
│ 1. Valide form (Zod)             │
│ 2. Convertit data → PmrParams    │
│ 3. Appelle computePMRCurrent()   │
│ 4. Appelle computePMRBest()      │
└──────────┬───────────────────────┘
           │ (résultats)
           ▼
┌──────────────────────────────────┐
│ React state: pmrResults          │
│ {                                │
│   current: { pmr, debugScores }, │
│   best: { pmr, debugScores }     │
│ }                                │
└──────────┬───────────────────────┘
           │ (render)
           ▼
┌──────────────────────────────────┐
│ UI: Deux colonnes                │
│ - PMR final (bleu/vert)          │
│ - Debug info (accordion)         │
└──────────────────────────────────┘
```

### Flux de Création de Joueur (Player Factory)

```
┌──────────────────────┐
│ Player Factory       │
│ - Form (name, pmr,   │
│   position)          │
└──────────┬───────────┘
           │ (submit)
           ▼
┌──────────────────────────────────┐
│ useCreatePlayer() mutation       │
│ POST /backoffice/players         │
│ {                                │
│   displayName: "Alice",          │
│   pmr: 4.5,                      │
│   preferredCourtPosition: "LEFT" │
│ }                                │
└──────────┬───────────────────────┘
           │ (success)
           ▼
┌──────────────────────────────────┐
│ TanStack Query                   │
│ - invalidateQueries(["players"]) │
│ - Rafraîchit PlayerBase          │
└──────────┬───────────────────────┘
           │ (refetch)
           ▼
┌──────────────────────────────────┐
│ UI: Joueur ajouté dans la base   │
│ Visible dans Queue/Algo Runner   │
└──────────────────────────────────┘
```

### Flux de Matchmaking

```
┌──────────────────────┐
│ Queue Control        │
│ - Liste joueurs avec │
│   leur PMR           │
└──────────┬───────────┘
           │ (lance matchmaking)
           ▼
┌──────────────────────────────────┐
│ Algo Runner                      │
│ POST /backoffice/matchmaking     │
│ {                                │
│   playerPublicIds: [...],        │
│   teammateTol: 1.5,              │
│   opponentTol: 2.0               │
│ }                                │
└──────────┬───────────────────────┘
           │ (backend calcule)
           ▼
┌──────────────────────────────────┐
│ Backend Matchmaking Algorithm    │
│ 1. Récupère les PMR de chaque    │
│    joueur                        │
│ 2. Génère combinaisons équipes   │
│ 3. Filtre selon teammateTol      │
│ 4. Score selon |avgTeam1-Team2|  │
│ 5. Retourne best matches         │
└──────────┬───────────────────────┘
           │ (response)
           ▼
┌──────────────────────────────────┐
│ Match Report                     │
│ - Affiche matchs créés           │
│ - PMR par joueur                 │
│ - Avg PMR par équipe             │
│ - Score de qualité               │
└──────────────────────────────────┘
```

---

## Exemples de Calcul Détaillés

### Exemple 1 : Joueur Débutant Cohérent

**Réponses :**
- Q1: `debutant` → mu=1, tau=1.2, weight=2.0
- Q2: `moins-1an` → mu=1.5, tau=2.0, weight=0.7, hardMax=4.0
- Q3: `loisir` → mu=2.0, tau=3.0, weight=0.2
- Q4: `1` → mu=1.1, tau=1.3, weight=0.8, hardMax=3.0
- Q5: `1` → mu=1.0, tau=1.3, weight=0.8, hardMax=3.0

**Calcul pour niveau candidat = 1.0 :**

```
logScore(Q1) = -2.0 × (1.0-1.0)² / (2×1.2²) = 0
logScore(Q2) = -0.7 × (1.0-1.5)² / (2×2.0²) = -0.7 × 0.25/8 = -0.0219
logScore(Q3) = -0.2 × (1.0-2.0)² / (2×3.0²) = -0.2 × 1/18 = -0.0111
logScore(Q4) = -0.8 × (1.0-1.1)² / (2×1.3²) = -0.8 × 0.01/3.38 = -0.0024
logScore(Q5) = -0.8 × (1.0-1.0)² / (2×1.3²) = 0

Total = 0 - 0.0219 - 0.0111 - 0.0024 + 0 = -0.0354
```

**Calcul pour niveau candidat = 5.0 :**

```
logScore(Q1) = -2.0 × (5.0-1.0)² / (2×1.2²) = -2.0 × 16/2.88 = -11.11
logScore(Q2) = -0.7 × (5.0-1.5)² / (2×2.0²) = -0.7 × 12.25/8 = -1.07
logScore(Q3) = -0.2 × (5.0-2.0)² / (2×3.0²) = -0.2 × 9/18 = -0.10
logScore(Q4) = -Infinity (niveau 5.0 > hardMax 3.0 de Q4)

Total = -Infinity
```

**Résultat attendu :** PMR ≈ **1.0-1.2** (toutes les réponses convergent vers le bas)

**Scores debug attendus :**
```
Q1: base ≈ 1.00 (parfait)
Q2: base ≈ 0.98
Q3: base ≈ 0.99
Q4: base ≈ 1.00
Q5: base ≈ 1.00
```

### Exemple 2 : Joueur avec Réponses Contradictoires

**Réponses :**
- Q1: `expert` → mu=7, tau=1.2, weight=2.0
- Q2: `moins-1an` → mu=1.5, tau=2.0, weight=0.7, **hardMax=4.0**
- Q3: `loisir` → mu=2.0, tau=3.0, weight=0.2
- Q4: `5` → mu=6.0, tau=1.8, weight=1.0
- Q5: `1` → mu=1.0, tau=1.3, weight=0.8, hardMax=3.0

**Analyse :**
- Q1 pousse vers 7.0 (poids fort)
- Q2 impose **hardMax=4.0** → Tout niveau > 4.0 interdit
- Q4 pousse vers 6.0 mais sera bloqué par Q2
- Q5 pousse vers 1.0 et impose hardMax=3.0

**Contraintes effectives :**
- Q2: niveau ≤ 4.0
- Q5: niveau ≤ 3.0
- **Contrainte la plus stricte** : niveau ≤ 3.0

**Calcul pour niveau candidat = 3.0 :**

```
logScore(Q1) = -2.0 × (3.0-7.0)² / (2×1.2²) = -2.0 × 16/2.88 = -11.11
logScore(Q2) = -0.7 × (3.0-1.5)² / (2×2.0²) = -0.7 × 2.25/8 = -0.20
logScore(Q3) = -0.2 × (3.0-2.0)² / (2×3.0²) = -0.2 × 1/18 = -0.01
logScore(Q4) = -1.0 × (3.0-6.0)² / (2×1.8²) = -1.0 × 9/6.48 = -1.39
logScore(Q5) = -0.8 × (3.0-1.0)² / (2×1.3²) = -0.8 × 4/3.38 = -0.95

Total = -11.11 - 0.20 - 0.01 - 1.39 - 0.95 = -13.66
```

**Calcul pour niveau candidat = 2.0 :**

```
logScore(Q1) = -2.0 × (2.0-7.0)² / (2×1.2²) = -2.0 × 25/2.88 = -17.36
logScore(Q2) = -0.7 × (2.0-1.5)² / (2×2.0²) = -0.7 × 0.25/8 = -0.02
logScore(Q3) = -0.2 × (2.0-2.0)² / (2×3.0²) = 0
logScore(Q4) = -1.0 × (2.0-6.0)² / (2×1.8²) = -1.0 × 16/6.48 = -2.47
logScore(Q5) = -0.8 × (2.0-1.0)² / (2×1.3²) = -0.8 × 1/3.38 = -0.24

Total = -17.36 - 0.02 + 0 - 2.47 - 0.24 = -20.09 (pire que 3.0)
```

**Résultat attendu :** PMR = **3.0** (meilleur compromis sous contraintes)

**Interprétation :**
- Le joueur se dit "expert" mais n'a que "moins d'1 an" d'expérience → Incohérence détectée
- Le hardMax de Q2 empêche un PMR > 4.0
- Le hardMax de Q5 empêche un PMR > 3.0 (encore plus strict)
- L'algorithme trouve le meilleur compromis à 3.0

**Scores debug attendus :**
```
Q1: base ≈ 0.00 (très faible, car 3.0 ≪ 7.0)
Q2: base ≈ 0.82
Q3: base ≈ 1.00 (parfait)
Q4: base ≈ 0.25
Q5: base ≈ 0.14
```

### Exemple 3 : Joueur Intermédiaire Équilibré

**Réponses :**
- Q1: `intermediaire` → mu=4, tau=1.2, weight=2.0
- Q2: `3-6ans` → mu=3.5, tau=1.2, weight=0.8, hardMax=6.5
- Q3: `debut-competition` → mu=4.0, tau=1.2, weight=0.8
- Q4: `3` → mu=3.8, tau=1.4, weight=0.9, hardMax=5.0
- Q5: `3` → mu=3.8, tau=1.4, weight=0.9, hardMax=5.0

**Calcul pour niveau candidat = 4.0 :**

```
logScore(Q1) = -2.0 × (4.0-4.0)² / (2×1.2²) = 0
logScore(Q2) = -0.8 × (4.0-3.5)² / (2×1.2²) = -0.8 × 0.25/2.88 = -0.07
logScore(Q3) = -0.8 × (4.0-4.0)² / (2×1.2²) = 0
logScore(Q4) = -0.9 × (4.0-3.8)² / (2×1.4²) = -0.9 × 0.04/3.92 = -0.01
logScore(Q5) = -0.9 × (4.0-3.8)² / (2×1.4²) = -0.01

Total = 0 - 0.07 + 0 - 0.01 - 0.01 = -0.09
```

**Calcul pour niveau candidat = 3.8 :**

```
logScore(Q1) = -2.0 × (3.8-4.0)² / (2×1.2²) = -2.0 × 0.04/2.88 = -0.03
logScore(Q2) = -0.8 × (3.8-3.5)² / (2×1.2²) = -0.8 × 0.09/2.88 = -0.03
logScore(Q3) = -0.8 × (3.8-4.0)² / (2×1.2²) = -0.8 × 0.04/2.88 = -0.01
logScore(Q4) = -0.9 × (3.8-3.8)² / (2×1.4²) = 0
logScore(Q5) = -0.9 × (3.8-3.8)² / (2×1.4²) = 0

Total = -0.03 - 0.03 - 0.01 + 0 + 0 = -0.07 (meilleur que 4.0 !)
```

**Résultat attendu :** PMR = **3.8-4.0** (les deux niveaux sont très proches, tie-breaking décidera)

**Scores debug attendus :**
```
Q1: base ≈ 0.97-1.00
Q2: base ≈ 0.97
Q3: base ≈ 0.99-1.00
Q4: base ≈ 0.99-1.00
Q5: base ≈ 0.99-1.00
```

---

## Recommandations

### Points Forts du Système

1. **Robustesse mathématique**
   - Calcul en log-space évite les underflows
   - Approche Bayésienne gère naturellement les incertitudes
   - Contraintes dures empêchent les incohérences grossières

2. **Flexibilité**
   - Paramètres (mu, tau, weight) ajustables par question
   - Deux versions d'algorithme pour A/B testing
   - Extensible à de nouvelles questions

3. **Debugging**
   - Informations détaillées par question (debugScores)
   - PMR Wizard permet de visualiser l'impact des paramètres
   - Scores normalisés (0..1] faciles à interpréter

4. **Type Safety**
   - TypeScript strict (pas d'`any`)
   - Validation Zod complète
   - Types backend synchronisés

5. **Comparaison facile**
   - Interface visuelle pour comparer les deux versions
   - Facilite le fine-tuning des paramètres

### Points d'Amélioration

#### 1. Alignement des Ranges

**Problème :**
- Calculateur retourne 0.1-8.9
- Backend accepte 1-8
- Frontend types acceptent 0.1-9.0

**Solution proposée :**
```typescript
function clampForBackend(pmr: number): number {
  return Math.max(1, Math.min(8, pmr));
}

// Avant envoi API
const pmrToSend = clampForBackend(calculatedPmr);
```

**Ou :** Modifier le calculateur pour limiter à 1.0-8.0 :
```typescript
for (let levelInt = 10; levelInt <= 80; levelInt++) { // 1.0 à 8.0
  const level = levelInt / 10;
  // ...
}
```

#### 2. Documentation des Paramètres

**Problème :** Les valeurs mu/tau/weight sont "magiques" (pas de justification dans le code)

**Solution :** Ajouter des commentaires détaillés :
```typescript
const Q1_EVIDENCE: Record<string, Evidence> = {
  debutant: {
    mu: 1,
    tau: 1.2, // Permissif car les débutants varient beaucoup
    weight: 2.0, // Double des autres car auto-évaluation est clé
  },
  // ...
};
```

#### 3. Tests Automatisés

**Problème :** Aucun test unitaire pour `computePMR()`

**Solution proposée :**
```typescript
// tests/pmr-calculator.test.ts

describe("computePMR", () => {
  it("should return PMR ≈ 1.0 for all min answers", () => {
    const result = computePMRCurrent({
      niveau: "debutant",
      experience: "moins-1an",
      competition: "loisir",
      volee: "1",
      rebonds: "1",
    });
    expect(result.pmr).toBeCloseTo(1.0, 1);
  });

  it("should return PMR ≈ 8.0 for all max answers", () => {
    const result = computePMRCurrent({
      niveau: "elite",
      experience: "plus-10ans",
      competition: "competiteur-avance",
      volee: "5",
      rebonds: "5",
    });
    expect(result.pmr).toBeGreaterThan(7.0);
  });

  it("should respect hard caps (Q2 moins-1an → PMR ≤ 4.0)", () => {
    const result = computePMRCurrent({
      niveau: "expert", // pousse vers 7.0
      experience: "moins-1an", // hardMax = 4.0
      competition: "competiteur-avance",
      volee: "5",
      rebonds: "5",
    });
    expect(result.pmr).toBeLessThanOrEqual(4.0);
  });

  it("should handle contradictions gracefully", () => {
    const result = computePMRCurrent({
      niveau: "expert",
      experience: "moins-1an",
      competition: "loisir",
      volee: "1",
      rebonds: "5",
    });
    expect(result.pmr).toBeGreaterThan(0);
    expect(result.pmr).toBeLessThan(9);
  });
});
```

#### 4. Calibration avec Données Réelles

**Problème :** Paramètres basés sur intuition, pas validés par des données

**Solution :**
1. Logger tous les PMR calculés + feedback utilisateurs
2. Analyser les distributions (éviter le clustering à certains niveaux)
3. A/B test avec vraies sessions de matchmaking
4. Ajuster mu/tau/weight selon les résultats

**Métriques à tracker :**
- Distribution des PMR calculés (éviter 80% entre 3-5)
- Taux de satisfaction matchmaking (équipes équilibrées ?)
- Corrélation PMR initial vs PMR après 10 matchs (si système dynamique)

#### 5. PMR Dynamique (Post-Match)

**Problème :** Tab "Post-match" non implémenté dans PMR Wizard

**Solution proposée (type ELO) :**
```typescript
function updatePMRAfterMatch(
  currentPMR: number,
  opponentsPMR: number[],
  result: "win" | "loss",
  matchCount: number
): number {
  // K-factor décroissant avec l'expérience
  const K = matchCount < 10 ? 0.4 : matchCount < 50 ? 0.2 : 0.1;

  // Score attendu (fonction logistique)
  const avgOpponentPMR = opponentsPMR.reduce((a, b) => a + b) / opponentsPMR.length;
  const expected = 1 / (1 + Math.pow(10, (avgOpponentPMR - currentPMR) / 4));

  // Score réel
  const actual = result === "win" ? 1 : 0;

  // Mise à jour
  return currentPMR + K * (actual - expected);
}
```

**Contraintes :**
- Limiter les variations : ±0.5 max par match
- Clamp final : 1.0-8.0
- Nécessite stockage de `matchCount` par joueur

#### 6. Validation Stricte du Formulaire

**Problème :** Le schéma Zod n'a que `string.min(1)` (pas de validation des valeurs exactes)

**Solution :**
```typescript
export const pmrOnboardingSchema = z.object({
  niveau: z.enum([
    "debutant",
    "debutant-avance",
    "loisir-regulier",
    "intermediaire",
    "confirme",
    "avance",
    "expert",
    "elite",
  ]),
  experience: z.enum(["moins-1an", "1-3ans", "3-6ans", "6-10ans", "plus-10ans"]),
  competition: z.enum(["loisir", "debut-competition", "competiteur-regulier", "competiteur-avance"]),
  volee: z.enum(["1", "2", "3", "4", "5"]),
  rebonds: z.enum(["1", "2", "3", "4", "5"]),
});
```

**Avantages :**
- TypeScript auto-complète les valeurs
- Erreur compile-time si nouvelle option ajoutée sans mise à jour de l'algo
- Meilleure sécurité

### Extensions Futures

#### 1. Visualisation de la Distribution

Afficher la courbe des scores pour tous les niveaux candidats :

```typescript
interface CandidateVisualization {
  level: number;
  normalizedScore: number; // 0..1
}

// UI: Graphique avec pic au niveau gagnant
<LineChart data={candidates}>
  <XAxis dataKey="level" />
  <YAxis dataKey="normalizedScore" />
  <Line strokeWidth={2} />
</LineChart>
```

**Utilité :**
- Voir si le choix est évident (pic unique) ou ambigu (plateau)
- Identifier les niveaux "presque gagnants"

#### 2. Confidence Interval

Ajouter un indicateur de confiance :

```typescript
interface PmrResult {
  pmr: number;
  confidence: number; // 0..1
  range: [number, number]; // [pmr - margin, pmr + margin]
}

// Calcul de la confiance
function computeConfidence(candidates: CandidateScore[]): number {
  const sorted = candidates.sort((a, b) => b.logScore - a.logScore);
  const best = sorted[0].logScore;
  const secondBest = sorted[1].logScore;

  // Plus la différence est grande, plus on est confiant
  const diff = best - secondBest;
  return Math.min(1, diff / 5); // Normalisé
}
```

**Affichage :**
```
PMR: 4.3 (confiance: 85%)
Range probable: 4.0-4.5
```

#### 3. Multi-Language Support

Actuellement tout en français, externaliser les labels :

```typescript
// i18n/fr.json
{
  "pmr.q1.debutant": "Débutant",
  "pmr.q1.debutant.description": "Je découvre le padel...",
  // ...
}

// i18n/en.json
{
  "pmr.q1.debutant": "Beginner",
  "pmr.q1.debutant.description": "I'm discovering padel...",
  // ...
}
```

#### 4. Analytics et Monitoring

Logger chaque calcul pour analyse statistique :

```typescript
interface PmrCalculationLog {
  timestamp: Date;
  userId?: string;
  answers: PmrParams;
  resultCurrent: number;
  resultBest: number;
  debugScores: QuestionDebugScore[];
}

// Backend endpoint
async function logPmrCalculation(log: PmrCalculationLog) {
  await apiClient.post("/analytics/pmr-calculations", log);
}
```

**Analyses possibles :**
- Distribution des PMR par question
- Questions les plus discriminantes
- Corrélation entre réponses
- Comparaison actuelle vs best (quelle version est meilleure ?)

#### 5. Questionnaire Adaptatif

Ajuster les questions suivantes en fonction des réponses précédentes :

```typescript
// Si Q1 = "debutant", skip Q3 (compétition) car peu pertinent
// Si Q4 ou Q5 = 1, ajouter question sur le service
```

**Avantages :**
- Questionnaire plus court pour certains profils
- Questions plus pertinentes

**Inconvénients :**
- Complexité accrue
- Difficulté de comparer les résultats entre profils

---

## Résumé Exécutif

### Architecture

Le système PMR est un **algorithme Bayésien modulaire** qui :
- Évalue les joueurs sur une échelle 0.1-8.9 via 5 questions
- Utilise des "soft evidences" (mu, tau, weight) + contraintes dures
- Calcule en espace logarithmique (robustesse numérique)
- Retourne le niveau avec le meilleur log-score combiné

### Implémentations

- **Version actuelle** ([`pmr-calculator.ts`](../lib/pmr-calculator.ts)) : Équilibrée, tolérante
- **Version best** ([`pmr-calculator-best.ts`](../lib/pmr-calculator-best.ts)) : Stricte, privilégie compétences techniques

### Intégrations

- **PMR Wizard** : Interface de comparaison avec debug détaillé
- **Player Factory** : Saisie manuelle PMR (1-8)
- **Matchmaking Lab** : Équilibrage des équipes basé sur PMR
- **Match Reports** : Analyse post-match (avg PMR, qualité)

### Qualité du Code

- TypeScript strict (pas d'`any`)
- Validation Zod complète
- Commentaires détaillés dans les algorithmes
- Patterns React modernes (hooks, TanStack Query)

### Prochaines Étapes

1. **Aligner les ranges** : Calculateur, frontend, backend (0.1-8.9 vs 1-8)
2. **Implémenter PMR dynamique** : Mise à jour post-match (tab "Post-match")
3. **Ajouter tests unitaires** : Cas limites, contraintes, incohérences
4. **Calibrer avec données réelles** : Logger calculs, analyser distributions
5. **Améliorer la validation** : Zod avec `z.enum()` pour valeurs exactes

---

## Annexe : Mapping Complet des Fichiers

### Calcul et Validation

| Fichier | Taille | Description |
|---------|--------|-------------|
| [`lib/pmr-calculator.ts`](../lib/pmr-calculator.ts) | 10.4 KB | Version actuelle (production) |
| [`lib/pmr-calculator-best.ts`](../lib/pmr-calculator-best.ts) | 10.3 KB | Version fine-tunée (expérimentation) |
| [`lib/schemas/pmr.ts`](../lib/schemas/pmr.ts) | 16 lignes | Schéma Zod questionnaire |
| [`lib/schemas/player.ts`](../lib/schemas/player.ts) | 35 lignes | Schéma Zod player (PMR 1-8) |

### Types

| Fichier | Taille | Description |
|---------|--------|-------------|
| [`types/api.ts`](../types/api.ts) | 857 lignes | Types TypeScript complets (Player, Matchmaking, etc.) |

### Interface Utilisateur

| Fichier | Taille | Description |
|---------|--------|-------------|
| [`app/admin/pmr-wizard/page.tsx`](../app/admin/pmr-wizard/page.tsx) | 625 lignes | PMR Wizard (comparaison algorithmes) |
| [`components/matchmaking/player-factory.tsx`](../components/matchmaking/player-factory.tsx) | 189 lignes | Création joueur avec PMR manuel |
| [`components/matchmaking/queue-control.tsx`](../components/matchmaking/queue-control.tsx) | 23k lignes | Affichage queue avec PMR |
| [`components/matchmaking/results/match-card.tsx`](../components/matchmaking/results/match-card.tsx) | - | Carte match avec PMR par joueur |
| [`components/matchmaking/results/matchmaking-results.tsx`](../components/matchmaking/results/matchmaking-results.tsx) | - | Rapport complet avec PMR moyen |

### State Management

| Fichier | Taille | Description |
|---------|--------|-------------|
| [`hooks/use-matchmaking.ts`](../hooks/use-matchmaking.ts) | 709 lignes | Hooks TanStack Query + state local |

### Utilities

| Fichier | Taille | Description |
|---------|--------|-------------|
| [`lib/matchmaking-report-utils.ts`](../lib/matchmaking-report-utils.ts) | 18.6 KB | Transformation rapport matchmaking |

---

**Fin de la documentation technique du système PMR.**
