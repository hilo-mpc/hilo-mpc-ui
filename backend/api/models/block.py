from pydantic import BaseModel
from typing import Literal


class Variable(BaseModel):
    name: str
    description: str = ""
    unit: str = ""


class Parameter(BaseModel):
    name: str
    value: float
    description: str = ""


class ModelBlockConfig(BaseModel):
    block_id: str
    states: list[Variable]
    inputs: list[Variable]
    parameters: list[Parameter] = []
    ode_expressions: list[str]  # one CasADi expression per state
    measurement_expressions: list[str] = []  # h(x) — empty means full state observation
    measurement_names: list[str] = []         # user-defined names for each y_i


class InputScheduleEntry(BaseModel):
    t_start: float
    t_end: float
    values: dict[str, float]


class SimulationBlockConfig(BaseModel):
    block_id: str
    dt: float
    t_end: float
    initial_conditions: dict[str, float]
    input_schedule: list[InputScheduleEntry] = []
    solver: Literal["cvodes", "rk4", "idas"] = "cvodes"
    integrator_options: dict = {}


class PlotBlockConfig(BaseModel):
    block_id: str
    x_axis: str = "t"
    y_axes: list[str] = []


class PlantBlockConfig(BaseModel):
    block_id: str
    states: list[Variable]
    inputs: list[Variable]
    parameters: list[Parameter] = []
    ode_expressions: list[str]
    measurement_expressions: list[str] = []  # empty = full state observation (y = x)
    measurement_names: list[str] = []        # names for each measurement output


class MpcBlockConfig(BaseModel):
    block_id: str
    horizon: int = 10
    dt: float = 0.1
    t_end: float = 10.0
    initial_conditions: dict[str, float] = {}
    state_weights: dict[str, float] = {}   # diagonal Q per state name
    input_weights: dict[str, float] = {}   # diagonal R per input name
    state_ref: dict[str, float] = {}       # setpoint per state name
    input_ref: dict[str, float] = {}       # setpoint per input name
    state_lb: dict[str, float | None] = {}
    state_ub: dict[str, float | None] = {}
    input_lb: dict[str, float | None] = {}
    input_ub: dict[str, float | None] = {}
