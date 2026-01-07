# PMR Post-Match v2 — Documentation

**Algorithme de mise à jour du PMR après un match 2v2**
_(Elo + score du match + surprises + fiabilité du niveau)_

---

## Vue d'ensemble

### Ce que fait l'algorithme

Après un match 2v2, l'algorithme calcule un nouveau PMR (Player Match Rating) pour chaque joueur en combinant :

- **Ce qui était attendu** vu les niveaux actuels
- **Ce qui s'est vraiment passé** (qui gagne + à quel point)
- **À quel point on fait confiance au niveau actuel** de chaque joueur (fiabilité)

### Entrées

Pour chaque match, l'algorithme reçoit :

**4 joueurs** : A, B vs C, D

Pour chaque joueur :
- `PMR actuel` : valeur entre 0.1 et 8.9
- `Fiabilité` : valeur entre 0 et 100
- `Score en sets` : best of 3 exprimé en jeux (ex : 6-4 7-6)

### Sorties

Pour chaque joueur :
- `previousPmr` : PMR avant le match
- `newPmr` : PMR après le match (clampé entre 0.1 et 8.9)
- `delta` : différence (new - previous)
- `previousReliability` : fiabilité avant le match
- `newReliability` : fiabilité après le match
- `deltaReliability` : différence de fiabilité

⚠️ **Important** : Le PMR final est toujours limité entre 0.1 et 8.9.

---

## Principe de l'algorithme

### Les 3 idées clés

#### 1) On compare "attendu" vs "réel"

Principe inspiré du système Elo :

- ✅ **Équipe forte gagne contre équipe faible** : rien de surprenant → petit ajustement
- ✅ **Équipe faible bat équipe forte** : surprise → gros ajustement

👉 C'est le principe Elo classique appliqué au padel 2v2.

#### 2) On tient compte du score (victoire serrée vs blowout)

Deux équipes de niveau proche :

- **7-6 7-6** : "match serré" → ajustement faible
- **6-0 6-0** : "grosse domination" → ajustement plus fort

👉 Ça évite que tous les matchs "valent pareil" tant qu'on a juste "win/lose".

#### 3) La fiabilité change la "vitesse" d'apprentissage

- **Fiabilité 100%** : l'algorithme se comporte exactement comme avant (delta normal)
- **Fiabilité faible** : on considère que son niveau est encore "flou" → on ajuste plus fort

👉 Même match, même équipe… mais deux coéquipiers peuvent bouger différemment si leur fiabilité n'est pas la même.

---

## Comportements garantis

Ce que vous verrez systématiquement en production :

| Scénario | Comportement attendu |
|----------|---------------------|
| ✅ Favori qui gagne | **Petit delta** — résultat attendu |
| ✅ Underdog qui gagne | **Delta plus grand** — surprise |
| ✅ Niveaux égaux + score serré | **Delta très faible** — rien d'anormal, match équilibré |
| ✅ Niveaux égaux + blowout | **Delta sensiblement plus grand** — un 6-0 6-0 indique qu'on s'est trompé sur leur niveau |
| ✅ Énorme écart (7 vs 3) + favori gagne 6-0 6-0 | **Delta quasi nul** — on ne récompense pas un résultat déjà évident |

---

## Les 4 blocs du calcul

### Bloc A — "Qui devait gagner ?" (Expectations)

On calcule une **probabilité de victoire attendue** pour l'équipe 1 (A, B), basée sur l'écart de PMR moyen.

**Logique** :
- Équipes proches → ~50/50
- Équipe 1 beaucoup plus forte → proche de 100%

👉 **Knob associé** : `eloScale` (voir section Paramètres de tuning)

### Bloc B — "Qui a gagné ?" (Résultat)

On regarde simplement le vainqueur via le nombre de sets gagnés :

- **Victoire** : 1
- **Défaite** : 0

### Bloc C — "À quel point ça a été dominant ?" (Score factor)

On mesure la **domination** via les jeux :

- **7-6 7-6** → domination faible
- **6-0 6-0** → domination maximale

Ça devient un **multiplicateur** :
- Proche d'un plancher si match serré
- Proche de 1 si blowout

👉 **Knobs associés** : `marginMin`, `marginGamma`

### Bloc D — "Est-ce une surprise ?" (Upset boost)

Si le résultat contredit le "attendu", on **amplifie l'ajustement**.

