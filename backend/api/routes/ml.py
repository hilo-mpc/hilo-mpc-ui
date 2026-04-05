from fastapi import APIRouter

from api.models.ml import PredictRequest, EvaluateRequest
from core.function_evaluator import run_prediction, run_evaluation

router = APIRouter()


@router.post("/predict")
async def predict(req: PredictRequest):
    series = run_prediction(req)
    return {"series": series}


@router.post("/evaluate")
async def evaluate(req: EvaluateRequest):
    series = run_evaluation(req)
    return {"series": series}
