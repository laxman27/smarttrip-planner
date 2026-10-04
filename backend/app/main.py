from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.places import router as places_router
from app.api.routes import router as routes_router
from app.config import settings

app = FastAPI(title="SmartTrip Planner API", version="1.0.0")

origins = [item.strip() for item in settings.cors_origins.split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(routes_router)
app.include_router(places_router)

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "smarttrip-api"}
