from fastapi import APIRouter
from pydantic import BaseModel

from api.models.block import Variable

router = APIRouter()


class ValidateRequest(BaseModel):
    states: list[Variable]
    inputs: list[Variable]
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
            parameters=[],
            ode_expressions=req.ode_expressions,
        )
        build_model(cfg)
        return ValidateResponse(valid=True)
    except Exception as exc:
        return ValidateResponse(valid=False, error=str(exc))
