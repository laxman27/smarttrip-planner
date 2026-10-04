from __future__ import annotations

from typing import Any

def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))

def _traffic_ratio(traffic_seconds: int, typical_seconds: int) -> float:
    if typical_seconds <= 0:
        return 1.0
    return traffic_seconds / typical_seconds

def analyze_route(route: dict[str, Any]) -> dict[str, Any]:
    distance_km = float(route.get("distanceMeters", 0)) / 1000
    traffic_seconds = _duration_seconds(route.get("duration"))
    typical_seconds = _duration_seconds(route.get("staticDuration"))
    ratio = _traffic_ratio(traffic_seconds, typical_seconds)

    # This is a transparent derived score, not a claim that Google supplies a
    # universal pavement/road-quality rating.
    traffic_penalty = _clamp((ratio - 1.0) * 100)
    traffic_score = round(_clamp(100 - traffic_penalty), 1)

    warnings = route.get("warnings") or []
    warning_penalty = min(30, len(warnings) * 10)
    safety_score = round(_clamp(100 - warning_penalty - traffic_penalty * 0.35), 1)

    if ratio >= 1.5:
        congestion = "severe"
    elif ratio >= 1.25:
        congestion = "high"
    elif ratio >= 1.10:
        congestion = "moderate"
    else:
        congestion = "low"

    speed_kmh = round(distance_km / (traffic_seconds / 3600), 1) if traffic_seconds else None

    return {
        "traffic": {
            "congestion": congestion,
            "traffic_vs_typical_ratio": round(ratio, 3),
            "traffic_score": traffic_score,
            "estimated_average_speed_kmh": speed_kmh,
        },
        "safety": {
            "score": safety_score,
            "warnings_count": len(warnings),
            "warnings": warnings,
            "method": "Derived from route warnings and traffic-vs-typical duration; not a pavement-condition measurement.",
        },
        "road_quality": {
            "score": None,
            "status": "requires a dedicated road-condition data source",
            "method": "Google Routes does not provide a universal pavement-quality score.",
        },
        "slow_section_signals": {
            "enabled": True,
            "description": "Route-level traffic signal based on traffic-aware versus typical duration.",
        },
    }

def _duration_seconds(value: str | None) -> int:
    if not value:
        return 0
    raw = value.strip().lower().removesuffix("s")
    try:
        return max(0, int(float(raw)))
    except ValueError:
        return 0

def score_trip(route_analysis: dict[str, Any], distance_km: float, toll_available: bool, fuel_cost_available: bool) -> dict[str, Any]:
    traffic = float(route_analysis["traffic"]["traffic_score"])
    safety = float(route_analysis["safety"]["score"])

    completeness = 100.0
    if not toll_available:
        completeness -= 5
    if not fuel_cost_available:
        completeness -= 5

    # Weighted score is intentionally explainable.
    overall = round(traffic * 0.40 + safety * 0.45 + completeness * 0.15, 1)

    if overall >= 85:
        grade = "excellent"
    elif overall >= 70:
        grade = "good"
    elif overall >= 55:
        grade = "fair"
    else:
        grade = "needs_attention"

    return {
        "overall_score": overall,
        "grade": grade,
        "components": {
            "traffic": traffic,
            "safety": safety,
            "data_completeness": round(completeness, 1),
        },
    }
