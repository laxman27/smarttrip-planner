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

type Route = {
  distanceMeters?: number;
  duration?: string;
  staticDuration?: string;
  description?: string;
};

type Place = {
  placeId: string;
  label: string;
};

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function SearchBox({
  label,
  value,
  onChange,
  onSelect,
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

  function search(value: string) {
    onChange(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    timer.current = setTimeout(async () => {
      try {
        const response = await fetch(API + "/api/v1/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: value.trim(),
            session_token: sessionStorage.getItem("smarttrip-place-session") ?? crypto.randomUUID(),
          }),
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

export default function Home() {
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidHighways, setAvoidHighways] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("smarttrip-place-session")) {
      sessionStorage.setItem("smarttrip-place-session", crypto.randomUUID());
    }
  }, []);

  async function planTrip(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setRoutes([]);

    if (!origin?.placeId || !destination?.placeId) {
      setError("Select both locations from the search suggestions.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API + "/api/v1/routes/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_place_id: origin.placeId,
          destination_place_id: destination.placeId,
          avoid_tolls: avoidTolls,
          avoid_highways: avoidHighways,
        }),
      });

      if (!response.ok) throw new Error("Route calculation failed.");
      const data = await response.json();
      setRoutes(data.routes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to plan this trip.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f5f7fa", padding: "48px 20px" }}>
      <section style={{ maxWidth: 920, margin: "0 auto" }}>
        <p style={{ fontWeight: 800, letterSpacing: 2 }}>SMARTTRIP</p>
        <h1 style={{ fontSize: 44, margin: "8px 0" }}>Plan the road. Enjoy the journey.</h1>
        <p style={{ color: "#5d6570", fontSize: 18 }}>
          Search real places and calculate a live traffic-aware driving route.
        </p>

        <form onSubmit={planTrip} style={{ background: "#fff", padding: 24, borderRadius: 18, marginTop: 28, boxShadow: "0 10px 40px rgba(20,30,50,.06)" }}>
          <div style={{ display: "grid", gap: 16 }}>
            <SearchBox
              label="Start"
              value={originText}
              onChange={(value) => {
                setOriginText(value);
                setOrigin(null);
              }}
              onSelect={(place) => {
                setOrigin(place);
                setOriginText(place.label);
              }}
            />
            <SearchBox
              label="Destination"
              value={destinationText}
              onChange={(value) => {
                setDestinationText(value);
                setDestination(null);
              }}
              onSelect={(place) => {
                setDestination(place);
                setDestinationText(place.label);
              }}
            />

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <label><input type="checkbox" checked={avoidTolls} onChange={(e) => setAvoidTolls(e.target.checked)} /> Avoid tolls</label>
              <label><input type="checkbox" checked={avoidHighways} onChange={(e) => setAvoidHighways(e.target.checked)} /> Avoid highways</label>
            </div>

            <button disabled={loading} type="submit" style={{ padding: 14, borderRadius: 10, border: 0, background: "#17191d", color: "#fff", cursor: "pointer", fontSize: 16 }}>
              {loading ? "Calculating live route…" : "Plan trip"}
            </button>
          </div>
        </form>

        {error && <p role="alert" style={{ color: "#b00020", marginTop: 18 }}>{error}</p>}

        {routes.length > 0 && (
          <div style={{ marginTop: 24 }}><TripMap routes={routes} /></div>

          <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
            {routes.map((route, index) => (
              <article key={index} style={{ background: "#fff", padding: 20, borderRadius: 14 }}>
                <h2 style={{ marginTop: 0 }}>Route {index + 1}</h2>
                {route.description && <p>{route.description}</p>}
                <p><strong>Distance:</strong> {((route.distanceMeters ?? 0) / 1000).toFixed(1)} km</p>
                <p><strong>Traffic-aware ETA:</strong> {route.duration ?? "Unavailable"}</p>
                <p><strong>Typical ETA:</strong> {route.staticDuration ?? "Unavailable"}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
