import httpx
from fastapi import HTTPException

from app.config import settings

AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"
DETAILS_URL = "https://places.googleapis.com/v1/places"

async def autocomplete(query: str, session_token: str | None = None) -> dict:
    payload = {"input": query}
    if session_token:
        payload["sessionToken"] = session_token

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.google_maps_api_key,
        "X-Goog-FieldMask": (
            "suggestions.placePrediction.placeId,"
            "suggestions.placePrediction.text,"
            "suggestions.placePrediction.structuredFormat"
        ),
    }

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(AUTOCOMPLETE_URL, json=payload, headers=headers)

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Places search failed")
    return response.json()

async def get_place_details(place_id: str) -> dict:
    headers = {
        "X-Goog-Api-Key": settings.google_maps_api_key,
        "X-Goog-FieldMask": (
            "id,displayName,formattedAddress,location,types,"
            "googleMapsUri"
        ),
    }

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(f"{DETAILS_URL}/{place_id}", headers=headers)

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Place details request failed")
    return response.json()
