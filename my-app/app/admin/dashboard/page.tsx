"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// SSR: false dynamic import as required for react-leaflet in Next.js App Router
const LiveMap = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-transparent relative z-0">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
        <span className="text-sm font-medium tracking-widest text-indigo-400 animate-pulse uppercase">
          Initializing Geospatial Engine...
        </span>
      </div>
    </div>
  ),
});

interface LocationRecord {
  latitude: number;
  longitude: number;
  createdAt: string;
}

interface Visitor {
  visitorCode: string;
  lastSeenAt: string;
}

export default function AdminDashboard() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [visitorCode, setVisitorCode] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Initial fetch for visitors
  useEffect(() => {
    let isMounted = true;
    const fetchVisitors = async () => {
      try {
        const res = await fetch("/api/locations");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setVisitors(data);
            if (data.length > 0 && !visitorCode) {
              setVisitorCode(data[0].visitorCode); // Auto-select first visitor
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch visitors", err);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    };
    fetchVisitors();
    
    return () => { isMounted = false; };
  }, []);

  // Poll backend for location history
  useEffect(() => {
    if (!visitorCode) return;

    let isMounted = true;

    const fetchHistory = async () => {
      try {
        setIsPolling(true);
        const res = await fetch(`/api/location/history/${visitorCode}`);

        if (!res.ok) {
          if (res.status === 404) {
            if (isMounted) {
              setLocations([]);
              setError("No coordinates broadcasted by this visitor yet.");
            }
          } else {
            if (isMounted) setError("Error retrieving location data.");
          }
          return;
        }

        const data = await res.json();
        if (isMounted) {
          setLocations(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError("Network anomaly detected while tracking.");
      } finally {
        if (isMounted) setIsPolling(false);
      }
    };

    // Initial fetch
    fetchHistory();

    // Set up 3-second fast-polling
    const intervalId = setInterval(fetchHistory, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [visitorCode]);

  const latestLoc = locations.length > 0 ? locations[locations.length - 1] : null;

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-slate-100 selection:bg-indigo-500/30 font-sans flex flex-col relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-[30%] -right-[10%] h-[800px] w-[800px] rounded-full bg-indigo-900/20 blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-slate-900/50 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex h-screen max-w-7xl flex-col p-4 lg:p-6 lg:flex-row gap-6 w-full">

        {/* --- Left Panel: Controls & Metadata --- */}
        <aside className="flex flex-col gap-6 lg:w-[420px] shrink-0 h-full">

          {/* Header Panel */}
          <div className="rounded-2xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden shrink-0">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
            <h1 className="text-2xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              GPS Tracker
            </h1>
            <p className="mt-1 text-xs text-slate-400 uppercase tracking-widest">
              Live Orbital Tracking
            </p>
          </div>

          {/* Target Selection Panel (Scrollable List) */}
          <div className="flex flex-col flex-1 rounded-2xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl p-5 shadow-xl relative overflow-hidden min-h-0">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-2 shrink-0">
              Active Targets
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {initialLoading ? (
                 <div className="text-center py-10 text-slate-500 text-xs uppercase tracking-widest animate-pulse">
                    Scanning Database...
                 </div>
              ) : visitors.length === 0 ? (
                 <div className="text-center py-10">
                    <p className="text-indigo-400/50 font-mono text-sm">No targets found in database.</p>
                 </div>
              ) : (
                 visitors.map((visitor) => (
                   <button
                     key={visitor.visitorCode}
                     onClick={() => setVisitorCode(visitor.visitorCode)}
                     className={`w-full text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden group
                       ${visitorCode === visitor.visitorCode 
                         ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                         : 'border-white/5 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]'
                       }
                     `}
                   >
                     {visitorCode === visitor.visitorCode && (
                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                     )}
                     <div className="flex justify-between items-center mb-1">
                        <span className={`font-mono text-sm tracking-tight ${visitorCode === visitor.visitorCode ? 'text-indigo-300' : 'text-slate-300'}`}>
                          {visitor.visitorCode}
                        </span>
                        {visitorCode === visitor.visitorCode && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                          </span>
                        )}
                     </div>
                     <p className="text-xs text-slate-500 font-medium">
                       Last Seen: {new Date(visitor.lastSeenAt).toLocaleString()}
                     </p>
                   </button>
                 ))
              )}
            </div>
          </div>

          {/* Telemetry Data Panel */}
          <div className="shrink-0 rounded-2xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl p-5 shadow-xl overflow-hidden flex flex-col relative">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Live Telemetry
              </h2>
              {isPolling && (
                <span className="flex h-2 w-2 items-center justify-center">
                  <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                </span>
              )}
            </div>

            <div className="space-y-5">
              <TelemetryCell label="Selected Target" value={visitorCode || "NONE"} highlight />
              
              <div className="grid grid-cols-2 gap-4">
                <TelemetryCell
                  label="Total Pings"
                  value={locations.length.toString()}
                  mono
                  small
                />
                <TelemetryCell
                  label="Last Update"
                  value={latestLoc ? new Date(latestLoc.createdAt).toLocaleTimeString() : "--:--:--"}
                  mono
                  small
                />
              </div>

              <div className="pt-5 mt-5 border-t border-white/[0.05] grid grid-cols-2 gap-4">
                <TelemetryCell
                  label="Latitude"
                  value={latestLoc ? latestLoc.latitude.toFixed(6) : "——.————"}
                  mono
                  small
                />
                <TelemetryCell
                  label="Longitude"
                  value={latestLoc ? latestLoc.longitude.toFixed(6) : "——.————"}
                  mono
                  small
                />
              </div>
            </div>

            {error && (
              <div className="mt-5">
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-relaxed text-red-400 backdrop-blur-md">
                  <span className="mr-2 font-bold">⚠</span>
                  {error}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* --- Right Panel: Live Map Viewport --- */}
        <section className="relative flex-1 overflow-hidden rounded-3xl border border-white/[0.05] bg-black shadow-2xl h-full min-h-[400px]">
          {/* Map Overlay Glows */}
          <div className="absolute inset-0 z-10 pointer-events-none ring-1 ring-inset ring-white/10 rounded-3xl shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />

          {locations.length > 0 ? (
            <LiveMap key={visitorCode || "map"} locations={locations} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#050508] relative z-0">
              <div className="text-center space-y-4">
                <div className="mx-auto h-16 w-16 opacity-20">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="text-indigo-400 w-full h-full animate-pulse">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium tracking-widest text-xs uppercase animate-pulse">
                  Awaiting Geospatial Signal...
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
      
      {/* Custom scrollbar styles for the target list */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
      `}} />
    </main>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function TelemetryCell({
  label,
  value,
  highlight,
  mono,
  small
}: {
  label: string,
  value: string,
  highlight?: boolean,
  mono?: boolean,
  small?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1 drop-shadow-sm">{label}</p>
      <p className={`
        ${highlight ? "text-indigo-400 font-bold drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "text-slate-200"}
        ${mono ? "font-mono" : "font-sans"}
        ${small ? "text-lg" : "text-2xl"}
        tabular-nums tracking-tight
      `}>
        {value}
      </p>
    </div>
  );
}

