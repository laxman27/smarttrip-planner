from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.google_routes import compute_route

router = APIRouter(prefix="/api/v1/routes", tags=["routes"])

class RouteRequest(BaseModel):
    origin_place_id: str | None = Field(default=None, max_length=256)
    destination_place_id: str | None = Field(default=None, max_length=256)
    origin_lat: float | None = Field(default=None, ge=-90, le=90)
    origin_lng: float | None = Field(default=None, ge=-180, le=180)
    destination_lat: float | None = Field(default=None, ge=-90, le=90)
    destination_lng: float | None = Field(default=None, ge=-180, le=180)
    avoid_tolls: bool = False
    avoid_highways: bool = False

    def validate_location(self) -> None:
        if not (
            (self.origin_place_id or (self.origin_lat is not None and self.origin_lng is not None))
            and
            (self.destination_place_id or (self.destination_lat is not None and self.destination_lng is not None))
        ):
            raise ValueError("Each endpoint requires a place ID or coordinates.")

@router.post("/calculate")
async def calculate_route(request: RouteRequest):
    try:
        request.validate_location()
        return await compute_route(**request.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Route provider request failed") from exc
