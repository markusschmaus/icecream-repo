from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class IngredientBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    density: float = Field(default=1.0, gt=0)
    water: float = Field(default=0.0, ge=0, le=1)
    fat: float = Field(default=0.0, ge=0, le=1)
    solute: float = Field(default=0.0, ge=0, le=1)
    other: float = Field(default=0.0, ge=0, le=1)
    pod: float = Field(default=0.0, ge=0)
    pac: float = Field(default=0.0, ge=0)


class IngredientCreate(IngredientBase):
    pass


class IngredientOut(IngredientBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class IngredientGroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    members: list[IngredientOut] = []


class InsertionPointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    base_state: str
    addition_class: str
    technique: str
    result: str
    description: str


class RecipeRef(BaseModel):
    """Lightweight reference to a recipe used as a component."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    name: str


class RecipeItemIn(BaseModel):
    ingredient_id: int | None = None
    component_recipe_id: int | None = None
    insertion_point_id: int | None = None
    ingredient_group_id: int | None = None
    amount_g: float = Field(ge=0)
    preparation: str = ""
    sort_order: int = 0

    @model_validator(mode="after")
    def exactly_one_source(self) -> "RecipeItemIn":
        if (self.ingredient_id is None) == (self.component_recipe_id is None):
            raise ValueError(
                "exactly one of ingredient_id or component_recipe_id must be set"
            )
        if self.ingredient_group_id is not None and self.ingredient_id is None:
            raise ValueError(
                "ingredient_group_id can only be set on an ingredient line"
            )
        return self


class RecipeItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ingredient_id: int | None
    component_recipe_id: int | None
    insertion_point_id: int | None
    ingredient_group_id: int | None
    amount_g: float
    preparation: str
    sort_order: int
    ingredient: IngredientOut | None
    component: RecipeRef | None


class GroupSolveRequest(BaseModel):
    """metric/value use the same fraction units as Ingredient columns (0-1 for
    fat/ts; unbounded for pod/pac) - callers convert from display percentages."""

    metric: str = Field(pattern="^(fat|ts|pod|pac)$")
    value: float


class GroupSolveItemResult(BaseModel):
    item_id: int
    old_mass_g: float
    new_mass_g: float


class GroupSolveResponse(BaseModel):
    success: bool
    reason: str = ""
    infeasible: bool = False
    items: list[GroupSolveItemResult] = []


class RecipeCreate(BaseModel):
    kind: str = Field(default="ice_cream", pattern="^(ice_cream|component)$")
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    notes: str = ""
    instructions: str = ""
    yield_g: float | None = Field(default=None, gt=0)
    items: list[RecipeItemIn] = []


class RecipeUpdate(RecipeCreate):
    pass


class Metrics(BaseModel):
    mass_g: float
    volume_ml: float
    fat_pct: float
    total_solids_pct: float
    pod: float
    pac: float


class RecipeMetrics(BaseModel):
    base_mix: Metrics
    total: Metrics


class RecipeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime


class RecipeOut(RecipeSummary):
    notes: str
    instructions: str
    yield_g: float | None
    items: list[RecipeItemOut]
    metrics: RecipeMetrics


class MethodStepOut(BaseModel):
    step_number: int
    instruction: str
    insertion_point: InsertionPointOut | None = None
    additions: list[RecipeItemOut] = []


class ScaleRequest(BaseModel):
    factor: float = Field(gt=0)