👉 **Knobs associés** : `upsetBeta`, `upsetGamma`

### Bloc E — "Fiabilité : à quelle vitesse ce joueur doit bouger ?"

Chaque joueur a un **multiplicateur de volatilité** basé sur sa fiabilité :

- **Fiabilité 100** → multiplicateur = 1 (inchangé)
- **Fiabilité 0** → multiplicateur = `Vmax` (ex : 3x)

👉 **Knobs associés** : `Vmax`, `vGamma`

---

## Paramètres de tuning (Knobs)

### Vue d'ensemble des paramètres

| Knob | Rôle | Effet si augmenté | Effet si diminué |
|------|------|-------------------|------------------|
| **K** | Volatilité globale | ⬆️ Tous les deltas augmentent | ⬇️ Tous les deltas diminuent |
| **eloScale** | Sensibilité à l'écart de niveau | ⬆️ Moins tranché sur les favoris | ⬇️ Plus tranché (favoris gagnent peu) |
| **marginMin** | Impact minimal d'un match serré | ⬆️ Matchs serrés comptent plus | ⬇️ Matchs serrés comptent moins |
| **marginGamma** | Poids des blowouts | ⬆️ 6-0 6-0 beaucoup plus impactant | ⬇️ Score a un effet plus linéaire |
| **upsetBeta** | Puissance du bonus surprise | ⬆️ Underdogs récompensés plus | ⬇️ Surprises lissées |
| **upsetGamma** | Courbe de la surprise | ⬆️ Gros boost pour grosses surprises | ⬇️ Petites surprises comptent plus |
| **Vmax** | Multiplicateur max (fiabilité 0) | ⬆️ Nouveaux convergent très vite | ⬇️ Limite les yo-yo sur nouveaux |
| **vGamma** | Forme de l'impact fiabilité | ⬆️ Effet surtout sur très nouveaux | ⬇️ Effet dès fiabilité moyenne |
| **relTau** | Vitesse de montée fiabilité | ⬆️ Monte plus lentement | ⬇️ Monte plus vite |
| **relCurveGamma** | Forme courbe fiabilité | ⬆️ Monte moins au début | ⬇️ Monte plus au début |

### A) K — Volatilité globale (le "volume" général)

**Ce que ça fait** : Augmente ou diminue **tous les deltas** (dans tous les cas).

**Tu l'augmentes si** :
- ⬆️ Tu trouves que les niveaux mettent trop longtemps à "se placer"
- ⬆️ Tu veux que le ladder soit plus réactif

**Tu le baisses si** :
- ⬇️ Tu vois des PMR qui "oscillent" trop
- ⬇️ Les users se plaignent que leur niveau bouge trop à chaque match

**Exemple concret** :
```
Besoin : "On veut que les nouveaux utilisateurs trouvent leur niveau en 10–15 matchs"
Action : ↑ K

Problème : "Les joueurs réguliers trouvent ça instable"
Action : ↓ K
```

---

### B) eloScale — Sensibilité à l'écart de niveau (attendu plus ou moins tranché)

**Ce que ça fait** : Détermine à quel point l'algorithme considère qu'un petit écart de PMR implique un gros avantage.

- `eloScale` **plus petit** → l'algorithme devient "sûr de lui" plus vite
  (un écart de 1 point PMR suffit pour prédire une victoire quasi certaine)
- `eloScale` **plus grand** → l'algorithme reste plus prudent
  (même avec un écart, il laisse de la place à la surprise)

**Tu l'augmentes si** :
- ⬆️ Tu trouves que les gros écarts "verrouillent" trop (favori gagne = delta ~0 tout le temps)
- ⬆️ Tu veux que battre plus fort que soi fasse gagner plus, même avec gros écart

**Tu le baisses si** :
- ⬇️ Tu veux que "7 vs 3" soit considéré comme quasi certain
- ⬇️ Tu veux éviter de trop récompenser les surprises sur gros écarts (anti-smurf / anti-bruit)

**Exemple concret** :
```
Problème : "Les 7.0 ne bougent jamais même quand ils jouent des 5.5 et gagnent serré"
Action : ↑ eloScale

Problème : "Un joueur 3.0 qui bat un 7.0 prend trop cher"
Action : ↓ eloScale
```

---

### C) marginMin — Impact minimal d'un match serré

**Ce que ça fait** : Même si match ultra serré, ça impose un minimum d'impact.

