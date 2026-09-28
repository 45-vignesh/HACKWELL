import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routes import (
    dashboard,
    inventory,
    forecasts,
    alerts,
    transfers,
    procurement,
    approvals,
    waste,
    agents,
    simulation,
    chat,
    data_quality,
    auth,
    audit_trail
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("medisentinel")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing MediSentinel database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("MediSentinel Autonomous Engine ready.")
    yield
    logger.info("Shutting down MediSentinel...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Autonomous Multi-Agent AI Platform for Hospital Inventory Management",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(dashboard.router)
app.include_router(inventory.router)
app.include_router(forecasts.router)
app.include_router(alerts.router)
app.include_router(transfers.router)
app.include_router(procurement.router)
app.include_router(approvals.router)
app.include_router(waste.router)
app.include_router(agents.router)
app.include_router(simulation.router)
app.include_router(chat.router)
app.include_router(data_quality.router)
app.include_router(auth.router)
app.include_router(audit_trail.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.BACKEND_HOST, port=settings.BACKEND_PORT, reload=settings.DEBUG)
