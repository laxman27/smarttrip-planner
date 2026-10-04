from __future__ import annotations

import math
from typing import Any

import httpx

from app.config import settings

SURFACE = {"asphalt": 100, "concrete": 98, "paved": 95, "paving_stones": 82, "cobblestone": 72, "gravel": 55, "dirt": 30, "earth": 30, "sand": 20, "mud": 15, "unpaved": 40}
SMOOTHNESS = {"excellent": 100, "good": 90, "intermediate": 75, "bad": 55, "very_bad": 35, "horrible": 20, "very_horrible": 10, "impassable": 0}
HIGHWAY = {"motorway": 100, "trunk": 95, "primary": 88, "secondary": 78, "tertiary": 68, "unclassified": 55, "residential": 52, "service": 35}

def way_score(tags: dict[str, str]) -> tuple[float | None, list[str]]:
    values = []
    for key, table, weight in (("surface", SURFACE, .35), ("smoothness", SMOOTHNESS, .40), ("highway", HIGHWAY, .15)):
        value = tags.get(key)
        if value and value.lower() in table:
            values.append((table[value.lower()], weight, key))
    if tags.get("lit") in ("yes", "no"):
        values.append((100 if tags["lit"] == "yes" else 45, .10, "lighting"))
    if not values:
        return None, []
    total = sum(w for _, w, _ in values)
    return round(sum(v * w for v, w, _ in values) / total, 1), [k for _, _, k in values]

def _distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))

async def lookup_road_attributes(points: list[dict[str, float]]) -> dict[str, Any]:
    if not points:
        return {"provider": "OpenStreetMap/Overpass", "segments": [], "sections": [], "coverage": 0.0, "status": "no route samples"}

    clauses = "".join(
        f'way(around:80,{p["latitude"]},{p["longitude"]})["highway"];'
        for p in points[:12]
    )
    query = "[out:json][timeout:20];(" + clauses + ");out tags center;"
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(settings.overpass_url, data={"data": query})
            response.raise_for_status()
            elements = response.json().get("elements", [])
    except Exception:
        return {
            "provider": "OpenStreetMap/Overpass",
            "segments": [],
            "sections": [],
            "coverage": 0.0,
            "status": "provider unavailable",
        }

    segments = []
    for element in elements:
        tags = element.get("tags") or {}
        score, factors = way_score(tags)
        center = element.get("center") or {}
        if center.get("lat") is None or center.get("lon") is None:
            continue
        segments.append({
            "osm_way_id": element.get("id"),
            "latitude": center.get("lat"),
            "longitude": center.get("lon"),
            "highway": tags.get("highway"),
            "surface": tags.get("surface"),
            "smoothness": tags.get("smoothness"),
            "maxspeed": tags.get("maxspeed"),
            "lanes": tags.get("lanes"),
            "lit": tags.get("lit"),
            "score": score,
            "score_factors": factors,
        })

    sections = []
    for sample in points[:12]:
        nearest = None
        nearest_distance = None
        for segment in segments:
            distance = _distance_m(sample["latitude"], sample["longitude"], segment["latitude"], segment["longitude"])
            if nearest_distance is None or distance < nearest_distance:
                nearest = segment
                nearest_distance = distance
        if nearest is None or nearest_distance is None or nearest_distance > 80:
            sections.append({
                "section_index": len(sections) + 1,
                "route_fraction": sample.get("fraction"),
                "latitude": sample["latitude"],
                "longitude": sample["longitude"],
                "status": "no mapped road attribute within 80m",
                "confidence": 0.0,
            })
            continue
        sections.append({
            "section_index": len(sections) + 1,
            "route_fraction": sample.get("fraction"),
            "latitude": sample["latitude"],
            "longitude": sample["longitude"],
            "status": "nearby mapped road attributes",
            "confidence": round(max(0.0, 1.0 - nearest_distance / 80.0), 2),
            "distance_to_mapped_way_m": round(nearest_distance, 1),
            "osm_way_id": nearest["osm_way_id"],
            "highway": nearest["highway"],
            "surface": nearest["surface"],
            "smoothness": nearest["smoothness"],
            "maxspeed": nearest["maxspeed"],
            "lanes": nearest["lanes"],
            "lit": nearest["lit"],
            "score": nearest["score"],
            "score_factors": nearest["score_factors"],
        })

    scored = [section["score"] for section in sections if section.get("score") is not None]
    coverage = round(len(scored) / max(1, len(points[:12])), 2)
    return {
        "provider": "OpenStreetMap/Overpass",
        "segments": segments[:50],
        "sections": sections,
        "coverage": coverage,
        "status": "available" if scored else "mapped road attributes unavailable",
        "method": "Proxy from mapped OSM surface, smoothness, highway class and lighting; not a live pavement inspection.",
    }
