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
