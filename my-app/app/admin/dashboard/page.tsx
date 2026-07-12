"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import type L from "leaflet";

interface LocationRecord {
  id: string;
  source: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  isp: string | null;
  ipAddress: string | null;
  capturedAt: string;
}

interface Visitor {
  id: string;
  visitorCode: string;
  firstSeenAt: string;
  lastSeenAt: string;
  userAgent: string | null;
  locations: LocationRecord[];
}

const POLL_INTERVAL = 5000;

const LEAFLET_ICONS = {
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
};

function fixLeafletIcons(leaflet: typeof L) {
  // @ts-expect-error -- Leaflet typings lack _getIconUrl on Icon.Default.prototype
  delete leaflet.Icon.Default.prototype._getIconUrl;
  leaflet.Icon.Default.mergeOptions(LEAFLET_ICONS);
}

function popupHtml(code: string) {
  return `<b>${code}</b><br>Live Moving...`;
}

export default function AdminDashboard() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const trackedIdRef = useRef<string | null>(null);

  const selectedVisitor = visitors.find((v) => v.id === selectedId) ?? null;

  // --- Data fetching ---
  const fetchLogs = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/locations");
      setVisitors(data);
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  }, []);
  //---after every 5sec it get the data from api and display in the map
  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  // --- Map lifecycle (marker and map) ---
  useEffect(() => {
    if (typeof window === "undefined" || !selectedVisitor) return;

    const latestLoc = selectedVisitor.locations[0];
    if (!latestLoc) return;

    const pos: [number, number] = [latestLoc.latitude, latestLoc.longitude];
    const isNewVisitor = trackedIdRef.current !== selectedVisitor.id;

    (async () => {
      const leaflet = (await import("leaflet")).default;
      fixLeafletIcons(leaflet);

      if (!mapRef.current) {
        // First mount — create map, tile layer, and marker
        mapRef.current = leaflet.map("live-map").setView(pos, 16);
        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
          })
          .addTo(mapRef.current);

        markerRef.current = leaflet
          .marker(pos)
          .addTo(mapRef.current)
          .bindPopup(popupHtml(selectedVisitor.visitorCode))
          .openPopup();

        trackedIdRef.current = selectedVisitor.id;
      } else if (isNewVisitor) {
        // Different visitor selected — snap view
        markerRef.current?.setLatLng(pos);
        markerRef.current?.setPopupContent(
          popupHtml(selectedVisitor.visitorCode),
        );
        mapRef.current.setView(pos, 16);
        trackedIdRef.current = selectedVisitor.id;
      } else {
        // Same visitor, new coordinates — smooth pan
        markerRef.current?.setLatLng(pos);
        mapRef.current.panTo(pos);
      }
    })();
  }, [selectedVisitor]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // --- Render ---
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-emerald-400">
        <div className="text-xl font-semibold animate-pulse">
          Loading Live Track Engine...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 mb-6">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
          Real-Time Geolocation Dashboard
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Select a session to stream live device movement
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar — Session list */}
        <div className="space-y-4 lg:col-span-1 max-h-[70vh] overflow-y-auto pr-2">
          <h2 className="text-lg font-bold text-slate-300 px-1">
            Active Sessions
          </h2>

          {visitors.length === 0 ? (
            <p className="text-slate-500 text-sm italic p-4 border border-slate-800 rounded-xl">
              No active connections found.
            </p>
          ) : (
            visitors.map((visitor) => {
              const isSelected = selectedId === visitor.id;
              const latest = visitor.locations[0];
              return (
                <div
                  key={visitor.id}
                  onClick={() => setSelectedId(visitor.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected
                    ? "bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/20"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm text-cyan-400 font-bold">
                      {visitor.visitorCode}
                    </span>
                    {latest && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${latest.source === "GPS"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-amber-950 text-amber-400 border border-amber-800"
                          }`}
                      >
                        {latest.source}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    {latest
                      ? `${latest.city || "Unknown City"}, ${latest.country || ""}`
                      : "No coordinates stream yet"}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Last Sync:{" "}
                    {new Date(visitor.lastSeenAt).toLocaleTimeString()}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Main — Live map */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col min-h-[500px]">
            <div className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Live Movement Tracking Panel
            </div>

            {selectedVisitor && selectedVisitor.locations.length > 0 ? (
              <div
                id="live-map"
                className="w-full flex-1 rounded-lg border border-slate-800 bg-slate-950 z-0"
              />
            ) : (
              <div className="w-full flex-1 rounded-lg border border-dashed border-slate-800 flex items-center justify-center text-slate-500 text-sm bg-slate-950/40">
                Select an active session from the left panel to display the
                real-time map.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
