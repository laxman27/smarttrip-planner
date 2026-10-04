"use client";

import { FormEvent, useState } from "react";

type Route = {
  distanceMeters?: number;
  duration?: string;
  staticDuration?: string;
};

export default function Home() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function planTrip(event: FormEvent) {
    event.preventDefault();
    setError("");
    setRoutes([]);
    setLoading(true);

    const parse = (value: string) => value.split(",").map(Number);
    const [origin_lat, origin_lng] = parse(origin);
    const [destination_lat, destination_lng] = parse(destination);

    if (![origin_lat, origin_lng, destination_lat, destination_lng].every(Number.isFinite)) {
      setError("Enter coordinates as latitude,longitude.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/api/v1/routes/calculate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin_lat, origin_lng, destination_lat, destination_lng }),
        },
      );

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
    <main style={{ minHeight: "100vh", background: "#f6f7f9", padding: "48px 20px" }}>
      <section style={{ maxWidth: 920, margin: "0 auto" }}>
        <p style={{ fontWeight: 700 }}>SMARTTRIP</p>
        <h1 style={{ fontSize: 42, marginBottom: 8 }}>Plan the road. Enjoy the journey.</h1>
        <p style={{ color: "#555", fontSize: 18 }}>
          Live traffic-aware route planning, with trip stops and journey intelligence coming next.
        </p>

        <form onSubmit={planTrip} style={{ background: "#fff", padding: 24, borderRadius: 16, marginTop: 28 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Start: 17.3850,78.4867" required style={{ padding: 14, borderRadius: 10, border: "1px solid #ddd" }} />
            <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination: 17.3616,78.4747" required style={{ padding: 14, borderRadius: 10, border: "1px solid #ddd" }} />
            <button disabled={loading} type="submit" style={{ padding: 14, borderRadius: 10, border: 0, cursor: "pointer" }}>
              {loading ? "Calculating live route…" : "Plan trip"}
            </button>
          </div>
        </form>

        {error && <p role="alert" style={{ color: "#b00020" }}>{error}</p>}

        {routes.length > 0 && (
          <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
            {routes.map((route, index) => (
              <article key={index} style={{ background: "#fff", padding: 20, borderRadius: 14 }}>
                <h2>Route {index + 1}</h2>
                <p>Distance: {((route.distanceMeters ?? 0) / 1000).toFixed(1)} km</p>
                <p>Traffic-aware ETA: {route.duration ?? "Unavailable"}</p>
                <p>Typical ETA: {route.staticDuration ?? "Unavailable"}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
