import httpx
from fastapi import HTTPException

from app.config import settings

ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

async def compute_route(
    origin_lat: float,
    origin_lng: float,
    destination_lat: float,
    destination_lng: float,
    avoid_tolls: bool = False,
    avoid_highways: bool = False,
) -> dict:
    payload = {
        "origin": {"location": {"latLng": {"latitude": origin_lat, "longitude": origin_lng}}},
        "destination": {"location": {"latLng": {"latitude": destination_lat, "longitude": destination_lng}}},
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
        "computeAlternativeRoutes": True,
        "routeModifiers": {
            "avoidTolls": avoid_tolls,
            "avoidHighways": avoid_highways,
        },
        "languageCode": "en-US",
        "units": "METRIC",
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.google_maps_api_key,
        "X-Goog-FieldMask": (
            "routes.duration,routes.staticDuration,routes.distanceMeters,"
            "routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction"
        ),
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(ROUTES_URL, json=payload, headers=headers)

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Google Routes API returned an error")
    return response.json()
