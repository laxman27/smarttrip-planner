from fastapi import APIRouter, Path
from pydantic import BaseModel, Field

from app.services.google_places import autocomplete, get_place_details, nearby_search

router = APIRouter(prefix="/api/v1/places", tags=["places"])

class AutocompleteRequest(BaseModel):
    query: str = Field(min_length=2, max_length=200)
    session_token: str | None = Field(default=None, max_length=128)

class NearbyRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    included_types: list[str] = Field(min_length=1, max_length=5)
    radius_meters: float = Field(default=5000, ge=100, le=50000)
    max_result_count: int = Field(default=10, ge=1, le=20)
    rank_preference: str = Field(default="DISTANCE", pattern="^(DISTANCE|POPULARITY)$")

@router.post("/autocomplete")
async def place_autocomplete(request: AutocompleteRequest):
    return await autocomplete(request.query, request.session_token)

@router.get("/{place_id}")
async def place_details(place_id: str = Path(min_length=1, max_length=256)):
    return await get_place_details(place_id)

@router.post("/nearby")
async def places_nearby(request: NearbyRequest):
    try:
        return await nearby_search(
            latitude=request.latitude,
            longitude=request.longitude,
            included_types=request.included_types,
            radius_meters=request.radius_meters,
            max_result_count=request.max_result_count,
            rank_preference=request.rank_preference,
        )
    except ValueError as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail=str(exc)) from exc
