"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

type RoadSection = {
  latitude: number;
  longitude: number;
  score?: number | null;
  route_fraction?: number;
  traffic_status?: string;
  traffic_score?: number;
  safety_signal?: string;
  safety_score?: number;
};

type MapRoute = {
  polyline?: { encodedPolyline?: string };
  roadSections?: RoadSection[];
};

function sectionColor(score?: number | null, trafficStatus?: string) {
  if (trafficStatus === "severe" || trafficStatus === "high") return "#dc2626";
  if (trafficStatus === "moderate") return "#ca8a04";
  if (score == null) return "#6b7280";
  if (score >= 80) return "#15803d";
  if (score >= 60) return "#ca8a04";
  return "#dc2626";
}

export default function TripMap({ routes }: { routes: MapRoute[] }) {
  const element = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
      if (!key || !element.current || routes.length === 0) return;
      setMapError("");

      try {
        setOptions({ key, v: "weekly" });
        const [{ Map }, { encoding }] = await Promise.all([
          importLibrary("maps") as Promise<google.maps.MapsLibrary>,
          importLibrary("geometry") as Promise<google.maps.GeometryLibrary>,
        ]);
        if (cancelled || !element.current) return;

        const map = new Map(element.current, {
          center: { lat: 20.5937, lng: 78.9629 },
          zoom: 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: "greedy",
          clickableIcons: true,
        });

        const bounds = new google.maps.LatLngBounds();
        let hasRoute = false;

        routes.forEach((route, index) => {
          const encoded = route.polyline?.encodedPolyline;
          if (!encoded) return;
          const path = encoding.decodePath(encoded);
          if (!path.length) return;
          hasRoute = true;
          path.forEach((point) => bounds.extend(point));

          new google.maps.Polyline({
            map,
            path,
            strokeColor: index === 0 ? "#2563eb" : "#94a3b8",
            strokeOpacity: index === 0 ? 0.92 : 0.62,
            strokeWeight: index === 0 ? 6 : 4,
            zIndex: index === 0 ? 2 : 1,
          });

          if (index === 0) {
            new google.maps.Marker({ map, position: path[0], title: "Start" });
            new google.maps.Marker({ map, position: path[path.length - 1], title: "Destination" });

            route.roadSections?.forEach((section) => {
              const position = { lat: section.latitude, lng: section.longitude };
              bounds.extend(position);
              new google.maps.Circle({
                map,
                center: position,
                radius: 350,
                strokeColor: sectionColor(section.score, section.traffic_status),
                strokeOpacity: 0.55,
                strokeWeight: 1,
                fillColor: sectionColor(section.score, section.traffic_status),
                fillOpacity: 0.16,
                zIndex: 3,
              });
            });
          }
        });

        if (!hasRoute) throw new Error("Google Maps loaded, but the route polyline was empty.");
        if (!bounds.isEmpty()) map.fitBounds(bounds, 50);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Google Maps could not be loaded.";
          setMapError(message);
        }
      }
    }

    void render();
    return () => { cancelled = true; };
  }, [routes]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY) {
    return (
      <div className="map-placeholder">
        <strong>Google Maps is not configured</strong>
        <span>Add <code>NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY</code> to <code>web/.env.local</code>, restart Next.js, and reload this page.</span>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="map-placeholder map-error">
        <strong>Map could not load</strong>
        <span>{mapError}</span>
        <small>Check Maps JavaScript API, Places API (New), billing, and browser-key HTTP referrer restrictions in Google Cloud.</small>
      </div>
    );
  }

  return <div ref={element} className="trip-map" aria-label="SmartTrip route map" />;
}
