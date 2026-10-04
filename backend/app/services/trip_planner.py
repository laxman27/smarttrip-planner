from __future__ import annotations

from datetime import datetime, timedelta, timezone
import math
from typing import Any

from app.services.google_routes import compute_route
from app.services.road_intelligence import analyze_route, score_trip
from app.services.road_data import lookup_road_attributes

EMISSION_TYPES = {"GASOLINE", "DIESEL", "HYBRID", "ELECTRIC"}

def _duration_seconds(value: str | None) -> int:
    if not value:
        return 0
    raw = value.strip().lower().removesuffix("s")
    try:
        return max(0, int(float(raw)))
    except ValueError:
        return 0

def _money_value(price: dict[str, Any] | None) -> float | None:
    if not price:
        return None
    return float(price.get("units", 0)) + float(price.get("nanos", 0)) / 1_000_000_000

def _decode_polyline(encoded: str) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    index = lat = lng = 0
    while index < len(encoded):
        result = shift = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        lat += ~(result >> 1) if result & 1 else result >> 1

        result = shift = 0
        while True:
            b = ord(encoded[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        lng += ~(result >> 1) if result & 1 else result >> 1
        points.append((lat / 1e5, lng / 1e5))
    return points

def _sample_route(encoded: str | None, fractions: list[float]) -> list[dict[str, float]]:
    points = _decode_polyline(encoded) if encoded else []
    if not points:
        return []
    result = []
    for fraction in fractions:
        index = min(len(points) - 1, max(0, round((len(points) - 1) * fraction)))
        lat, lng = points[index]
        result.append({"latitude": lat, "longitude": lng, "fraction": fraction})
    return result

def _build_itinerary(
    departure: datetime,
    drive_seconds: int,
    max_drive_hours: float,
    break_minutes: int,
) -> list[dict[str, Any]]:
    max_block = max_drive_hours * 3600
    if drive_seconds <= 0:
        return []

    blocks = math.ceil(drive_seconds / max_block)
    itinerary = []
    remaining = drive_seconds
    cursor = departure

    for day_index in range(1, blocks + 1):
        block_seconds = min(remaining, int(max_block))
        drive_end = cursor + timedelta(seconds=block_seconds)
        overnight = day_index < blocks
        itinerary.append({
            "day": day_index,
            "start_time": cursor.isoformat(),
            "drive_hours": round(block_seconds / 3600, 2),
            "arrive_or_rest_time": drive_end.isoformat(),
            "overnight": overnight,
            "recommended_break_minutes": break_minutes if overnight else 0,
        })
        remaining -= block_seconds
        if remaining > 0:
            cursor = drive_end + timedelta(minutes=break_minutes)

    return itinerary

async def plan_trip(request: Any) -> dict[str, Any]:
    departure = request.departure_at
    if departure.tzinfo is None:
        departure = departure.replace(tzinfo=timezone.utc)

    if departure < datetime.now(timezone.utc):
        raise ValueError("Departure time must be in the future.")

    if request.emission_type not in EMISSION_TYPES:
        raise ValueError("Unsupported emission type.")

    include_fuel = request.fuel_efficiency is not None
    route_data = await compute_route(
        origin_place_id=request.origin_place_id,
        destination_place_id=request.destination_place_id,
        avoid_tolls=request.avoid_tolls,
        avoid_highways=request.avoid_highways,
        departure_time=departure.isoformat(),
        emission_type=request.emission_type,
        include_tolls=True,
        include_fuel_consumption=include_fuel,
        compute_alternatives=True,
    )

    raw_routes = route_data.get("routes", [])
    if not raw_routes:
        raise ValueError("No driving route was returned.")

    routes = []
    for route_index, route in enumerate(raw_routes[:3]):
        distance_km = float(route.get("distanceMeters", 0)) / 1000
        duration_seconds = _duration_seconds(route.get("duration"))
        static_seconds = _duration_seconds(route.get("staticDuration"))
        advisory = route.get("travelAdvisory") or {}

        toll_prices = (advisory.get("tollInfo") or {}).get("estimatedPrice") or []
        toll_amount = _money_value(toll_prices[0]) if toll_prices else None
        toll_currency = toll_prices[0].get("currencyCode") if toll_prices else None

        fuel_micro = advisory.get("fuelConsumptionMicroliters")
        provider_liters = float(fuel_micro) / 1_000_000 if fuel_micro else None

        user_units = None
        user_cost = None
        if request.fuel_efficiency:
            user_units = distance_km / request.fuel_efficiency
            if request.fuel_price_per_unit is not None:
                user_cost = user_units * request.fuel_price_per_unit

        arrival = departure + timedelta(seconds=duration_seconds)
        max_block = request.max_drive_hours * 3600
        rest_count = min(3, max(0, math.ceil(duration_seconds / max_block) - 1))
        rest_fractions = [(i + 1) / (rest_count + 1) for i in range(rest_count)]

        intelligence = analyze_route(route)
        road_attributes = await lookup_road_attributes(_sample_route((route.get("polyline") or {}).get("encodedPolyline"), [0.08, 0.16, 0.24, 0.32, 0.40, 0.48, 0.56, 0.64, 0.72, 0.80, 0.88, 0.96]))
        # Google Routes exposes traffic at route level here, not as an exact live
        # feed for every sampled road section. Propagate that signal transparently
        # to sampled sections so the UI can distinguish traffic from road attributes.
        traffic_signal = intelligence["traffic"]
        safety_signal = intelligence["safety"]
        for section in road_attributes.get("sections", []):
            section["traffic_status"] = traffic_signal["congestion"]
            section["traffic_score"] = traffic_signal["traffic_score"]
            section["traffic_source"] = "Google Routes route-level traffic signal"
            section["safety_signal"] = "attention" if safety_signal["score"] < 60 else ("caution" if safety_signal["score"] < 80 else "normal")
            section["safety_score"] = safety_signal["score"]
            section["safety_source"] = "Derived from route warnings and traffic-vs-typical duration"
        trip_score = score_trip(
            intelligence,
            distance_km,
            toll_available=toll_amount is not None,
            fuel_cost_available=user_cost is not None,
        )

        rest_candidates = _sample_route(
            (route.get("polyline") or {}).get("encodedPolyline"),
            rest_fractions,
        )
        for stop_index, stop in enumerate(rest_candidates, start=1):
            planned_drive_hours = round(duration_seconds * stop["fraction"] / 3600, 2)
            stop["stop_index"] = stop_index
            stop["reason"] = "driver_rest"
            stop["planned_drive_hours"] = planned_drive_hours
            stop["recommended_after_hours"] = round(max_drive_hours, 2)

        routes.append({
            "route_index": route_index,
            "label": (route.get("routeLabels") or [None])[0],
            "description": route.get("description"),
            "distance_km": round(distance_km, 2),
            "traffic_duration_seconds": duration_seconds,
            "typical_duration_seconds": static_seconds,
            "departure_at": departure.isoformat(),
            "estimated_arrival_at": arrival.isoformat(),
            "polyline": (route.get("polyline") or {}).get("encodedPolyline"),
            "warnings": route.get("warnings") or [],
            "toll": {
                "amount": toll_amount,
                "currency": toll_currency,
                "available": toll_amount is not None,
            },
            "energy": {
                "provider_estimated_liters": provider_liters,
                "user_estimated_units": round(user_units, 2) if user_units is not None else None,
                "unit": "kWh" if request.emission_type == "ELECTRIC" else "L",
                "estimated_cost": round(user_cost, 2) if user_cost is not None else None,
            },
            "road_intelligence": intelligence,
            "road_attributes": road_attributes,
            "trip_score": trip_score,
            "rest_stop_candidates": rest_candidates,
            "itinerary": _build_itinerary(
                departure,
                duration_seconds,
                request.max_drive_hours,
                request.break_minutes,
            ),
        })

    # Rank alternatives using the transparent trip score first, then cost and distance.
    # This never invents road-quality data; unavailable components simply do not affect the ranking.
    ranked = sorted(
        routes,
        key=lambda item: (
            -float(item["trip_score"]["overall_score"]),
            float(item["energy"].get("estimated_cost") or 0) + float(item["toll"].get("amount") or 0),
            float(item["distance_km"]),
        ),
    )
    for rank, item in enumerate(ranked, start=1):
        item["recommendation_rank"] = rank
        score = float(item["trip_score"]["overall_score"])
        if rank == 1:
            item["recommendation"] = "recommended"
            item["recommendation_reason"] = "Highest overall traffic, safety and data-completeness score among returned alternatives."
        else:
            item["recommendation"] = "alternative"
            item["recommendation_reason"] = "Alternative route; ranked below the recommended route using the same transparent scoring method."

    routes = ranked
    primary = routes[0]
    total_cost = None
    if primary["toll"]["amount"] is not None or primary["energy"]["estimated_cost"] is not None:
        total_cost = round(
            (primary["toll"]["amount"] or 0) + (primary["energy"]["estimated_cost"] or 0),
            2,
        )

    return {
        "departure_at": departure.isoformat(),
        "vehicle": {
            "type": request.vehicle_type,
            "emission_type": request.emission_type,
            "fuel_efficiency": request.fuel_efficiency,
            "fuel_price_per_unit": request.fuel_price_per_unit,
        },
        "preferences": {
            "avoid_tolls": request.avoid_tolls,
            "avoid_highways": request.avoid_highways,
            "max_drive_hours": request.max_drive_hours,
            "break_minutes": request.break_minutes,
        },
        "primary_route": primary,
        "routes": routes,
        "route_ranking": {
            "recommended_route_index": primary["route_index"],
            "method": "Highest overall score, then lowest estimated toll+energy cost, then shortest distance.",
        },
        "estimated_trip_cost": {
            "amount": total_cost,
            "currency": request.currency,
            "includes": [
                name for name, enabled in (
                    ("tolls", primary["toll"]["amount"] is not None),
                    ("fuel_or_energy", primary["energy"]["estimated_cost"] is not None),
                ) if enabled
            ],
            "note": "Fuel/energy cost requires a user-supplied current price. Hotel and meal costs are not fabricated.",
        },
    }
