from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.google_routes import compute_route

router = APIRouter(prefix="/api/v1/routes", tags=["routes"])

class RouteRequest(BaseModel):
    origin_lat: float = Field(ge=-90, le=90)
    origin_lng: float = Field(ge=-180, le=180)
    destination_lat: float = Field(ge=-90, le=90)
    destination_lng: float = Field(ge=-180, le=180)
    avoid_tolls: bool = False
    avoid_highways: bool = False

@router.post("/calculate")
async def calculate_route(request: RouteRequest):
    try:
        return await compute_route(**request.model_dump())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Route provider request failed") from exc
