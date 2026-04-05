import asyncio
import time
import uuid

from fastapi import APIRouter, WebSocket, HTTPException

from api.models.mhe import MheRequest, MheResult
from core.mhe_runner import run_mhe

router = APIRouter()

_runs: dict[str, tuple[MheResult, MheRequest]] = {}


@router.post("/mhe")
async def start_mhe(req: MheRequest):
    run_id = str(uuid.uuid4())
    result = MheResult(run_id=run_id, status="running")
    _runs[run_id] = (result, req)
    return {"run_id": run_id}


@router.delete("/mhe/{run_id}", status_code=204)
async def cancel_mhe(run_id: str):
    if run_id not in _runs:
        raise HTTPException(status_code=404, detail="Run not found")
    result, _ = _runs[run_id]
    result.status = "failed"
    result.error = "Cancelled by user"


@router.websocket("/ws/mhe/{run_id}")
async def mhe_ws(websocket: WebSocket, run_id: str):
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
        await run_mhe(req, send_frame)
        elapsed = round(time.monotonic() - t0, 3)
        result.status = "completed"
        result.elapsed_seconds = elapsed
        await websocket.send_json({"type": "complete", "elapsed_seconds": elapsed})
    except asyncio.CancelledError:
        await websocket.send_json({"type": "error", "message": "Cancelled"})
    except Exception as exc:
        import traceback
        traceback.print_exc()
        result.status = "failed"
        result.error = str(exc)
        await websocket.send_json({"type": "error", "message": str(exc)})
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
