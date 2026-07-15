import { redirect } from "next/navigation";

// Is line se Next.js is page ko static build nahi karega, 
// balki har visitor ke liye request-time par naya random ID generate karega.
export const dynamic = "force-dynamic";

export default function Home() {
  // Har user ke liye ek random unique code generate karein (jaise: usr_a8f2b)
  const uniqueId = "usr_" + Math.random().toString(36).substring(2, 7);

  // Seedha user ko redirect kar dein
  redirect(`/v/${uniqueId}`);
}