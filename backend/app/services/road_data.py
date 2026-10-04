from __future__ import annotations

import httpx
from typing import Any
from app.config import settings

SURFACE = {"asphalt":100,"concrete":98,"paved":95,"paving_stones":82,"cobblestone":72,"gravel":55,"dirt":30,"earth":30,"sand":20,"mud":15,"unpaved":40}
SMOOTHNESS = {"excellent":100,"good":90,"intermediate":75,"bad":55,"very_bad":35,"horrible":20,"very_horrible":10,"impassable":0}
HIGHWAY = {"motorway":100,"trunk":95,"primary":88,"secondary":78,"tertiary":68,"unclassified":55,"residential":52,"service":35}

def way_score(tags: dict[str,str]) -> tuple[float|None,list[str]]:
    values=[]
    for key, table, weight in (("surface",SURFACE,.35),("smoothness",SMOOTHNESS,.40),("highway",HIGHWAY,.15)):
        value=tags.get(key)
        if value and value.lower() in table:
            values.append((table[value.lower()],weight,key))
    if tags.get("lit") in ("yes","no"):
        values.append((100 if tags["lit"]=="yes" else 45,.10,"lighting"))
    if not values:
        return None,[]
    total=sum(w for _,w,_ in values)
    return round(sum(v*w for v,w,_ in values)/total,1),[k for _,_,k in values]

async def lookup_road_attributes(points: list[dict[str,float]]) -> dict[str,Any]:
    if not points:
        return {"provider":"OpenStreetMap/Overpass","segments":[],"coverage":0.0}
    clauses="".join(f'way(around:80,{p["latitude"]},{p["longitude"]})["highway"];' for p in points[:12])
    query="[out:json][timeout:20];("+clauses+");out tags center;"
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response=await client.post(settings.overpass_url,data={"data":query})
            response.raise_for_status()
            elements=response.json().get("elements",[])
    except Exception:
        return {"provider":"OpenStreetMap/Overpass","segments":[],"coverage":0.0,"status":"provider unavailable"}
    segments=[]
    for e in elements:
        tags=e.get("tags") or {}
        score,factors=way_score(tags)
        center=e.get("center") or {}
        segments.append({"osm_way_id":e.get("id"),"latitude":center.get("lat"),"longitude":center.get("lon"),"highway":tags.get("highway"),"surface":tags.get("surface"),"smoothness":tags.get("smoothness"),"maxspeed":tags.get("maxspeed"),"lanes":tags.get("lanes"),"lit":tags.get("lit"),"score":score,"score_factors":factors})
    scored=[x["score"] for x in segments if x["score"] is not None]
    return {"provider":"OpenStreetMap/Overpass","segments":segments[:50],"coverage":round(min(1.0,len(scored)/max(1,len(points))),2),"status":"available" if scored else "mapped road attributes unavailable","method":"Proxy from mapped OSM surface, smoothness, highway class and lighting; not a live pavement inspection."}
