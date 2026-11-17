"use client";

import { useState } from "react";
import { klijent } from "@/lib/supabase/client";

export default function Prijava() {
  const [email, setEmail] = useState("");
  const [stanje, setStanje] = useState<"mirno" | "salje" | "poslano" | "greska">(
    "mirno",
  );
  const [poruka, setPoruka] = useState("");

  async function posalji(e: React.FormEvent) {
    e.preventDefault();
    setStanje("salje");

    const supabase = klijent();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${
          process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
        }/auth/callback`,
      },
    });

    if (error) {
      setStanje("greska");
      setPoruka(error.message);
    } else {
      setStanje("poslano");
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="ploca w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold">Lični panel</h1>
        <p className="tiho text-sm mt-1">
          Upiši adresu, stiže ti link za prijavu.
        </p>

        {stanje === "poslano" ? (
          <p className="mt-6 text-sm">
            Provjeri poštu — link je poslan na <strong>{email}</strong>.
          </p>
        ) : (
          <form onSubmit={posalji} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ti@primjer.com"
              className="w-full rounded-md border px-3 py-2 text-sm bg-transparent"
              style={{ borderColor: "var(--ivica)" }}
            />
            <button
              type="submit"
              disabled={stanje === "salje"}
              className="w-full rounded-md bg-blue-600 text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              {stanje === "salje" ? "Šaljem…" : "Pošalji link"}
            </button>
            {stanje === "greska" && (
              <p className="text-sm text-red-600">{poruka}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