- **Plus bas** → 7-6 7-6 a très peu d'effet
- **Plus haut** → même un match serré compte beaucoup

**Tu l'augmentes si** :
- ⬆️ Tu veux que tout match "compte" davantage, même serré

**Tu le baisses si** :
- ⬇️ Tu veux éviter de trop bouger les niveaux quand c'est du 50/50

**Exemple concret** :
```
Problème : "Les matchs serrés entre joueurs proches font trop bouger le PMR"
Action : ↓ marginMin

Besoin : "On veut valoriser la victoire même serrée"
Action : ↑ marginMin
```

---

### D) marginGamma — À quel point les blowouts pèsent plus

**Ce que ça fait** : Accentue (ou non) l'écart entre un match serré et un match à sens unique.

- **Plus haut** → 6-0 6-0 devient beaucoup plus impactant que 7-6 7-6
- **Plus bas** → score a un effet plus "linéaire"

**Tu l'augmentes si** :
- ⬆️ Tu veux que les matchs très déséquilibrés corrigent vite les niveaux

**Tu le baisses si** :
- ⬇️ Tu crains les artefacts de score (ex : set "lâché", blessure, abandon déguisé)
- ⬇️ Tu veux réduire l'importance du score

**Exemple concret** :
```
Problème : "Deux joueurs censés être égaux se mettent 6-0 6-0 trop souvent sans correction"
Action : ↑ marginGamma

Problème : "On voit des scores extrêmes qui semblent 'contextuels' (fatigue/bobo)"
Action : ↓ marginGamma
```

---

### E) upsetBeta — Puissance du bonus "surprise"

**Ce que ça fait** : Plus il est élevé, plus les underdogs gagnants prennent cher… et les favoris perdants perdent beaucoup.

**Tu l'augmentes si** :
- ⬆️ Tu veux accélérer la correction quand le résultat contredit le niveau

**Tu le baisses si** :
- ⬇️ Tu veux lisser les surprises (moins de swings)
- ⬇️ Tu crains les matchs "non sérieux" ou incomplets

**Exemple concret** :
```
Besoin : "On veut que battre plus fort que soi soit vraiment récompensé"
Action : ↑ upsetBeta

Problème : "Des surprises ponctuelles font trop bouger les PMR"
Action : ↓ upsetBeta
```

---

### F) upsetGamma — Courbe de la surprise (où commence le "gros boost")

**Ce que ça fait** :

- **Plus haut** → le gros boost arrive surtout pour les très grosses surprises
- **Plus bas** → même des petites surprises prennent un boost notable

**Tu l'augmentes si** :
- ⬆️ Tu veux réserver les gros swings aux gros écarts inattendus

**Tu le baisses si** :
- ⬇️ Tu veux que l'algorithme réagisse même aux surprises modérées

**Exemple concret** :
```
Problème : "Les surprises modérées (ex 55/45) bougent trop"
Action : ↑ upsetGamma

Besoin : "Même un petit underdog win devrait compter plus"
Action : ↓ upsetGamma
```

---

### G) Vmax — Multiplicateur max d'amplitude quand fiabilité = 0

**Ce que ça fait** : Combien de fois plus un joueur "incertain" peut bouger.

- `Vmax = 3` → un joueur à 0% peut bouger jusqu'à 3x plus que le delta normal
- À 100% c'est toujours x1

**Tu l'augmentes si** :
- ⬆️ Tu veux que les nouveaux joueurs convergent très vite vers leur vrai niveau

**Tu le baisses si** :
- ⬇️ Tu veux éviter les "effets yo-yo" sur les nouveaux
- ⬇️ Tu veux limiter les gros swings même à faible fiabilité

**Exemple concret** :
```
Problème : "Les nouveaux restent mal classés trop longtemps"
Action : ↑ Vmax

Problème : "Les nouveaux prennent +0.6 / -0.6 sur un match, c'est trop violent"
Action : ↓ Vmax
```

---

### H) vGamma — Forme de l'impact fiabilité

**Ce que ça fait** : Comment la volatilité augmente quand la fiabilité baisse.

