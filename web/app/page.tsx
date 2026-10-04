"use client";

import TripMap from "../components/TripMap";
import { useEffect, useRef, useState } from "react";

type Prediction = {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
};

type Place = { placeId: string; label: string };

type Route = {
  distanceMeters?: number;
  distance_km?: number;
  duration?: string;
  traffic_duration_seconds?: number;
  staticDuration?: string;
  typical_duration_seconds?: number;
  description?: string;
  polyline?: string;
  estimated_arrival_at?: string;
  toll?: { amount?: number | null; currency?: string | null };
  energy?: { user_estimated_units?: number | null; unit?: string; estimated_cost?: number | null };
  road_intelligence?: { traffic?: { congestion?: string; traffic_score?: number; estimated_average_speed_kmh?: number }; safety?: { score?: number; warnings_count?: number }; road_quality?: { score?: number | null; status?: string } };
  trip_score?: { overall_score?: number; grade?: string; components?: { traffic?: number; safety?: number; data_completeness?: number } };
  road_attributes?: {
    coverage?: number;
    sections?: Array<{
      section_index: number;
      latitude?: number;
      longitude?: number;
      route_fraction?: number;
      score?: number | null;
      highway?: string | null;
      surface?: string | null;
      smoothness?: string | null;
      maxspeed?: string | null;
      lanes?: string | null;
      lit?: string | null;
      confidence?: number;
      status?: string;
      traffic_status?: string;
      traffic_score?: number;
      traffic_source?: string;
      safety_signal?: string;
      safety_score?: number;
      safety_source?: string;
    }>;
  };
  itinerary?: Array<{
    day: number;
    start_time: string;
    drive_hours: number;
    arrive_or_rest_time: string;
    overnight: boolean;
    recommended_break_minutes: number;
  }>;
  rest_stop_candidates?: Array<{ latitude: number; longitude: number; fraction: number }>;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function SearchBox({
  label, value, onChange, onSelect,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: Place) => void;
}) {
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function search(next: string) {
    onChange(next);
    if (timer.current) clearTimeout(timer.current);
    if (next.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    timer.current = setTimeout(async () => {
      try {
        const token = sessionStorage.getItem("smarttrip-place-session") ?? crypto.randomUUID();
        sessionStorage.setItem("smarttrip-place-session", token);
        const response = await fetch(API + "/api/v1/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: next.trim(), session_token: token }),
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setSuggestions(data.suggestions ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }

  return (
    <div style={{ position: "relative" }}>
      <label style={{ display: "block", fontWeight: 650, marginBottom: 7 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => search(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={label === "Start" ? "Search starting location" : "Search destination"}
        required
        style={{ boxSizing: "border-box", width: "100%", padding: 14, borderRadius: 10, border: "1px solid #d7dbe2", fontSize: 16 }}
      />
      {open && suggestions.length > 0 && (
        <div style={{ position: "absolute", zIndex: 10, left: 0, right: 0, top: "100%", background: "#fff", border: "1px solid #ddd", borderRadius: 10, marginTop: 4, overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,.12)" }}>
          {suggestions.map((item, index) => {
            const prediction = item.placePrediction;
            if (!prediction?.placeId) return null;
            const main = prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? "";
            const secondary = prediction.structuredFormat?.secondaryText?.text ?? "";
            return (
              <button
                type="button"
                key={prediction.placeId + index}
                onClick={() => {
                  onSelect({ placeId: prediction.placeId!, label: main + (secondary ? ", " + secondary : "") });
                  setOpen(false);
                }}
                style={{ display: "block", width: "100%", textAlign: "left", border: 0, background: "#fff", padding: "13px 15px", cursor: "pointer" }}
              >
                <strong>{main}</strong>
                {secondary && <span style={{ display: "block", color: "#68707c", marginTop: 3 }}>{secondary}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isoForDateTime(date: string, time: string) {
  return new Date(date + "T" + time).toISOString();
}

function formatSeconds(seconds?: number) {
  if (!seconds) return "Unavailable";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? hours + "h " + minutes + "m" : minutes + "m";
}

export default function Home() {
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("08:00");
  const [vehicleType, setVehicleType] = useState("car");
  const [emissionType, setEmissionType] = useState("GASOLINE");
  const [efficiency, setEfficiency] = useState("12");
  const [fuelPrice, setFuelPrice] = useState("100");
  const [maxDriveHours, setMaxDriveHours] = useState("4");
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Array<{ route_fraction: number; category: string; places: Array<{ id?: string; displayName?: { text?: string }; formattedAddress?: string; googleMapsUri?: string }> }>>([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("smarttrip-place-session")) {
      sessionStorage.setItem("smarttrip-place-session", crypto.randomUUID());
    }
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    setDepartureDate(local.toISOString().slice(0, 10));
  }, []);

  async function planTrip(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setRoutes([]);
    setStops([]);

    if (!origin?.placeId || !destination?.placeId) {
      setError("Select both locations from the search suggestions.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API + "/api/v1/trips/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_place_id: origin.placeId,
          destination_place_id: destination.placeId,
          departure_at: isoForDateTime(departureDate, departureTime),
          vehicle_type: vehicleType,
          emission_type: emissionType,
          fuel_efficiency: Number(efficiency),
          fuel_price_per_unit: Number(fuelPrice),
          currency: "INR",
          avoid_tolls: avoidTolls,
          avoid_highways: avoidHighways,
          max_drive_hours: Number(maxDriveHours),
          break_minutes: 20,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Trip planning failed.");
      setRoutes(data.routes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to plan this trip.");
    } finally {
      setLoading(false);
    }
  }

  async function findStops() {
    const candidates = routes[0]?.rest_stop_candidates;
    if (!candidates?.length) return;
    setStopsLoading(true);
    try {
      const categories = emissionType === "ELECTRIC"
        ? ["rest_stop", "restaurant", "ev_charging", "hotel"]
        : ["rest_stop", "restaurant", "fuel", "hotel"];
      const response = await fetch(API + "/api/v1/trips/stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates, categories, radius_meters: 5000 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Stop search failed.");
      setStops(data.stops ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to find nearby stops.");
    } finally {
      setStopsLoading(false);
    }
  }

  const mapRoutes = routes.map((route) => ({
    distanceMeters: (route.distance_km ?? 0) * 1000,
    duration: route.traffic_duration_seconds ? route.traffic_duration_seconds + "s" : undefined,
    staticDuration: route.typical_duration_seconds ? route.typical_duration_seconds + "s" : undefined,
    polyline: { encodedPolyline: route.polyline ?? "" },
  }));

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fa", padding: "48px 20px" }}>
      <section style={{ maxWidth: 1000, margin: "0 auto" }}>
        <p style={{ fontWeight: 800, letterSpacing: 2 }}>SMARTTRIP</p>
        <h1 style={{ fontSize: 44, margin: "8px 0" }}>Plan the road. Enjoy the journey.</h1>
        <p style={{ color: "#5d6570", fontSize: 18 }}>
          Build a real traffic-aware road-trip plan with vehicle cost and driver-rest planning.
        </p>

        <form onSubmit={planTrip} style={{ background: "#fff", padding: 24, borderRadius: 18, marginTop: 28, boxShadow: "0 10px 40px rgba(20,30,50,.06)" }}>
          <div style={{ display: "grid", gap: 16 }}>
            <SearchBox label="Start" value={originText}
              onChange={(value) => { setOriginText(value); setOrigin(null); }}
              onSelect={(place) => { setOrigin(place); setOriginText(place.label); }} />
            <SearchBox label="Destination" value={destinationText}
              onChange={(value) => { setDestinationText(value); setDestination(null); }}
              onSelect={(place) => { setDestination(place); setDestinationText(place.label); }} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
              <label>Departure date<input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} required style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, padding: 12, borderRadius: 9, border: "1px solid #d7dbe2" }} /></label>
              <label>Departure time<input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} required style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, padding: 12, borderRadius: 9, border: "1px solid #d7dbe2" }} /></label>
              <label>Vehicle<select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: 12, borderRadius: 9, border: "1px solid #d7dbe2" }}><option value="car">Car</option><option value="suv">SUV</option><option value="motorcycle">Motorcycle</option><option value="van">Van</option><option value="ev">EV</option></select></label>
              <label>Energy type<select value={emissionType} onChange={(e) => setEmissionType(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: 12, borderRadius: 9, border: "1px solid #d7dbe2" }}><option value="GASOLINE">Petrol</option><option value="DIESEL">Diesel</option><option value="HYBRID">Hybrid</option><option value="ELECTRIC">Electric</option></select></label>
              <label>Efficiency<input type="number" min="1" step="0.1" value={efficiency} onChange={(e) => setEfficiency(e.target.value)} placeholder="L/100km or kWh/100km" style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, padding: 12, borderRadius: 9, border: "1px solid #d7dbe2" }} /></label>
              <label>Price / unit (₹)<input type="number" min="0" step="0.01" value={fuelPrice} onChange={(e) => setFuelPrice(e.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, padding: 12, borderRadius: 9, border: "1px solid #d7dbe2" }} /></label>
              <label>Max driving hours<input type="number" min="1" max="12" step="0.5" value={maxDriveHours} onChange={(e) => setMaxDriveHours(e.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, padding: 12, borderRadius: 9, border: "1px solid #d7dbe2" }} /></label>
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <label><input type="checkbox" checked={avoidTolls} onChange={(e) => setAvoidTolls(e.target.checked)} /> Avoid tolls</label>
              <label><input type="checkbox" checked={avoidHighways} onChange={(e) => setAvoidHighways(e.target.checked)} /> Avoid highways</label>
            </div>

            <button disabled={loading} type="submit" style={{ padding: 14, borderRadius: 10, border: 0, background: "#17191d", color: "#fff", cursor: "pointer", fontSize: 16 }}>
              {loading ? "Building live trip plan…" : "Plan complete trip"}
            </button>
          </div>
        </form>

        {error && <p role="alert" style={{ color: "#b00020", marginTop: 18 }}>{error}</p>}

        {routes.length > 0 && (
          <>
            <div style={{ marginTop: 24 }}><TripMap routes={mapRoutes.map((item, index) => ({ ...item, roadSections: routes[index]?.road_attributes?.sections ?? [] }))} /></div>
            <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
              {routes.map((route, index) => (
                <article key={index} style={{ background: "#fff", padding: 20, borderRadius: 14 }}>
                  <h2 style={{ marginTop: 0 }}>Route {index + 1} {route.label ? "· " + route.label : ""}</h2>
                  {route.description && <p>{route.description}</p>}
                  <p><strong>Distance:</strong> {(route.distance_km ?? 0).toFixed(1)} km</p>
                  <p><strong>Traffic-aware ETA:</strong> {formatSeconds(route.traffic_duration_seconds)}</p>
                  <p><strong>Arrival:</strong> {route.estimated_arrival_at ? new Date(route.estimated_arrival_at).toLocaleString() : "Unavailable"}</p>
                  <p><strong>Tolls:</strong> {route.toll?.available ? "₹" + route.toll.amount?.toFixed(2) : "No estimated toll price returned"}</p>
                  <p><strong>Fuel/energy:</strong> {route.energy?.user_estimated_units != null ? route.energy.user_estimated_units.toFixed(2) + " " + route.energy.unit : "Not calculated"}</p>
                  <p><strong>Estimated trip cost:</strong> {route.toll?.amount != null || route.energy?.estimated_cost != null ? "₹" + ((route.toll?.amount ?? 0) + (route.energy?.estimated_cost ?? 0)).toFixed(2) : "Unavailable"}</p>
                  <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "#f5f7fa" }}>
                    <strong>Trip intelligence</strong>
                    <p style={{ marginBottom: 5 }}>Overall score: <strong>{route.trip_score?.overall_score ?? "—"}/100</strong> · {route.trip_score?.grade ?? "unavailable"}</p>
                    <p style={{ margin: "5px 0" }}>Traffic: {route.road_intelligence?.traffic?.congestion ?? "—"} · {route.road_intelligence?.traffic?.traffic_score ?? "—"}/100</p>
                    <p style={{ margin: "5px 0" }}>Safety signal: {route.road_intelligence?.safety?.score ?? "—"}/100</p>
                    <p style={{ margin: "5px 0" }}>Average traffic speed: {route.road_intelligence?.traffic?.estimated_average_speed_kmh != null ? route.road_intelligence.traffic.estimated_average_speed_kmh + " km/h" : "Unavailable"}</p>
                    <p style={{ margin: "5px 0", color: "#68707c", fontSize: 13 }}>Road quality: {route.road_intelligence?.road_quality?.status ?? "Dedicated road-condition data required"}</p>
                  </div>

                  {route.road_attributes?.sections?.length ? (
                    <div style={{ marginTop: 18, padding: 14, borderRadius: 12, background: "#f7f8fa" }}>
                      <h3 style={{ marginTop: 0 }}>Route-section road intelligence</h3>
                      <p style={{ color: "#68707c", fontSize: 13 }}>
                        Mapped OSM road attributes near sampled route points. This is not a live pavement inspection.
                        Coverage: {Math.round((route.road_attributes.coverage ?? 0) * 100)}%.
                      </p>
                      <div style={{ display: "grid", gap: 8 }}>
                        {route.road_attributes.sections.map((section) => (
                          <div key={section.section_index} style={{ padding: 10, border: "1px solid #e3e6eb", borderRadius: 9, background: "#fff" }}>
                            <strong>{Math.round((section.route_fraction ?? 0) * 100)}% of route</strong>
                            {" · "}score {section.score ?? "—"}/100
                            <div style={{ color: "#68707c", fontSize: 13, marginTop: 4 }}>
                              {section.highway ?? "road class unknown"} · surface {section.surface ?? "unknown"} · smoothness {section.smoothness ?? "unknown"}
                              {section.maxspeed ? " · max " + section.maxspeed : ""}
                              {section.lanes ? " · " + section.lanes + " lanes" : ""}
                              {section.lit ? " · lighting " + section.lit : ""}
                            </div>
                            <div style={{ marginTop: 5, fontSize: 12 }}>
                              Traffic: <strong>{section.traffic_status ?? "unavailable"}</strong>
                              {section.traffic_score != null ? " · " + section.traffic_score + "/100" : ""}
                              {" · "}Safety: <strong>{section.safety_signal ?? "unavailable"}</strong>
                              {section.safety_score != null ? " · " + section.safety_score + "/100" : ""}
                            </div>
                            <div style={{ color: "#68707c", fontSize: 12, marginTop: 3 }}>
                              Confidence {Math.round((section.confidence ?? 0) * 100)}% · {section.status}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {route.itinerary?.length ? (
                    <div style={{ marginTop: 18 }}>
                      <h3>Day-wise itinerary</h3>
                      {route.itinerary.map((day) => (
                        <div key={day.day} style={{ padding: 12, borderTop: "1px solid #eee" }}>
                          <strong>Day {day.day}</strong> · {day.drive_hours}h driving · starts {new Date(day.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {day.overnight ? <div>Rest/overnight break recommended after this driving block.</div> : <div>Destination arrival block.</div>}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {index === 0 && route.rest_stop_candidates?.length ? (
                    <button type="button" onClick={findStops} disabled={stopsLoading} style={{ marginTop: 12, padding: 12, borderRadius: 9, border: "1px solid #d7dbe2", background: "#fff", cursor: "pointer" }}>
                      {stopsLoading ? "Finding real nearby stops…" : "Find fuel, EV, restaurants, hotels & rest stops"}
                    </button>
                  ) : null}

                  {route.rest_stop_candidates?.length ? (
                    <div style={{ marginTop: 18 }}>
                      <h3>Recommended rest windows</h3>
                      {route.rest_stop_candidates.map((stop, i) => (
                        <div key={i} style={{ padding: 8 }}>
                          Stop {i + 1}: around {Math.round(stop.fraction * 100)}% of the route · {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                        </div>
                      ))}
                      <p style={{ color: "#68707c", fontSize: 13 }}>Use Nearby Search to select an actual fuel station, restaurant, restroom, hospital or hotel at each rest window.</p>
                    </div>
                  ) : null}

                  {index === 0 && stops.length > 0 && (
                    <div style={{ marginTop: 18 }}>
                      <h3>Real nearby stop options</h3>
                      {stops.map((group, groupIndex) => (
                        <div key={group.category + group.route_fraction + groupIndex} style={{ padding: 10, borderTop: "1px solid #eee" }}>
                          <strong>{group.category.replace("_", " ")}</strong> · around {Math.round(group.route_fraction * 100)}% of route
                          {group.places.length === 0 ? (
                            <div style={{ color: "#68707c", marginTop: 4 }}>No matching places returned in this search radius.</div>
                          ) : (
                            group.places.slice(0, 3).map((place, placeIndex) => (
                              <div key={place.id ?? placeIndex} style={{ marginTop: 6 }}>
                                {place.googleMapsUri ? <a href={place.googleMapsUri} target="_blank" rel="noreferrer">{place.displayName?.text ?? "Place"}</a> : <span>{place.displayName?.text ?? "Place"}</span>}
                                {place.formattedAddress && <span style={{ color: "#68707c" }}> · {place.formattedAddress}</span>}
                              </div>
                            ))
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
