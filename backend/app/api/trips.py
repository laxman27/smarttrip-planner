from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.google_places import nearby_search
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


class StopCandidate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    fraction: float = Field(ge=0, le=1)

class TripStopsRequest(BaseModel):
    candidates: list[StopCandidate] = Field(min_length=1, max_length=6)
    categories: list[Literal["fuel", "ev_charging", "restaurant", "hotel", "hospital", "parking", "rest_stop"]] = Field(default=["rest_stop", "restaurant", "fuel"], min_length=1, max_length=4)
    radius_meters: float = Field(default=5000, ge=100, le=20000)
    max_results_per_category: int = Field(default=3, ge=1, le=5)

STOP_TYPES = {
    "fuel": ["gas_station"],
    "ev_charging": ["electric_vehicle_charging_station"],
    "restaurant": ["restaurant"],
    "hotel": ["hotel"],
    "hospital": ["hospital"],
    "parking": ["parking"],
    "rest_stop": ["rest_stop"],
}

@router.post("/stops")
async def find_trip_stops(request: TripStopsRequest):
    import asyncio

    async def search(candidate: StopCandidate, category: str):
        data = await nearby_search(
            latitude=candidate.latitude,
            longitude=candidate.longitude,
            included_types=STOP_TYPES[category],
            radius_meters=request.radius_meters,
            max_result_count=request.max_results_per_category,
            rank_preference="DISTANCE",
        )
        places = data.get("places", [])
        ranked = []
        for place in places:
            location = place.get("location") or {}
            lat = location.get("latitude")
            lng = location.get("longitude")
            if lat is None or lng is None:
                continue
            # Google Nearby Search is distance-ranked; keep an explicit route-window
            # score so clients can distinguish proximity from place metadata.
            dlat = float(lat) - candidate.latitude
            dlng = float(lng) - candidate.longitude
            distance_score = max(0.0, 100.0 - min(100.0, ((dlat * dlat + dlng * dlng) ** 0.5) * 900))
            primary_type = place.get("primaryType") or category
            relevance_bonus = 10.0 if primary_type == STOP_TYPES[category][0] else 0.0
            place["smart_stop_score"] = round(distance_score + relevance_bonus, 1)
            place["route_stop_reason"] = "driver_rest_window" if category == "rest_stop" else category
            ranked.append(place)
        ranked.sort(key=lambda item: item.get("smart_stop_score", 0), reverse=True)
        return {
            "route_fraction": candidate.fraction,
            "category": category,
            "planned_drive_hours": candidate.fraction,
            "selection_method": "Google Nearby Search distance + place-type relevance",
            "places": ranked,
        }

    try:
        results = await asyncio.gather(
            *(search(candidate, category) for candidate in request.candidates for category in request.categories)
        )
        return {"stops": results}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Nearby stop search failed") from exc
