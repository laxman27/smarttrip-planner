from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.trip_planner import plan_trip

router = APIRouter(prefix="/api/v1/trips", tags=["trip-planning"])

class TripPlanRequest(BaseModel):
    origin_place_id: str = Field(min_length=1, max_length=256)
    destination_place_id: str = Field(min_length=1, max_length=256)
    departure_at: datetime
    vehicle_type: Literal["car", "suv", "motorcycle", "van", "ev"] = "car"
    emission_type: Literal["GASOLINE", "DIESEL", "HYBRID", "ELECTRIC"] = "GASOLINE"
    fuel_efficiency: float | None = Field(default=None, gt=0, le=200, description="L/100 km for fuel vehicles or kWh/100 km for EVs.")
    fuel_price_per_unit: float | None = Field(default=None, gt=0, le=100000)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    avoid_tolls: bool = False
    avoid_highways: bool = False
    max_drive_hours: float = Field(default=4.0, gt=1, le=12)
    break_minutes: int = Field(default=20, ge=10, le=120)

@router.post("/plan")
async def create_trip_plan(request: TripPlanRequest):
    try:
        return await plan_trip(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Trip planning provider request failed") from exc
