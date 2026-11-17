"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { klijent } from "@/lib/supabase/client";

type Nacin = "prijava" | "registracija";

export default function Prijava() {
  const router = useRouter();
  const [nacin, setNacin] = useState<Nacin>("prijava");
  const [email, setEmail] = useState("");
  const [lozinka, setLozinka] = useState("");
  const [radi, setRadi] = useState(false);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");

  async function posalji(e: React.FormEvent) {
    e.preventDefault();
    setGreska("");
    setPoruka("");
    setRadi(true);

    const supabase = klijent();

    if (nacin === "registracija") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: lozinka,
      });

      if (error) {
        setGreska(prevedi(error.message));
        setRadi(false);
        return;
      }

      if (data.session) {
        router.push("/tabla");
        router.refresh();
        return;
      }

      setPoruka(
        "Nalog je napravljen, ali čeka potvrdu adrese. Javi mi pa ga potvrdim direktno u bazi.",
      );
      setRadi(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: lozinka,
    });

    if (error) {
      setGreska(prevedi(error.message));
      setRadi(false);
      return;
    }

    router.push("/tabla");
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="ploca w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold">Lični panel</h1>
        <p className="tiho text-sm mt-1">
          {nacin === "prijava" ? "Prijavi se." : "Napravi nalog."}
        </p>

        <form onSubmit={posalji} className="mt-6 space-y-3">
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="adresa"
            className="w-full rounded-md border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: "var(--ivica)" }}
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete={
              nacin === "prijava" ? "current-password" : "new-password"
            }
            value={lozinka}
            onChange={(e) => setLozinka(e.target.value)}
            placeholder="lozinka"
            className="w-full rounded-md border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: "var(--ivica)" }}
          />

          <button
            type="submit"
            disabled={radi}
            className="w-full rounded-md bg-blue-600 text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {radi
              ? "Čekaj…"
              : nacin === "prijava"
                ? "Prijavi se"
                : "Napravi nalog"}
          </button>

          {greska && <p className="text-sm text-red-600">{greska}</p>}
          {poruka && <p className="text-sm">{poruka}</p>}
        </form>

        <button
          onClick={() => {
            setNacin(nacin === "prijava" ? "registracija" : "prijava");
            setGreska("");
            setPoruka("");
          }}
          className="tiho text-xs mt-4 hover:opacity-70"
        >
          {nacin === "prijava"
            ? "Prvi put ovdje? Napravi nalog"
            : "Imam nalog, idem na prijavu"}
        </button>
      </div>
    </main>
  );
}

function prevedi(poruka: string): string {
  const m = poruka.toLowerCase();
  if (m.includes("invalid login credentials")) return "Pogrešna adresa ili lozinka.";
  if (m.includes("user already registered")) return "Nalog s tom adresom već postoji.";
  if (m.includes("email not confirmed")) return "Adresa još nije potvrđena.";
  if (m.includes("password should be")) return "Lozinka mora imati bar 8 znakova.";
  if (m.includes("rate limit")) return "Previše pokušaja. Sačekaj malo.";
  return poruka;
}
