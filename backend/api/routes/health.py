import sys
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    hilo_version = "unknown"
    try:
        import hilo_mpc
        hilo_version = getattr(hilo_mpc, "__version__", "installed")
    except ImportError:
        hilo_version = "not installed"

    return {
        "status": "ok",
        "hilo_mpc_version": hilo_version,
        "python_version": sys.version.split()[0],
    }
