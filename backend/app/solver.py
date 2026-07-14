"""Blend-solve: redistribute mass across a set of ingredient-group members to
hit a target metric while holding their combined mass fixed - the "exchange
substitutable ingredients to move a metric" operation. A straight swap of one
member for another is just the n=2 case of this.

Ported from the minimum-norm least-squares solver in the original static
formulation calculator (script.js solveAllIngredients), scoped down from "all
ingredients in the mix" to "this recipe's members of one substitution group."

Units: fat/ts/pod/pac targets and coefficients are fractions matching the
Ingredient columns directly (0-1 for fat/ts, unbounded for pod/pac since those
coefficients are relative to sucrose = 1.00, not themselves percentages). This
matches metrics.to_metrics before its *100 display scaling - callers doing
user-facing display conversions are responsible for that scaling, same as the
original calculator's toInternal/trimNum split between model and UI units.
"""

from dataclasses import dataclass

from .models import Ingredient, IngredientGroup, RecipeItem

EPS = 1e-9

METRICS = ("fat", "ts", "pod", "pac")


def metric_coef(ingredient: Ingredient, metric: str) -> float:
    if metric == "fat":
        return ingredient.fat
    if metric == "ts":
        return 1 - ingredient.water
    if metric == "pod":
        return ingredient.solute * ingredient.pod
    if metric == "pac":
        return ingredient.solute * ingredient.pac
    raise ValueError(f"unknown metric {metric!r}")


def assert_group_membership(ingredient: Ingredient, group: IngredientGroup) -> None:
    if group not in ingredient.groups:
        raise ValueError(
            f"{ingredient.name!r} is not a member of group {group.name!r}"
        )


def _solve_linear_system(a: list[list[float]], b: list[float]) -> list[float] | None:
    """Gauss-Jordan elimination with partial pivoting; None if singular."""
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(m[r][col]))
        if abs(m[pivot][col]) < EPS:
            return None
        m[col], m[pivot] = m[pivot], m[col]
        for r in range(n):
            if r == col:
                continue
            factor = m[r][col] / m[col][col]
            for c in range(col, n + 1):
                m[r][c] -= factor * m[col][c]
    return [m[i][n] / m[i][i] for i in range(n)]


@dataclass
class ItemSolveResult:
    item_id: int
    old_mass: float
    new_mass: float


@dataclass
class SolveResult:
    success: bool
    reason: str = ""
    infeasible: bool = False
    items: list[ItemSolveResult] | None = None


def solve_blend(
    items: list[RecipeItem], targets: list[tuple[str, float]]
) -> SolveResult:
    """targets: (metric, value) pairs. metric is "mass" (grams, absolute) or
    one of METRICS (mass-weighted average, fraction units - see module
    docstring). Solves for the mass changes across `items` that hit every
    target simultaneously, picking the minimum relative-change solution when
    the system is underdetermined (more items than targets)."""
    n = len(items)
    k = len(targets)
    if k == 0:
        return SolveResult(success=True, items=[])
    if k > n:
        return SolveResult(
            success=False,
            reason=(
                f"Solving needs at least {k} ingredients (one per constrained "
                f"metric) but the group only has {n} in this recipe."
            ),
        )

    m0 = [it.amount_g for it in items]
    total0 = sum(m0)
    scale = [m if abs(m) > EPS else 1.0 for m in m0]

    raw_coef: list[list[float]] = []
    c: list[float] = []
    for metric, value in targets:
        if metric == "mass":
            raw_coef.append([1.0] * n)
            c.append(value - total0)
        else:
            coefs = [metric_coef(it.ingredient, metric) for it in items]
            c0 = sum(m * co for m, co in zip(m0, coefs))
            raw_coef.append([co - value for co in coefs])
            c.append(value * total0 - c0)

    b = [[row[i] * scale[i] for i in range(n)] for row in raw_coef]
    bbt = [[sum(bj[i] * bl[i] for i in range(n)) for bl in b] for bj in b]

    y = _solve_linear_system(bbt, c)
    if y is None:
        return SolveResult(
            success=False,
            reason=(
                "No solution - these ingredients aren't compositionally diverse "
                "enough to hit this target while holding the rest fixed."
            ),
        )

    results = []
    infeasible = False
    for i, it in enumerate(items):
        z = sum(b[j][i] * y[j] for j in range(k))
        new_mass = m0[i] + z * scale[i]
        if new_mass < -1e-6:
            infeasible = True
        results.append(
            ItemSolveResult(item_id=it.id, old_mass=m0[i], new_mass=new_mass)
        )

    return SolveResult(success=True, infeasible=infeasible, items=results)


def solve_group_blend(
    items: list[RecipeItem], metric: str, target_value: float
) -> SolveResult:
    """Hold the group's total mass fixed, retarget one metric across its
    members. `items` must already be filtered to one recipe's items sharing
    one ingredient_group_id."""
    if len(items) < 2:
        return SolveResult(
            success=False,
            reason=(
                "Need at least 2 ingredients from this group in the recipe to "
                "blend-solve - add another member first."
            ),
        )
    total0 = sum(it.amount_g for it in items)
    return solve_blend(items, [("mass", total0), (metric, target_value)])