- **Plus haut** → proche de 100% ça reste presque x1, puis ça grimpe fort vers 0
- **Plus bas** → ça grimpe plus tôt (même à 70–80% tu sens l'effet)

**Tu l'augmentes si** :
- ⬆️ Tu veux que l'effet fiabilité soit surtout visible chez les très nouveaux (0–30%)

**Tu le baisses si** :
- ⬇️ Tu veux que même à fiabilité moyenne (ex 50–70%) ça bouge encore sensiblement

**Exemple concret** :
```
Problème : "À 60% fiabilité ça bouge encore trop"
Action : ↑ vGamma

Problème : "À 60% fiabilité ça bouge déjà trop peu"
Action : ↓ vGamma
```

---

### I) relTau — Vitesse globale de montée de la fiabilité

**Ce que ça fait** : Contrôle la vitesse globale d'acquisition de fiabilité.

- **Plus petit** → monte plus vite
- **Plus grand** → monte plus lentement

**Exemple concret** :
```
Besoin : "On veut 85% vers 70 matchs au lieu de 100"
Action : ↓ relTau

Besoin : "On veut que la fiabilité reste basse plus longtemps"
Action : ↑ relTau
```

---

### J) relCurveGamma — Forme de la courbe (début vs fin)

**Ce que ça fait** : Détermine la forme de la courbe de progression.

- **Plus petit** → monte plus au début
- **Plus grand** → monte moins au début, plus tard

**Exemple concret** :
```
Besoin : "On veut que les 10 premiers matchs apportent moins de confiance"
Action : ↑ relCurveGamma

Besoin : "On veut que les nouveaux sortent vite de 0–30%"
Action : ↓ relCurveGamma
```

---

## Mise à jour de la fiabilité (progression)

### Courbe calibrée

La courbe de fiabilité est calibrée pour atteindre les jalons suivants :

| Nombre de matchs | Fiabilité attendue |
|-----------------|-------------------|
| 5 matchs | ~24% |
| 30 matchs | ~55% |
| 100 matchs | ~85% |

### Paramètres de contrôle

- **relTau** : Vitesse globale de montée
- **relCurveGamma** : Forme de la courbe (début vs fin)

---

## Scénarios typiques → quel knob toucher ?

### Problème : "Les PMR changent trop chez les joueurs confirmés"

**Solutions** :
- ↓ `K` (global)
- ↓ `marginMin` (réduit les petits matchs)
- ↓ `upsetBeta` (surprises moins violentes)

---

### Problème : "Les nouveaux mettent trop longtemps à être bien classés"

**Solutions** :
- ↑ `Vmax` (fiabilité faible = bouge plus)
- ↑ `K` (global)
- ↓ `relTau` (fiabilité monte plus vite → paradoxalement ça stabilise plus tôt, donc à doser)

---

### Problème : "Le score (6-0/6-1) a trop d'impact, ça sur-réagit"

**Solutions** :
- ↓ `marginGamma`
- ↑ `marginMin` peut aider à lisser l'écart serré/blowout (selon ton objectif)

---

### Problème : "Les upsets ne sont pas assez récompensés"

**Solutions** :
- ↑ `upsetBeta`
- ↓ `eloScale` ? (attention : ça rend l'attendu plus tranché, donc surprise plus "énorme" quand elle arrive)
- ↑ `K` si tu veux plus de mouvement global

---

### Problème : "Les grosses surprises font des swings absurdes"

**Solutions** :
- ↓ `upsetBeta`
- ↑ `upsetGamma` (réserve le boost aux énormes surprises)
- ↑ `eloScale` (attendu moins extrême → surprises moins massives)

---

## Règles simples pour éviter de te tirer une balle dans le pied

⚠️ **Important** :

1. **Ne change pas 6 knobs en même temps**
   Tu ajustes 1–2 knobs, tu observes 1 semaine, tu recommences.

2. **Si tu veux plus/moins de mouvement "partout", touche d'abord K**

3. **Si ton souci est "nouveaux vs anciens", touche d'abord `Vmax` / `vGamma` / (`relTau` éventuellement)**

---

## Valeurs par défaut recommandées (baseline)

```typescript
// Configuration baseline recommandée
const DEFAULT_KNOBS = {
  K: 0.25,
  eloScale: 1.25,
  marginMin: 0.25,
  marginGamma: 1.3,
  upsetBeta: 0.8,
  upsetGamma: 1.2,
  Vmax: 3.0,
  vGamma: 1.2,
  relTau: 77,
  relCurveGamma: 0.52
};
```

Ces valeurs constituent un point de départ équilibré pour la plupart des cas d'usage.
