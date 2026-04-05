import asyncio
import time
import traceback
import uuid

from fastapi import APIRouter, WebSocket, HTTPException

from api.models.mhe_mpc import MheMpcRequest, MheMpcResult
from core.mhe_mpc_runner import run_mhe_mpc

router = APIRouter()

_runs: dict[str, tuple[MheMpcResult, MheMpcRequest]] = {}


@router.post("/mhe-mpc")
async def start_mhe_mpc(req: MheMpcRequest):
    run_id = str(uuid.uuid4())
    result = MheMpcResult(run_id=run_id, status="running")
    _runs[run_id] = (result, req)
    return {"run_id": run_id}


@router.delete("/mhe-mpc/{run_id}", status_code=204)
async def cancel_mhe_mpc(run_id: str):
    if run_id not in _runs:
        raise HTTPException(status_code=404, detail="Run not found")
    result, _ = _runs[run_id]
    result.status = "failed"
    result.error = "Cancelled by user"


@router.websocket("/ws/mhe-mpc/{run_id}")
async def mhe_mpc_ws(websocket: WebSocket, run_id: str):
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
        await run_mhe_mpc(req, send_frame)
        elapsed = round(time.monotonic() - t0, 3)
        result.status = "completed"
        result.elapsed_seconds = elapsed
        await websocket.send_json({"type": "complete", "elapsed_seconds": elapsed})
    except asyncio.CancelledError:
        await websocket.send_json({"type": "error", "message": "Cancelled"})
    except Exception as exc:
        traceback.print_exc()
        result.status = "failed"
        result.error = str(exc)
        await websocket.send_json({"type": "error", "message": str(exc)})
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
