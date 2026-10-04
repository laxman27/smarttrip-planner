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
    departure_time: str | None = None,
    emission_type: str = "GASOLINE",
    include_tolls: bool = False,
    include_fuel_consumption: bool = False,
    compute_alternatives: bool = True,
) -> dict:
    payload = {
        "origin": waypoint(origin_place_id, origin_lat, origin_lng),
        "destination": waypoint(destination_place_id, destination_lat, destination_lng),
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE_OPTIMAL" if include_fuel_consumption else "TRAFFIC_AWARE",
        "computeAlternativeRoutes": compute_alternatives,
        "routeModifiers": {
            "avoidTolls": avoid_tolls,
            "avoidHighways": avoid_highways,
            "vehicleInfo": {"emissionType": emission_type},
        },
        "languageCode": "en-US",
        "regionCode": "IN",
        "units": "METRIC",
    }

    if departure_time:
        payload["departureTime"] = departure_time

    extra = []
    if include_tolls:
        extra.append("TOLLS")
    if include_fuel_consumption:
        extra.append("FUEL_CONSUMPTION")
    if extra:
        payload["extraComputations"] = extra

    field_mask = (
        "routes.duration,routes.staticDuration,routes.distanceMeters,"
        "routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,"
        "routes.description,routes.warnings,routes.viewport,routes.routeLabels"
    )
    if include_tolls:
        field_mask += ",routes.travelAdvisory.tollInfo"
    if include_fuel_consumption:
        field_mask += ",routes.travelAdvisory.fuelConsumptionMicroliters"

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.google_maps_api_key,
        "X-Goog-FieldMask": field_mask,
    }

    async with httpx.AsyncClient(timeout=25) as client:
        response = await client.post(ROUTES_URL, json=payload, headers=headers)

    if response.status_code >= 400:
        detail = "Google Routes API returned an error"
        try:
            message = response.json().get("error", {}).get("message")
            if message:
                detail = message
        except ValueError:
            pass
        raise HTTPException(status_code=502, detail=detail)

    return response.json()
