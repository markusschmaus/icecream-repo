# Data model: recipes as fixed procedure + tunable ratios

The premise: the steps of an ice cream recipe are fixed, while composition is what
gets tuned — and tuning happens in terms of *metrics* (fat %, water %, MSNF share,
POD, PAC) that each have a natural set of ingredients allowed to move on their
behalf. The model below separates four concerns that the current flat ingredient
table conflates:

1. **What a material is** — composition per gram (`Substance`)
2. **How the recipe uses it** — amount and *role* (`Line`)
3. **What the procedure is** — ordered steps that lines attach to (`Step`)
4. **What the recipe should measure** — declared metric targets (`Target`)

Masses in the ingredient table become *derived state*: the recipe is specified by
batch size + identity shares + follower rules + metric targets, and the solver
materializes gram amounts from that spec.

---

## Entities

Types are given in TypeScript for precision; storage is plain JSON.

### Substance — recipe-independent material data

```ts
interface Substance {
  id: string;
  name: string;              // "Cream, 30% fat"
  density: number;           // g/mL

  // Composition, mass fractions 0–1, water+fat+solute+other ≈ 1.
  water: number;
  fat: number;
  solute: number;            // dissolved sugars/salts — drive POD and PAC
  other: number;             // protein/fiber/ash/stabilizer — TS only

  msnf: number;              // milk-solids-non-fat fraction (subset of solute+other);
                             // 0 for non-dairy. Enables MSNF metrics without
                             // guessing from solute/other.

  pod: number;               // sweetening power per unit solute, sucrose = 1
  pac: number;               // freezing-point depression per unit solute, sucrose = 1
}
```

Substances form a shared library (the current `PRESETS`); recipes reference them
by id and may override fields locally (e.g. a specific cream measured at 32 %).

### Step — the fixed procedure

```ts
interface Step {
  id: string;
  name: string;              // "Macerate", "Cook base", "Churn", "Finish"
  instructions: string;      // free text: temperatures, times, technique
}
```

Steps are an ordered list on the recipe. They are documentation and grouping
structure — the solver never reorders or touches them. Every line attaches to
exactly one step, so the recipe can always be printed as "procedure with amounts
filled in."

### Line — one use of a substance, with a role

```ts
interface Line {
  id: string;
  substanceId: string;
  stepId: string;            // where in the procedure this amount enters
  name?: string;             // optional display override: "Sugar (maceration)"
  mass: number;              // grams — DERIVED state, materialized by the solver
  role: Role;
}

type Role =
  | { kind: 'identity'; share: number }        // fraction of batch mass
  | { kind: 'lever';    groupId: string }      // solver variable
  | { kind: 'follower'; rule: FollowerRule };  // computed from a rule

interface FollowerRule {
  basis: 'batch' | 'group' | 'line';  // what the fraction is measured against
  refId?: string;                     // groupId or lineId when basis isn't 'batch'
  fraction: number;                   // e.g. 0.002 for 0.2 % stabilizer
}
```

The three roles encode who is allowed to change a line's mass:

- **identity** — creative decisions that define the recipe: fruit at 22 % of
  batch, balsamic at 2.6 %, pepper at a fixed pinch. Scale only with batch size.
  The solver must never adjust these to hit a nutritional metric.
- **lever** — the solver's variables, scoped to a group (below).
- **follower** — rules, not variables: guar at 0.2 % of batch, salt at 0.07 % of
  batch, maceration sugar at 5 % of the fruit line. Recomputed after everything
  else settles; never tuned directly.

### Group — a lever set that owns metrics

```ts
interface Group {
  id: string;
  name: string;              // "Dairy & water", "Sweeteners"
  owns: MetricId[];          // metrics this group is responsible for hitting
}
```

Groups partition the lever lines and declare responsibility. Editing a metric
dispatches the solve to its owning group only — that is what makes tuning
predictable and explainable ("you raised PAC: dextrose +12 g, sucrose −14 g").
Within-group ratios (dextrose vs. sucrose, cream vs. milk) are exactly what the
group-scoped solve produces, and they are the ratios that matter for tuning.

A group must contain at least as many lever lines as metrics it owns, and the
lines must be compositionally independent with respect to those metrics —
validated at edit time, reported as "add a sweetener with different PAC" rather
than a silent failure.

