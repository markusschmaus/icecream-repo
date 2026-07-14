from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Ingredient(Base):
    """Catalog entry with composition data.

    Composition fractions (water/fat/solute/other) are stored 0-1 and should sum
    to ~1. "solute" = dissolved sugars/salts that drive sweetness (POD) and
    freezing-point depression (PAC); "other" = protein/fiber/ash/stabilizer,
    counted in Total Solids but not in Fat, POD or PAC. pod/pac coefficients are
    relative to sucrose = 1.00.
    """

    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    density: Mapped[float] = mapped_column(Float, default=1.0)  # g/mL
    water: Mapped[float] = mapped_column(Float, default=0.0)
    fat: Mapped[float] = mapped_column(Float, default=0.0)
    solute: Mapped[float] = mapped_column(Float, default=0.0)
    other: Mapped[float] = mapped_column(Float, default=0.0)
    pod: Mapped[float] = mapped_column(Float, default=0.0)
    pac: Mapped[float] = mapped_column(Float, default=0.0)

    groups: Mapped[list["IngredientGroup"]] = relationship(
        secondary="ingredient_group_members", back_populates="members"
    )


class IngredientGroup(Base):
    """A named set of substitutable ingredients (e.g. "Sweeteners": sucrose,
    dextrose, fructose, invert sugar, honey). Catalog-level and reusable across
    recipes; membership is many-to-many since an ingredient can play more than
    one substitutable role (honey is both a sweetener and a liquid sugar).

    A recipe item opts into a group via RecipeItem.ingredient_group_id, which
    marks that line as a blend-solve candidate in that recipe - see
    RecipeItem for why group membership alone isn't enough to say that.
    """

    __tablename__ = "ingredient_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")

    members: Mapped[list[Ingredient]] = relationship(
        secondary="ingredient_group_members", back_populates="groups"
    )


class IngredientGroupMember(Base):
    __tablename__ = "ingredient_group_members"

    ingredient_id: Mapped[int] = mapped_column(
        ForeignKey("ingredients.id", ondelete="CASCADE"), primary_key=True
    )
    group_id: Mapped[int] = mapped_column(
        ForeignKey("ingredient_groups.id", ondelete="CASCADE"), primary_key=True
    )


class InsertionPoint(Base):
    """One of the 8 points in the generic method where additions can go.

    Seeded 1-8; ids are stable and referenced by recipe items and method steps.
    """

    __tablename__ = "insertion_points"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    base_state: Mapped[str] = mapped_column(String(160))
    addition_class: Mapped[str] = mapped_column(String(160))
    technique: Mapped[str] = mapped_column(String(80))
    result: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text)


class MethodStep(Base):
    """The generic custard method, shared by every ice cream recipe.

    A step optionally carries the insertion point that occurs at it. Component
    recipes do not use these steps; they carry their own free-text instructions.
    """

    __tablename__ = "method_steps"

    id: Mapped[int] = mapped_column(primary_key=True)
    step_number: Mapped[int] = mapped_column(Integer, unique=True)
    instruction: Mapped[str] = mapped_column(Text)
    insertion_point_id: Mapped[int | None] = mapped_column(
        ForeignKey("insertion_points.id"), nullable=True
    )

    insertion_point: Mapped[InsertionPoint | None] = relationship()


RECIPE_KINDS = ("ice_cream", "component")


class Recipe(Base):
    """An ice cream (renders the shared method) or a component sub-recipe
    (coulis, caramel, cookie pieces) with its own free-text instructions.

    Recipes are standalone snapshots: cloning copies rows, and editing one
    recipe never affects another.

    yield_g (components only): actual mass after preparation. If set below the
    sum of item masses, the difference is treated as evaporated water when the
    component's composition is rolled up into a parent recipe.
    """

    __tablename__ = "recipes"
    __table_args__ = (
        CheckConstraint("kind IN ('ice_cream', 'component')", name="ck_recipe_kind"),
        CheckConstraint("yield_g IS NULL OR yield_g > 0", name="ck_recipe_yield"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), default="ice_cream")
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    instructions: Mapped[str] = mapped_column(Text, default="")
    yield_g: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    items: Mapped[list["RecipeItem"]] = relationship(
        back_populates="recipe",
        foreign_keys="RecipeItem.recipe_id",
        cascade="all, delete-orphan",
        order_by="RecipeItem.sort_order",
    )


class RecipeItem(Base):
    """One line of a recipe: an amount of either a catalog ingredient or a
    component recipe (exactly one of the two references is set).

    insertion_point_id NULL means the base custard mix; 1-8 means an addition
    at that point. Always NULL when the parent recipe is a component.

    Deeper cycles (A -> B -> A) are rejected by the API with a graph walk; the
    DB check only rules out direct self-reference.

    ingredient_group_id tags this line as a blend-solve candidate: the app can
    redistribute mass across every item in the same recipe sharing the same
    group, holding their combined mass fixed, to hit a target metric (see
    solver.solve_group_blend). It's a separate flag from catalog-level group
    membership (Ingredient.groups) because an ingredient can belong to more
    than one group (e.g. honey is both a sweetener and a liquid sugar) - this
    field says which one applies to this line, in this recipe. The API
    validates on write that the item's ingredient is actually a member of the
    chosen group; the DB only enforces that it's set exclusively on ingredient
    lines, never on component lines.
    """

    __tablename__ = "recipe_items"
    __table_args__ = (
        CheckConstraint(
            "(ingredient_id IS NULL) != (component_recipe_id IS NULL)",
            name="ck_item_one_source",
        ),
        CheckConstraint(
            "component_recipe_id IS NULL OR component_recipe_id != recipe_id",
            name="ck_item_no_self_reference",
        ),
        CheckConstraint("amount_g >= 0", name="ck_item_amount_nonnegative"),
        CheckConstraint(
            "ingredient_group_id IS NULL OR ingredient_id IS NOT NULL",
            name="ck_item_group_requires_ingredient",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE")
    )
    ingredient_id: Mapped[int | None] = mapped_column(
        ForeignKey("ingredients.id", ondelete="RESTRICT"), nullable=True
    )
    component_recipe_id: Mapped[int | None] = mapped_column(
        ForeignKey("recipes.id", ondelete="RESTRICT"), nullable=True
    )
    insertion_point_id: Mapped[int | None] = mapped_column(
        ForeignKey("insertion_points.id"), nullable=True
    )
    ingredient_group_id: Mapped[int | None] = mapped_column(
        ForeignKey("ingredient_groups.id"), nullable=True
    )
    amount_g: Mapped[float] = mapped_column(Float)
    preparation: Mapped[str] = mapped_column(String(200), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    recipe: Mapped[Recipe] = relationship(
        back_populates="items", foreign_keys=[recipe_id]
    )
    ingredient: Mapped[Ingredient | None] = relationship()
    component: Mapped[Recipe | None] = relationship(foreign_keys=[component_recipe_id])
    insertion_point: Mapped[InsertionPoint | None] = relationship()
    ingredient_group: Mapped[IngredientGroup | None] = relationship()
