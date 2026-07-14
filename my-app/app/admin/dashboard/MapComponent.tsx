"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default Leaflet icons in Next.js App Router
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper sub-component to auto-pan the map when coordinates change
function MapAutoPan({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { animate: true, duration: 1.5 });
  }, [center, map]);
  return null;
}

interface MapProps {
  locations: { latitude: number; longitude: number; createdAt: string }[];
}

export default function MapComponent({ locations }: MapProps) {
  if (!locations || locations.length === 0) return null;

  // The locations array is sorted ASC by creation time, so the last item is the latest
  const latestLoc = locations[locations.length - 1];
  const currentPos: [number, number] = [latestLoc.latitude, latestLoc.longitude];

  // Map historical locations to Polyline position format
  const polylinePositions: [number, number][] = locations.map((loc) => [
    loc.latitude,
    loc.longitude,
  ]);

  return (
    <MapContainer
      center={currentPos}
      zoom={16}
      className="h-full w-full z-0 bg-transparent"
      zoomControl={false}
    >
      {/* 
        CartoDB Dark Matter TileLayer 
        Chosen to match the Antigravity dark space aesthetic 
      */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
      />
      
      {/* 
        Glowing Neon Indigo Polyline connecting all chronological points 
      */}
      <Polyline
        positions={polylinePositions}
        pathOptions={{
          color: "#818cf8", // tailwind indigo-400
          weight: 4,
          opacity: 0.9,
          lineJoin: "round",
          className: "drop-shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse", // Glow effect
        }}
      />
      
      <Marker position={currentPos} />
      
      {/* Hook into Leaflet's map instance to pan smoothly to new locations */}
      <MapAutoPan center={currentPos} />
    </MapContainer>
  );
}
