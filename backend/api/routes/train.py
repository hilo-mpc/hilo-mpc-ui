import asyncio
import time
import uuid

from fastapi import APIRouter, WebSocket, HTTPException

from api.models.train import TrainRequest, TrainResult
from core.ann_trainer import run_training

router = APIRouter()

# run_id -> (result, request)
_runs: dict[str, tuple[TrainResult, TrainRequest]] = {}


@router.post("/train")
async def start_train(req: TrainRequest):
    run_id = str(uuid.uuid4())
    result = TrainResult(run_id=run_id, status="running")
    _runs[run_id] = (result, req)
    return {"run_id": run_id}


@router.delete("/train/{run_id}", status_code=204)
async def cancel_train(run_id: str):
    if run_id not in _runs:
        raise HTTPException(status_code=404, detail="Run not found")
    result, _ = _runs[run_id]
    result.status = "failed"
    result.error = "Cancelled by user"


@router.websocket("/ws/train/{run_id}")
async def train_ws(websocket: WebSocket, run_id: str):
    await websocket.accept()

    entry = _runs.get(run_id)
    if entry is None:
        await websocket.send_json({"type": "error", "message": "Run not found"})
        await websocket.close()
        return

    result, req = entry
    t0 = time.monotonic()

    async def send_frame(frame: dict):
        if result.status == "failed":
            raise asyncio.CancelledError("Run cancelled")
        await websocket.send_json(frame)

    try:
        model_state = await run_training(req, send_frame)
        elapsed = round(time.monotonic() - t0, 3)
        result.status = "completed"
        result.elapsed_seconds = elapsed
        await websocket.send_json({"type": "complete", "elapsed_seconds": elapsed, "model_state": model_state})
    except asyncio.CancelledError:
        await websocket.send_json({"type": "error", "message": "Cancelled"})
    except Exception as exc:
        result.status = "failed"
        result.error = str(exc)
        await websocket.send_json({"type": "error", "message": str(exc)})
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