### Metric — a measurable property of the mix

```ts
type MetricId = string;

type MetricDef =
  | { id: MetricId; kind: 'massPct';  component: 'fat' | 'water' | 'ts' | 'msnf' }
  | { id: MetricId; kind: 'coefSum';  coef: 'pod' | 'pac' }   // Σ m·solute·coef / M
  | { id: MetricId; kind: 'ratio';    num: MetricId; den: MetricId }  // e.g. MSNF/TS
  | { id: MetricId; kind: 'absolute'; quantity: 'mass' };
```

All of these are linear (or, for `ratio`, linearizable by cross-multiplication)
in line masses, so every solve remains a small linear system. The built-in set:
`fat`, `water`, `ts`, `msnf`, `pod`, `pac`, `msnfShareOfTs`, `batchMass`.

### Recipe — ties it together

```ts
interface Recipe {
  id: string;
  name: string;
  batchMass: number;                   // the one absolute number; everything else is relative
  steps: Step[];                       // ordered
  lines: Line[];
  groups: Group[];
  targets: { metric: MetricId; value: number }[];  // the declared spec
  overrunPct: number;
}
```

The `targets` array is the recipe's compositional spec: "fat 14 %, TS 38 %,
POD 16, PAC 25." Together with identity shares and follower rules, it fully
determines the line masses. Two recipes with the same targets but different
sweetener sets are the same *specification* compiled against different pantries.

---

## Evaluation semantics

Materializing masses from the spec is a cascade with one weak coupling loop:

