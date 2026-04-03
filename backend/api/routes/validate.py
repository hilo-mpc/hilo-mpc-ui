from fastapi import APIRouter
from pydantic import BaseModel

from api.models.block import Variable, Parameter

router = APIRouter()


class ValidateRequest(BaseModel):
    states: list[Variable]
    inputs: list[Variable]
    parameters: list[Parameter] = []
    ode_expressions: list[str]


class ValidateResponse(BaseModel):
    valid: bool
    error: str | None = None


@router.post("/validate/equations", response_model=ValidateResponse)
async def validate_equations(req: ValidateRequest):
    if not req.states:
        return ValidateResponse(valid=False, error="At least one state is required.")
    if len(req.ode_expressions) != len(req.states):
        return ValidateResponse(
            valid=False,
            error=f"Expected {len(req.states)} ODE expression(s), got {len(req.ode_expressions)}.",
        )
    if any(e.strip() == "" for e in req.ode_expressions):
        return ValidateResponse(valid=False, error="All ODE expressions must be non-empty.")

    try:
        from core.model_builder import build_model
        from api.models.block import ModelBlockConfig, Parameter

        cfg = ModelBlockConfig(
            block_id="validate",
            states=req.states,
            inputs=req.inputs,
            parameters=req.parameters,
            ode_expressions=req.ode_expressions,
        )
        model = build_model(cfg)
        # setup() + a dry simulate() is needed to catch undefined symbols:
        # hilo-mpc silently accepts unknown names and only errors at simulate time.
        model.setup(dt=0.1, integrator="rk4")
        model.set_initial_conditions(x0=[0.0] * len(req.states))
        n_inputs = len([i for i in req.inputs if i.name.strip()])
        param_values = [p.value for p in req.parameters if p.name.strip()]
        try:
            if n_inputs > 0 and param_values:
                model.simulate(u=[0.0] * n_inputs, p=param_values)
            elif n_inputs > 0:
                model.simulate(u=[0.0] * n_inputs)
            elif param_values:
                model.simulate(p=param_values)
            else:
                model.simulate()
        except RuntimeError as sim_err:
            msg = str(sim_err)
            if "No parameter" in msg:
                return ValidateResponse(
                    valid=False,
                    error="ODE expressions contain undefined symbols. Check that all variables are declared as states, inputs, or parameters.",
                )
            raise
        return ValidateResponse(valid=True)
    except Exception as exc:
        return ValidateResponse(valid=False, error=str(exc))
