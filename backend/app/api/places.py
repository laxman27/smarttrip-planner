from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.google_places import autocomplete, get_place_details

router = APIRouter(prefix="/api/v1/places", tags=["places"])

class AutocompleteRequest(BaseModel):
    query: str = Field(min_length=2, max_length=200)
    session_token: str | None = Field(default=None, max_length=128)

@router.post("/autocomplete")
async def place_autocomplete(request: AutocompleteRequest):
    return await autocomplete(request.query, request.session_token)

@router.get("/{place_id}")
async def place_details(place_id: str = Query(min_length=1, max_length=256)):
    return await get_place_details(place_id)
