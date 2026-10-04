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
type User = { id: number; email: string; display_name?: string | null };
type SavedTrip = { id: number; name: string; start_label: string; destination_label: string; departure_at: string; vehicle_type: string; preferences?: Record<string, unknown>; created_at: string };

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
  rest_stop_candidates?: Array<{ latitude: number; longitude: number; fraction: number; stop_index?: number; reason?: string; planned_drive_hours?: number; recommended_after_hours?: number }>;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function createPlaceSessionToken() {
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    if (typeof globalThis.crypto.randomUUID === "function") return globalThis.createPlaceSessionToken();
    if (typeof globalThis.crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      return hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20);
    }
  }
  return "st-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}


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
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function search(next: string) {
    onChange(next);
    setSearchError("");
    if (timer.current) clearTimeout(timer.current);
    if (next.trim().length < 2) {
      setSuggestions([]); setOpen(false); setSearching(false); return;
    }
    setSearching(true);
    const requestId = ++requestRef.current;
    timer.current = setTimeout(async () => {
      try {
        const token = sessionStorage.getItem("smarttrip-place-session") ?? createPlaceSessionToken();
        sessionStorage.setItem("smarttrip-place-session", token);
        const response = await fetch(API + "/api/v1/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: next.trim(), session_token: token }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Place suggestions are unavailable.");
        if (requestId !== requestRef.current) return;
        setSuggestions(data.suggestions ?? []);
        setOpen(true);
      } catch (err) {
        if (requestId !== requestRef.current) return;
        setSuggestions([]);
        setOpen(true);
        setSearchError(err instanceof Error ? err.message : "Place suggestions are unavailable.");
      } finally {
        if (requestId === requestRef.current) setSearching(false);
      }
    }, 300);
  }

  return (
    <div className="search-box">
      <label>{label}</label>
      <div className={"search-input-wrap" + (open && suggestions.length ? " has-results" : "")}>
        <span className="search-pin" aria-hidden="true">●</span>
        <input
          value={value}
          onChange={(e) => search(e.target.value)}
          onFocus={() => (suggestions.length > 0 || !!searchError) && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder={label === "Start" ? "Search city, address or landmark" : "Search destination"}
          required
          autoComplete="off"
        />
        {searching && <span className="search-spinner" aria-label="Searching" />}
      </div>
      {open && (searching || suggestions.length > 0 || searchError) && (
        <div className="suggestions-panel">
          {searching && <div className="suggestion-status"><span className="search-spinner" /> Searching Google Places…</div>}
          {!searching && suggestions.map((item, index) => {
            const prediction = item.placePrediction;
            if (!prediction?.placeId) return null;
            const main = prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? "";
            const secondary = prediction.structuredFormat?.secondaryText?.text ?? "";
            return (
              <button type="button" className="suggestion-item" key={prediction.placeId + index}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect({ placeId: prediction.placeId!, label: main + (secondary ? ", " + secondary : "") });
                  setOpen(false);
                }}>
                <span className="suggestion-icon">⌖</span>
                <span><strong>{main}</strong>{secondary && <small>{secondary}</small>}</span>
              </button>
            );
          })}
          {!searching && !suggestions.length && !searchError && <div className="suggestion-status">No places found. Try a city, landmark or full address.</div>}
          {searchError && <div className="suggestion-error">{searchError}<small>Check the backend Google Maps API key and Places API (New) configuration.</small></div>}
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
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [savedTripsLoading, setSavedTripsLoading] = useState(false);
  const [saveTripLoading, setSaveTripLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("smarttrip-token")) void loadCurrentUser();
    if (!sessionStorage.getItem("smarttrip-place-session")) {
      sessionStorage.setItem("smarttrip-place-session", createPlaceSessionToken());
    }
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    setDepartureDate(local.toISOString().slice(0, 10));
  }, []);

  function authHeaders() {
    const token = localStorage.getItem("smarttrip-token");
    return token ? { Authorization: "Bearer " + token } : {};
  }

  async function loadSavedTrips() {
    const token = localStorage.getItem("smarttrip-token");
    if (!token) return;
    setSavedTripsLoading(true);
    try {
      const response = await fetch(API + "/api/v1/trips/saved", { headers: authHeaders() });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setSavedTrips(data.trips ?? data ?? []);
    } catch { setSavedTrips([]); }
    finally { setSavedTripsLoading(false); }
  }

  async function loadCurrentUser() {
    const token = localStorage.getItem("smarttrip-token");
    if (!token) return;
    try {
      const response = await fetch(API + "/api/v1/auth/me", { headers: authHeaders() });
      if (!response.ok) throw new Error();
      setUser(await response.json());
      await loadSavedTrips();
    } catch {
      localStorage.removeItem("smarttrip-token");
      setUser(null);
      setSavedTrips([]);
    }
  }

  async function submitAuth(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setAuthLoading(true);
    try {
      const endpoint = authMode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const body = authMode === "login"
        ? { email: authEmail.trim(), password: authPassword }
        : { email: authEmail.trim(), password: authPassword, display_name: authName.trim() || undefined };
      const response = await fetch(API + endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Authentication failed.");
      if (!data.access_token) throw new Error("Authentication succeeded but no access token was returned.");
      localStorage.setItem("smarttrip-token", data.access_token);
      setAuthEmail(""); setAuthPassword(""); setAuthName("");
      await loadCurrentUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally { setAuthLoading(false); }
  }

  function logout() {
    localStorage.removeItem("smarttrip-token");
    setUser(null);
    setSavedTrips([]);
  }

  async function saveCurrentTrip() {
    if (!user) { setError("Sign in before saving a trip."); return; }
    if (!origin?.label || !destination?.label) { setError("Complete the trip details before saving."); return; }
    setSaveTripLoading(true); setError("");
    try {
      const response = await fetch(API + "/api/v1/trips/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: origin.label + " → " + destination.label,
          start_label: origin.label,
          destination_label: destination.label,
          departure_at: isoForDateTime(departureDate, departureTime),
          vehicle_type: vehicleType,
          preferences: { emission_type: emissionType, fuel_efficiency: Number(efficiency), fuel_price_per_unit: Number(fuelPrice), avoid_tolls: avoidTolls, avoid_highways: avoidHighways, max_drive_hours: Number(maxDriveHours), break_minutes: 20 }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Unable to save trip.");
      await loadSavedTrips();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save trip.");
    } finally { setSaveTripLoading(false); }
  }

  async function deleteSavedTrip(id: number) {
    try {
      const response = await fetch(API + "/api/v1/trips/saved/" + id, { method: "DELETE", headers: authHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Unable to delete saved trip.");
      setSavedTrips((current) => current.filter((trip) => trip.id !== id));
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to delete saved trip."); }
  }

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
        body: JSON.stringify({ candidates, categories, radius_meters: 5000, max_results_per_category: 3 }),
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
    roadSections: (route.road_attributes?.sections ?? [])
      .filter((section) => section.latitude != null && section.longitude != null)
      .map((section) => ({
        latitude: section.latitude as number,
        longitude: section.longitude as number,
        score: section.score,
        route_fraction: section.route_fraction,
        traffic_status: section.traffic_status,
        traffic_score: section.traffic_score,
        safety_signal: section.safety_signal,
        safety_score: section.safety_score,
      })),
  }));

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <div className="brand-name">SmartTrip</div>
            <div className="brand-subtitle">Intelligent road travel</div>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="status-pill"><span className="status-dot" /> Live route planning</span>
          {user ? (
            <button className="ghost-btn" type="button" onClick={logout}>Sign out</button>
          ) : (
            <button className="ghost-btn" type="button" onClick={() => document.getElementById("account-panel")?.scrollIntoView({ behavior: "smooth" })}>Sign in</button>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">SMARTER JOURNEYS · INDIA</span>
          <h1>Plan the journey.<br /><span>Enjoy the destination.</span></h1>
          <p>Real routes, traffic-aware ETAs, fuel costs, road intelligence and smart rest planning in one place.</p>
        </div>
        <div className="hero-badge">
          <div className="hero-badge-icon">⌁</div>
          <div><strong>Trip intelligence</strong><span>Route • traffic • cost • rest</span></div>
        </div>
      </section>

      <section className="planner-grid">
        <div className="planner-card">
          <div className="card-heading">
            <div>
              <span className="section-kicker">NEW TRIP</span>
              <h2>Where are you going?</h2>
            </div>
            <span className="step-badge">1 / 1</span>
          </div>

          <form onSubmit={planTrip}>
            <div className="route-inputs">
              <SearchBox label="Start" value={originText}
                onChange={(value) => { setOriginText(value); setOrigin(null); }}
                onSelect={(place) => { setOrigin(place); setOriginText(place.label); }} />
              <div className="route-line" aria-hidden="true"><span>↓</span></div>
              <SearchBox label="Destination" value={destinationText}
                onChange={(value) => { setDestinationText(value); setDestination(null); }}
                onSelect={(place) => { setDestination(place); setDestinationText(place.label); }} />
            </div>

            <div className="field-grid">
              <label className="field"><span>Departure date</span><input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} required /></label>
              <label className="field"><span>Departure time</span><input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} required /></label>
              <label className="field"><span>Vehicle</span><select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}><option value="car">Car</option><option value="suv">SUV</option><option value="motorcycle">Motorcycle</option><option value="van">Van</option><option value="ev">EV</option></select></label>
              <label className="field"><span>Energy</span><select value={emissionType} onChange={(e) => setEmissionType(e.target.value)}><option value="GASOLINE">Petrol</option><option value="DIESEL">Diesel</option><option value="HYBRID">Hybrid</option><option value="ELECTRIC">Electric</option></select></label>
              <label className="field"><span>Efficiency</span><input type="number" min="1" step="0.1" value={efficiency} onChange={(e) => setEfficiency(e.target.value)} placeholder="L/100km" /></label>
              <label className="field"><span>Price / unit <small>₹</small></span><input type="number" min="0" step="0.01" value={fuelPrice} onChange={(e) => setFuelPrice(e.target.value)} /></label>
              <label className="field"><span>Max driving <small>hours</small></span><input type="number" min="1" max="12" step="0.5" value={maxDriveHours} onChange={(e) => setMaxDriveHours(e.target.value)} /></label>
            </div>

            <div className="preference-row">
              <label className="toggle"><input type="checkbox" checked={avoidTolls} onChange={(e) => setAvoidTolls(e.target.checked)} /><span />Avoid tolls</label>
              <label className="toggle"><input type="checkbox" checked={avoidHighways} onChange={(e) => setAvoidHighways(e.target.checked)} /><span />Avoid highways</label>
            </div>

            <button className="primary-btn" disabled={loading} type="submit">
              <span>{loading ? "Building your live trip…" : "Plan my trip"}</span><b>→</b>
            </button>
          </form>
        </div>

        <aside id="account-panel" className="account-card">
          {user ? (
            <>
              <div className="account-head">
                <div className="avatar">{(user.display_name || user.email).charAt(0).toUpperCase()}</div>
                <div className="account-copy"><strong>{user.display_name || "Traveler"}</strong><span>{user.email}</span></div>
              </div>
              <div className="account-title"><h3>Saved trips</h3><span>{savedTrips.length}</span></div>
              <button className="secondary-btn full" type="button" onClick={loadSavedTrips} disabled={savedTripsLoading}>{savedTripsLoading ? "Refreshing…" : "↻ Refresh"}</button>
              {savedTrips.length === 0 ? (
                <div className="empty-state"><div>☆</div><strong>No saved trips yet</strong><span>Your planned journeys will appear here.</span></div>
              ) : (
                <div className="saved-list">{savedTrips.map((trip) => (
                  <div className="saved-trip" key={trip.id}>
                    <div><strong>{trip.name}</strong><span>{new Date(trip.departure_at).toLocaleString()}</span></div>
                    <button type="button" onClick={() => deleteSavedTrip(trip.id)} aria-label="Delete saved trip">×</button>
                  </div>
                ))}</div>
              )}
            </>
          ) : (
            <>
              <span className="section-kicker">YOUR ACCOUNT</span>
              <h2>{authMode === "login" ? "Welcome back" : "Create your account"}</h2>
              <p className="muted">Save trips and access your travel plans across sessions.</p>
              <form onSubmit={submitAuth} className="auth-form">
                {authMode === "register" && <input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Display name" autoComplete="name" />}
                <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email address" autoComplete="email" />
                <input type="password" required minLength={10} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password (10+ characters)" autoComplete={authMode === "login" ? "current-password" : "new-password"} />
                <button className="primary-btn" disabled={authLoading} type="submit">{authLoading ? "Please wait…" : authMode === "login" ? "Sign in →" : "Create account →"}</button>
              </form>
              <button className="text-btn" type="button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>{authMode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
            </>
          )}
        </aside>
      </section>

      {error && <div className="error-banner" role="alert"><strong>Something went wrong</strong><span>{error}</span></div>}

      {routes.length > 0 && (
        <section className="results-section">
          <div className="results-heading">
            <div><span className="section-kicker">YOUR TRIP PLAN</span><h2>Routes & intelligence</h2></div>
            <span className="live-label"><span className="status-dot" /> Live data</span>
          </div>

          <div className="map-card"><TripMap routes={mapRoutes.map((item, index) => ({
            ...item,
            roadSections: (routes[index]?.road_attributes?.sections ?? []).filter((section) => section.latitude != null && section.longitude != null).map((section) => ({
              latitude: section.latitude as number, longitude: section.longitude as number, score: section.score, route_fraction: section.route_fraction,
              traffic_status: section.traffic_status, traffic_score: section.traffic_score, safety_signal: section.safety_signal, safety_score: section.safety_score,
            })),
          }))} /></div>

          <div className="route-list">
            {routes.map((route, index) => (
              <article className={"route-card " + (index === 0 ? "recommended" : "")} key={index}>
                <div className="route-top">
                  <div><span className="route-number">ROUTE {index + 1}</span><h3>{route.description || route.label || (index === 0 ? "Recommended route" : "Alternative route")}</h3></div>
                  {index === 0 && <span className="recommended-badge">★ Best match</span>}
                </div>
                <div className="metric-grid">
                  <div className="metric"><span>Distance</span><strong>{(route.distance_km ?? 0).toFixed(1)} <small>km</small></strong></div>
                  <div className="metric"><span>Traffic ETA</span><strong>{formatSeconds(route.traffic_duration_seconds)}</strong></div>
                  <div className="metric"><span>Arrival</span><strong>{route.estimated_arrival_at ? new Date(route.estimated_arrival_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</strong></div>
                  <div className="metric"><span>Trip cost</span><strong>{route.toll?.amount != null || route.energy?.estimated_cost != null ? "₹" + ((route.toll?.amount ?? 0) + (route.energy?.estimated_cost ?? 0)).toFixed(0) : "—"}</strong></div>
                </div>
                <div className="intelligence-grid">
                  <div className="intel"><span>Trip score</span><strong>{route.trip_score?.overall_score ?? "—"}<small>/100</small></strong><em>{route.trip_score?.grade ?? "Unavailable"}</em></div>
                  <div className="intel"><span>Traffic</span><strong>{route.road_intelligence?.traffic?.traffic_score ?? "—"}<small>/100</small></strong><em>{route.road_intelligence?.traffic?.congestion ?? "Unavailable"}</em></div>
                  <div className="intel"><span>Safety signal</span><strong>{route.road_intelligence?.safety?.score ?? "—"}<small>/100</small></strong><em>Route signal</em></div>
                  <div className="intel"><span>Fuel / energy</span><strong>{route.energy?.user_estimated_units != null ? route.energy.user_estimated_units.toFixed(1) : "—"}</strong><em>{route.energy?.unit || "Not calculated"}</em></div>
                </div>

                <div className="route-actions">
                  {index === 0 && user && <button className="secondary-btn" type="button" onClick={saveCurrentTrip} disabled={saveTripLoading}>{saveTripLoading ? "Saving…" : "☆ Save trip"}</button>}
                  {index === 0 && route.rest_stop_candidates?.length ? <button className="secondary-btn" type="button" onClick={findStops} disabled={stopsLoading}>{stopsLoading ? "Finding stops…" : "＋ Find smart stops"}</button> : null}
                </div>

                {route.road_attributes?.sections?.length ? (
                  <details className="details-panel">
                    <summary>Road intelligence <span>{Math.round((route.road_attributes.coverage ?? 0) * 100)}% coverage</span></summary>
                    <p>Mapped OSM road attributes near sampled route points. This is not a live pavement inspection.</p>
                    <div className="road-grid">{route.road_attributes.sections.map((section) => (
                      <div className="road-item" key={section.section_index}>
                        <strong>{Math.round((section.route_fraction ?? 0) * 100)}%</strong><span>Score {section.score ?? "—"}/100</span>
                        <small>{section.highway ?? "road"} · {section.surface ?? "surface unknown"} · {section.smoothness ?? "smoothness unknown"}</small>
                        <small>Traffic: {section.traffic_status ?? "unavailable"} · Safety: {section.safety_signal ?? "unavailable"}</small>
                      </div>
                    ))}</div>
                  </details>
                ) : null}

                {route.itinerary?.length ? (
                  <details className="details-panel"><summary>Day-wise itinerary <span>{route.itinerary.length} day{route.itinerary.length > 1 ? "s" : ""}</span></summary>
                    <div className="timeline">{route.itinerary.map((day) => <div className="timeline-item" key={day.day}><div className="timeline-dot" /><div><strong>Day {day.day}</strong><span>{day.drive_hours}h driving · starts {new Date(day.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><small>{day.overnight ? "Rest / overnight break recommended" : "Destination arrival block"}</small></div></div>)}</div>
                  </details>
                ) : null}

                {route.rest_stop_candidates?.length ? (
                  <details className="details-panel"><summary>Recommended rest windows <span>{route.rest_stop_candidates.length} stops</span></summary>
                    <div className="rest-grid">{route.rest_stop_candidates.map((stop, i) => <div className="rest-item" key={i}><strong>Stop {i + 1}</strong><span>~{Math.round(stop.fraction * 100)}% of route</span><small>{stop.reason || "Planned driver rest window"}</small></div>)}</div>
                  </details>
                ) : null}

                {index === 0 && stops.length > 0 && (
                  <div className="stops-panel"><div className="stops-title"><h4>Nearby options</h4><span>Real place results</span></div>
                    {stops.map((group, groupIndex) => <div className="stop-group" key={group.category + group.route_fraction + groupIndex}><strong>{group.category.replace("_", " ")}</strong><div>{group.places.length === 0 ? <span className="muted">No matching places found.</span> : group.places.slice(0, 3).map((place, placeIndex) => <a key={place.id ?? placeIndex} href={place.googleMapsUri} target="_blank" rel="noreferrer">{place.displayName?.text ?? "Place"}{place.formattedAddress ? <small>{place.formattedAddress}</small> : null}</a>)}</div></div>)}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className="footer"><span>SmartTrip Planner</span><span>Real route data • Smart planning • Built for the road</span></footer>
    </main>
  );
}
