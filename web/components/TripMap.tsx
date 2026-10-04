"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
      if (!key || !element.current || routes.length === 0) return;

      setOptions({ key, v: "weekly" });
      const { Map } = await importLibrary("maps") as google.maps.MapsLibrary;
      const { encoding } = await importLibrary("geometry") as google.maps.GeometryLibrary;

      if (cancelled || !element.current) return;

      const map = new Map(element.current, {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      const bounds = new google.maps.LatLngBounds();

      routes.forEach((route, index) => {
        const encoded = route.polyline?.encodedPolyline;
        if (!encoded) return;

        const path = encoding.decodePath(encoded);
        path.forEach((point) => bounds.extend(point));

        new google.maps.Polyline({
          map,
          path,
          strokeOpacity: index === 0 ? 0.9 : 0.45,
          strokeWeight: index === 0 ? 6 : 4,
          zIndex: index === 0 ? 2 : 1,
        });

        if (index === 0) {
          route.roadSections?.forEach((section) => {
            const position = { lat: section.latitude, lng: section.longitude };
            bounds.extend(position);
            new google.maps.Circle({
              map,
              center: position,
              radius: 450,
              strokeOpacity: 0.75,
              strokeWeight: 1,
              fillColor: sectionColor(section.score, section.traffic_status),
              fillOpacity: 0.18,
              zIndex: 3,
            });
          });
        }
      });

      if (!bounds.isEmpty()) map.fitBounds(bounds, 50);
    }

    render().catch(() => undefined);
    return () => { cancelled = true; };
  }, [routes]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY) {
    return (
      <div style={{ padding: 20, borderRadius: 14, background: "#eef1f5", color: "#59616d" }}>
        Configure NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY to display the live map.
      </div>
    );
  }

  return <div ref={element} style={{ width: "100%", height: 440, borderRadius: 16, overflow: "hidden" }} />;
}
