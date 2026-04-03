from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import health, simulate, validate, mpc

app = FastAPI(title="hilo-mpc-ui backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(simulate.router)
app.include_router(validate.router)
app.include_router(mpc.router)
