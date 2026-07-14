"""Mix metrics with recursive component rollup.

The scalar metrics are the ones from the original static formulation
calculator: fat_pct / total_solids_pct are mass percentages of the mix; POD
(sweetness) and PAC (anti-freeze power) are sucrose-equivalent solute mass as a
percentage of total mix mass.

Components roll up recursively: an item referencing a component recipe
contributes amount_g times that component's per-gram composition. When a
component declares yield_g below the sum of its item masses (e.g. a reduced
coulis), the lost mass is treated as evaporated water (~1 g/mL for volume).
"""

from dataclasses import dataclass, field

from .models import Recipe, RecipeItem
from .schemas import Metrics


class RecipeCycleError(ValueError):
    pass


@dataclass
class Breakdown:
    """Absolute masses (g) and volume (mL) of a collection of items."""

    mass: float = 0.0
    water: float = 0.0
    fat: float = 0.0
    pod: float = 0.0  # sucrose-equivalent sweetness mass
    pac: float = 0.0  # sucrose-equivalent anti-freeze mass
    volume: float = 0.0

    def add(self, other: "Breakdown", scale: float = 1.0) -> None:
        self.mass += other.mass * scale
        self.water += other.water * scale
        self.fat += other.fat * scale
        self.pod += other.pod * scale
        self.pac += other.pac * scale
        self.volume += other.volume * scale


def items_breakdown(
    items: list[RecipeItem], _visiting: frozenset[int] = frozenset()
) -> Breakdown:
    total = Breakdown()
    for item in items:
        if item.ingredient is not None:
            ing = item.ingredient
            total.add(
                Breakdown(
                    mass=item.amount_g,
                    water=item.amount_g * ing.water,
                    fat=item.amount_g * ing.fat,
                    pod=item.amount_g * ing.solute * ing.pod,
                    pac=item.amount_g * ing.solute * ing.pac,
                    volume=item.amount_g / (ing.density or 1.0),
                )
            )
        elif item.component is not None:
            comp = component_breakdown(item.component, _visiting)
            if comp.mass > 0:
                total.add(comp, scale=item.amount_g / comp.mass)
    return total


def component_breakdown(
    recipe: Recipe, _visiting: frozenset[int] = frozenset()
) -> Breakdown:
    """Breakdown of one full batch of a component, after yield adjustment."""
    if recipe.id in _visiting:
        raise RecipeCycleError(
            f"recipe {recipe.id} ({recipe.name!r}) is part of a component cycle"
        )
    raw = items_breakdown(recipe.items, _visiting | {recipe.id})
    if recipe.yield_g is None or recipe.yield_g >= raw.mass:
        return raw
    loss = raw.mass - recipe.yield_g  # evaporated water
    raw.mass = recipe.yield_g
    raw.water = max(raw.water - loss, 0.0)
    raw.volume = max(raw.volume - loss, 0.0)
    return raw


def to_metrics(b: Breakdown) -> Metrics:
    return Metrics(
        mass_g=b.mass,
        volume_ml=b.volume,
        fat_pct=(b.fat / b.mass) * 100 if b.mass else 0.0,
        total_solids_pct=(1 - b.water / b.mass) * 100 if b.mass else 0.0,
        pod=(b.pod / b.mass) * 100 if b.mass else 0.0,
        pac=(b.pac / b.mass) * 100 if b.mass else 0.0,
    )


def compute_metrics(items: list[RecipeItem]) -> Metrics:
    return to_metrics(items_breakdown(items))
