from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.places import router as places_router
from app.api.routes import router as routes_router
from app.api.trips import router as trips_router
from app.api.auth import router as auth_router
from app.config import settings

app = FastAPI(title="SmartTrip Planner API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_router)
app.include_router(places_router)
app.include_router(trips_router)
app.include_router(auth_router)

@app.get("/health")
async def health():
    return {"status": "ok"}
