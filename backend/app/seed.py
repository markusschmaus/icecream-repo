"""Idempotent seed data: ingredient catalog, ingredient groups, the 8
insertion points, the 16 generic method steps, the generic custard base as a
template recipe, and a stracciatella variation demonstrating a component
sub-recipe."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import (
    Ingredient,
    IngredientGroup,
    InsertionPoint,
    MethodStep,
    Recipe,
    RecipeItem,
)

# Composition fractions 0-1; pod/pac relative to sucrose = 1.00.
INGREDIENTS = [
    dict(name="Whole milk, 3.5% fat", density=1.03, water=0.878, fat=0.035, solute=0.049, other=0.038, pod=0.16, pac=1.00),
    dict(name="Milk, 1.5% fat", density=1.03, water=0.895, fat=0.015, solute=0.049, other=0.041, pod=0.16, pac=1.00),
    dict(name="Heavy cream, 35% fat", density=0.99, water=0.602, fat=0.35, solute=0.026, other=0.022, pod=0.16, pac=1.00),
    dict(name="Cream, 30% fat", density=0.99, water=0.646, fat=0.30, solute=0.029, other=0.025, pod=0.16, pac=1.00),
    dict(name="Egg yolk, fresh", density=1.03, water=0.51, fat=0.27, solute=0.0, other=0.22, pod=0.0, pac=0.0),
    dict(name="Egg yolk powder", density=1.0, water=0.03, fat=0.60, solute=0.0, other=0.37, pod=0.0, pac=0.0),
    dict(name="Skim milk powder", density=1.0, water=0.03, fat=0.01, solute=0.51, other=0.45, pod=0.16, pac=1.00),
    dict(name="Sugar (sucrose)", density=1.0, water=0.0, fat=0.0, solute=1.0, other=0.0, pod=1.00, pac=1.00),
    dict(name="Dextrose", density=1.0, water=0.0, fat=0.0, solute=1.0, other=0.0, pod=0.74, pac=1.90),
    dict(name="Fructose", density=1.0, water=0.0, fat=0.0, solute=1.0, other=0.0, pod=1.73, pac=1.90),
    dict(name="Invert sugar (dry equiv.)", density=1.0, water=0.0, fat=0.0, solute=1.0, other=0.0, pod=1.25, pac=1.90),
    dict(name="Glucose syrup, DE60", density=1.4, water=0.20, fat=0.0, solute=0.80, other=0.0, pod=0.60, pac=0.60),
    dict(name="Honey", density=1.42, water=0.17, fat=0.0, solute=0.80, other=0.03, pod=1.30, pac=1.90),
    dict(name="Guar gum", density=1.0, water=0.09, fat=0.0, solute=0.0, other=0.91, pod=0.0, pac=0.0),
    dict(name="Xanthan gum", density=1.0, water=0.09, fat=0.0, solute=0.0, other=0.91, pod=0.0, pac=0.0),
    dict(name="Locust bean gum", density=1.0, water=0.09, fat=0.0, solute=0.0, other=0.91, pod=0.0, pac=0.0),
    dict(name="Salt, fine", density=1.0, water=0.002, fat=0.0, solute=0.998, other=0.0, pod=0.0, pac=32.6),
    dict(name="Fresh strawberries", density=1.0, water=0.91, fat=0.003, solute=0.055, other=0.032, pod=1.10, pac=1.60),
    dict(name="Freeze-dried strawberries", density=1.0, water=0.03, fat=0.01, solute=0.50, other=0.46, pod=1.10, pac=1.60),
    dict(name="Vanilla bean", density=1.0, water=0.25, fat=0.0, solute=0.0, other=0.75, pod=0.0, pac=0.0),
    dict(name="Dark chocolate, 70%", density=1.25, water=0.01, fat=0.43, solute=0.29, other=0.27, pod=1.00, pac=1.00),
    dict(name="Cocoa nibs", density=1.0, water=0.03, fat=0.54, solute=0.0, other=0.43, pod=0.0, pac=0.0),
    dict(name="Neutral oil", density=0.92, water=0.0, fat=1.0, solute=0.0, other=0.0, pod=0.0, pac=0.0),
    dict(name="Water", density=1.0, water=1.0, fat=0.0, solute=0.0, other=0.0, pod=0.0, pac=0.0),
    dict(name="Spirit / liqueur, 40% ABV", density=0.95, water=0.68, fat=0.0, solute=0.32, other=0.0, pod=0.0, pac=5.80),
    dict(name="Balsamic vinegar", density=1.06, water=0.77, fat=0.0, solute=0.15, other=0.08, pod=1.10, pac=1.60),
    dict(name="Black pepper, cracked", density=1.0, water=0.10, fat=0.02, solute=0.0, other=0.88, pod=0.0, pac=0.0),
]

INSERTION_POINTS = [
    dict(id=1, name="Infusion", base_state="Raw dairy, pre-cook", addition_class="Volatile aromatics", technique="Infusion", result="Fully integrated aroma, no textural effect", description="Add aromatics to the raw dairy (vanilla bean, tea, whole spices, herbs). Steep at a bare simmer 10-20 min off heat, covered."),
    dict(id=2, name="Late infusion", base_state="Hot custard, pre-strain", addition_class="Heat-hungry aromatics", technique="Late infusion", result="Stronger extraction", description="For aromatics needing more heat/time (toasted spices, coffee, robust teas), extend or repeat the steep in the hot dairy."),
    dict(id=3, name="Pre-age mix-in", base_state="Strained custard, warm, pre-age", addition_class="Purees/pastes", technique="Pre-age mix-in", result="Integrates + matures overnight", description="Blend in purees or pastes that benefit from overnight maturation (fruit puree, nut butter, matcha, miso) while the custard is still warm."),
    dict(id=4, name="Post-age mix-in", base_state="Aged custard, cold, pre-churn", addition_class="Acidic/water-labile liquids, or fats for uniform distribution", technique="Post-age mix-in", result="Clean emulsification before churn", description="Just before churning, whisk in water-labile or acidic liquids (citrus juice, liqueur/alcohol) or additional fats meant to distribute uniformly (melted chocolate, extra cream)."),
    dict(id=5, name="End-of-churn shatter/distribute", base_state="End-of-churn, shear tapering", addition_class="Fat-based liquid (thin stream) or small dense solids", technique="Shatter/distribute", result="Shards, or evenly dispersed small solids", description="In the final 30-60 seconds of churning: fat-based liquid in a thin stream shatters into flakes (stracciatella); small dense solids (mini chips, nibs, toffee bits, crushed nuts) are distributed and lightly broken up by residual shear."),
    dict(id=6, name="Swirl", base_state="Post-churn, static, no shear", addition_class="Liquid (fat- or water-based)", technique="Swirl", result="Ribbon/streak", description="Pour and minimally fold in a liquid addition (fruit coulis, caramel, extra chocolate) in broad strokes to preserve ribbons rather than homogenize."),
    dict(id=7, name="Fold-in", base_state="Post-churn, static", addition_class="Larger/fragile solids", technique="Fold-in", result="Even distribution, no pulverization", description="Fold in larger or more fragile solids (chips, nuts, cookie pieces) evenly through the mass - no mechanical stress, unlike end-of-churn additions."),
    dict(id=8, name="Layering", base_state="Transfer to storage", addition_class="Anything already swirled/folded", technique="Layering", result="Spatial stratification", description="Instead of, or in addition to, folding: transfer in stages (base, then sauce/solids, repeat) to stratify rather than distribute evenly. Orthogonal to points 5-7."),
]

# (step_number, insertion_point_id or None, instruction)
METHOD_STEPS = [
    (1, 1, "Combine milk, cream, half the sugar, and salt in a saucepan."),
    (2, None, "Whisk yolks with remaining sugar until pale and slightly thickened."),
    (3, 2, "Bring dairy back to a bare simmer."),
    (4, None, "Temper: slowly whisk ~1/3 of the hot dairy into the yolks, then return everything to the pan."),
    (5, None, "Cook over medium-low, stirring constantly, to 82-84 C (180-184 F) - nappe consistency, coats the back of a spoon."),
    (6, None, "Strain through a fine sieve into a clean container."),
    (7, 3, "Blend in pre-age additions while the custard is still warm."),
    (8, None, "Cool the custard (ice bath), then cover and refrigerate 4-24 h."),
    (9, 4, "Just before churning, whisk in post-age additions."),
    (10, None, "Churn in an ice cream maker per manufacturer instructions, until soft-serve consistency."),
    (11, 5, "In the final 30-60 seconds of churning, add end-of-churn additions while the dasher is still shearing."),
    (12, None, "Transfer churned ice cream to a storage container."),
    (13, 6, "Pour and minimally fold in swirl additions in broad strokes."),
    (14, 7, "Fold in larger or fragile solids evenly through the mass."),
    (15, 8, "Optionally layer: transfer in stages (base, then sauce/solids, repeat) to stratify."),
    (16, None, "Freeze, covered with parchment or plastic pressed to the surface, minimum 4 h, ideally overnight, before serving."),
]

# Generic base: yields ~1 quart (950 mL) finished mix.
# (ingredient name, amount_g, insertion_point_id or None, preparation, sort_order)
BASE_ITEMS = [
    ("Whole milk, 3.5% fat", 340, None, "", 0),
    ("Heavy cream, 35% fat", 340, None, "", 1),
    ("Sugar (sucrose)", 100, None, "into dairy", 2),
    ("Sugar (sucrose)", 50, None, "into yolks", 3),
    ("Egg yolk, fresh", 110, None, "6 large yolks", 4),
    ("Salt, fine", 1, None, "", 5),
]

# Groups of ingredients that can be blend-solved against each other (see
# solver.solve_group_blend): (group name, description, member ingredient names)
INGREDIENT_GROUPS = [
    (
        "Sweeteners",
        "Sugars that can be blended against each other to hit a POD/PAC target "
        "without changing the total sweetener mass.",
        [
            "Sugar (sucrose)",
            "Dextrose",
            "Fructose",
            "Invert sugar (dry equiv.)",
            "Honey",
        ],
    ),
    (
        "Stabilizer gums",
        "Interchangeable thickener/stabilizer gums.",
        ["Guar gum", "Xanthan gum", "Locust bean gum"],
    ),
]


def seed(db: Session) -> None:
    if db.scalar(select(Ingredient.id).limit(1)) is not None:
        return

    ingredients = {row["name"]: Ingredient(**row) for row in INGREDIENTS}
    db.add_all(ingredients.values())
    db.add_all(InsertionPoint(**row) for row in INSERTION_POINTS)
    db.add_all(
        MethodStep(step_number=n, insertion_point_id=ip, instruction=text)
        for n, ip, text in METHOD_STEPS
    )
    groups = {
        name: IngredientGroup(
            name=name,
            description=desc,
            members=[ingredients[m] for m in member_names],
        )
        for name, desc, member_names in INGREDIENT_GROUPS
    }
    db.add_all(groups.values())
    db.flush()

    def base_items():
        return [
            RecipeItem(
                ingredient_id=ingredients[name].id,
                amount_g=amount,
                insertion_point_id=ip,
                preparation=prep,
                sort_order=order,
                ingredient_group_id=(
                    groups["Sweeteners"].id if name == "Sugar (sucrose)" else None
                ),
            )
            for name, amount, ip, prep, order in BASE_ITEMS
        ]

    base = Recipe(
        kind="ice_cream",
        name="Generic Custard Base",
        description="The template recipe: yields ~1 quart (950 mL) finished mix. Clone this to build a variation.",
        items=base_items(),
    )
    db.add(base)

    chocolate = Recipe(
        kind="component",
        name="Stracciatella chocolate",
        description="Melted dark chocolate thinned with oil so it shatters into flakes when streamed into the churn.",
        instructions="Melt the chocolate gently (microwave in bursts or bain-marie), stir in the oil, keep warm and fluid until use.",
        items=[
            RecipeItem(
                ingredient_id=ingredients["Dark chocolate, 70%"].id,
                amount_g=100,
                sort_order=0,
            ),
            RecipeItem(
                ingredient_id=ingredients["Neutral oil"].id,
                amount_g=10,
                sort_order=1,
            ),
        ],
    )
    db.add(chocolate)
    db.flush()

    stracciatella = Recipe(
        kind="ice_cream",
        name="Stracciatella",
        description="Generic base with a vanilla infusion and chocolate shards shattered in at end of churn.",
        items=base_items()
        + [
            RecipeItem(
                ingredient_id=ingredients["Vanilla bean"].id,
                amount_g=3,
                insertion_point_id=1,
                preparation="1 bean, split and scraped",
                sort_order=6,
            ),
            RecipeItem(
                component_recipe_id=chocolate.id,
                amount_g=110,
                insertion_point_id=5,
                preparation="thin stream while dasher runs",
                sort_order=7,
            ),
            # A second Sweeteners-group member alongside the base's sucrose,
            # so this recipe has >=2 real blend-solve candidates in that group.
            RecipeItem(
                ingredient_id=ingredients["Dextrose"].id,
                amount_g=20,
                preparation="part of the sweetener blend, softens texture",
                sort_order=8,
                ingredient_group_id=groups["Sweeteners"].id,
            ),
        ],
    )
    db.add(stracciatella)
    db.commit()
