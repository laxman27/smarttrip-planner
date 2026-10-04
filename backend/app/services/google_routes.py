import httpx
from fastapi import HTTPException

from app.config import settings

ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

def waypoint(place_id: str | None, lat: float | None, lng: float | None) -> dict:
    if place_id:
        return {"placeId": place_id}
    return {"location": {"latLng": {"latitude": lat, "longitude": lng}}}

async def compute_route(
    origin_place_id: str | None = None,
    destination_place_id: str | None = None,
    origin_lat: float | None = None,
    origin_lng: float | None = None,
    destination_lat: float | None = None,
    destination_lng: float | None = None,
    avoid_tolls: bool = False,
    avoid_highways: bool = False,
) -> dict:
    payload = {
        "origin": waypoint(origin_place_id, origin_lat, origin_lng),
        "destination": waypoint(destination_place_id, destination_lat, destination_lng),
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
        "computeAlternativeRoutes": True,
        "routeModifiers": {
            "avoidTolls": avoid_tolls,
            "avoidHighways": avoid_highways,
        },
        "languageCode": "en-US",
        "regionCode": "IN",
        "units": "METRIC",
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.google_maps_api_key,
        "X-Goog-FieldMask": (
            "routes.duration,routes.staticDuration,routes.distanceMeters,"
            "routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,"
            "routes.description,routes.warnings,routes.viewport"
        ),
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(ROUTES_URL, json=payload, headers=headers)

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Google Routes API returned an error")
    return response.json()