1. **Identity lines**: `mass = share × batchMass`.
2. **Follower lines**: apply rules against current basis masses.
3. **Each group in declaration order**: solve that group's lever masses so its
   owned metrics hit their targets, holding all other lines at current values.
   Minimum relative change from the previous materialization (the existing
   weighted least-squares approach, restricted to the group's lines).
4. **Repeat 2–3 until stable.** Groups couple only through the total-mass
   denominator and small cross-contributions (cream's lactose carries a little
   PAC), so this converges in a few iterations. Iteration cap + residual check;
   non-convergence surfaces as a diagnostic, never a hang.

Interactive edits map onto the same machinery:

- **Edit a target** → update `targets`, re-run the cascade. Primary movement is
  in the owning group; other groups shift slightly to keep their own targets
  pinned. Report the per-line deltas as the edit's explanation.
- **Edit batch size** → pure scale of every line (all metrics are intensive
  except `batchMass`).
- **Edit an identity share or follower rule** → recompute that line, then
  cascade so lever groups restore their targets.
- **Hand-edit a lever mass** → accept it, recompute metrics, and show the drift
  between measured metrics and declared targets ("PAC now 26.1 vs target 25")
  rather than instantly fighting the user. An explicit "re-solve" action snaps
  back to spec.

Infeasibility (negative mass, unreachable target within the owning group) is
reported against the group: "PAC 29 is not reachable with sucrose+dextrose alone
— add invert sugar or raise the sweetener share," never a silent global
redistribution.

---

## Worked example: strawberry–balsamic–black pepper

```jsonc
{
  "name": "Strawberry balsamic, black pepper",
  "batchMass": 1650,
  "overrunPct": 25,

  "steps": [
    { "id": "macerate", "name": "Macerate",  "instructions": "Toss berries with sugar and pepper; rest 2 h; add balsamic." },
    { "id": "base",     "name": "Cook base", "instructions": "Heat dairy to 45 °C; whisk in yolk powder, sugars, salt; add gums at 70 °C; pasteurize 85 °C; chill." },
    { "id": "age",      "name": "Age",       "instructions": "Rest base 12 h at 4 °C." },
    { "id": "churn",    "name": "Churn",     "instructions": "Blend maceration into base; churn to −5 °C." },
    { "id": "finish",   "name": "Finish",    "instructions": "Fold in cracked pepper; harden at −18 °C." }
  ],

  "groups": [
    { "id": "dairy", "name": "Dairy & water", "owns": ["fat", "msnf", "water"] },
    { "id": "sweet", "name": "Sweeteners",    "owns": ["pod", "pac"] }
  ],

  "lines": [
    // Levers — dairy group: three independent handles for fat / MSNF / water
    { "substanceId": "cream30",    "stepId": "base", "role": { "kind": "lever", "groupId": "dairy" } },
    { "substanceId": "milk15",     "stepId": "base", "role": { "kind": "lever", "groupId": "dairy" } },
    { "substanceId": "smp",        "stepId": "base", "role": { "kind": "lever", "groupId": "dairy" } },

    // Levers — sweetener group: two independent handles for POD / PAC
    { "substanceId": "sucrose",    "stepId": "base", "role": { "kind": "lever", "groupId": "sweet" } },
    { "substanceId": "dextrose",   "stepId": "base", "role": { "kind": "lever", "groupId": "sweet" } },

    // Identity — the creative spec, as shares of batch
    { "substanceId": "strawberry", "stepId": "macerate", "role": { "kind": "identity", "share": 0.20 } },
    { "substanceId": "fdStrawb",   "stepId": "macerate", "role": { "kind": "identity", "share": 0.030 } },
    { "substanceId": "balsamic",   "stepId": "macerate", "role": { "kind": "identity", "share": 0.024 } },
    { "substanceId": "yolkPowder", "stepId": "base",     "role": { "kind": "identity", "share": 0.022 } },
    { "substanceId": "pepper",     "stepId": "macerate", "name": "Black pepper (maceration)",
      "role": { "kind": "identity", "share": 0.0002 } },
    { "substanceId": "pepper",     "stepId": "finish",   "name": "Black pepper (finishing)",
      "role": { "kind": "identity", "share": 0.0002 } },

    // Followers — rules, recomputed after every solve
    { "substanceId": "sucrose",  "stepId": "macerate", "name": "Sugar (maceration)",
      "role": { "kind": "follower", "rule": { "basis": "line", "refId": "strawberry-line", "fraction": 0.055 } } },
    { "substanceId": "guar",     "stepId": "base",
      "role": { "kind": "follower", "rule": { "basis": "batch", "fraction": 0.0006 } } },
    { "substanceId": "xanthan",  "stepId": "base",
      "role": { "kind": "follower", "rule": { "basis": "batch", "fraction": 0.0006 } } },
    { "substanceId": "salt",     "stepId": "base",
      "role": { "kind": "follower", "rule": { "basis": "batch", "fraction": 0.0006 } } }
  ],

  "targets": [
    { "metric": "fat",   "value": 14.0 },
    { "metric": "msnf",  "value": 9.5 },
    { "metric": "water", "value": 61.0 },
    { "metric": "pod",   "value": 16.0 },
    { "metric": "pac",   "value": 25.0 }
  ]
}
```

Note what became of the current recipe's oddities: "Sugar (maceration)" is now a
follower of the strawberry line (it exists *because* maceration needs sugar, at
a technique-driven ratio), the two pepper additions are identity lines attached
to different steps, and the gums stopped being solver variables.

Tuning walkthroughs against this recipe:

- **"Less sweet"**: lower the `pod` target → sweetener group shifts sucrose →
  dextrose (dextrose has lower POD, higher PAC), dairy group nudges water to
  keep TS pinned. Fruit untouched.
- **"Too icy"**: raise `pac` or lower `water` → the owning group acts; if
  sucrose+dextrose can't reach the PAC target, the error says so and names the
  fix (add invert sugar to the sweetener group).
- **"More strawberry"**: raise the strawberry identity share → maceration sugar
  follows automatically, dairy and sweetener groups re-solve to keep all five
  targets exact.
- **"Make 4 L instead of 2"**: change `batchMass`; every line scales, followers
  included; no solve needed.

---

## Open questions

1. **Substance overrides**: store per-recipe overrides as a sparse diff against
   the library substance, or fork a private copy? Sparse diff keeps library
   updates flowing; a fork is simpler and more predictable. Leaning fork-on-edit.
2. **Water as an implicit lever**: a plain "Water" line in the dairy group is the
   cheapest way to make `water` independently reachable; should the model add it
   automatically when the dairy group can't span its metrics, or leave that to
   the user with a good diagnostic? Leaning diagnostic-only.
3. **Group solve ordering**: declaration order is user-controlled and transparent;
   is that enough, or should ordering be derived from metric dependencies?
   Leaning declaration order until a real recipe breaks it.
4. **Serialization of `mass`**: persist materialized masses alongside the spec
   (fast load, drift-tolerant) — the spec remains the source of truth and a
   loaded recipe re-materializes lazily.
